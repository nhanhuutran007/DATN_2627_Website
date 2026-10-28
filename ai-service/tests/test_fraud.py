from app.services.fraud_detector import FraudDetectorService


def test_high_volume_rule_triggers_high_risk() -> None:
    service = FraudDetectorService()
    response = service.score("USER", "user-999", {"contribution_count_1h": 12.0})

    assert response.risk_score >= 0.7
    assert response.level == "HIGH"
    groups = {reason.group for reason in response.reasons}
    assert "RULE_HIGH_VOLUME" in groups


def test_many_failed_payments_rule_triggered() -> None:
    service = FraudDetectorService()
    response = service.score(
        "TRANSACTION",
        None,
        {"failed_payment_count": 9, "total_payment_count": 10},
    )

    groups = {reason.group for reason in response.reasons}
    assert "RULE_MANY_FAILED" in groups
    assert response.level == "HIGH"


def test_rules_with_zero_score_are_not_reasons() -> None:
    service = FraudDetectorService()
    response = service.score(
        "CAMPAIGN",
        "campaign-1",
        {"contribution_count_1h": 0, "device_shared_accounts": 0, "amount_z_score": 2.0},
    )

    groups = {reason.group for reason in response.reasons}
    assert groups == {"RULE_BIG_JUMP"}


def test_weak_signals_are_scored_but_not_reported_as_reasons() -> None:
    service = FraudDetectorService()
    # 1 lượt/giờ, 1/35 giao dịch lỗi: điểm luật nhỏ, không được gọi là "quá cao"
    response = service.score(
        "CAMPAIGN",
        "campaign-1",
        {"contribution_count_1h": 1, "failed_payment_count": 1, "total_payment_count": 35},
    )

    assert response.level == "LOW"
    assert not [reason for reason in response.reasons if reason.group.startswith("RULE_")]


def test_without_classifier_only_rules_score(tmp_path) -> None:
    service = FraudDetectorService(
        classifier_path=tmp_path / "missing.pkl", reference_path=tmp_path / "missing.json"
    )
    response = service.score("TRANSACTION", None, {"contribution_count_1h": 12.0})

    assert response.method == "RULE"
    assert response.fallback is True
    assert response.level == "HIGH"


def test_unknown_entity_and_features_are_harmless() -> None:
    service = FraudDetectorService()
    response = service.score("BOGUS_ENTITY", None, {"made_up_feature": 99})

    assert response.level == "LOW"
    assert response.risk_score < 0.35
    assert not response.reasons

def _classifier_service(tmp_path):
    import json

    import joblib
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingClassifier

    from app.services.catalog import FRAUD_FEATURES

    rng = np.random.default_rng(0)
    rows = np.column_stack(
        [
            rng.poisson(1, 2000),
            np.zeros(2000),
            rng.poisson(5, 2000),
            rng.normal(0, 1, 2000),
            rng.uniform(0, 400, 2000),
        ]
    )
    # Tài khoản rất mới là gian lận (giống tín hiệu chính trên IEEE-CIS)
    labels = (rows[:, FRAUD_FEATURES.index("new_account_days")] < 20).astype(int)
    model = HistGradientBoostingClassifier(max_iter=50, random_state=0).fit(rows, labels)
    joblib.dump(model, tmp_path / "fraud_classifier.pkl")
    quantiles = np.quantile(model.predict_proba(rows)[:, 1], np.linspace(0, 1, 1001))
    (tmp_path / "reference.json").write_text(
        json.dumps({"quantiles": quantiles.tolist()}), encoding="utf-8"
    )
    return FraudDetectorService(
        classifier_path=tmp_path / "fraud_classifier.pkl",
        reference_path=tmp_path / "reference.json",
    )


def test_supervised_classifier_is_preferred_and_ranks_risk(tmp_path) -> None:
    service = _classifier_service(tmp_path)

    young = service._classifier_risk({"new_account_days": 2, "total_payment_count": 5})
    old = service._classifier_risk({"new_account_days": 300, "total_payment_count": 5})

    assert young is not None and old is not None
    assert young > old
    response = service.score("TRANSACTION", None, {"new_account_days": 2})
    assert response.method == "ENSEMBLE"
    assert response.fallback is False
    # Mô hình chỉ là tín hiệu phụ (25%): một mình nó không đẩy được lên mức trung bình
    assert response.level == "LOW"


def test_missing_features_are_passed_as_nan_to_classifier(tmp_path) -> None:
    service = _classifier_service(tmp_path)

    risk = service._classifier_risk({})

    assert risk is not None
    assert 0.0 <= risk <= 1.0


def test_classifier_is_named_as_reason_when_it_ranks_risk_top(tmp_path) -> None:
    service = _classifier_service(tmp_path)

    response = service.score("TRANSACTION", None, {"new_account_days": 2, "total_payment_count": 5})

    groups = {reason.group for reason in response.reasons}
    assert "ML_CLASSIFIER" in groups

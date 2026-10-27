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


def test_unknown_entity_and_features_are_harmless() -> None:
    service = FraudDetectorService()
    response = service.score("BOGUS_ENTITY", None, {"made_up_feature": 99})

    assert response.level == "LOW"
    assert response.risk_score < 0.35
    assert not response.reasons

def test_missing_feature_uses_training_mean_not_zero(tmp_path) -> None:
    import joblib
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

    from app.services.catalog import FRAUD_FEATURES

    rng = np.random.default_rng(0)
    rows = rng.normal(0.0, 1.0, (300, len(FRAUD_FEATURES)))
    rows[:, FRAUD_FEATURES.index("new_account_days")] = rng.uniform(20.0, 400.0, 300)
    scaler = StandardScaler().fit(rows)
    model = IsolationForest(n_estimators=50, random_state=0).fit(scaler.transform(rows))
    joblib.dump(model, tmp_path / "fraud.pkl")
    joblib.dump(scaler, tmp_path / "scaler.pkl")

    # Chỉ kiểm tra nhánh Isolation Forest: trỏ mô hình có giám sát tới file không tồn tại
    service = FraudDetectorService(
        tmp_path / "fraud.pkl",
        tmp_path / "scaler.pkl",
        classifier_path=tmp_path / "missing_classifier.pkl",
        reference_path=tmp_path / "missing_reference.json",
    )
    base = {name: 0.0 for name in FRAUD_FEATURES if name != "new_account_days"}
    missing = service._ml_risk(base)
    mean_days = float(scaler.mean_[FRAUD_FEATURES.index("new_account_days")])
    as_mean = service._ml_risk({**base, "new_account_days": mean_days})
    as_zero = service._ml_risk({**base, "new_account_days": 0.0})

    assert missing is not None and missing == as_mean
    assert as_zero > missing
    assert service.score("CAMPAIGN", "c-1", base).method == "ENSEMBLE"


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
        model_path=tmp_path / "missing_if.pkl",
        scaler_path=tmp_path / "missing_scaler.pkl",
        classifier_path=tmp_path / "fraud_classifier.pkl",
        reference_path=tmp_path / "reference.json",
    )


def test_supervised_classifier_is_preferred_and_ranks_risk(tmp_path) -> None:
    service = _classifier_service(tmp_path)

    young = service._ml_risk({"new_account_days": 2, "total_payment_count": 5})
    old = service._ml_risk({"new_account_days": 300, "total_payment_count": 5})

    assert young is not None and old is not None
    assert young > old
    response = service.score("TRANSACTION", None, {"new_account_days": 2})
    assert response.method == "ENSEMBLE"
    assert response.fallback is False
    # Mô hình chỉ là tín hiệu phụ (25%): một mình nó không đẩy được lên mức trung bình
    assert response.level == "LOW"


def test_missing_features_are_passed_as_nan_to_classifier(tmp_path) -> None:
    service = _classifier_service(tmp_path)

    risk = service._ml_risk({})

    assert risk is not None
    assert 0.0 <= risk <= 1.0

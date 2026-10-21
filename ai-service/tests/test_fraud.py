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
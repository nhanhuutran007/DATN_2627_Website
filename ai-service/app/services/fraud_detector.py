"""Fraud-detection service: business rules + optional machine-learning layer.

The ML layer prefers a supervised classifier trained on labelled real transactions
(``models/fraud_classifier.pkl``, see ``notebooks/train_real_data_colab.ipynb``); its
probability is turned into a risk percentile against the training score distribution
(``models/fraud_score_reference.json``) because fraud is rare and raw probabilities stay
small. Without those files the legacy IsolationForest + scaler artifacts are used.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.core.config import settings
from app.schemas.fraud import FraudReason, FraudResponse
from app.services.catalog import FRAUD_FEATURES

ML_SCALE = 10.0


@dataclass(frozen=True)
class RuleResult:
    group: str
    label: str
    score: float


def _as_finite(value: object) -> float | None:
    try:
        result = float(value) if value is not None else None
    except (TypeError, ValueError):
        return None
    if result is None or not math.isfinite(result):
        return None
    return result


@lru_cache(maxsize=8)
def _load_fraud_artifacts(
    model_path_str: str, scaler_path_str: str
) -> tuple[Any | None, Any | None]:
    try:
        model = joblib.load(Path(model_path_str))
        scaler = joblib.load(Path(scaler_path_str))
        if not hasattr(model, "decision_function") or not hasattr(scaler, "transform"):
            return None, None
        return model, scaler
    except Exception:
        return None, None


@lru_cache(maxsize=8)
def _load_classifier_artifacts(
    model_path_str: str, reference_path_str: str
) -> tuple[Any | None, np.ndarray | None]:
    try:
        model = joblib.load(Path(model_path_str))
        payload = json.loads(Path(reference_path_str).read_text(encoding="utf-8"))
        reference = np.sort(np.asarray(payload["quantiles"], dtype=float))
        if not hasattr(model, "predict_proba") or reference.size < 2:
            return None, None
        if not np.all(np.isfinite(reference)):
            return None, None
        return model, reference
    except Exception:
        return None, None


def _apply_rules(features: dict[str, float]) -> list[RuleResult]:
    results: list[RuleResult] = []

    high_volume = _as_finite(features.get("contribution_count_1h"))
    if high_volume is not None:
        score = 1.0 if high_volume > 5 else max(0.0, high_volume / 10.0)
        results.append(
            RuleResult(
                group="RULE_HIGH_VOLUME",
                label="Tần suất ủng hộ quá cao trong 1 giờ",
                score=min(score, 1.0),
            )
        )

    failed = _as_finite(features.get("failed_payment_count"))
    total = _as_finite(features.get("total_payment_count"))
    if failed is not None and total is not None and total >= 0:
        ratio = failed / max(1.0, total)
        score = 1.0 if ratio > 0.5 else max(0.0, min(ratio, 0.5) * 2.0)
        results.append(
            RuleResult(
                group="RULE_MANY_FAILED",
                label="Tỷ lệ thanh toán thất bại cao",
                score=min(score, 1.0),
            )
        )

    shared_device = _as_finite(features.get("device_shared_accounts"))
    if shared_device is not None:
        score = 1.0 if shared_device > 3 else max(0.0, shared_device / 5.0)
        results.append(
            RuleResult(
                group="RULE_SHARED_DEVICE",
                label="Thiết bị dùng chung nhiều tài khoản",
                score=min(score, 1.0),
            )
        )

    big_jump = _as_finite(features.get("amount_z_score"))
    if big_jump is not None:
        score = 1.0 if big_jump > 3 else max(0.0, big_jump / 5.0)
        results.append(
            RuleResult(
                group="RULE_BIG_JUMP",
                label="Số tiền biến động bất thường",
                score=min(score, 1.0),
            )
        )

    ip_changes = _as_finite(features.get("ip_country_changes"))
    if ip_changes is not None:
        score = 1.0 if ip_changes > 2 else max(0.0, ip_changes / 3.0)
        results.append(
            RuleResult(
                group="RULE_IP_CHANGES",
                label="Thay đổi quốc gia IP bất thường",
                score=min(score, 1.0),
            )
        )

    new_account = _as_finite(features.get("new_account_days"))
    if new_account is not None and new_account < 1:
        results.append(
            RuleResult(
                group="RULE_NEW_ACCOUNT",
                label="Tài khoản mới được tạo gần đây",
                score=0.5,
            )
        )

    profile_change = _as_finite(features.get("profile_change_frequency"))
    if profile_change is not None:
        score = 1.0 if profile_change > 2 else max(0.0, profile_change / 3.0)
        results.append(
            RuleResult(
                group="RULE_SUDDEN_PROFILE_CHANGE",
                label="Thay đổi hồ sơ đột ngột",
                score=min(score, 1.0),
            )
        )

    return results


class FraudDetectorService:
    """Combines trusted business rules with an optional anomaly-detection layer."""

    def __init__(
        self,
        model_path: Path | str | None = None,
        scaler_path: Path | str | None = None,
        classifier_path: Path | str | None = None,
        reference_path: Path | str | None = None,
    ) -> None:
        self._model_path = Path(model_path) if model_path else settings.fraud_model_path
        self._scaler_path = Path(scaler_path) if scaler_path else settings.fraud_scaler_path
        self._classifier_path = (
            Path(classifier_path) if classifier_path else settings.fraud_classifier_path
        )
        self._reference_path = (
            Path(reference_path) if reference_path else settings.fraud_reference_path
        )

    def score(
        self, entity_type: str, entity_id: str | None, features: dict[str, float]
    ) -> FraudResponse:
        rule_results = _apply_rules(features)
        rule_score = max((result.score for result in rule_results), default=0.0)
        ml_risk = self._ml_risk(features)

        if ml_risk is not None:
            ensembled = 0.75 * rule_score + 0.25 * ml_risk
            risk_score = max(ensembled, rule_score)
            method = "ENSEMBLE"
            fallback = False
        else:
            risk_score = rule_score
            method = "RULE"
            fallback = True

        risk_score = max(0.0, min(1.0, float(risk_score)))
        if risk_score >= 0.7:
            level = "HIGH"
        elif risk_score >= 0.35:
            level = "MEDIUM"
        else:
            level = "LOW"

        # Chỉ luật thực sự kích hoạt (điểm > 0) mới là nguyên nhân
        reasons = sorted(
            (
                FraudReason(group=result.group, label=result.label, weight=round(result.score, 6))
                for result in rule_results
                if result.score > 0
            ),
            key=lambda reason: reason.weight,
            reverse=True,
        )
        evidences = {name: value for name, value in features.items() if self._nonzero(name, value)}

        return FraudResponse(
            risk_score=round(risk_score, 6),
            level=level,
            method=method,
            reasons=reasons,
            evidences=evidences,
            fallback=fallback,
        )

    def _ml_risk(self, features: dict[str, float]) -> float | None:
        classifier_risk = self._classifier_risk(features)
        if classifier_risk is not None:
            return classifier_risk
        return self._isolation_risk(features)

    def _classifier_risk(self, features: dict[str, float]) -> float | None:
        model, reference = _load_classifier_artifacts(
            str(self._classifier_path), str(self._reference_path)
        )
        if model is None or reference is None:
            return None
        try:
            # Mô hình cây xử lý được giá trị thiếu (NaN) nên không cần điền trung bình
            vector = np.asarray(
                [[
                    value if (value := _as_finite(features.get(name))) is not None else np.nan
                    for name in FRAUD_FEATURES
                ]],
                dtype=float,
            )
            probability = float(np.asarray(model.predict_proba(vector))[0][1])
            if not math.isfinite(probability):
                return None
            # Phân vị rủi ro: giao dịch này rủi ro hơn bao nhiêu phần giao dịch lúc huấn luyện
            rank = float(np.searchsorted(reference, probability, side="right"))
            return max(0.0, min(1.0, rank / reference.size))
        except Exception:
            return None

    def _isolation_risk(self, features: dict[str, float]) -> float | None:
        model, scaler = _load_fraud_artifacts(str(self._model_path), str(self._scaler_path))
        if model is None:
            return None
        try:
            # Đặc trưng thiếu lấy trung bình tập huấn luyện (trung tính sau chuẩn hóa); điền 0
            # sẽ khiến vd. new_account_days thiếu bị coi là "tài khoản 0 ngày tuổi" -> bất thường.
            means = getattr(scaler, "mean_", None)
            vector = np.asarray(
                [[
                    value
                    if (value := _as_finite(features.get(name))) is not None
                    else (float(means[index]) if means is not None else 0.0)
                    for index, name in enumerate(FRAUD_FEATURES)
                ]],
                dtype=float,
            )
            scaled = scaler.transform(vector)
            decision = float(np.asarray(model.decision_function(scaled))[0])
            if not math.isfinite(decision):
                return None
            return float(max(0.0, min(1.0, 1.0 / (1.0 + math.exp(decision * ML_SCALE)))))
        except Exception:
            return None

    def _nonzero(self, name: str, value: object) -> bool:
        finite = _as_finite(value)
        return finite is not None and finite != 0.0
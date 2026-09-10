"""Shared catalogs: category vocabulary and feature-list contracts.

These constants are the single source of truth for both the offline training
pipeline (``training/train.py``) and the online inference services, so the
feature vectors produced at request time always match the training order.
"""

from __future__ import annotations

CATEGORIES: list[str] = [
    "Môi trường",
    "Khởi nghiệp",
    "Giáo dục",
    "Y tế",
    "Văn hóa",
    "Công nghệ",
]

CATEGORY_IDS: dict[str, int] = {name: idx for idx, name in enumerate(CATEGORIES)}

SUCCESS_FEATURES: list[str] = [
    "category_id",
    "goal_amount",
    "duration_days",
    "profile_score",
    "content_length",
    "image_count",
    "has_video",
    "story_word_count",
    "owner_campaign_count",
    "owner_credential_approved",
    "has_budget_report",
    "early_views",
    "early_backers",
]

FRAUD_FEATURES: list[str] = [
    "contribution_count_1h",
    "failed_payment_count",
    "total_payment_count",
    "device_shared_accounts",
    "amount_z_score",
    "ip_country_changes",
    "new_account_days",
    "profile_change_frequency",
]
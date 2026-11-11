"""Shared catalogs: category vocabulary and feature-list contracts.

These constants are the single source of truth for the online inference services and
mirror the training notebook (``notebooks/train_real_data_colab.ipynb``). The success
model's actual column order comes from ``models/success_features.json``.
"""

from __future__ import annotations

import unicodedata

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

# Đầu vào của mô hình phát hiện gian lận: chỉ các đặc trưng nền tảng đo được thật.
# device_shared_accounts / ip_country_changes / profile_change_frequency vẫn có trong
# dataset và luật nghiệp vụ (dùng khi có dữ liệu) nhưng không đưa vào mô hình.
FRAUD_FEATURES: list[str] = [
    "contribution_count_1h",
    "failed_payment_count",
    "total_payment_count",
    "amount_z_score",
    "new_account_days",
]
# Lĩnh vực trên nền tảng do quản trị viên đặt tên tự do ("Văn hóa nghệ thuật", "Nông nghiệp"…),
# còn mô hình chỉ biết 6 nhóm ở trên. Dò theo từ khóa không dấu để đưa tên bất kỳ về nhóm chuẩn;
# giữ khớp với AI_CATEGORY_RULES trong backend/src/modules/ai/ai.service.ts.
_CATEGORY_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("Y tế", ("y te", "suc khoe", "benh")),
    ("Giáo dục", ("giao duc", "hoc bong", "truong hoc")),
    ("Công nghệ", ("cong nghe", "ky thuat so", "phan mem")),
    ("Văn hóa", ("van hoa", "nghe thuat", "am nhac", "dien anh")),
    ("Khởi nghiệp", ("khoi nghiep", "nong nghiep", "kinh doanh", "thu cong", "thuc pham")),
    ("Môi trường", ("moi truong",)),
)


def fold_vietnamese(value: str) -> str:
    """Lowercase, strip Vietnamese diacritics and collapse whitespace."""
    decomposed = unicodedata.normalize("NFD", value)
    stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(stripped.replace("đ", "d").replace("Đ", "D").lower().split())


def canonical_category(name: str | None) -> str | None:
    """Map a free-form platform category to one of ``CATEGORIES`` (``None`` if no match)."""
    if not name:
        return None
    if name in CATEGORY_IDS:
        return name
    folded = fold_vietnamese(name)
    for canonical, keywords in _CATEGORY_KEYWORDS:
        if any(keyword in folded for keyword in keywords):
            return canonical
    return None

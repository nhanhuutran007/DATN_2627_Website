"""Scraping + normalization helpers for real crowdfunding campaigns.

The trained models expect the column contracts defined in
``app/services/catalog.py`` and ``data/README.md``. This tool lets you turn raw
JSON dumps from a donation/crowdfunding API into ``data/processed/*.csv`` files
that can replace the synthetic datasets before ``training.train`` runs.

Run from the ``ai-service`` directory. Stdlib only (urllib), so no new runtime
dependencies are required. Two steps:

1. Fetch raw JSON pages into ``data/raw/``::

       python tools/scrape_campaigns.py fetch \\
           --url "https://api.example.com/v1/campaigns" \\
           --items-path "data.campaigns" \\
           --max-pages 20 --delay 1.5 --out data/raw/source.json

2. Normalize records into the training schema::

       python tools/scrape_campaigns.py normalize \\
           --in data/raw/source.json --items-path "data.campaigns" \\
           --out data/processed/campaigns.csv

A ``--mapping`` JSON file can remap source keys to target columns; see
``data/README.md`` for the schema and an example mapping for Kickstarter /
ComOn-style APIs.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.catalog import CATEGORIES, CATEGORY_IDS  # noqa: E402

RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

DEFAULT_HEADERS = {
    "User-Agent": "GoP-Mam-DATN-2627/0.1 (+thesis; polite crawler)",
    "Accept": "application/json",
}

CAMPAIGN_COLUMNS = [
    "campaign_id",
    "category",
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
    "success",
    "launch_seq",
]

EVENTS_COLUMNS = ["user_id", "campaign_id", "category", "event_type", "occurred_at"]

CATEGORY_ALIASES = {
    "moi-truong": "Môi trường",
    "môi trường": "Môi trường",
    "environment": "Môi trường",
    "khoi-nghiep": "Khởi nghiệp",
    "khởi nghiệp": "Khởi nghiệp",
    "startup": "Khởi nghiệp",
    "entrepreneurship": "Khởi nghiệp",
    "giao-duc": "Giáo dục",
    "giáo dục": "Giáo dục",
    "education": "Giáo dục",
    "y-te": "Y tế",
    "y tế": "Y tế",
    "health": "Y tế",
    "medical": "Y tế",
    "van-hoa": "Văn hóa",
    "văn hóa": "Văn hóa",
    "culture": "Văn hóa",
    "art": "Văn hóa",
    "cong-nghe": "Công nghệ",
    "công nghệ": "Công nghệ",
    "technology": "Công nghệ",
    "tech": "Công nghệ",
}

EVENT_ALIASES = {
    "view": "VIEW",
    "views": "VIEW",
    "read": "VIEW",
    "xem": "VIEW",
    "search": "SEARCH",
    "tim": "SEARCH",
    "tìm kiếm": "SEARCH",
    "follow": "FOLLOW",
    "bookmark": "FOLLOW",
    "theo doi": "FOLLOW",
    "theo dõi": "FOLLOW",
    "contribute": "CONTRIBUTE",
    "donate": "CONTRIBUTE",
    "pledge": "CONTRIBUTE",
    "back": "CONTRIBUTE",
    "tai tro": "CONTRIBUTE",
    "tài trợ": "CONTRIBUTE",
    "ủng hộ": "CONTRIBUTE",
}


def fetch_json(
    url: str,
    *,
    timeout: int = 20,
    retries: int = 3,
    backoff: float = 2.0,
) -> object:
    last_error: Exception | None = None
    for attempt in range(retries):
        request = urllib.request.Request(url, headers=DEFAULT_HEADERS)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < retries - 1:
                time.sleep(backoff * (attempt + 1))
    raise RuntimeError(f"Không tải được {url}: {type(last_error).__name__}") from last_error


def extract_items(payload: object, items_path: str) -> list[object]:
    if not items_path:
        if isinstance(payload, list):
            return payload
        raise ValueError("items-path rỗng nhưng payload không phải list")
    current: object = payload
    for part in items_path.split("."):
        if not isinstance(current, dict) or part not in current:
            raise ValueError(f"Không tìm thấy đường dẫn {items_path!r}")
        current = current[part]
    if not isinstance(current, list):
        raise ValueError(f"{items_path!r} không trỏ tới một list")
    return current


def lookup_value(record: object, path: str) -> object:
    current: object = record
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def to_number(value: object, default: float = 0.0) -> float:
    if value is None or isinstance(value, bool):
        return default
    try:
        result = float(value)
    except (TypeError, ValueError):
        return default
    return result if result == result else default


def to_bool(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def parse_iso_datetime(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"Z$", "+00:00", text)
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return ""
    return parsed.replace(tzinfo=None).isoformat(timespec="seconds")


def map_category(value: object) -> str:
    if value is None:
        return "Khởi nghiệp"
    text = str(value).strip().lower()
    for alias, target in CATEGORY_ALIASES.items():
        if alias in text:
            return target
    return "Khởi nghiệp"


def story_word_count(record: object, path: str) -> int:
    text = lookup_value(record, path)
    if not text:
        return 0
    return len(str(text).split())


def profile_score_fraction(record: object, fields: str) -> float:
    names = [f.strip() for f in fields.split(",") if f.strip()]
    if not names:
        return 0.0
    filled = sum(
        1 for name in names if lookup_value(record, name) not in (None, "")
    )
    return round(100.0 * filled / len(names), 2)


def normalize_campaign(record: object, mapping: dict, index: int) -> dict:
    def resolve(name: str) -> object:
        spec = mapping.get(name)
        if not spec:
            return None
        path = spec.get("path", "")
        return lookup_value(record, path)

    start = parse_iso_datetime(resolve("start_date"))
    end = parse_iso_datetime(resolve("end_date"))
    duration_days = 0
    if start and end:
        try:
            delta = datetime.fromisoformat(end) - datetime.fromisoformat(start)
            duration_days = max(0, delta.days)
        except ValueError:
            duration_days = 0

    goal = to_number(resolve("goal_amount"))
    raised = to_number(resolve("raised_amount"))
    success = to_bool(resolve("success"))
    if not start and goal > 0:
        success = bool(success or (raised >= goal and end))

    category = map_category(resolve("category"))

    image_count = int(to_number(resolve("image_count")))
    profile_fields = "description,story,total_story,owner,budget_report"
    profile_score = to_number(
        resolve("profile_score"),
        default=profile_score_fraction(record, profile_fields),
    )
    description = lookup_value(record, "description")
    content_length = int(
        to_number(resolve("content_length"), default=len(str(description or "")))
    )
    story_words = int(
        story_word_count(record, "story") or to_number(resolve("story_word_count"))
    )
    return {
        "campaign_id": str(resolve("campaign_id") or f"scraped-{index:05d}"),
        "category": category,
        "category_id": CATEGORY_IDS.get(category, 0),
        "goal_amount": goal,
        "duration_days": int(duration_days or to_number(resolve("duration_days"))),
        "profile_score": profile_score,
        "content_length": content_length,
        "image_count": image_count,
        "has_video": to_bool(resolve("has_video")),
        "story_word_count": story_words,
        "owner_campaign_count": int(to_number(resolve("owner_campaign_count"))),
        "owner_credential_approved": to_bool(resolve("owner_credential_approved")),
        "has_budget_report": to_bool(resolve("has_budget_report")),
        "early_views": int(to_number(resolve("early_views"))),
        "early_backers": int(to_number(resolve("early_backers"))),
        "success": int(success),
        "launch_seq": index,
    }


def normalize_event(record: object, mapping: dict, index: int) -> dict:
    def mapped(name: str) -> object:
        return lookup_value(record, mapping.get(name, {}).get("path", ""))

    event_type_raw = str(mapped("event_type") or "")
    event_type = "VIEW"
    lowered = event_type_raw.lower()
    for alias, target in EVENT_ALIASES.items():
        if lowered == alias:
            event_type = target
            break
    category = map_category(mapped("category"))
    user_id = str(mapped("user_id") or f"u-{index:05d}")
    campaign_id = str(mapped("campaign_id") or "")
    occurred_at = parse_iso_datetime(mapped("occurred_at"))
    return {
        "user_id": user_id,
        "campaign_id": campaign_id,
        "category": category,
        "event_type": event_type,
        "occurred_at": occurred_at,
    }


def write_csv(rows: list[dict], columns: list[str], path: Path) -> None:
    import csv

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def build_campaign_url(base: str, page: int, page_param: str, limit: int, limit_param: str) -> str:
    separator = "&" if "?" in base else "?"
    return f"{base}{separator}{page_param}={page}&{limit_param}={limit}"


def display(path: Path) -> str:
    """Show a path relative to ROOT when inside it, else absolute."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def cmd_fetch(args: argparse.Namespace) -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    all_items: list[object] = []
    for page in range(1, args.max_pages + 1):
        url = build_campaign_url(args.url, page, args.page_param, args.limit, args.limit_param)
        payload = fetch_json(url, retries=args.retries)
        items = extract_items(payload, args.items_path)
        all_items.extend(items)
        print(f"Trang {page}: {len(items)} bản ghi (tổng {len(all_items)})")
        if not items:
            break
        time.sleep(args.delay)
    fetched_at = datetime.now().isoformat(timespec="seconds")
    count = len(all_items)
    dump = {"source": args.url, "fetched_at": fetched_at, "count": count, "items": all_items}
    args.out.write_text(json.dumps(dump, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Đã ghi {len(all_items)} bản ghi -> {display(args.out)}")
    return 0


def _load_mapping(path: Path | None) -> dict:
    if path is None:
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def cmd_normalize(args: argparse.Namespace) -> int:
    dump = json.loads(args.in_file.read_text(encoding="utf-8-sig"))
    items = extract_items(dump, args.items_path)
    mapping = _load_mapping(args.mapping)
    method = normalize_event if args.events else normalize_campaign
    rows = [method(item, mapping, i) for i, item in enumerate(items)]
    columns = EVENTS_COLUMNS if args.events else CAMPAIGN_COLUMNS
    ordered = [{col: row[col] for col in columns} for row in rows]
    write_csv(ordered, columns, args.out_file)
    print(f"Đã chuẩn hóa {len(ordered)} bản ghi -> {display(args.out_file)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="scrape_campaigns", description=__doc__)
    sub = parser.add_subparsers(dest="command")

    fetch = sub.add_parser("fetch", help="tải JSON của một API về data/raw")
    fetch.add_argument("--url", required=True, help="endpoint (chỉ hỗ trợ GET, trả JSON)")
    fetch.add_argument("--items-path", default="data.campaigns",
                       help="vị trí list bản ghi trong payload")
    fetch.add_argument("--page-param", default="page")
    fetch.add_argument("--limit-param", default="per_page")
    fetch.add_argument("--limit", type=int, default=100)
    fetch.add_argument("--max-pages", type=int, default=5)
    fetch.add_argument("--delay", type=float, default=1.5, help="giây chờ giữa các trang")
    fetch.add_argument("--retries", type=int, default=3)
    fetch.add_argument("--out", type=Path, default=RAW_DIR / "source.json")

    normalize = sub.add_parser("normalize", help="chuẩn hóa bản ghi về schema huấn luyện")
    normalize.add_argument("--in", dest="in_file", type=Path, required=True)
    normalize.add_argument("--items-path", default="items")
    normalize.add_argument("--mapping", type=Path, help="JSON {target_col: {path: 'a.b.c'}}")
    normalize.add_argument("--events", action="store_true",
                           help="chuẩn hóa sự kiện thay vì chiến dịch")
    normalize.add_argument("--out", dest="out_file", type=Path,
                           default=PROCESSED_DIR / "campaigns.csv")

    parser.add_argument("--categories", action="store_true",
                        help="in danh sách categories rồi thoát")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if getattr(args, "categories", False):
        for idx, name in enumerate(CATEGORIES):
            print(f"{idx}: {name}")
        return 0
    if args.command == "fetch":
        return cmd_fetch(args)
    if args.command == "normalize":
        return cmd_normalize(args)
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
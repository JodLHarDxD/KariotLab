"""Generate content_index.json for chatbot grounding.

Reads all content/ sections and produces output/content_index.json —
a flat list of records the chatbot can search over.
"""
import json
from pathlib import Path
from . import config
from .loader import load_section


def _url_for(page_file: str, content_subdir: str, slug: str) -> str:
    if content_subdir == "work":
        return f"case-study.html?slug={slug}"
    if content_subdir == "journal":
        return f"journal/{slug}.html"
    if content_subdir == "services":
        return "pricing.html"
    if content_subdir == "members":
        return "contact.html"
    return page_file


def _record(page_file: str, content_subdir: str, item: dict) -> dict:
    meta = item["meta"]
    slug = item["slug"]
    record: dict = {
        "type": content_subdir.rstrip("s"),  # "work", "journal", "service", "member"
        "slug": slug,
        "url": _url_for(page_file, content_subdir, slug),
    }
    # Title / name
    if "title" in meta:
        record["title"] = meta["title"]
        if meta.get("title_em"):
            record["title"] += f" — {meta['title_em']}"
    elif "name" in meta:
        record["title"] = meta["name"]

    # Description / excerpt
    for key in ("brief", "desc", "excerpt"):
        if meta.get(key):
            record["description"] = meta[key]
            break

    # Supplementary fields
    if "tags" in meta:
        record["tags"] = meta["tags"]
    if "category" in meta:
        record["category"] = meta["category"]
    if "date_display" in meta:
        record["date"] = meta["date_display"]
    if "author" in meta:
        record["author"] = meta["author"]
    if "price" in meta:
        prefix = meta.get("price_prefix", "")
        unit = meta.get("price_unit", "")
        record["price"] = f"{prefix}{meta['price']}{(' ' + unit) if unit else ''}".strip()
    if "bullets" in meta:
        record["features"] = meta["bullets"]

    return record


def build_index(output_path: Path | None = None) -> list[dict]:
    records: list[dict] = []
    for page_file, _, content_subdir, _ in config.SECTIONS:
        section_dir = config.CONTENT_DIR / content_subdir
        items = load_section(section_dir)
        for item in items:
            records.append(_record(page_file, content_subdir, item))

    if output_path is None:
        output_path = config.ROOT / "content_index.json"
    output_path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return records

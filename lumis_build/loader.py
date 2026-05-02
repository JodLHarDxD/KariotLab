"""Walk content/<type>/<slug>/ and return a sorted list of item dicts."""
from pathlib import Path
from typing import Any
import yaml
from markdown_it import MarkdownIt

_md = MarkdownIt("commonmark")
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def load_section(section_dir: Path) -> list[dict[str, Any]]:
    if not section_dir.is_dir():
        return []
    items: list[dict[str, Any]] = []
    for slug_dir in sorted(p for p in section_dir.iterdir() if p.is_dir()):
        meta_path = slug_dir / "meta.yml"
        if not meta_path.is_file():
            continue
        meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
        if meta.get("visible") is False:
            continue
        body_path = slug_dir / "body.md"
        body_html = _md.render(body_path.read_text(encoding="utf-8")) if body_path.is_file() else ""
        images = sorted(
            p for p in slug_dir.iterdir()
            if p.is_file() and p.suffix.lower() in _IMAGE_EXTS
        )
        items.append({
            "slug": slug_dir.name,
            "meta": meta,
            "body_html": body_html,
            "images": images,
        })
    items.sort(key=lambda i: (i["meta"].get("order", 9999), i["slug"]))
    return items

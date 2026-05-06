"""Generate per-slug HTML pages for journal articles."""
from pathlib import Path
from . import config
from .loader import load_section
from .images import process_image
from .render import build_env


def build_journal_pages() -> int:
    env = build_env(config.TEMPLATES_DIR)
    template = env.get_template("journal_article_page.html.j2")
    section_dir = config.CONTENT_DIR / "journal"
    items = load_section(section_dir)
    out_dir = config.ROOT / "journal"
    out_dir.mkdir(exist_ok=True)
    count = 0
    for item in items:
        # Process cover image if present
        if item["images"]:
            preset_name, max_width, quality = config.IMAGE_PRESETS["journal"]
            dst = config.ASSETS_DIR / "journal" / item["slug"] / f"{preset_name}.jpg"
            process_image(item["images"][0], dst, max_width=max_width, quality=quality)
            item["image_url"] = f"assets/journal/{item['slug']}/{preset_name}.jpg"
        else:
            item["image_url"] = ""
        html = template.render(item=item)
        page_path = out_dir / f"{item['slug']}.html"
        if not page_path.is_file() or page_path.read_text(encoding="utf-8") != html:
            page_path.write_text(html, encoding="utf-8")
        count += 1
    return count

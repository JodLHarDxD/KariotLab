"""Run the full build: content → images → render → marker replace."""
from pathlib import Path
from typing import Iterable
from . import config
from .loader import load_section
from .images import process_image
from .render import build_env, render_card
from .markers import replace_section


def _image_url_for(item: dict, content_subdir: str) -> str:
    """Pick the first image, return its rebased assets/ URL."""
    if not item["images"]:
        return ""
    src = item["images"][0]
    preset_name, _, _ = config.IMAGE_PRESETS.get(content_subdir, ("image", 1600, 82))
    return f"assets/{content_subdir}/{item['slug']}/{preset_name}.jpg"


def build_all(only_sections: Iterable[str] | None = None) -> None:
    env = build_env(config.TEMPLATES_DIR)
    for page_file, marker_name, content_subdir, template_name in config.SECTIONS:
        if only_sections is not None and marker_name not in only_sections:
            continue
        section_dir = config.CONTENT_DIR / content_subdir
        items = load_section(section_dir)
        if not items:
            continue
        # Resize each item's primary image
        for item in items:
            if not item["images"]:
                continue
            preset = config.IMAGE_PRESETS.get(content_subdir)
            if not preset:
                continue
            preset_name, max_width, quality = preset
            dst = config.ASSETS_DIR / content_subdir / item["slug"] / f"{preset_name}.jpg"
            process_image(item["images"][0], dst, max_width=max_width, quality=quality)
            item["image_url"] = _image_url_for(item, content_subdir)
        rendered = "\n".join(render_card(env, template_name, item) for item in items)
        page_path = config.ROOT / page_file
        if not page_path.is_file():
            continue
        html = page_path.read_text(encoding="utf-8")
        new_html = replace_section(html, marker_name, rendered)
        if new_html != html:
            page_path.write_text(new_html, encoding="utf-8")

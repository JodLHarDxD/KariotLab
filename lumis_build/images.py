"""Resize source images into the assets/ tree."""
from pathlib import Path
from PIL import Image


def process_image(src: Path, dst: Path, *, max_width: int, quality: int) -> None:
    """Resize src to max_width px wide (no upscale), write JPEG to dst.

    Skips work when dst already exists and is newer than src.
    """
    if dst.is_file() and dst.stat().st_mtime_ns >= src.stat().st_mtime_ns:
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        if w > max_width:
            new_h = round(h * (max_width / w))
            im = im.resize((max_width, new_h), Image.LANCZOS)
        im.save(dst, format="JPEG", quality=quality, optimize=True, progressive=True)

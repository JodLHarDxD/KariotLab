#!/usr/bin/env python
"""Lumis build CLI. See README.md for usage."""
import argparse
import sys

# Ensure UTF-8 output on Windows consoles whose default codepage is cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, Exception):
    pass

from lumis_build.orchestrate import build_all


def cmd_extract() -> int:
    """Extract today's HTML into content/ folders. Run once at cutover."""
    import shutil
    import urllib.request
    import yaml
    from lumis_build import config
    from lumis_build.extractor import extract_team_grid

    contact_html = (config.ROOT / "contact.html").read_text(encoding="utf-8")
    items = extract_team_grid(contact_html)
    out_root = config.CONTENT_DIR / "members"
    out_root.mkdir(parents=True, exist_ok=True)
    for item in items:
        slug_dir = out_root / item["slug"]
        slug_dir.mkdir(parents=True, exist_ok=True)
        (slug_dir / "meta.yml").write_text(
            yaml.safe_dump(item["meta"], allow_unicode=True), encoding="utf-8"
        )
        # Download the existing remote image to portrait.jpg if not already present
        portrait = slug_dir / "portrait.jpg"
        if not portrait.is_file() and item["image_src"].startswith("http"):
            req = urllib.request.Request(
                item["image_src"], headers={"User-Agent": "Mozilla/5.0"}
            )
            with urllib.request.urlopen(req) as r, open(portrait, "wb") as f:
                shutil.copyfileobj(r, f)
        print(f"  ✓ members/{item['slug']}")
    print(f"✓ extracted {len(items)} members")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="build.py", description="Lumis content build")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("build", help="Render content/ into the HTML pages (default).")
    sub.add_parser("extract", help="Populate content/ from today's HTML (run once).")

    args = parser.parse_args(argv)
    cmd = args.cmd or "build"
    if cmd == "build":
        build_all()
        print("✓ build complete")
        return 0
    if cmd == "extract":
        return cmd_extract()
    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())

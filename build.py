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
    """Extract today's HTML into content/ folders. Run once at cutover on original HTML."""
    import shutil
    import urllib.request
    import yaml
    from lumis_build import config
    from lumis_build.extractor import (
        extract_team_grid,
        extract_work_grid,
        extract_journal_grid,
        extract_pricing_tiers,
    )

    sources = [
        ("contact.html",  "members",  "portrait.jpg", extract_team_grid),
        ("work.html",     "work",     "cover.jpg",    extract_work_grid),
        ("journal.html",  "journal",  "cover.jpg",    extract_journal_grid),
        ("pricing.html",  "services", None,           extract_pricing_tiers),
    ]

    def _fetch_or_copy(src_url: str, dst: "Path") -> None:
        if dst.is_file():
            return
        if src_url.startswith("http"):
            req = urllib.request.Request(src_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as r, open(dst, "wb") as f:
                shutil.copyfileobj(r, f)
        else:
            src_path = config.ROOT / src_url.replace("\\", "/")
            if src_path.is_file():
                shutil.copy2(src_path, dst)

    total = 0
    for page_file, subdir, img_name, extractor in sources:
        page_path = config.ROOT / page_file
        raw_html = page_path.read_text(encoding="utf-8")
        items = extractor(raw_html)
        out_root = config.CONTENT_DIR / subdir
        out_root.mkdir(parents=True, exist_ok=True)
        for item in items:
            slug_dir = out_root / item["slug"]
            slug_dir.mkdir(parents=True, exist_ok=True)
            (slug_dir / "meta.yml").write_text(
                yaml.safe_dump(item["meta"], allow_unicode=True, sort_keys=False),
                encoding="utf-8",
            )
            if img_name and item.get("image_src"):
                _fetch_or_copy(item["image_src"], slug_dir / img_name)
            print(f"  ✓ {subdir}/{item['slug']}")
            total += 1
    print(f"✓ extracted {total} items across {len(sources)} sections")
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

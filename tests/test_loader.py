from pathlib import Path
import yaml
from lumis_build.loader import load_section


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_load_section_returns_items_sorted_by_order(tmp_content: Path):
    base = tmp_content / "content" / "members"
    _write(base / "z-second/meta.yml", yaml.safe_dump({"name": "Z", "order": 2}))
    _write(base / "a-first/meta.yml",  yaml.safe_dump({"name": "A", "order": 1}))
    items = load_section(base)
    assert [i["slug"] for i in items] == ["a-first", "z-second"]
    assert items[0]["meta"]["name"] == "A"


def test_load_section_skips_invisible_items(tmp_content: Path):
    base = tmp_content / "content" / "members"
    _write(base / "hidden/meta.yml",  yaml.safe_dump({"name": "H", "visible": False}))
    _write(base / "shown/meta.yml",   yaml.safe_dump({"name": "S"}))
    items = load_section(base)
    assert [i["slug"] for i in items] == ["shown"]


def test_load_section_finds_image_files(tmp_content: Path):
    base = tmp_content / "content" / "members"
    _write(base / "p/meta.yml", yaml.safe_dump({"name": "P"}))
    (base / "p" / "portrait.jpg").write_bytes(b"\xff\xd8\xff\xd9")
    items = load_section(base)
    assert items[0]["images"] == [base / "p" / "portrait.jpg"]


def test_load_section_renders_body_markdown(tmp_content: Path):
    base = tmp_content / "content" / "journal"
    _write(base / "post/meta.yml",  yaml.safe_dump({"title": "T"}))
    _write(base / "post/body.md",   "# Heading\n\nA paragraph.")
    items = load_section(base)
    assert "<h1>Heading</h1>" in items[0]["body_html"]
    assert "<p>A paragraph." in items[0]["body_html"]


def test_load_section_returns_empty_list_for_missing_dir(tmp_path: Path):
    assert load_section(tmp_path / "does-not-exist") == []

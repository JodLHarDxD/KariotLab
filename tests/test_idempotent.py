"""Task 11 — idempotency safety net.

Running build_all() twice must produce byte-identical HTML on the second pass.
This guards against templates emitting extra whitespace, markers drifting, or
image-url logic changing between runs.
"""
from pathlib import Path
from lumis_build import config
from lumis_build.orchestrate import build_all

_REAL_ROOT = Path(__file__).resolve().parents[1]


def test_build_all_is_idempotent(tmp_path: Path, monkeypatch) -> None:
    # Copy the current built HTML pages into tmp so we don't touch the real repo.
    for page_file, _, _, _ in config.SECTIONS:
        src = _REAL_ROOT / page_file
        if src.is_file():
            (tmp_path / page_file).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    # Use real content/ and templates/ but tmp ROOT and assets/
    monkeypatch.setattr(config, "ROOT",          tmp_path)
    monkeypatch.setattr(config, "CONTENT_DIR",   _REAL_ROOT / "content")
    monkeypatch.setattr(config, "ASSETS_DIR",    tmp_path / "assets")
    monkeypatch.setattr(config, "TEMPLATES_DIR", _REAL_ROOT / "templates")

    # First build
    build_all()

    # Capture HTML after first build
    snap: dict[str, str] = {}
    for page_file, _, _, _ in config.SECTIONS:
        p = tmp_path / page_file
        if p.is_file():
            snap[page_file] = p.read_text(encoding="utf-8")

    # Second build — must produce identical output
    build_all()

    for page_file, text1 in snap.items():
        text2 = (tmp_path / page_file).read_text(encoding="utf-8")
        assert text1 == text2, (
            f"{page_file} changed on second build — template produces non-idempotent output"
        )

from pathlib import Path
import shutil
import yaml
from lumis_build import config
from lumis_build.orchestrate import build_all


def test_build_all_replaces_team_grid(tmp_path: Path, monkeypatch, sample_portrait):
    # Stand up a minimal lumis tree under tmp_path
    monkeypatch.setattr(config, "ROOT", tmp_path)
    monkeypatch.setattr(config, "CONTENT_DIR", tmp_path / "content")
    monkeypatch.setattr(config, "ASSETS_DIR",  tmp_path / "assets")
    monkeypatch.setattr(config, "TEMPLATES_DIR", Path(__file__).resolve().parents[1] / "templates")

    # contact.html stub with markers
    (tmp_path / "contact.html").write_text(
        "<html><body>\n"
        "  <!-- LUMIS:BEGIN team-grid -->\n"
        "  <div>placeholder</div>\n"
        "  <!-- LUMIS:END team-grid -->\n"
        "</body></html>\n",
        encoding="utf-8",
    )
    # one member
    member_dir = tmp_path / "content" / "members" / "mara-c"
    member_dir.mkdir(parents=True)
    shutil.copy(sample_portrait, member_dir / "portrait.jpg")
    (member_dir / "meta.yml").write_text(yaml.safe_dump({
        "name": "Mara Castellán",
        "role": "Principal · Strategy",
        "location": "Lisbon",
        "ex_roles": "ex-Wolff Olins",
        "order": 1,
    }), encoding="utf-8")

    build_all(only_sections={"team-grid"})

    out = (tmp_path / "contact.html").read_text(encoding="utf-8")
    assert "Mara <em>Castellán</em>" in out
    assert "// Principal · Strategy" in out
    assert "placeholder" not in out
    # Image was processed
    assert (tmp_path / "assets" / "members" / "mara-c" / "portrait.jpg").is_file()

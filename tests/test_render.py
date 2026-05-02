from pathlib import Path
from lumis_build.render import build_env, render_card

EXPECTED_DIR = Path(__file__).parent / "fixtures" / "expected"


def test_team_card_matches_expected():
    env = build_env(Path(__file__).resolve().parents[1] / "templates")
    item = {
        "slug": "mara",
        "meta": {
            "name": "Mara Castellán",
            "role": "Principal · Strategy",
            "location": "Lisbon",
            "ex_roles": "ex-Wolff Olins, ex-Mother",
        },
        "image_url": "assets/members/mara/portrait.jpg",
    }
    out = render_card(env, "team_card.html.j2", item)
    expected = (EXPECTED_DIR / "team_card.html").read_text(encoding="utf-8").rstrip("\n")
    assert out.rstrip("\n") == expected

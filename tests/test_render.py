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


def test_work_card_matches_expected():
    env = build_env(Path(__file__).resolve().parents[1] / "templates")
    item = {
        "slug": "atelier-vesta",
        "meta": {
            "title": "Atelier Vesta",
            "title_em": "slow beauty, considered.",
            "brief": "Pre-seed · Identity · Packaging system",
            "badge": "D2C · Beauty",
            "case_num": "02",
            "year": 2026,
            "filter": "creative",
            "tags": ["D2C", "Beauty", "Editorial"],
        },
        "image_url": "assets/work/atelier-vesta/cover.jpg",
    }
    out = render_card(env, "work_card.html.j2", item)
    expected = (EXPECTED_DIR / "work_card.html").read_text(encoding="utf-8").rstrip("\n")
    assert out.rstrip("\n") == expected


def test_journal_card_matches_expected():
    env = build_env(Path(__file__).resolve().parents[1] / "templates")
    item = {
        "slug": "brand-systems-in-motion",
        "meta": {
            "title": "Brand systems in the age of motion",
            "category": "Branding",
            "date_display": "Apr 18, 2026",
            "read_time": 12,
            "author": "Marcus Chen",
        },
        "image_url": "assets/journal/brand-systems-in-motion/cover.jpg",
        "author_img_url": "assets/journal/brand-systems-in-motion/author.jpg",
    }
    out = render_card(env, "journal_card.html.j2", item)
    expected = (EXPECTED_DIR / "journal_card.html").read_text(encoding="utf-8").rstrip("\n")
    assert out.rstrip("\n") == expected


def test_pricing_tier_matches_expected():
    env = build_env(Path(__file__).resolve().parents[1] / "templates")
    item = {
        "meta": {
            "name": "Starter",
            "price_prefix": "$",
            "price": 49,
            "price_unit": "/ mo",
            "desc": "Get a real foundation in an afternoon — ideal for solo founders and pre-seed teams.",
            "bullets": [
                "One full brand system: strategy, identity, voice",
                "2 strategic revisions / month",
            ],
            "cta_label": "Start Starter",
            "hero": False,
        },
    }
    out = render_card(env, "pricing_tier.html.j2", item)
    expected = (EXPECTED_DIR / "pricing_tier.html").read_text(encoding="utf-8").rstrip("\n")
    assert out.rstrip("\n") == expected

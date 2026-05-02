"""Single source of truth for all paths, image presets, and marker names."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
ASSETS_DIR = ROOT / "assets"
TEMPLATES_DIR = ROOT / "templates"

# (page_filename, marker_name, content_subdir, template_filename)
SECTIONS = [
    ("contact.html",  "team-grid",     "members",  "team_card.html.j2"),
    ("work.html",     "work-grid",     "work",     "work_card.html.j2"),
    ("journal.html",  "journal-grid",  "journal",  "journal_card.html.j2"),
    ("pricing.html",  "pricing-tiers", "services", "pricing_tier.html.j2"),
]

# (subdir, max_width, jpeg_quality)
IMAGE_PRESETS = {
    "members":  ("portrait", 800,  85),
    "work":     ("cover",    1600, 82),
    "journal":  ("cover",    900,  82),
}

MARKER_BEGIN = "<!-- LUMIS:BEGIN {name} -->"
MARKER_END   = "<!-- LUMIS:END {name} -->"

"""One-shot HTML → content/ extractor. Used at cutover on original HTML."""
import html as _html
import re
import unicodedata


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


def _section_inner(raw_html: str, name: str) -> str:
    pat = re.compile(
        rf"<!-- LUMIS:BEGIN {re.escape(name)} -->(.*?)<!-- LUMIS:END {re.escape(name)} -->",
        re.DOTALL,
    )
    m = pat.search(raw_html)
    return m.group(1) if m else ""


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s)


# ── Team ────────────────────────────────────────────────────────────────────

_PERSON_PAT = re.compile(
    r'<div class="person">\s*'
    r'<div class="ph"><img src="(?P<src>[^"]+)"[^>]*/></div>\s*'
    r'<div class="meta">\s*'
    r'<div class="name">(?P<first>[^<]+)\s*<em>(?P<last>[^<]+)</em></div>\s*'
    r'<div class="role">//\s*(?P<role>[^<]+)</div>\s*'
    r'<div class="city">(?P<city>[^<]+)</div>',
    re.DOTALL,
)


def extract_team_grid(raw_html: str) -> list[dict]:
    inner = _section_inner(raw_html, "team-grid")
    items: list[dict] = []
    for i, m in enumerate(_PERSON_PAT.finditer(inner), start=1):
        name = f"{m['first'].strip()} {m['last'].strip()}"
        city_parts = m["city"].split(" · ", 1)
        location = city_parts[0].strip()
        ex_roles = city_parts[1].strip() if len(city_parts) > 1 else ""
        items.append({
            "slug": _slugify(name),
            "meta": {
                "name": name,
                "role": m["role"].strip(),
                "location": location,
                "ex_roles": ex_roles,
                "order": i,
            },
            "image_src": m["src"].strip(),
        })
    return items


# ── Work ────────────────────────────────────────────────────────────────────
# Parses the original hand-authored work.html (before first build).
# href is "case-study.html" (no slug) — slug derives from h3 brand name.

_WORK_PAT = re.compile(
    r'<a href="[^"]*"\s+class="case[^"]*"\s+data-f="(?P<filter>[^"]+)"[^>]*>\s*'
    r'<div class="ph">\s*'
    r'<img src="(?P<img>[^"]+)"[^>]*/>\s*'
    r'<div class="vignette"></div>\s*'
    r'<div class="stamp">\s*(?P<stamp_html>.*?)</div>\s*'
    r'</div>\s*'
    r'<div class="meta-row">'
    r'<span class="num">(?P<num_text>[^<]+)</span>'
    r'<span class="year">(?P<year_text>[^<]+)</span>'
    r'</div>\s*'
    r'<h3>(?P<h3_html>.*?)</h3>\s*'
    r'<p class="brief">(?P<brief>[^<]+)</p>\s*'
    r'<div class="tagline">(?P<tags_html>.*?)</div>',
    re.DOTALL,
)
_BADGE_PAT = re.compile(r'<span class="badge[^"]*">([^<]+)</span>')
_TAG_PAT = re.compile(r'<span class="t">([^<]+)</span>')


def extract_work_grid(raw_html: str) -> list[dict]:
    inner = _section_inner(raw_html, "work-grid")
    items: list[dict] = []
    for m in _WORK_PAT.finditer(inner):
        # Brand name + tagline from h3 text
        h3_text = _strip_tags(m["h3_html"]).strip()
        parts = h3_text.split(" — ", 1)  # em-dash
        if len(parts) == 1:
            parts = h3_text.split(" - ", 1)   # fallback hyphen
        title = parts[0].strip()
        title_em = parts[1].strip() if len(parts) > 1 else ""

        # Case number (first integer in num_text like "// case 01 · 2026")
        num_m = re.search(r"(\d+)", m["num_text"])
        num = int(num_m.group(1)) if num_m else len(items) + 1

        # Year: try year_text first, then num_text
        year_m = re.search(r"(\d{4})", m["year_text"])
        if not year_m:
            year_m = re.search(r"(\d{4})", m["num_text"])
        year = int(year_m.group(1)) if year_m else 0

        # First badge only
        badge_m = _BADGE_PAT.search(m["stamp_html"])
        badge = badge_m.group(1).strip() if badge_m else ""

        tags = _TAG_PAT.findall(m["tags_html"])
        items.append({
            "slug": _slugify(title),
            "meta": {
                "title": title,
                "title_em": title_em,
                "brief": _html.unescape(m["brief"].strip()),
                "badge": badge,
                "case_num": f"{num:02d}",
                "year": year,
                "filter": m["filter"].strip(),
                "tags": tags,
                "order": num,
            },
            "image_src": m["img"].strip(),
        })
    return items


# ── Journal ──────────────────────────────────────────────────────────────────
# Parses the original hand-authored journal.html (thumb/body structure,
# before first build which converts it to ph/meta/byline structure).

_JOURNAL_PAT = re.compile(
    r'<a href="[^"]*"\s+class="article[^"]*"[^>]*>\s*'
    r'<div class="thumb">\s*'
    r'<img src="(?P<img>[^"]+)"[^>]*/>\s*'
    r'<span class="cat-badge">(?P<cat>[^<]+)</span>\s*'
    r'</div>\s*'
    r'<div class="body">\s*'
    r'<div class="row">\s*'
    r'<span class="date">(?P<date>[^<]+)</span>\s*'
    r'<span class="rt">(?P<rt>[^<]+)</span>\s*'
    r'</div>\s*'
    r'<h3>(?P<h3_html>.*?)</h3>\s*'
    r'<p class="excerpt">[^<]*</p>\s*'
    r'<div class="author-row">\s*'
    r'<div class="ava"><img[^>]*/></div>\s*'
    r'<span class="an">(?P<author>[^<]+)</span>',
    re.DOTALL,
)


def extract_journal_grid(raw_html: str) -> list[dict]:
    inner = _section_inner(raw_html, "journal-grid")
    items: list[dict] = []
    for i, m in enumerate(_JOURNAL_PAT.finditer(inner), start=1):
        title = _html.unescape(_strip_tags(m["h3_html"]).strip())
        rt_m = re.search(r"\d+", m["rt"])
        items.append({
            "slug": _slugify(title),
            "meta": {
                "title": title,
                "category": m["cat"].strip(),
                "date_display": m["date"].strip(),
                "read_time": int(rt_m.group()) if rt_m else 5,
                "author": m["author"].strip(),
                "order": i,
            },
            "image_src": m["img"].strip(),
        })
    return items


# ── Pricing ──────────────────────────────────────────────────────────────────

_PRICING_PAT = re.compile(
    r'<div class="tier(?P<hero> hero-tier)?[^"]*">\s*'
    r'(?:<span class="badge">(?P<badge>[^<]+)</span>\s*)?'
    r'<span class="name">(?P<name>[^<]+)</span>\s*'
    r'<div>\s*'
    r'<span class="price">(?P<prefix>[^<]*)<span class="ital"[^>]*>(?P<price>[^<]+)</span>'
    r'(?:<span class="unit">(?P<unit>[^<]+)</span>)?</span>\s*'
    r'<p class="desc">(?P<desc>[^<]+)</p>\s*'
    r'</div>\s*'
    r'<ul>(?P<bullets_html>.*?)</ul>\s*'
    r'<a href="[^"]*" class="cta-tier">(?P<cta>[^<]+)</a>',
    re.DOTALL,
)
_BULLET_PAT = re.compile(r'<span>([^<]+)</span>\s*</li>')


def extract_pricing_tiers(raw_html: str) -> list[dict]:
    inner = _section_inner(raw_html, "pricing-tiers")
    items: list[dict] = []
    for i, m in enumerate(_PRICING_PAT.finditer(inner), start=1):
        bullets = _BULLET_PAT.findall(m["bullets_html"])
        # Extract data-monthly / data-yearly from price span if present
        data_m = re.search(
            r'data-monthly="(\d+)"\s+data-yearly="(\d+)"',
            m["bullets_html"] or "",
        )
        # The attributes are on the .ital span, so search in the match context
        ital_span = re.search(
            r'<span class="ital"([^>]*)>',
            m.group(0),
        )
        price_data: dict | None = None
        if ital_span:
            dm = re.search(r'data-monthly="(\d+)"', ital_span.group(1))
            dy = re.search(r'data-yearly="(\d+)"', ital_span.group(1))
            if dm and dy:
                price_data = {"monthly": int(dm.group(1)), "yearly": int(dy.group(1))}
        items.append({
            "slug": _slugify(m["name"].strip()),
            "meta": {
                "name": m["name"].strip(),
                "hero": bool(m["hero"]),
                "badge": m["badge"].strip() if m["badge"] else None,
                "price_prefix": m["prefix"].strip(),
                "price": m["price"].strip(),
                "price_unit": m["unit"].strip() if m["unit"] else "",
                "desc": m["desc"].strip(),
                "bullets": bullets,
                "cta_label": m["cta"].strip(),
                "price_data": price_data,
                "order": i,
            },
            "image_src": None,
        })
    return items

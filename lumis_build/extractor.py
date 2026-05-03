"""One-shot HTML → content/ extractor. Used at cutover."""
import re
import unicodedata


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


def _section_inner(html: str, name: str) -> str:
    pat = re.compile(
        rf"<!-- LUMIS:BEGIN {re.escape(name)} -->(.*?)<!-- LUMIS:END {re.escape(name)} -->",
        re.DOTALL,
    )
    m = pat.search(html)
    return m.group(1) if m else ""


_PERSON_PAT = re.compile(
    r'<div class="person">\s*'
    r'<div class="ph"><img src="(?P<src>[^"]+)"[^>]*/></div>\s*'
    r'<div class="meta">\s*'
    r'<div class="name">(?P<first>[^<]+)\s*<em>(?P<last>[^<]+)</em></div>\s*'
    r'<div class="role">//\s*(?P<role>[^<]+)</div>\s*'
    r'<div class="city">(?P<city>[^<]+)</div>',
    re.DOTALL,
)


def extract_team_grid(html: str) -> list[dict]:
    inner = _section_inner(html, "team-grid")
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

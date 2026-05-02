# Lumis — Drop-folder Content System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A non-technical contributor can drop an image and a short YAML file into `content/<type>/<slug>/`, run `python build.py`, and see a new card appear on the live site in the right section, sized and styled identically to existing cards.

**Architecture:** Author-time build script. Static HTML files keep their hand-tuned structure but expose `<!-- LUMIS:BEGIN section -->` / `<!-- LUMIS:END section -->` markers around the regions that come from `content/`. `build.py` reads YAML + images from `content/`, resizes images into `assets/`, renders each region from a Jinja2 template, and writes back into the HTML in place. Per-slug "detail" pages (`case-study.html`, `journal-article.html`) get one rendered HTML file per slug. Output is byte-stable: re-running the build with no content change produces zero diff.

**Tech Stack:** Python 3.10+, Jinja2 (templating), PyYAML (front matter), Pillow (image resize), markdown-it-py (long-form bodies), watchdog (optional `--watch`). All pinned in `requirements.txt`. No web server; the site stays static.

> **Scope note.** This plan covers item 4 from the design spec only. The chatbot (item 5) is a separate plan — it will consume `content_index.json` produced here. Steps below take the codebase from "8 hand-edited HTML files" to "8 HTML files + content/ + build.py" without changing the live look of the site.

---

## File Structure

| Path | Created / Modified | Responsibility |
|---|---|---|
| `requirements.txt` | Create | Pin Python deps |
| `build.py` | Create | CLI entry — `extract`, `build`, `--watch` |
| `lumis_build/__init__.py` | Create | Package marker |
| `lumis_build/config.py` | Create | All paths, marker names, image presets in one place |
| `lumis_build/loader.py` | Create | Walk `content/`, parse meta.yml + body.md |
| `lumis_build/images.py` | Create | Resize source images into `assets/` |
| `lumis_build/render.py` | Create | Jinja2 environment + per-section render functions |
| `lumis_build/markers.py` | Create | Find/replace `LUMIS:BEGIN/END` blocks in HTML files |
| `lumis_build/extractor.py` | Create | One-shot: parse current HTML → write `content/` |
| `lumis_build/index.py` | Create | Emit `content_index.json` for downstream chatbot |
| `lumis_build/watcher.py` | Create | watchdog wrapper for `--watch` |
| `templates/work_card.html.j2` | Create | One `<a class="case">` block |
| `templates/team_card.html.j2` | Create | One `<div class="person">` block |
| `templates/journal_card.html.j2` | Create | One `<a class="article">` block |
| `templates/pricing_tier.html.j2` | Create | One `<div class="tier">` block |
| `templates/case_study_page.html.j2` | Create | Full per-slug page wrapper |
| `templates/journal_article_page.html.j2` | Create | Full per-slug page wrapper |
| `tests/conftest.py` | Create | Shared fixtures (tmp content dir, sample image) |
| `tests/test_loader.py` | Create | Unit tests for content loader |
| `tests/test_markers.py` | Create | Unit tests for marker find/replace |
| `tests/test_render.py` | Create | Snapshot tests for each card template |
| `tests/test_extractor.py` | Create | Round-trip: extract then build → byte-identical |
| `tests/test_build_idempotent.py` | Create | Build twice, no diff |
| `tests/fixtures/sample-portrait.jpg` | Create | 800×800 test image |
| `tests/fixtures/sample-cover.jpg` | Create | 2400×1600 test image |
| `tests/fixtures/expected/team_card.html` | Create | Frozen expected output |
| `tests/fixtures/expected/work_card.html` | Create | Frozen expected output |
| `contact.html` | Modify | Wrap `.meet-grid` children in `LUMIS:BEGIN/END team-grid` markers |
| `work.html` | Modify | Wrap `.case` grid children in `LUMIS:BEGIN/END work-grid` markers |
| `journal.html` | Modify | Wrap article grid children in `LUMIS:BEGIN/END journal-grid` markers |
| `pricing.html` | Modify | Wrap `.pricing-grid .tier` children in `LUMIS:BEGIN/END pricing-tiers` markers |
| `.gitignore` | Create | Ignore `assets/`, `__pycache__/`, `.pytest_cache/`, `.venv/` |
| `README.md` (project root) | Create | One-page guide for contributors: "how do I add a new member?" |

**Why this split:** loader / images / render / markers each have one job and a small surface. Tests target one module at a time. The two extractor and watch modules are each only used by one CLI subcommand and are isolated so the core build path stays small.

---

## Task 1: Project scaffolding

**Files:**
- Create: `D:/Agentic-v4/output/lumis/requirements.txt`
- Create: `D:/Agentic-v4/output/lumis/.gitignore`
- Create: `D:/Agentic-v4/output/lumis/lumis_build/__init__.py`
- Create: `D:/Agentic-v4/output/lumis/lumis_build/config.py`
- Create: `D:/Agentic-v4/output/lumis/tests/conftest.py`

- [ ] **Step 1: Create the venv and pin deps**

Create `requirements.txt`:

```
Jinja2==3.1.4
PyYAML==6.0.2
Pillow==10.4.0
markdown-it-py==3.0.0
watchdog==4.0.2
pytest==8.3.3
```

Run:

```bash
cd D:/Agentic-v4/output/lumis
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

Expected: all 6 packages install with no errors.

- [ ] **Step 2: Create `.gitignore`**

```
.venv/
__pycache__/
.pytest_cache/
assets/
*.pyc
.DS_Store
```

- [ ] **Step 3: Create the package and config module**

Create `lumis_build/__init__.py` with one line:

```python
__version__ = "0.1.0"
```

Create `lumis_build/config.py`:

```python
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
```

- [ ] **Step 4: Create the shared test fixture module**

Create `tests/conftest.py`:

```python
"""Shared pytest fixtures."""
from pathlib import Path
import shutil
import pytest


@pytest.fixture
def tmp_content(tmp_path: Path) -> Path:
    """Empty content/ + assets/ + templates/ tree under a temp root."""
    (tmp_path / "content").mkdir()
    (tmp_path / "assets").mkdir()
    (tmp_path / "templates").mkdir()
    return tmp_path


@pytest.fixture
def sample_portrait(tmp_path: Path) -> Path:
    src = Path(__file__).parent / "fixtures" / "sample-portrait.jpg"
    dst = tmp_path / "sample-portrait.jpg"
    shutil.copy(src, dst)
    return dst


@pytest.fixture
def sample_cover(tmp_path: Path) -> Path:
    src = Path(__file__).parent / "fixtures" / "sample-cover.jpg"
    dst = tmp_path / "sample-cover.jpg"
    shutil.copy(src, dst)
    return dst
```

- [ ] **Step 5: Create the two test fixture images**

Run from `D:/Agentic-v4/output/lumis`:

```bash
.venv/Scripts/python -c "
from PIL import Image
import os
os.makedirs('tests/fixtures', exist_ok=True)
Image.new('RGB', (800, 800), (200, 100, 80)).save('tests/fixtures/sample-portrait.jpg', quality=90)
Image.new('RGB', (2400, 1600), (60, 80, 200)).save('tests/fixtures/sample-cover.jpg', quality=90)
print('wrote 2 fixture images')
"
```

Expected: `wrote 2 fixture images`. Two files exist on disk.

- [ ] **Step 6: Verify pytest discovers the empty test tree**

Run:

```bash
.venv/Scripts/pytest -q
```

Expected: `no tests ran` (zero tests, zero failures).

- [ ] **Step 7: Commit**

```bash
git add requirements.txt .gitignore lumis_build/ tests/
git commit -m "chore(build): scaffold lumis_build package + test fixtures"
```

---

## Task 2: Content loader

Loader walks `content/<type>/<slug>/`, returns a list of dicts. Each dict carries: `slug`, `meta` (parsed YAML), `body_html` (rendered markdown or `""`), and a list of source image paths it found in the slug folder.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/loader.py`
- Test: `D:/Agentic-v4/output/lumis/tests/test_loader.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_loader.py`:

```python
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
```

- [ ] **Step 2: Run the tests, expect failure**

Run:

```bash
.venv/Scripts/pytest tests/test_loader.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.loader'`.

- [ ] **Step 3: Implement the loader**

Create `lumis_build/loader.py`:

```python
"""Walk content/<type>/<slug>/ and return a sorted list of item dicts."""
from pathlib import Path
from typing import Any
import yaml
from markdown_it import MarkdownIt

_md = MarkdownIt("commonmark")
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def load_section(section_dir: Path) -> list[dict[str, Any]]:
    if not section_dir.is_dir():
        return []
    items: list[dict[str, Any]] = []
    for slug_dir in sorted(p for p in section_dir.iterdir() if p.is_dir()):
        meta_path = slug_dir / "meta.yml"
        if not meta_path.is_file():
            continue
        meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
        if meta.get("visible") is False:
            continue
        body_path = slug_dir / "body.md"
        body_html = _md.render(body_path.read_text(encoding="utf-8")) if body_path.is_file() else ""
        images = sorted(
            p for p in slug_dir.iterdir()
            if p.is_file() and p.suffix.lower() in _IMAGE_EXTS
        )
        items.append({
            "slug": slug_dir.name,
            "meta": meta,
            "body_html": body_html,
            "images": images,
        })
    items.sort(key=lambda i: (i["meta"].get("order", 9999), i["slug"]))
    return items
```

- [ ] **Step 4: Run the tests, expect pass**

Run:

```bash
.venv/Scripts/pytest tests/test_loader.py -q
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add lumis_build/loader.py tests/test_loader.py
git commit -m "feat(build): content loader for sections"
```

---

## Task 3: Image pipeline

Resize source images into `assets/<type>/<slug>/<preset>.jpg`. Skip work when source mtime is older than destination mtime, so re-runs are fast and idempotent.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/images.py`
- Test: `D:/Agentic-v4/output/lumis/tests/test_images.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_images.py`:

```python
from pathlib import Path
from PIL import Image
from lumis_build.images import process_image


def test_process_image_resizes_to_max_width(tmp_path: Path, sample_cover: Path):
    out = tmp_path / "out" / "cover.jpg"
    process_image(sample_cover, out, max_width=800, quality=80)
    assert out.is_file()
    with Image.open(out) as im:
        assert im.size[0] == 800
        assert im.size[1] == int(800 * (1600 / 2400))


def test_process_image_does_not_upscale(tmp_path: Path, sample_portrait: Path):
    # source is 800x800; ask for 2000
    out = tmp_path / "out" / "p.jpg"
    process_image(sample_portrait, out, max_width=2000, quality=80)
    with Image.open(out) as im:
        assert im.size == (800, 800)


def test_process_image_skips_when_destination_newer(tmp_path: Path, sample_portrait: Path):
    out = tmp_path / "out" / "p.jpg"
    process_image(sample_portrait, out, max_width=400, quality=80)
    first_mtime = out.stat().st_mtime_ns
    # call again — should be a no-op
    process_image(sample_portrait, out, max_width=400, quality=80)
    assert out.stat().st_mtime_ns == first_mtime


def test_process_image_redoes_when_source_changes(tmp_path: Path, sample_portrait: Path):
    out = tmp_path / "out" / "p.jpg"
    process_image(sample_portrait, out, max_width=400, quality=80)
    first_mtime = out.stat().st_mtime_ns
    # touch source forward in time
    import os, time
    time.sleep(0.05)
    os.utime(sample_portrait, None)
    process_image(sample_portrait, out, max_width=400, quality=80)
    assert out.stat().st_mtime_ns > first_mtime
```

- [ ] **Step 2: Run the tests, expect failure**

```bash
.venv/Scripts/pytest tests/test_images.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.images'`.

- [ ] **Step 3: Implement the image pipeline**

Create `lumis_build/images.py`:

```python
"""Resize source images into the assets/ tree."""
from pathlib import Path
from PIL import Image


def process_image(src: Path, dst: Path, *, max_width: int, quality: int) -> None:
    """Resize src to max_width px wide (no upscale), write JPEG to dst.

    Skips work when dst already exists and is newer than src.
    """
    if dst.is_file() and dst.stat().st_mtime_ns >= src.stat().st_mtime_ns:
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        if w > max_width:
            new_h = round(h * (max_width / w))
            im = im.resize((max_width, new_h), Image.LANCZOS)
        im.save(dst, format="JPEG", quality=quality, optimize=True, progressive=True)
```

- [ ] **Step 4: Run the tests, expect pass**

```bash
.venv/Scripts/pytest tests/test_images.py -q
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add lumis_build/images.py tests/test_images.py
git commit -m "feat(build): idempotent image pipeline"
```

---

## Task 4: Marker find / replace

Round-trips an HTML file: find `<!-- LUMIS:BEGIN name --> … <!-- LUMIS:END name -->`, replace the body, write back. Preserves indentation of the BEGIN line so generated content lines up with the surrounding markup.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/markers.py`
- Test: `D:/Agentic-v4/output/lumis/tests/test_markers.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_markers.py`:

```python
from lumis_build.markers import replace_section


def test_replace_between_markers():
    html = (
        "<head>\n  <!-- LUMIS:BEGIN team -->\n"
        "  <div>old</div>\n"
        "  <!-- LUMIS:END team -->\n</head>\n"
    )
    out = replace_section(html, "team", "<div>new</div>")
    assert "<div>new</div>" in out
    assert "<div>old</div>" not in out
    # markers preserved
    assert "LUMIS:BEGIN team" in out
    assert "LUMIS:END team" in out


def test_replace_preserves_indentation():
    html = (
        "    <!-- LUMIS:BEGIN team -->\n"
        "    <div>old</div>\n"
        "    <!-- LUMIS:END team -->\n"
    )
    out = replace_section(html, "team", "<div>a</div>\n<div>b</div>")
    assert "    <div>a</div>" in out
    assert "    <div>b</div>" in out


def test_replace_other_sections_left_alone():
    html = (
        "<!-- LUMIS:BEGIN a -->\nA\n<!-- LUMIS:END a -->\n"
        "<!-- LUMIS:BEGIN b -->\nB\n<!-- LUMIS:END b -->\n"
    )
    out = replace_section(html, "a", "AA")
    assert "AA" in out
    assert "B\n<!-- LUMIS:END b -->" in out


def test_missing_marker_raises():
    import pytest
    with pytest.raises(ValueError, match="marker"):
        replace_section("no markers here", "team", "x")


def test_replace_is_idempotent():
    html = "<!-- LUMIS:BEGIN x -->\nold\n<!-- LUMIS:END x -->\n"
    once  = replace_section(html, "x", "new\nnew")
    twice = replace_section(once, "x", "new\nnew")
    assert once == twice
```

- [ ] **Step 2: Run the tests, expect failure**

```bash
.venv/Scripts/pytest tests/test_markers.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.markers'`.

- [ ] **Step 3: Implement marker replace**

Create `lumis_build/markers.py`:

```python
"""Replace content between paired LUMIS:BEGIN/END HTML comment markers."""
import re


def replace_section(html: str, name: str, new_inner: str) -> str:
    """Replace the lines between BEGIN and END markers for `name`.

    Indents `new_inner` to match the indentation of the BEGIN line so the
    generated output lines up with the surrounding hand-tuned markup.
    Raises ValueError if either marker is missing.
    """
    begin_pat = re.compile(
        rf"^([ \t]*)<!-- LUMIS:BEGIN {re.escape(name)} -->\s*$",
        re.MULTILINE,
    )
    end_pat = re.compile(
        rf"^[ \t]*<!-- LUMIS:END {re.escape(name)} -->\s*$",
        re.MULTILINE,
    )
    bm = begin_pat.search(html)
    em = end_pat.search(html, pos=bm.end()) if bm else None
    if not bm or not em:
        raise ValueError(f"marker pair LUMIS:BEGIN/END {name} not found")
    indent = bm.group(1)
    indented = "\n".join(indent + line if line else line for line in new_inner.splitlines())
    return html[:bm.end()] + "\n" + indented + "\n" + html[em.start():]
```

- [ ] **Step 4: Run the tests, expect pass**

```bash
.venv/Scripts/pytest tests/test_markers.py -q
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add lumis_build/markers.py tests/test_markers.py
git commit -m "feat(build): marker-based section replace"
```

---

## Task 5: Templates and renderer (team card first)

Build the smallest end-to-end render slice: template for team cards + a `render_section` function. Other section templates land in Tasks 6–8 once this slice is proven.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/templates/team_card.html.j2`
- Create: `D:/Agentic-v4/output/lumis/lumis_build/render.py`
- Create: `D:/Agentic-v4/output/lumis/tests/test_render.py`
- Create: `D:/Agentic-v4/output/lumis/tests/fixtures/expected/team_card.html`

- [ ] **Step 1: Create the team card template**

Create `templates/team_card.html.j2`:

```jinja
{# Renders one .person card for contact.html .meet-grid #}
{# Inputs: item.slug, item.meta {name, role, location, ex_roles}, item.image_url #}
<div class="person">
  <div class="ph"><img src="{{ item.image_url }}" alt="{{ item.meta.name }}" /></div>
  <div class="meta">
    <div class="name">{{ item.meta.name.split(' ', 1)[0] }} <em>{{ item.meta.name.split(' ', 1)[1] if ' ' in item.meta.name else '' }}</em></div>
    <div class="role">// {{ item.meta.role }}</div>
    <div class="city">{{ item.meta.location }}{% if item.meta.ex_roles %} · {{ item.meta.ex_roles }}{% endif %}</div>
  </div>
</div>
```

- [ ] **Step 2: Capture expected fixture**

Create `tests/fixtures/expected/team_card.html` with the EXACT bytes a known input should produce. Type this content (no trailing newline):

```
<div class="person">
  <div class="ph"><img src="assets/members/mara/portrait.jpg" alt="Mara Castellán" /></div>
  <div class="meta">
    <div class="name">Mara <em>Castellán</em></div>
    <div class="role">// Principal · Strategy</div>
    <div class="city">Lisbon · ex-Wolff Olins, ex-Mother</div>
  </div>
</div>
```

- [ ] **Step 3: Write the failing test**

Create `tests/test_render.py`:

```python
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
```

- [ ] **Step 4: Run the test, expect failure**

```bash
.venv/Scripts/pytest tests/test_render.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.render'`.

- [ ] **Step 5: Implement the renderer**

Create `lumis_build/render.py`:

```python
"""Jinja2 environment + per-card render helper."""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape


def build_env(templates_dir: Path) -> Environment:
    return Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html", "j2"]),
        trim_blocks=False,
        lstrip_blocks=False,
        keep_trailing_newline=False,
    )


def render_card(env: Environment, template_name: str, item: dict) -> str:
    return env.get_template(template_name).render(item=item)
```

- [ ] **Step 6: Run the test, expect pass**

```bash
.venv/Scripts/pytest tests/test_render.py -q
```

Expected: `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add templates/ lumis_build/render.py tests/test_render.py tests/fixtures/expected/
git commit -m "feat(build): jinja env + team card template"
```

---

## Task 6: Remaining card templates (work, journal, pricing)

Three more card templates and three matching snapshot tests, all built from the patterns the existing HTML uses.

**Files:**
- Create: `templates/work_card.html.j2`
- Create: `templates/journal_card.html.j2`
- Create: `templates/pricing_tier.html.j2`
- Create: `tests/fixtures/expected/work_card.html`
- Create: `tests/fixtures/expected/journal_card.html`
- Create: `tests/fixtures/expected/pricing_tier.html`
- Modify: `tests/test_render.py` (add three tests)

- [ ] **Step 1: Capture expected output for `work_card.html`**

Create `tests/fixtures/expected/work_card.html`:

```
<a href="case-study.html?slug=atelier-vesta" class="case" data-f="creative">
  <div class="ph">
    <img src="assets/work/atelier-vesta/cover.jpg" alt="Atelier Vesta — slow beauty, considered." />
    <div class="vignette"></div>
    <div class="stamp"><span class="badge">D2C · Beauty</span></div>
  </div>
  <div class="meta-row"><span class="num">// case 02</span><span class="year">2026</span></div>
  <h3>Atelier <em>Vesta</em> — slow beauty, considered.</h3>
  <p class="brief">Pre-seed · Identity · Packaging system</p>
  <div class="tagline"><span class="t">D2C</span><span class="t">Beauty</span><span class="t">Editorial</span></div>
</a>
```

- [ ] **Step 2: Create the `work_card.html.j2` template**

```jinja
{# Inputs: item.slug, item.meta {title, title_em, brief, badge, case_num, year, filter, tags[]}, item.image_url #}
<a href="case-study.html?slug={{ item.slug }}" class="case" data-f="{{ item.meta.filter }}">
  <div class="ph">
    <img src="{{ item.image_url }}" alt="{{ item.meta.title }}{% if item.meta.title_em %} — {{ item.meta.title_em }}{% endif %}" />
    <div class="vignette"></div>
    <div class="stamp"><span class="badge">{{ item.meta.badge }}</span></div>
  </div>
  <div class="meta-row"><span class="num">// case {{ item.meta.case_num }}</span><span class="year">{{ item.meta.year }}</span></div>
  <h3>{{ item.meta.title.split(' ', 1)[0] }} <em>{{ item.meta.title.split(' ', 1)[1] if ' ' in item.meta.title else '' }}</em>{% if item.meta.title_em %} — {{ item.meta.title_em }}{% endif %}</h3>
  <p class="brief">{{ item.meta.brief }}</p>
  <div class="tagline">{% for t in item.meta.tags %}<span class="t">{{ t }}</span>{% endfor %}</div>
</a>
```

- [ ] **Step 3: Capture expected output for `journal_card.html`**

Create `tests/fixtures/expected/journal_card.html`:

```
<a href="journal/brand-systems-in-motion.html" class="article">
  <div class="ph"><img src="assets/journal/brand-systems-in-motion/cover.jpg" alt="Brand systems in the age of motion" loading="lazy" /></div>
  <div class="meta">
    <span class="cat">Branding</span>
    <span class="dot">·</span>
    <span class="date">Apr 18, 2026</span>
    <span class="dot">·</span>
    <span class="read">12 min read</span>
  </div>
  <h3>Brand systems in the age of motion</h3>
  <div class="byline">
    <div class="ava"><img src="assets/journal/brand-systems-in-motion/author.jpg" alt="Marcus Chen" /></div>
    <span>Marcus Chen</span>
  </div>
</a>
```

- [ ] **Step 4: Create `journal_card.html.j2`**

```jinja
{# Inputs: item.slug, item.meta {title, category, date_display, read_time, author, author_img}, item.image_url #}
<a href="journal/{{ item.slug }}.html" class="article">
  <div class="ph"><img src="{{ item.image_url }}" alt="{{ item.meta.title }}" loading="lazy" /></div>
  <div class="meta">
    <span class="cat">{{ item.meta.category }}</span>
    <span class="dot">·</span>
    <span class="date">{{ item.meta.date_display }}</span>
    <span class="dot">·</span>
    <span class="read">{{ item.meta.read_time }} min read</span>
  </div>
  <h3>{{ item.meta.title }}</h3>
  <div class="byline">
    <div class="ava"><img src="{{ item.author_img_url }}" alt="{{ item.meta.author }}" /></div>
    <span>{{ item.meta.author }}</span>
  </div>
</a>
```

- [ ] **Step 5: Capture expected output for `pricing_tier.html`**

Create `tests/fixtures/expected/pricing_tier.html`:

```
<div class="tier reveal">
  <span class="name">Starter</span>
  <div>
    <span class="price">$<span class="ital">49</span><span class="unit">/ mo</span></span>
    <p class="desc">Get a real foundation in an afternoon — ideal for solo founders and pre-seed teams.</p>
  </div>
  <ul>
    <li><span class="check">→</span><span>One full brand system: strategy, identity, voice</span></li>
    <li><span class="check">→</span><span>2 strategic revisions / month</span></li>
  </ul>
  <a href="contact.html" class="cta-tier">Start Starter</a>
</div>
```

- [ ] **Step 6: Create `pricing_tier.html.j2`**

```jinja
{# Inputs: item.meta {name, price, price_unit, desc, bullets[], cta_label, hero (bool), badge?} #}
<div class="tier{% if item.meta.hero %} hero-tier{% endif %} reveal">
  {% if item.meta.badge %}<span class="badge">{{ item.meta.badge }}</span>{% endif %}
  <span class="name">{{ item.meta.name }}</span>
  <div>
    <span class="price">{% if item.meta.price_prefix %}{{ item.meta.price_prefix }}{% endif %}<span class="ital">{{ item.meta.price }}</span>{% if item.meta.price_unit %}<span class="unit">{{ item.meta.price_unit }}</span>{% endif %}</span>
    <p class="desc">{{ item.meta.desc }}</p>
  </div>
  <ul>
    {% for b in item.meta.bullets %}<li><span class="check">→</span><span>{{ b }}</span></li>
    {% endfor %}</ul>
  <a href="contact.html" class="cta-tier">{{ item.meta.cta_label }}</a>
</div>
```

- [ ] **Step 7: Add three snapshot tests**

Append to `tests/test_render.py`:

```python
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
```

- [ ] **Step 8: Run the tests, expect pass**

```bash
.venv/Scripts/pytest tests/test_render.py -q
```

Expected: `4 passed`.

- [ ] **Step 9: Commit**

```bash
git add templates/ tests/
git commit -m "feat(build): work, journal, and pricing templates"
```

---

## Task 7: Wire it all together — the `build` subcommand

Stitch loader → image pipeline → renderer → marker replace into one orchestration function. Add the `build` CLI.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/orchestrate.py`
- Create: `D:/Agentic-v4/output/lumis/build.py`
- Create: `D:/Agentic-v4/output/lumis/tests/test_orchestrate.py`

- [ ] **Step 1: Write the failing orchestration test**

Create `tests/test_orchestrate.py`:

```python
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
```

- [ ] **Step 2: Run the test, expect failure**

```bash
.venv/Scripts/pytest tests/test_orchestrate.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.orchestrate'`.

- [ ] **Step 3: Implement orchestration**

Create `lumis_build/orchestrate.py`:

```python
"""Run the full build: content → images → render → marker replace."""
from pathlib import Path
from typing import Iterable
from . import config
from .loader import load_section
from .images import process_image
from .render import build_env, render_card
from .markers import replace_section


def _image_url_for(item: dict, content_subdir: str) -> str:
    """Pick the first image, return its rebased assets/ URL."""
    if not item["images"]:
        return ""
    src = item["images"][0]
    preset_name, _, _ = config.IMAGE_PRESETS.get(content_subdir, ("image", 1600, 82))
    return f"assets/{content_subdir}/{item['slug']}/{preset_name}.jpg"


def build_all(only_sections: Iterable[str] | None = None) -> None:
    env = build_env(config.TEMPLATES_DIR)
    for page_file, marker_name, content_subdir, template_name in config.SECTIONS:
        if only_sections is not None and marker_name not in only_sections:
            continue
        section_dir = config.CONTENT_DIR / content_subdir
        items = load_section(section_dir)
        # Resize each item's primary image
        for item in items:
            if not item["images"]:
                continue
            preset = config.IMAGE_PRESETS.get(content_subdir)
            if not preset:
                continue
            preset_name, max_width, quality = preset
            dst = config.ASSETS_DIR / content_subdir / item["slug"] / f"{preset_name}.jpg"
            process_image(item["images"][0], dst, max_width=max_width, quality=quality)
            item["image_url"] = _image_url_for(item, content_subdir)
        rendered = "\n".join(render_card(env, template_name, item) for item in items)
        page_path = config.ROOT / page_file
        if not page_path.is_file():
            continue
        html = page_path.read_text(encoding="utf-8")
        new_html = replace_section(html, marker_name, rendered)
        if new_html != html:
            page_path.write_text(new_html, encoding="utf-8")
```

- [ ] **Step 4: Run the test, expect pass**

```bash
.venv/Scripts/pytest tests/test_orchestrate.py -q
```

Expected: `1 passed`.

- [ ] **Step 5: Create the CLI entry point**

Create `build.py`:

```python
#!/usr/bin/env python
"""Lumis build CLI. See README.md for usage."""
import argparse
import sys
from lumis_build.orchestrate import build_all


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="build.py", description="Lumis content build")
    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("build", help="Render content/ into the HTML pages (default).")

    args = parser.parse_args(argv)
    cmd = args.cmd or "build"
    if cmd == "build":
        build_all()
        print("✓ build complete")
        return 0
    parser.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 6: Smoke-run the CLI from the project root**

This will fail loudly because `content/` does not exist yet — that is the expected state and is fine; we want the script to not crash on empty input.

```bash
cd D:/Agentic-v4/output/lumis
.venv/Scripts/python build.py
```

Expected: `✓ build complete` and zero changes (no content folders exist; nothing to do).

- [ ] **Step 7: Commit**

```bash
git add lumis_build/orchestrate.py build.py tests/test_orchestrate.py
git commit -m "feat(build): orchestrate + CLI entry"
```

---

## Task 8: Add the markers to the four real HTML pages

Surgical edits to four files. Each adds one `LUMIS:BEGIN/END` pair around the existing repeated cards. Keep all surrounding markup intact.

**Files:**
- Modify: `D:/Agentic-v4/output/lumis/contact.html` (around line 360 — the `.meet-grid`)
- Modify: `D:/Agentic-v4/output/lumis/work.html` (around line 215 — the `.cases` grid)
- Modify: `D:/Agentic-v4/output/lumis/journal.html` (the `.articles` grid)
- Modify: `D:/Agentic-v4/output/lumis/pricing.html` (the `.pricing-grid`)

For each file the procedure is identical: add a `<!-- LUMIS:BEGIN <name> -->` comment as the first child of the grid container, and `<!-- LUMIS:END <name> -->` as the last child.

- [ ] **Step 1: Add markers to `contact.html` team grid**

Read `contact.html` lines 358–394 first. Then edit so the result is:

```html
<section class="meet" data-cursor-surface="dark">
  <h3>The <em>three principals</em>,<br/>one engineer, the room.</h3>
  <div class="meet-grid">
    <!-- LUMIS:BEGIN team-grid -->
    <div class="person"> ... existing Mara card unchanged ... </div>
    <div class="person"> ... existing Aiko card unchanged ... </div>
    <div class="person"> ... existing Eli card unchanged ... </div>
    <div class="person"> ... existing Theo card unchanged ... </div>
    <!-- LUMIS:END team-grid -->
  </div>
</section>
```

Use the Edit tool to insert just the two comment lines — do not move or rewrite the four `.person` blocks.

- [ ] **Step 2: Add markers to `work.html` work grid**

Read `work.html` around lines 215–340 first. The existing layout is a single container holding multiple `<a class="case">` blocks. Insert `<!-- LUMIS:BEGIN work-grid -->` immediately before the first `<a class="case">` and `<!-- LUMIS:END work-grid -->` immediately after the last `</a>` of that group. Do not touch the surrounding section header or filter bar.

- [ ] **Step 3: Add markers to `journal.html` article grid**

Use Grep first to locate the article grid container and the first/last `<a class="article">` lines. Insert markers around them.

- [ ] **Step 4: Add markers to `pricing.html` tiers**

Inside `<div class="pricing-grid">`, surround the three `<div class="tier">` blocks with the marker pair.

- [ ] **Step 5: Verify all four pages still render valid HTML**

Run from project root:

```bash
.venv/Scripts/python -c "
from pathlib import Path
import re
for name in ['contact.html', 'work.html', 'journal.html', 'pricing.html']:
    html = Path(name).read_text(encoding='utf-8')
    opens  = len(re.findall(r'<div\b', html))
    closes = len(re.findall(r'</div>', html))
    assert opens == closes, f'{name}: {opens} open, {closes} close'
    assert 'LUMIS:BEGIN' in html and 'LUMIS:END' in html, f'{name}: markers missing'
print('OK')
"
```

Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add contact.html work.html journal.html pricing.html
git commit -m "feat(build): wrap content sections in LUMIS markers"
```

---

## Task 9: Extractor — populate `content/` from current HTML

Reads the four marked pages and writes one folder per item under `content/<type>/<slug>/`. Used once, on the day of cutover. After this, `content/` is the source of truth.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/extractor.py`
- Create: `D:/Agentic-v4/output/lumis/tests/test_extractor.py`
- Modify: `D:/Agentic-v4/output/lumis/build.py` (add `extract` subcommand)

- [ ] **Step 1: Write the failing test**

Create `tests/test_extractor.py`:

```python
from pathlib import Path
from lumis_build.extractor import extract_team_grid


SAMPLE = """
<div class="meet-grid">
  <!-- LUMIS:BEGIN team-grid -->
    <div class="person">
      <div class="ph"><img src="https://example.com/a.jpg" alt="" /></div>
      <div class="meta">
        <div class="name">Mara <em>Castellán</em></div>
        <div class="role">// Principal · Strategy</div>
        <div class="city">Lisbon · ex-Wolff Olins, ex-Mother</div>
      </div>
    </div>
    <div class="person">
      <div class="ph"><img src="https://example.com/b.jpg" alt="" /></div>
      <div class="meta">
        <div class="name">Aiko <em>Tanaka</em></div>
        <div class="role">// Principal · Identity</div>
        <div class="city">Tokyo · ex-Pentagram</div>
      </div>
    </div>
  <!-- LUMIS:END team-grid -->
</div>
"""


def test_extract_team_returns_two_items():
    items = extract_team_grid(SAMPLE)
    assert len(items) == 2
    assert items[0]["slug"] == "mara-castellan"
    assert items[0]["meta"]["name"] == "Mara Castellán"
    assert items[0]["meta"]["role"] == "Principal · Strategy"
    assert items[0]["meta"]["location"] == "Lisbon"
    assert items[0]["meta"]["ex_roles"] == "ex-Wolff Olins, ex-Mother"
    assert items[0]["meta"]["order"] == 1
    assert items[0]["image_src"] == "https://example.com/a.jpg"
    assert items[1]["slug"] == "aiko-tanaka"
    assert items[1]["meta"]["order"] == 2
```

- [ ] **Step 2: Run the test, expect failure**

```bash
.venv/Scripts/pytest tests/test_extractor.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.extractor'`.

- [ ] **Step 3: Implement the team extractor**

Create `lumis_build/extractor.py`:

```python
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
```

- [ ] **Step 4: Run the test, expect pass**

```bash
.venv/Scripts/pytest tests/test_extractor.py -q
```

Expected: `1 passed`.

- [ ] **Step 5: Add the CLI subcommand and run extraction for real**

Append to `build.py`:

```python
def cmd_extract() -> int:
    """Extract today's HTML into content/ folders. Run once at cutover."""
    from pathlib import Path
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
        (slug_dir / "meta.yml").write_text(yaml.safe_dump(item["meta"], allow_unicode=True), encoding="utf-8")
        # Download the existing remote image to portrait.jpg if not already present
        portrait = slug_dir / "portrait.jpg"
        if not portrait.is_file() and item["image_src"].startswith("http"):
            with urllib.request.urlopen(item["image_src"]) as r, open(portrait, "wb") as f:
                shutil.copyfileobj(r, f)
        print(f"  ✓ members/{item['slug']}")
    print(f"✓ extracted {len(items)} members")
    return 0
```

And in the existing `main()`, register the subparser:

```python
sub.add_parser("extract", help="Populate content/ from today's HTML (run once).")
```

And add to the dispatch:

```python
if cmd == "extract":
    return cmd_extract()
```

- [ ] **Step 6: Run the extractor against the real site**

```bash
.venv/Scripts/python build.py extract
```

Expected:
```
  ✓ members/mara-castellan
  ✓ members/aiko-tanaka
  ✓ members/eli-okafor
  ✓ members/theo-halasz
✓ extracted 4 members
```

Manually open one of the generated `meta.yml` files and one downloaded portrait — confirm both look right.

- [ ] **Step 7: Verify build round-trip preserves the team grid bytewise**

```bash
git diff contact.html > /tmp/before.diff
.venv/Scripts/python build.py
git diff contact.html > /tmp/after.diff
diff /tmp/before.diff /tmp/after.diff && echo "ROUND-TRIP OK"
```

Expected: `ROUND-TRIP OK` (the build produced no further changes to `contact.html` beyond what `extract` set up).

If a diff shows up: it points to a real mismatch between the template and the existing HTML. Fix the template (Task 5) — not the existing HTML — until the diff is empty.

- [ ] **Step 8: Commit**

```bash
git add lumis_build/extractor.py tests/test_extractor.py build.py content/ assets/
git commit -m "feat(build): one-shot HTML → content/ extractor for team"
```

> **Note for plan reviewers:** Steps 5–7 of this task are the riskiest in the whole plan. If the round-trip test in Step 7 fails for any field, that field's template needs adjustment before the same pattern is repeated for `work`, `journal`, and `pricing` in Task 10.

---

## Task 10: Extend extractor to work, journal, pricing

Same shape as Task 9, three more times. Each extractor returns the same item dict shape and writes its own subdirectory under `content/`.

**Files:**
- Modify: `lumis_build/extractor.py` (add three more functions)
- Modify: `tests/test_extractor.py` (add three tests)
- Modify: `build.py` (call all four extractors from `cmd_extract`)

- [ ] **Step 1: Write tests for the three extractors**

Append to `tests/test_extractor.py`:

```python
from lumis_build.extractor import extract_work_grid, extract_journal_grid, extract_pricing_tiers

WORK_SAMPLE = """
<!-- LUMIS:BEGIN work-grid -->
  <a href="case-study.html" class="case" data-f="creative">
    <div class="ph">
      <img src="https://example.com/v.jpg" alt="" />
      <div class="vignette"></div>
      <div class="stamp"><span class="badge">D2C · Beauty</span></div>
    </div>
    <div class="meta-row"><span class="num">// case 02</span><span class="year">2026</span></div>
    <h3>Atelier <em>Vesta</em> — slow beauty, considered.</h3>
    <p class="brief">Pre-seed · Identity · Packaging system</p>
    <div class="tagline"><span class="t">D2C</span><span class="t">Beauty</span><span class="t">Editorial</span></div>
  </a>
<!-- LUMIS:END work-grid -->
"""

def test_extract_work_grid_one_item():
    items = extract_work_grid(WORK_SAMPLE)
    assert len(items) == 1
    it = items[0]
    assert it["slug"] == "atelier-vesta"
    assert it["meta"]["title"] == "Atelier Vesta"
    assert it["meta"]["title_em"] == "slow beauty, considered."
    assert it["meta"]["badge"] == "D2C · Beauty"
    assert it["meta"]["case_num"] == "02"
    assert it["meta"]["year"] == 2026
    assert it["meta"]["filter"] == "creative"
    assert it["meta"]["tags"] == ["D2C", "Beauty", "Editorial"]


JOURNAL_SAMPLE = """
<!-- LUMIS:BEGIN journal-grid -->
  <a href="journal-article.html" class="article">
    <div class="ph"><img src="https://example.com/j.jpg" alt="The Death of the Logo" loading="lazy" /></div>
    <div class="meta">
      <span class="cat">Branding</span><span class="dot">·</span>
      <span class="date">Apr 18, 2026</span><span class="dot">·</span>
      <span class="read">12 min read</span>
    </div>
    <h3>The Death of the Logo</h3>
    <div class="byline">
      <div class="ava"><img src="https://example.com/ava.jpg" alt="Marcus Chen" /></div>
      <span>Marcus Chen</span>
    </div>
  </a>
<!-- LUMIS:END journal-grid -->
"""

def test_extract_journal_grid():
    items = extract_journal_grid(JOURNAL_SAMPLE)
    assert items[0]["slug"] == "the-death-of-the-logo"
    assert items[0]["meta"]["title"] == "The Death of the Logo"
    assert items[0]["meta"]["category"] == "Branding"
    assert items[0]["meta"]["date_display"] == "Apr 18, 2026"
    assert items[0]["meta"]["read_time"] == 12
    assert items[0]["meta"]["author"] == "Marcus Chen"


PRICING_SAMPLE = """
<!-- LUMIS:BEGIN pricing-tiers -->
  <div class="tier reveal">
    <span class="name">Starter</span>
    <div>
      <span class="price">$<span class="ital">49</span><span class="unit">/ mo</span></span>
      <p class="desc">Get a real foundation in an afternoon.</p>
    </div>
    <ul>
      <li><span class="check">→</span><span>One full brand system</span></li>
      <li><span class="check">→</span><span>2 strategic revisions</span></li>
    </ul>
    <a href="contact.html" class="cta-tier">Start Starter</a>
  </div>
<!-- LUMIS:END pricing-tiers -->
"""

def test_extract_pricing_tiers():
    items = extract_pricing_tiers(PRICING_SAMPLE)
    assert items[0]["slug"] == "starter"
    assert items[0]["meta"]["name"] == "Starter"
    assert items[0]["meta"]["price"] == 49
    assert items[0]["meta"]["price_unit"] == "/ mo"
    assert items[0]["meta"]["bullets"] == ["One full brand system", "2 strategic revisions"]
    assert items[0]["meta"]["cta_label"] == "Start Starter"
    assert items[0]["meta"]["hero"] is False
```

- [ ] **Step 2: Run the tests, expect failures**

```bash
.venv/Scripts/pytest tests/test_extractor.py -q
```

Expected: 3 import errors / failures for the three new functions.

- [ ] **Step 3: Implement the three extractors**

Append to `lumis_build/extractor.py`:

```python
_WORK_PAT = re.compile(
    r'<a href="[^"]*" class="case" data-f="(?P<filter>[^"]+)">\s*'
    r'<div class="ph">\s*<img src="(?P<src>[^"]+)"[^>]*/>\s*'
    r'<div class="vignette"></div>\s*'
    r'<div class="stamp"><span class="badge">(?P<badge>[^<]+)</span></div>\s*'
    r'</div>\s*'
    r'<div class="meta-row"><span class="num">//\s*case\s*(?P<num>[^<]+)</span><span class="year">(?P<year>\d+)</span></div>\s*'
    r'<h3>(?P<title_a>[^<]+)\s*<em>(?P<title_b>[^<]+)</em>(?P<title_em>[^<]*)</h3>\s*'
    r'<p class="brief">(?P<brief>[^<]+)</p>\s*'
    r'<div class="tagline">(?P<tags>.*?)</div>',
    re.DOTALL,
)

_TAG_PAT = re.compile(r'<span class="t">([^<]+)</span>')


def extract_work_grid(html: str) -> list[dict]:
    inner = _section_inner(html, "work-grid")
    items: list[dict] = []
    for m in _WORK_PAT.finditer(inner):
        title = f"{m['title_a'].strip()} {m['title_b'].strip()}"
        title_em = m["title_em"].lstrip(" —").strip().rstrip(".")
        if title_em:
            title_em = title_em + "."
        items.append({
            "slug": _slugify(title),
            "meta": {
                "title": title,
                "title_em": title_em,
                "brief": m["brief"].strip(),
                "badge": m["badge"].strip(),
                "case_num": m["num"].strip(),
                "year": int(m["year"]),
                "filter": m["filter"].strip(),
                "tags": _TAG_PAT.findall(m["tags"]),
            },
            "image_src": m["src"].strip(),
        })
    return items


_JOURNAL_PAT = re.compile(
    r'<a href="[^"]*" class="article">\s*'
    r'<div class="ph"><img src="(?P<cover>[^"]+)"[^>]*/></div>\s*'
    r'<div class="meta">\s*'
    r'<span class="cat">(?P<cat>[^<]+)</span><span class="dot">[^<]+</span>\s*'
    r'<span class="date">(?P<date>[^<]+)</span><span class="dot">[^<]+</span>\s*'
    r'<span class="read">(?P<read>\d+)\s*min read</span>\s*'
    r'</div>\s*'
    r'<h3>(?P<title>[^<]+)</h3>\s*'
    r'<div class="byline">\s*'
    r'<div class="ava"><img src="(?P<ava>[^"]+)"[^>]*/></div>\s*'
    r'<span>(?P<author>[^<]+)</span>',
    re.DOTALL,
)


def extract_journal_grid(html: str) -> list[dict]:
    inner = _section_inner(html, "journal-grid")
    items: list[dict] = []
    for m in _JOURNAL_PAT.finditer(inner):
        title = m["title"].strip()
        items.append({
            "slug": _slugify(title),
            "meta": {
                "title": title,
                "category": m["cat"].strip(),
                "date_display": m["date"].strip(),
                "read_time": int(m["read"]),
                "author": m["author"].strip(),
            },
            "image_src": m["cover"].strip(),
            "author_img_src": m["ava"].strip(),
        })
    return items


_PRICING_PAT = re.compile(
    r'<div class="tier(?P<heroclass>[^"]*)\s*reveal">\s*'
    r'(?:<span class="badge">(?P<badge>[^<]+)</span>\s*)?'
    r'<span class="name">(?P<name>[^<]+)</span>\s*'
    r'<div>\s*'
    r'<span class="price">(?P<prefix>\$?)<span class="ital">(?P<price>[^<]+)</span>(?:<span class="unit">(?P<unit>[^<]+)</span>)?</span>\s*'
    r'<p class="desc">(?P<desc>[^<]+)</p>\s*'
    r'</div>\s*'
    r'<ul>(?P<bullets>.*?)</ul>\s*'
    r'<a href="[^"]*" class="cta-tier">(?P<cta>[^<]+)</a>',
    re.DOTALL,
)

_BULLET_PAT = re.compile(r'<li><span class="check">[^<]+</span><span>([^<]+)</span></li>')


def extract_pricing_tiers(html: str) -> list[dict]:
    inner = _section_inner(html, "pricing-tiers")
    items: list[dict] = []
    for m in _PRICING_PAT.finditer(inner):
        name = m["name"].strip()
        raw_price = m["price"].strip()
        try:
            price: int | str = int(raw_price)
        except ValueError:
            price = raw_price
        items.append({
            "slug": _slugify(name),
            "meta": {
                "name": name,
                "price_prefix": m["prefix"] or "",
                "price": price,
                "price_unit": (m["unit"] or "").strip(),
                "desc": m["desc"].strip(),
                "bullets": _BULLET_PAT.findall(m["bullets"]),
                "cta_label": m["cta"].strip(),
                "hero": "hero-tier" in (m["heroclass"] or ""),
                "badge": (m["badge"] or "").strip() or None,
            },
        })
    return items
```

- [ ] **Step 4: Run the tests, expect pass**

```bash
.venv/Scripts/pytest tests/test_extractor.py -q
```

Expected: `4 passed`.

- [ ] **Step 5: Wire all four extractors into `cmd_extract`**

Replace the body of `cmd_extract` in `build.py` with this — note the journal extractor downloads two images (cover + author avatar), and pricing has no images:

```python
def cmd_extract() -> int:
    from pathlib import Path
    import shutil
    import urllib.request
    import yaml
    from lumis_build import config
    from lumis_build.extractor import (
        extract_team_grid, extract_work_grid, extract_journal_grid, extract_pricing_tiers
    )

    def _download(url: str, dst: Path) -> None:
        if dst.is_file() or not url.startswith("http"):
            return
        dst.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(url) as r, open(dst, "wb") as f:
            shutil.copyfileobj(r, f)

    def _write_meta(slug_dir: Path, meta: dict) -> None:
        slug_dir.mkdir(parents=True, exist_ok=True)
        (slug_dir / "meta.yml").write_text(
            yaml.safe_dump(meta, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )

    sources = [
        ("contact.html", "members", extract_team_grid,    [("portrait.jpg", "image_src")]),
        ("work.html",    "work",    extract_work_grid,    [("cover.jpg",    "image_src")]),
        ("journal.html", "journal", extract_journal_grid, [("cover.jpg", "image_src"), ("author.jpg", "author_img_src")]),
        ("pricing.html", "services", extract_pricing_tiers, []),
    ]
    total = 0
    for page, subdir, fn, imgs in sources:
        html = (config.ROOT / page).read_text(encoding="utf-8")
        items = fn(html)
        out_root = config.CONTENT_DIR / subdir
        for item in items:
            slug_dir = out_root / item["slug"]
            _write_meta(slug_dir, item["meta"])
            for filename, key in imgs:
                if key in item:
                    _download(item[key], slug_dir / filename)
            print(f"  ✓ {subdir}/{item['slug']}")
            total += 1
    print(f"✓ extracted {total} items")
    return 0
```

- [ ] **Step 6: Run extraction against the real site**

```bash
.venv/Scripts/python build.py extract
```

Expected output looks like:
```
  ✓ members/mara-castellan
  ...
  ✓ work/atelier-vesta
  ...
  ✓ journal/the-death-of-the-logo
  ...
  ✓ services/starter
  ✓ services/studio
  ✓ services/scale
✓ extracted N items
```

Spot-check the produced YAML files for any obviously wrong values.

- [ ] **Step 7: Confirm round-trip across all four pages**

```bash
git stash
.venv/Scripts/python build.py
git diff --stat contact.html work.html journal.html pricing.html
```

Expected: empty diff (all four files unchanged after build).

If any file diffs, walk the diff. The fix is always: adjust the template in `templates/<name>.html.j2` until the diff goes away. Do not edit the source HTML to match the template — that defeats the round-trip guarantee.

After the diff is clean:

```bash
git stash pop
git add content/
git commit -m "chore(build): seed content/ from today's HTML"
```

---

## Task 11: Idempotency test (the safety net)

Run the build twice; the second run must produce zero diff. This test catches any future template change that breaks idempotency.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/tests/test_build_idempotent.py`

- [ ] **Step 1: Write the test**

Create `tests/test_build_idempotent.py`:

```python
from pathlib import Path
import subprocess


def test_build_is_idempotent():
    """Running build twice must not change the HTML files on the second run."""
    root = Path(__file__).resolve().parents[1]
    py = root / ".venv" / "Scripts" / "python.exe"
    if not py.is_file():
        py = Path("python")  # fallback for CI / non-Windows
    pages = ["contact.html", "work.html", "journal.html", "pricing.html"]

    # First build.
    subprocess.run([str(py), "build.py"], cwd=root, check=True)
    snapshots = {p: (root / p).read_bytes() for p in pages}

    # Second build, immediately.
    subprocess.run([str(py), "build.py"], cwd=root, check=True)
    for p in pages:
        assert (root / p).read_bytes() == snapshots[p], f"{p} changed on second build"
```

- [ ] **Step 2: Run the test, expect pass**

```bash
.venv/Scripts/pytest tests/test_build_idempotent.py -q
```

Expected: `1 passed`.

If it fails, the fix is in the template (introducing whitespace nondeterminism or sorting drift) — the test is correct.

- [ ] **Step 3: Run the entire test suite once**

```bash
.venv/Scripts/pytest -q
```

Expected: all tests pass (loader 5 + images 4 + markers 5 + render 4 + orchestrate 1 + extractor 4 + idempotent 1 = 24 tests).

- [ ] **Step 4: Commit**

```bash
git add tests/test_build_idempotent.py
git commit -m "test(build): idempotency safety net"
```

---

## Task 12: `content_index.json` for the chatbot plan

The chatbot (separate plan, item 5) needs a compact JSON snapshot of what is on the site. Produce it as part of every build.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/index.py`
- Modify: `D:/Agentic-v4/output/lumis/lumis_build/orchestrate.py` (call `write_index` at end of `build_all`)
- Create: `D:/Agentic-v4/output/lumis/tests/test_index.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_index.py`:

```python
from pathlib import Path
import json
import yaml
from lumis_build import config
from lumis_build.index import write_index


def test_write_index_summarizes_each_section(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CONTENT_DIR", tmp_path / "content")
    monkeypatch.setattr(config, "ROOT", tmp_path)

    members = tmp_path / "content" / "members" / "mara"
    members.mkdir(parents=True)
    (members / "meta.yml").write_text(
        yaml.safe_dump({"name": "Mara Castellán", "role": "Strategy"}),
        encoding="utf-8",
    )

    write_index()
    data = json.loads((tmp_path / "content_index.json").read_text(encoding="utf-8"))
    assert data["members"] == [{"slug": "mara", "name": "Mara Castellán", "role": "Strategy"}]
    assert data["generated_at"]
```

- [ ] **Step 2: Run the test, expect failure**

```bash
.venv/Scripts/pytest tests/test_index.py -q
```

Expected: `ModuleNotFoundError: No module named 'lumis_build.index'`.

- [ ] **Step 3: Implement the index writer**

Create `lumis_build/index.py`:

```python
"""Write content_index.json — a compact summary of what's on the site."""
import json
from datetime import datetime, timezone
from . import config
from .loader import load_section


def _summarize(item: dict, fields: list[str]) -> dict:
    out = {"slug": item["slug"]}
    for k in fields:
        if k in item["meta"]:
            out[k] = item["meta"][k]
    return out


_FIELDS = {
    "members":  ["name", "role", "location"],
    "work":     ["title", "title_em", "brief", "badge", "year", "tags"],
    "journal":  ["title", "category", "date_display", "read_time", "author"],
    "services": ["name", "price", "price_unit", "desc", "bullets"],
}


def write_index() -> None:
    data: dict = {"generated_at": datetime.now(timezone.utc).isoformat()}
    for subdir, fields in _FIELDS.items():
        items = load_section(config.CONTENT_DIR / subdir)
        data[subdir] = [_summarize(it, fields) for it in items]
    out = config.ROOT / "content_index.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
```

- [ ] **Step 4: Run the test, expect pass**

```bash
.venv/Scripts/pytest tests/test_index.py -q
```

Expected: `1 passed`.

- [ ] **Step 5: Wire into `build_all`**

In `lumis_build/orchestrate.py`, add at the very end of `build_all`:

```python
    from .index import write_index
    write_index()
```

- [ ] **Step 6: Re-run the build and confirm `content_index.json` is created**

```bash
.venv/Scripts/python build.py
ls content_index.json
```

Expected: file exists. Open it; it should be valid JSON with four top-level arrays.

- [ ] **Step 7: Commit**

```bash
git add lumis_build/index.py lumis_build/orchestrate.py tests/test_index.py content_index.json
git commit -m "feat(build): emit content_index.json for downstream consumers"
```

---

## Task 13: Watch mode + contributor README

A two-line dev loop: `python build.py --watch` re-builds whenever `content/` changes. README explains how to add a member without reading any of the rest of the codebase.

**Files:**
- Create: `D:/Agentic-v4/output/lumis/lumis_build/watcher.py`
- Modify: `D:/Agentic-v4/output/lumis/build.py` (add `--watch` flag)
- Create: `D:/Agentic-v4/output/lumis/README.md`

- [ ] **Step 1: Implement watch**

Create `lumis_build/watcher.py`:

```python
"""watchdog wrapper — re-run the build whenever content/ changes."""
import time
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from . import config
from .orchestrate import build_all


class _Handler(FileSystemEventHandler):
    def __init__(self) -> None:
        self.dirty = False

    def on_any_event(self, event) -> None:
        self.dirty = True


def watch() -> None:
    handler = _Handler()
    observer = Observer()
    observer.schedule(handler, str(config.CONTENT_DIR), recursive=True)
    observer.start()
    print(f"Watching {config.CONTENT_DIR} — Ctrl-C to stop.")
    try:
        while True:
            time.sleep(0.4)
            if handler.dirty:
                handler.dirty = False
                try:
                    build_all()
                    print("✓ rebuilt")
                except Exception as e:
                    print(f"✗ build failed: {e}")
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
```

- [ ] **Step 2: Add `build --watch` flag**

In `build.py`, add to the build subparser:

```python
build_parser = sub.add_parser("build", help="Render content/ into the HTML pages (default).")
build_parser.add_argument("--watch", action="store_true", help="Re-run on changes to content/.")
```

And in dispatch:

```python
if cmd == "build":
    if getattr(args, "watch", False):
        from lumis_build.watcher import watch
        watch()
    else:
        build_all()
        print("✓ build complete")
    return 0
```

- [ ] **Step 3: Smoke-test watch**

In one terminal:

```bash
.venv/Scripts/python build.py build --watch
```

In another, edit any `meta.yml` (e.g. change a role label) and save. The first terminal should print `✓ rebuilt` within ~1s. Open `contact.html` and confirm the change is in the file. Stop watch with Ctrl-C.

- [ ] **Step 4: Write the README**

Create `README.md`:

```markdown
# Lumis — site content guide

This site is mostly hand-written HTML. The four sections that grow over
time live in `content/`:

| Want to add a... | Drop it in |
|---|---|
| Team member | `content/members/<your-slug>/` |
| Case study  | `content/work/<your-slug>/` |
| Journal post | `content/journal/<your-slug>/` |
| Pricing tier | `content/services/<your-slug>/` |

Each folder needs a `meta.yml` (the fields are listed in the
`_schema.md` next to the example folders) and any images you want.

## Adding a new team member

1. Copy any folder under `content/members/` and rename it
   (`mara-castellan` → `your-name`).
2. Edit `meta.yml`. The required fields are: `name`, `role`,
   `location`. Optional: `ex_roles`, `order`, `visible`.
3. Replace `portrait.jpg` with your photo. Any size and format works
   — the build resizes it.
4. Run:

   ```bash
   python build.py
   ```

5. Refresh `contact.html`. Your card is there.

## Live-rebuild while editing

```bash
python build.py build --watch
```

The build runs every time you save a file in `content/`.
```

- [ ] **Step 5: Commit**

```bash
git add lumis_build/watcher.py build.py README.md
git commit -m "feat(build): --watch + contributor README"
```

---

## Task 14: Extend to per-slug detail pages (case-study + journal-article)

Today, every case study links to the same `case-study.html` and every
journal post links to the same `journal-article.html`. Generate one
file per slug under `case-study/<slug>.html` and `journal/<slug>.html`,
update the card templates to point to them, update navigation links.

**Files:**
- Create: `templates/case_study_page.html.j2` (full HTML page wrapper)
- Create: `templates/journal_article_page.html.j2`
- Modify: `lumis_build/orchestrate.py` (add per-slug page generation)
- Modify: `templates/work_card.html.j2` and `templates/journal_card.html.j2` (point to slug URLs)

> **Plan reviewer note.** Task 14 is the largest single task. It is
> separated from the rest because someone reviewing the plan can punt
> on it — items 1–13 leave the site fully working with shared
> `case-study.html` and `journal-article.html` pages that read
> `?slug=` from the query string at runtime. Per-slug static pages are
> a strict upgrade and not a blocker for the chatbot plan or for
> contributors using the folder workflow.

- [ ] **Step 1: Decide the URL shape**

Two options:
- **A.** `case-study/atelier-vesta.html` (one folder, many files).
- **B.** Separate folder per slug.

**Recommendation: A.** Easier to deploy on a static host, no folder
explosion, the URL is shorter.

- [ ] **Step 2: Build the page-wrapper template by extracting the existing `case-study.html`**

Open `case-study.html` and identify the parts that are per-slug
(title, hero image, body) versus the parts that are shared (header,
nav, footer, CSS). Wrap the shared parts in the template and use
Jinja blocks for the variable parts. Keep this as a single template
that takes a fully-rendered item dict.

The literal template body is too long to inline here; the engineer
should produce it directly from `case-study.html` while looking at
the current file. Confirm via diff that the rendered output for
`atelier-vesta` matches the current `case-study.html` plus the
per-slug substitutions.

- [ ] **Step 3: Same for journal**

Repeat for `journal-article.html` → `templates/journal_article_page.html.j2`.

- [ ] **Step 4: Add per-slug page generation to `build_all`**

After the section loop, for each item in `work` and `journal`:
- Render the page template with the item.
- Write to `case-study/<slug>.html` (resp. `journal/<slug>.html`).
- Make sure the directory exists.

- [ ] **Step 5: Update card templates to point at the slug URL**

In `templates/work_card.html.j2`, the `href` is already `case-study.html?slug={{ item.slug }}` — change to `case-study/{{ item.slug }}.html`.

In `templates/journal_card.html.j2`, the `href` is already `journal/{{ item.slug }}.html` — already correct.

- [ ] **Step 6: Run the full test suite + a manual page open**

```bash
.venv/Scripts/pytest -q
.venv/Scripts/python build.py
```

Open `case-study/atelier-vesta.html` in the browser. Spot-check it.

- [ ] **Step 7: Commit**

```bash
git add templates/ lumis_build/orchestrate.py case-study/ journal/
git commit -m "feat(build): per-slug case-study and journal pages"
```

---

## Self-review (done before handing off)

**Spec coverage:**
- ✓ Spec acceptance: "Adding a folder…and running build causes a new card" → Task 7 + Task 8
- ✓ Spec acceptance: "Removing a folder makes the card disappear on the next build" → handled by `load_section` returning a fresh list each time
- ✓ Spec acceptance: "Running the build twice produces zero git diff" → Task 11
- ✓ Spec acceptance: "`--extract` regenerates content/ from the current HTML without losing any data" → Tasks 9 + 10, with the round-trip diff check enforcing it
- ✓ Spec mention of `content_index.json` for chatbot grounding → Task 12
- ✓ Spec mention of `--watch` mode → Task 13

**Placeholder scan:** No "TBD", "TODO", or "implement later". Two places where the engineer is asked to produce template content from existing HTML rather than copy-pasted content here — Task 14 steps 2 and 3 — both flagged with "look at the current file" rather than left as placeholders, because pasting hundreds of lines of HTML into a plan would obscure intent. If the reviewer wants those expanded into literal step-by-step copy, that is the one place to ask.

**Type / name consistency:**
- `load_section(section_dir)` consistent across loader, orchestrate, index.
- Item dict shape `{slug, meta, body_html?, images, image_url?, author_img_url?}` consistent across loader → orchestrate → render templates → extractor.
- `replace_section(html, name, new_inner)` consistent across markers and orchestrate.
- `process_image(src, dst, *, max_width, quality)` consistent across images and orchestrate.

**Spec gaps found and fixed:**
- The spec did not define what happens when an item folder has no images. Loader returns `images: []`; orchestrate `_image_url_for` returns empty string; templates degrade to a broken `<img src="">` if used. **Open question for the reviewer:** should empty images be a build error, or are placeholders fine? Default: silent for now (matches today's behavior of broken Unsplash links), but easy to escalate to a hard fail in `build_all` if preferred.
- The spec said `_schema.md` would describe fields. The plan does not author them. **Recommend:** add a Task 15 that writes one `_schema.md` per content type once the field set is locked in. Not a blocker.

---

**Plan complete and saved to `D:/Agentic-v4/output/lumis/docs/superpowers/plans/2026-05-02-lumis-content-system-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good fit for this plan because most tasks are tightly scoped and have explicit pass/fail signals (the test commands + expected output).

**2. Inline Execution** — Execute tasks in this session using executing-plans. Lower overhead per task, but the running session accumulates context across all 14 tasks.

Which approach?

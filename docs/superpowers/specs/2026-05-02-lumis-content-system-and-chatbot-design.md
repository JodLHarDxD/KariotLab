---
project: lumis
date: 2026-05-02
status: draft (awaiting user review)
scope: items 4 (drop-folder content management) + 5 (AI chatbot widget)
---

# Lumis — Drop-folder Content Management + AI Chatbot

## Why this spec exists

Three of the five items the user requested were quick wins and have been
shipped against the static site (broken image, Journal nav, interactive
v1.x templates). Two items fundamentally change the architecture of the
project and need their own design pass before implementation:

4. **A way for someone to drop new content (members, services, photos,
   videos, descriptions) into a folder and have the website pick them up
   smoothly.**
5. **An AI chatbot at the bottom of the site, with a glassmorphism look
   matching the third reference screenshot, that can help users.**

Both rely on infrastructure that does not yet exist in `output/lumis/`
(only HTML files today). The decisions below are the smallest set that
unblock both items without committing to a heavy framework.

---

## Item 4 — Drop-folder content management

### Goal

A non-technical contributor should be able to:

1. Drop a photo into the right folder.
2. Edit a single human-readable file with the title, role, description,
   tags, etc.
3. Open the site (or run one short command) and see the new card
   render in the right place, in the right style.

### Approach: build script + structured `content/` folder

Pure runtime JS injection (option B from the brainstorming round) was
ruled out for two reasons: (a) it requires a local web server because
`fetch()` of a sibling JSON file fails under `file://` on Chrome, and
(b) the existing pages are large hand-tuned HTML — replacing a chunk of
markup at runtime is more brittle than rebuilding it once at author
time.

A small Python build script reads `content/` and writes the relevant
`<section>` blocks into the matching HTML files between marked
delimiters. The HTML stays static and shippable. The contributor's
loop is "edit folder → run `python build.py` → refresh browser".

### Folder layout

```
output/lumis/
├── content/
│   ├── members/
│   │   ├── _schema.md              ← human-readable field reference
│   │   ├── mara-castellan/
│   │   │   ├── meta.yml            ← name, role, location, ex-roles, order
│   │   │   └── portrait.jpg        ← any size, the build resizes
│   │   ├── aiko-tanaka/
│   │   │   ├── meta.yml
│   │   │   └── portrait.jpg
│   │   └── …
│   ├── services/
│   │   ├── _schema.md
│   │   ├── starter/
│   │   │   └── meta.yml            ← name, price, blurb, bullets[], cta
│   │   └── …
│   ├── work/
│   │   ├── _schema.md
│   │   ├── atelier-vesta/
│   │   │   ├── meta.yml            ← title, client_type, year, tags[]
│   │   │   ├── cover.jpg
│   │   │   └── case-study.md       ← optional long-form body
│   │   └── …
│   └── journal/
│       ├── _schema.md
│       ├── 2026-04-18-brand-systems-in-motion/
│       │   ├── meta.yml            ← title, author, date, category, read_time
│       │   ├── cover.jpg
│       │   └── body.md
│       └── …
├── assets/                          ← built output (resized images)
│   └── …                            ← script writes here, gitignored
├── build.py                         ← the build script
└── *.html                           ← unchanged structure, with markers
```

### HTML markers

Each HTML page that gets generated content uses paired comment markers
the build script targets. Anything between the markers is replaced on
each build; everything outside is hand-tuned and never touched.

Example in `work.html`:

```html
<!-- LUMIS:BEGIN work-grid -->
<a href="case-study.html?slug=atelier-vesta" class="case" data-f="creative">
  <div class="ph">
    <img src="assets/work/atelier-vesta/cover.jpg" alt="Atelier Vesta" />
    …
  </div>
  …
</a>
<!-- LUMIS:END work-grid -->
```

Markers per page:

| Page | Marker(s) |
|---|---|
| `work.html` | `work-grid` |
| `contact.html` | `team-grid` (the four people cards) |
| `pricing.html` | `pricing-tiers` |
| `journal.html` | `journal-grid` |
| `journal-article.html` | dynamically generated — one file per `journal/<slug>/` |
| `case-study.html` | dynamically generated — one file per `work/<slug>/` |

### `meta.yml` example (member)

```yaml
name: Mara Castellán
role: Principal · Strategy
location: Lisbon
ex_roles: ex-Wolff Olins, ex-Mother
order: 1                # controls left-to-right display order
visible: true           # set false to hide without deleting
```

Fields are loose. The build script uses `pyyaml` (single dependency)
and treats unknown fields as ignored, missing fields as empty.

### `build.py` behavior

1. Walk `content/<type>/` directories.
2. For each item, load `meta.yml` plus any image/markdown siblings.
3. Resize images to the standard sizes the existing markup uses
   (1600w cover, 800w portrait, 60w avatar) and write them to
   `assets/<type>/<slug>/`.
4. For each affected HTML file, read it, find the `LUMIS:BEGIN/END`
   marker pair, replace the content between them with the rendered
   block, write back.
5. For dynamic pages (`case-study.html`, `journal-article.html`),
   render one HTML file per slug from a per-type template.
6. Print a one-line summary per item: `✓ members/mara-castellan`.

### Runs in two ways

- **One-shot:** `python build.py` after editing.
- **Watch mode:** `python build.py --watch` re-runs on any change in
  `content/`. Uses `watchdog` (added to requirements only when watch is
  used).

### Open questions

- **Image processing dependency.** Pillow handles resize cleanly but
  adds a dependency. Acceptable tradeoff — resizing in the browser
  after the fact is wasteful on a static site.
- **Existing data extraction.** First implementation step is a
  `python build.py --extract` mode that reads the current HTML and
  writes out `content/` files for every existing member, work item,
  journal entry, and pricing tier — so the contributor starts with a
  populated folder, not an empty one.

---

## Item 5 — AI chatbot widget with glassmorphism

### Goal

A floating glass-style chat widget on every page (or a chosen subset)
that visitors can open to ask about Lumis — services, pricing, process,
how to get started — and get useful answers grounded in the actual site
content rather than hallucinated.

### Architecture decision: small backend proxy

There are three ways to put an LLM-backed chatbot on a static site:

- **A.** Embed a third-party widget (Chatbase, Crisp + AI add-on,
  Intercom Fin). Zero code, monthly cost, generic look — the
  glassmorphism design from the reference screenshot would be
  approximated, not exact.
- **B.** Call the model API directly from the browser. The visual
  design can be exactly what the reference shows, but every visitor
  would see the API key. **Disqualifying.**
- **C.** Tiny backend proxy (FastAPI or a single Cloudflare Worker)
  that holds the API key, accepts `{messages: […]}`, and forwards to
  the Anthropic Messages API. The browser-side widget owns the
  glassmorphism UI. ~80 lines of Python.

**Recommendation: C.** It's the only option that delivers the exact
visual treatment the reference image shows while keeping the API key
out of the client.

### Backend (FastAPI proxy)

```
backend/
├── chat_proxy.py          ← FastAPI app, one POST /api/chat endpoint
├── system_prompt.md       ← the persona + rules + Lumis facts
├── content_index.json     ← built from content/ (titles + summaries)
└── requirements.txt       ← fastapi, uvicorn, anthropic, python-dotenv
```

`chat_proxy.py` does, in order:

1. Read JSON: `{ messages: [{role, content}], session_id? }`.
2. Load `system_prompt.md` and inject `content_index.json` as a
   compact JSON snippet so the model knows what's on the site.
3. Forward to `anthropic.messages.create(model="claude-haiku-4-5-20251001", …)` —
   Haiku is the right cost/latency choice for a marketing-site Q&A
   assistant.
4. Stream the response back as Server-Sent Events.
5. Rate-limit per IP (in-memory token bucket, 30 messages / hour by
   default) so a hostile visitor cannot drain the API budget.
6. Log nothing about the message contents — only timestamp, IP hash,
   token count.

The `content_index.json` is written by `build.py` (item 4) so the chat
stays grounded in current site content automatically.

### Frontend widget

A single self-contained file `widgets/chatbot.html` is `@@include`'d
or copy-pasted into the bottom of each page (build.py can also handle
this so each page only references one snippet).

Visual treatment matches the reference screenshot:

- **Floating launcher.** Bottom-right, 56px circle, glass surface
  (`backdrop-filter: blur(20px) saturate(140%); background:
  rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12)`),
  thin glow on hover (the existing `--signal` color).
- **Open panel.** 380px wide, 540px tall, anchored bottom-right with
  16px gutter. Same glass treatment, plus a soft inner orange aura at
  the top edge mirroring the reference image's warm glow.
- **Message rows.** User bubbles right-aligned, opaque ink-on-cream;
  assistant rows left-aligned, glass with white text. Mono font for
  the small "Lumis · AI" label, serif italic for the welcome greeting,
  sans for the body — matching the existing site's typography.
- **Input.** Single-line glass field at the bottom, `Enter` to send,
  `Shift+Enter` for newline, voice icon on the right (decorative for
  v1, no actual mic capture).
- **States.** Open / minimized / sending (dot animation) / error
  (gentle inline retry button, no toast).
- **Mobile.** Below 640px the panel becomes a full-height sheet that
  slides up from the bottom with the same glass material.

### System prompt skeleton (excerpt)

```
You are the Lumis Studio assistant. Lumis builds creative-intelligence
brand systems for founders. Answer succinctly, in the studio's voice
(curatorial, considered, never hype).

You may reference: services in content/services/, work in content/work/,
team in content/members/, journal entries in content/journal/.
The current site index is below.

Refuse politely if asked: to write code, do design work, hand out the
team's contact info beyond what's already public, or anything outside
"explain Lumis to me".

If the user wants to start a project, route them to /contact.html.
```

### Open questions

- **Hosting.** Cloudflare Worker is cheaper at scale, easier to deploy
  (no server to keep up). FastAPI is easier to develop locally and to
  port to Railway later. Pick one before implementation — recommendation
  is **Cloudflare Worker** because the rest of the site is static and
  it keeps the deploy story uniform.
- **Persistence.** Should chats persist across sessions (localStorage)?
  Default proposal: yes for user-side history, no on the server. Server
  is stateless; rate-limit bucket is the only memory.
- **Analytics.** Count opens, count messages sent, count "useful"
  thumbs-up. No content stored. Default: opt-in via a one-line consent
  in the widget footer.

---

## Build & ship order

1. **Item 4 step 1 — extractor.** Add `build.py --extract`. Run it
   once. Get a fully populated `content/` folder reflecting today's
   site exactly. **No HTML changes yet.**
2. **Item 4 step 2 — markers + render.** Add the `LUMIS:BEGIN/END`
   markers to the four affected pages. Implement the render path.
   `python build.py` should now reproduce the current HTML byte-for-byte
   (modulo whitespace) from `content/`.
3. **Item 4 step 3 — dynamic pages.** Generate per-slug
   `case-study/<slug>.html` and `journal/<slug>.html` files.
4. **Item 4 step 4 — image pipeline.** Pillow resize + `assets/`
   output.
5. **Item 5 step 1 — backend.** Cloudflare Worker proxy, deployable
   independent of the site. Smoke-test with a curl call.
6. **Item 5 step 2 — widget.** Build the glass widget against a fake
   local backend first, then point at the real one.
7. **Item 5 step 3 — content grounding.** Wire `content_index.json`
   from item 4's build into the system prompt.

Each step is independently shippable. Steps 1–4 can ship without
touching item 5. Step 5 can ship without touching item 4 (the chatbot
will just be less grounded until step 7 is done).

---

## What is explicitly out of scope

- **Auth / admin UI.** No login, no web-based content editor. Files in
  a folder, tracked by git, edited locally.
- **Multi-language.** English only.
- **A CMS.** Anything more than YAML + images is a different project.
- **Voice / audio chat.** The mic icon in the widget is decorative.
- **Search.** No site search. The chatbot is the search.

---

## Acceptance criteria

**Item 4:**
- [ ] Adding a folder under `content/members/` with a `meta.yml` and a
      `portrait.jpg` and running `python build.py` causes a new card to
      appear in `contact.html` in correct order, sized and styled
      identically to existing cards.
- [ ] Removing a folder makes the card disappear on the next build.
- [ ] Running the build twice in a row produces zero git diff.
- [ ] `--extract` regenerates `content/` from the current HTML without
      losing any data.

**Item 5:**
- [ ] The widget appears on every page, bottom-right, matching the glass
      reference within reasonable visual tolerance.
- [ ] Sending a message routes through the backend proxy. The browser
      never sees the API key.
- [ ] Asking "what does Lumis do?" returns an answer that references
      content actually in `content/`.
- [ ] Asking the assistant to write a thousand-line Python script gets
      a polite refusal.
- [ ] Above 30 messages/hour from one IP, the visitor sees an inline
      "give me a moment" rate-limit message, not a server error.

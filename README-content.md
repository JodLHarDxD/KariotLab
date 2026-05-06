# Lumis — Content Management Guide

The site is powered by a file-based content system. You never edit HTML directly.
Drop files into `content/`, run the build, done.

---

## Directory layout

```
content/
├── members/          → Contact page team grid
│   └── mara-castellan/
│       ├── meta.yml
│       └── portrait.jpg
├── work/             → Work page case cards
│   └── north-capital/
│       ├── meta.yml
│       └── cover.jpg
├── journal/          → Journal page article cards
│   └── why-italics-are-having-a-moment/
│       ├── meta.yml
│       └── cover.jpg
└── services/         → Pricing page tiers (no images)
    └── starter/
        └── meta.yml
```

---

## Commands

```bash
python build.py           # same as 'build'
python build.py build     # render content/ → HTML pages
python build.py watch     # rebuild automatically on every save
python build.py index     # regenerate content_index.json (chatbot)
python build.py extract   # ONE-TIME bootstrap from original HTML
```

---

## Adding or editing content

### Add a work case

1. Create `content/work/<slug>/`
2. Add `meta.yml` (see fields below)
3. Drop a `cover.jpg` (any size — auto-resized to 1600px wide)
4. Run `python build.py build`

**`meta.yml` fields for work:**
```yaml
title: "Brand Name"          # first word plain, rest italic in h3
title_em: "the tagline"      # what follows the — dash
brief: "Stage · Deliverables"
badge: "● Live"              # stamp text (optional)
case_num: "01"               # zero-padded
year: 2026
filter: fintech              # all | b2c | b2b | fintech | creative | health | hospitality
tags:
  - Fintech
  - B2B
order: 1                     # sort position on page
```

### Add a journal article

1. Create `content/journal/<slug>/`
2. Add `meta.yml` and a `cover.jpg`

**`meta.yml` fields for journal:**
```yaml
title: "Full article title"
category: Branding            # Branding | Culture | Founders | Process
date_display: "Apr 18, 2026"
read_time: 12                 # minutes
author: "Marcus Chen"
order: 1
```

### Edit pricing tiers

Edit `content/services/<starter|studio|scale>/meta.yml`.

**`meta.yml` fields for services:**
```yaml
name: Studio
hero: true                    # hero highlight card
badge: "Most chosen"          # badge text (null to hide)
price_prefix: "$"
price: "249"
price_unit: "/ mo"
price_data:                   # drives the monthly/annual toggle
  monthly: 249
  yearly: 199
desc: "For teams shipping..."
bullets:
  - Everything in Starter, no caps
  - Unlimited iterations
cta_label: "Start Studio"
order: 2
```

### Add a team member

1. Create `content/members/<slug>/`
2. Add `meta.yml` and a `portrait.jpg` (auto-resized to 800px)

**`meta.yml` fields for members:**
```yaml
name: "Mara Castellán"
role: "Principal · Strategy"
location: "Lisbon"
ex_roles: "ex-Wolff Olins, ex-Mother"
order: 1
```

---

## Hiding an item

Add `visible: false` to any `meta.yml`:
```yaml
visible: false
```
The build silently skips it.

---

## Image processing

Images are auto-processed on every build (mtime-cached, so unchanged images are skipped):

| Section  | Input file   | Max width | Quality |
|----------|-------------|-----------|---------|
| members  | portrait.jpg | 800 px    | 85      |
| work     | cover.jpg    | 1600 px   | 82      |
| journal  | cover.jpg    | 900 px    | 82      |

Processed images land in `assets/<section>/<slug>/`.

---

## Chatbot index

`python build.py index` writes `content_index.json` — a flat list of all content
records used to ground the AI chatbot. Run it after any content change if the
chatbot is live.

from lumis_build.extractor import (
    extract_team_grid,
    extract_work_grid,
    extract_journal_grid,
    extract_pricing_tiers,
)


TEAM_SAMPLE = """
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
    items = extract_team_grid(TEAM_SAMPLE)
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


# ── Work ────────────────────────────────────────────────────────────────────

WORK_SAMPLE = """
<!-- LUMIS:BEGIN work-grid -->
  <a href="case-study.html" class="case full" data-f="fintech">
    <div class="ph">
      <img src="https://images.unsplash.com/photo-abc?w=2400&q=80" alt="" />
      <div class="vignette"></div>
      <div class="stamp">
        <span class="badge live">● Currently shipping</span>
        <span class="badge">Featured</span>
      </div>
    </div>
    <div class="meta-row"><span class="num">// case 01 · 2026</span><span class="year">Mar — Apr</span></div>
    <h3>North <em>Capital</em> — quietly opinionated finance for builders.</h3>
    <p class="brief">Series A · Identity · Living system</p>
    <div class="tagline"><span class="t">Fintech</span><span class="t">B2B</span></div>
  </a>
  <a href="case-study.html" class="case" data-f="b2b">
    <div class="ph">
      <img src="https://images.unsplash.com/photo-xyz?w=1600&q=80" alt="" />
      <div class="vignette"></div>
      <div class="stamp"><span class="badge">SaaS · Dev tools</span></div>
    </div>
    <div class="meta-row"><span class="num">// case 03</span><span class="year">2026</span></div>
    <h3>Hum <em>— observability</em>, finally readable.</h3>
    <p class="brief">Series Seed · Identity · Product UI</p>
    <div class="tagline"><span class="t">B2B</span><span class="t">Dev tools</span></div>
  </a>
<!-- LUMIS:END work-grid -->
"""


def test_extract_work_returns_two_items():
    items = extract_work_grid(WORK_SAMPLE)
    assert len(items) == 2

    nc = items[0]
    assert nc["slug"] == "north-capital"
    assert nc["meta"]["title"] == "North Capital"
    assert nc["meta"]["title_em"] == "quietly opinionated finance for builders."
    assert nc["meta"]["brief"] == "Series A · Identity · Living system"
    assert nc["meta"]["badge"] == "● Currently shipping"
    assert nc["meta"]["case_num"] == "01"
    assert nc["meta"]["year"] == 2026
    assert nc["meta"]["filter"] == "fintech"
    assert nc["meta"]["tags"] == ["Fintech", "B2B"]
    assert nc["meta"]["order"] == 1
    assert "unsplash.com" in nc["image_src"]

    hum = items[1]
    assert hum["slug"] == "hum"
    assert hum["meta"]["title"] == "Hum"
    assert hum["meta"]["title_em"] == "observability, finally readable."
    assert hum["meta"]["case_num"] == "03"
    assert hum["meta"]["order"] == 3


# ── Journal ──────────────────────────────────────────────────────────────────

JOURNAL_SAMPLE = """
<!-- LUMIS:BEGIN journal-grid -->
  <a href="journal-article.html" class="article col-5 reveal" data-cat="founders">
    <div class="thumb">
      <img src="https://images.unsplash.com/photo-aaa?w=700&q=80" alt="YC brands" loading="lazy" />
      <span class="cat-badge">Founders</span>
    </div>
    <div class="body">
      <div class="row">
        <span class="date">Apr 10, 2026</span>
        <span class="rt">8 min</span>
      </div>
      <h3>What <em>YC's top brands</em> have in common</h3>
      <p class="excerpt">After auditing 80 YC graduates...</p>
      <div class="author-row">
        <div class="ava"><img src="https://images.unsplash.com/photo-bbb?w=60&q=80" alt="Sena Adusei" /></div>
        <span class="an">Sena Adusei</span>
      </div>
    </div>
  </a>
  <a href="journal-article.html" class="article col-7 reveal" data-cat="process">
    <div class="thumb">
      <img src="https://images.unsplash.com/photo-ccc?w=900&q=80" alt="Sprint" loading="lazy" />
      <span class="cat-badge">Process</span>
    </div>
    <div class="body">
      <div class="row">
        <span class="date">Mar 28, 2026</span>
        <span class="rt">10 min</span>
      </div>
      <h3>The 48-hour brand sprint: what we learned</h3>
      <p class="excerpt">Speed reveals truth.</p>
      <div class="author-row">
        <div class="ava"><img src="" alt="Marcus Chen" /></div>
        <span class="an">Marcus Chen</span>
      </div>
    </div>
  </a>
<!-- LUMIS:END journal-grid -->
"""


def test_extract_journal_returns_two_items():
    items = extract_journal_grid(JOURNAL_SAMPLE)
    assert len(items) == 2

    yc = items[0]
    assert yc["slug"] == "what-ycs-top-brands-have-in-common"
    assert yc["meta"]["title"] == "What YC's top brands have in common"
    assert yc["meta"]["category"] == "Founders"
    assert yc["meta"]["date_display"] == "Apr 10, 2026"
    assert yc["meta"]["read_time"] == 8
    assert yc["meta"]["author"] == "Sena Adusei"
    assert yc["meta"]["order"] == 1
    assert "unsplash.com" in yc["image_src"]

    sprint = items[1]
    assert sprint["slug"] == "the-48-hour-brand-sprint-what-we-learned"
    assert sprint["meta"]["read_time"] == 10
    assert sprint["meta"]["order"] == 2


# ── Pricing ──────────────────────────────────────────────────────────────────

PRICING_SAMPLE = """
<section class="pricing-grid">
  <!-- LUMIS:BEGIN pricing-tiers -->
  <div class="tier">
    <span class="name">Starter</span>
    <div>
      <span class="price">$<span class="ital" data-monthly="49" data-yearly="39">49</span><span class="unit">/ mo</span></span>
      <p class="desc">For solo founders and pre-seed teams.</p>
    </div>
    <ul>
      <li><span class="check">→</span><span>One full brand system</span></li>
      <li><span class="check">→</span><span>Email support · 48h response</span></li>
    </ul>
    <a href="contact.html" class="cta-tier">Start Starter</a>
  </div>
  <div class="tier hero-tier">
    <span class="badge">Most chosen</span>
    <span class="name">Studio</span>
    <div>
      <span class="price">$<span class="ital" data-monthly="249" data-yearly="199">249</span><span class="unit">/ mo</span></span>
      <p class="desc">For teams shipping product.</p>
    </div>
    <ul>
      <li><span class="check">→</span><span>Everything in Starter, no caps</span></li>
    </ul>
    <a href="contact.html" class="cta-tier">Start Studio</a>
  </div>
  <div class="tier">
    <span class="name">Scale</span>
    <div>
      <span class="price"><span class="ital">Custom</span></span>
      <p class="desc">For Series-B+ teams.</p>
    </div>
    <ul>
      <li><span class="check">→</span><span>Everything in Studio, dedicated</span></li>
    </ul>
    <a href="contact.html" class="cta-tier">Talk to a principal</a>
  </div>
  <!-- LUMIS:END pricing-tiers -->
</section>
"""


def test_extract_pricing_returns_three_tiers():
    items = extract_pricing_tiers(PRICING_SAMPLE)
    assert len(items) == 3

    starter = items[0]
    assert starter["slug"] == "starter"
    assert starter["meta"]["name"] == "Starter"
    assert starter["meta"]["hero"] is False
    assert starter["meta"]["badge"] is None
    assert starter["meta"]["price_prefix"] == "$"
    assert starter["meta"]["price"] == "49"
    assert starter["meta"]["price_unit"] == "/ mo"
    assert starter["meta"]["price_data"] == {"monthly": 49, "yearly": 39}
    assert "One full brand system" in starter["meta"]["bullets"]
    assert starter["meta"]["cta_label"] == "Start Starter"
    assert starter["meta"]["order"] == 1

    studio = items[1]
    assert studio["slug"] == "studio"
    assert studio["meta"]["hero"] is True
    assert studio["meta"]["badge"] == "Most chosen"
    assert studio["meta"]["price_data"] == {"monthly": 249, "yearly": 199}

    scale = items[2]
    assert scale["slug"] == "scale"
    assert scale["meta"]["price"] == "Custom"
    assert scale["meta"]["price_prefix"] == ""
    assert scale["meta"]["price_unit"] == ""
    assert scale["meta"]["price_data"] is None
    assert scale["meta"]["order"] == 3

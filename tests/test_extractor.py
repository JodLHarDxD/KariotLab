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

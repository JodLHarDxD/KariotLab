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

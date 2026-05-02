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

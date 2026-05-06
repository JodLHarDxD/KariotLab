"""Watch content/ and templates/ for changes, re-run build automatically."""
import time
from pathlib import Path
from . import config
from .orchestrate import build_all
from .indexer import build_index

_WATCH_DIRS = [config.CONTENT_DIR, config.TEMPLATES_DIR]
_POLL_INTERVAL = 1.0  # seconds


def _collect_mtimes(dirs: list[Path]) -> dict[Path, float]:
    mtimes: dict[Path, float] = {}
    for d in dirs:
        if not d.is_dir():
            continue
        for p in d.rglob("*"):
            if p.is_file():
                try:
                    mtimes[p] = p.stat().st_mtime
                except OSError:
                    pass
    return mtimes


def watch(rebuild_index: bool = True) -> None:
    print("Lumis watcher started. Press Ctrl-C to stop.")
    print(f"  Watching: {config.CONTENT_DIR}")
    print(f"            {config.TEMPLATES_DIR}")

    # Initial build
    build_all()
    if rebuild_index:
        build_index()
    print("✓ initial build done\n")

    prev = _collect_mtimes(_WATCH_DIRS)

    try:
        while True:
            time.sleep(_POLL_INTERVAL)
            curr = _collect_mtimes(_WATCH_DIRS)
            if curr != prev:
                added   = set(curr) - set(prev)
                removed = set(prev) - set(curr)
                changed = {p for p in curr if p in prev and curr[p] != prev[p]}
                touched = added | removed | changed
                print(f"  changed: {', '.join(p.name for p in sorted(touched)[:4])}")
                try:
                    build_all()
                    if rebuild_index:
                        build_index()
                    print("✓ rebuild done\n")
                except Exception as exc:
                    print(f"✗ build failed: {exc}\n")
                prev = curr
    except KeyboardInterrupt:
        print("\nWatcher stopped.")

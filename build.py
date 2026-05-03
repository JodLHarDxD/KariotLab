#!/usr/bin/env python
"""Lumis build CLI. See README.md for usage."""
import argparse
import sys

# Ensure UTF-8 output on Windows consoles whose default codepage is cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, Exception):
    pass

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

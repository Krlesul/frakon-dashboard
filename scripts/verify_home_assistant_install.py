#!/usr/bin/env python3
"""Verify an installed FRAKON Dashboard alpha inside a Home Assistant config directory."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

EXPECTED_VERSION = "0.16.0-alpha.1"
DOMAIN = "frakon_dashboard"
REQUIRED_FILES = (
    "__init__.py",
    "config_flow.py",
    "const.py",
    "frontend.py",
    "manifest.json",
    "responsive_storage.py",
    "responsive_websocket.py",
    "storage.py",
    "websocket.py",
    "frontend/frakon-dashboard.js",
)


def fail(message: str) -> None:
    print(f"ERROR: {message}")
    raise SystemExit(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=Path, help="Home Assistant config directory, e.g. /config")
    args = parser.parse_args()

    root = args.config.expanduser().resolve()
    integration = root / "custom_components" / DOMAIN
    if not integration.is_dir():
        fail(f"missing integration directory: {integration}")

    missing = [relative for relative in REQUIRED_FILES if not (integration / relative).is_file()]
    if missing:
        fail("missing required files: " + ", ".join(missing))

    manifest_path = integration / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - CLI diagnostic
        fail(f"cannot parse {manifest_path}: {exc}")

    if manifest.get("domain") != DOMAIN:
        fail(f"manifest domain is {manifest.get('domain')!r}, expected {DOMAIN!r}")
    if manifest.get("version") != EXPECTED_VERSION:
        fail(f"manifest version is {manifest.get('version')!r}, expected {EXPECTED_VERSION!r}")
    if manifest.get("config_flow") is not True:
        fail("manifest config_flow must be true")

    dependencies = set(manifest.get("dependencies") or [])
    for dependency in ("http", "lovelace"):
        if dependency not in dependencies:
            fail(f"manifest is missing dependency {dependency!r}")

    frontend = integration / "frontend" / "frakon-dashboard.js"
    size = frontend.stat().st_size
    if size < 10_000:
        fail(f"frontend bundle looks unexpectedly small: {size} bytes")
    source = frontend.read_text(encoding="utf-8", errors="ignore")
    for marker in (
        "frakon-canvas-dashboard-card",
        "frakon-dashboard-card",
        "frakon-energy-card",
    ):
        if marker not in source:
            fail(f"frontend bundle is missing registration marker {marker!r}")

    print("FRAKON Dashboard install self-check: OK")
    print(f"config: {root}")
    print(f"integration: {integration}")
    print(f"version: {EXPECTED_VERSION}")
    print(f"frontend bytes: {size}")
    print("resource URL: /frakon-dashboard/frakon-dashboard.js")
    return 0


if __name__ == "__main__":
    sys.exit(main())

from __future__ import annotations

import json
import os
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "dist" / "frakon_dashboard.zip"
PREFIX = "custom_components/frakon_dashboard/"

required = {
    f"{PREFIX}__init__.py",
    f"{PREFIX}build_info.py",
    f"{PREFIX}build-info.json",
    f"{PREFIX}build_websocket.py",
    f"{PREFIX}config_flow.py",
    f"{PREFIX}const.py",
    f"{PREFIX}frontend.py",
    f"{PREFIX}frontend/frakon-dashboard.js",
    f"{PREFIX}manifest.json",
    f"{PREFIX}responsive_storage.py",
    f"{PREFIX}responsive_websocket.py",
    f"{PREFIX}storage.py",
    f"{PREFIX}websocket.py",
    f"{PREFIX}translations/en.json",
    f"{PREFIX}translations/cs.json",
    f"{PREFIX}translations/de.json",
    f"{PREFIX}translations/sk.json",
    f"{PREFIX}translations/pl.json",
}

if not ZIP_PATH.is_file():
    raise SystemExit(f"Missing HACS release archive: {ZIP_PATH}")

with ZipFile(ZIP_PATH) as archive:
    names = set(archive.namelist())
    missing = sorted(required - names)
    if missing:
        raise SystemExit("HACS release archive is incomplete:\n- " + "\n- ".join(missing))

    manifest = json.loads(archive.read(f"{PREFIX}manifest.json"))
    package = json.loads((ROOT / "package.json").read_text())
    package_version = package.get("version")
    if manifest.get("version") != package_version:
        raise SystemExit(
            f"Packaged manifest version {manifest.get('version')!r} does not match package version {package_version!r}"
        )

    build_info = json.loads(archive.read(f"{PREFIX}build-info.json"))
    source_commit = build_info.get("sourceCommit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        raise SystemExit("Packaged build-info.json is missing sourceCommit")
    expected_commit = os.environ.get("GITHUB_SHA")
    if expected_commit and source_commit != expected_commit:
        raise SystemExit(
            f"Packaged sourceCommit {source_commit!r} does not match GITHUB_SHA {expected_commit!r}"
        )

    frontend = archive.read(f"{PREFIX}frontend/frakon-dashboard.js")
    if len(frontend) < 10_000:
        raise SystemExit(f"Packaged frontend bundle is unexpectedly small: {len(frontend)} bytes")
    if b"frakon-canvas-dashboard-card" not in frontend:
        raise SystemExit("Packaged frontend does not register the FRAKON canvas dashboard card")
    if isinstance(package_version, str) and package_version.encode() not in frontend:
        raise SystemExit("Packaged frontend does not contain the embedded FRAKON version")
    if source_commit != "development" and source_commit.encode() not in frontend:
        raise SystemExit("Packaged frontend does not contain the embedded source commit")

print(f"HACS release archive verified: {ZIP_PATH.name} ({ZIP_PATH.stat().st_size} bytes)")

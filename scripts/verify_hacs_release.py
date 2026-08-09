from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "dist" / "frakon_dashboard.zip"
PREFIX = "custom_components/frakon_dashboard/"

required = {
    f"{PREFIX}__init__.py",
    f"{PREFIX}config_flow.py",
    f"{PREFIX}const.py",
    f"{PREFIX}frontend.py",
    f"{PREFIX}frontend/frakon-dashboard.js",
    f"{PREFIX}manifest.json",
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
    if manifest.get("version") != package.get("version"):
        raise SystemExit(
            f"Packaged manifest version {manifest.get('version')!r} does not match package version {package.get('version')!r}"
        )

    frontend = archive.read(f"{PREFIX}frontend/frakon-dashboard.js")
    if len(frontend) < 10_000:
        raise SystemExit(f"Packaged frontend bundle is unexpectedly small: {len(frontend)} bytes")
    if b"frakon-canvas-dashboard-card" not in frontend:
        raise SystemExit("Packaged frontend does not register the FRAKON canvas dashboard card")

print(f"HACS release archive verified: {ZIP_PATH.name} ({ZIP_PATH.stat().st_size} bytes)")

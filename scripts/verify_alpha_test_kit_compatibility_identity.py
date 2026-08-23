from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "dist" / "frakon-dashboard-alpha-test-kit.zip"
HACS = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
EXPECTED_MINIMUM = "2025.1.0"
EXPECTED_ARCHIVE_LAYOUT = "integration-files-at-archive-root"

if HACS.get("homeassistant") != EXPECTED_MINIMUM:
    raise SystemExit(
        "Alpha Test Kit compatibility identity failed: "
        f"hacs.json declares {HACS.get('homeassistant')!r}, expected {EXPECTED_MINIMUM!r}"
    )
if not KIT.is_file():
    raise SystemExit(f"Alpha Test Kit compatibility identity failed: missing {KIT}")

with ZipFile(KIT) as archive:
    names = set(archive.namelist())
    for required in ("alpha-test-kit.json", "README.txt", "frakon_dashboard.zip"):
        if required not in names:
            raise SystemExit(
                f"Alpha Test Kit compatibility identity failed: missing {required}"
            )
    manifest = json.loads(archive.read("alpha-test-kit.json"))
    readme = archive.read("README.txt").decode("utf-8")

minimum = manifest.get("minimumHomeAssistant")
if minimum != EXPECTED_MINIMUM:
    raise SystemExit(
        "Alpha Test Kit compatibility identity failed: "
        f"minimumHomeAssistant={minimum!r}, expected {EXPECTED_MINIMUM!r}"
    )
archive_layout = manifest.get("integrationArchiveLayout")
if archive_layout != EXPECTED_ARCHIVE_LAYOUT:
    raise SystemExit(
        "Alpha Test Kit compatibility identity failed: "
        f"integrationArchiveLayout={archive_layout!r}, expected {EXPECTED_ARCHIVE_LAYOUT!r}"
    )
if f"Minimum Home Assistant Core: {EXPECTED_MINIMUM}" not in readme:
    raise SystemExit(
        "Alpha Test Kit compatibility identity failed: README does not expose the minimum Home Assistant version"
    )
if "Home Assistant minimum compatibility: OK (2025.1.0+)" not in readme:
    raise SystemExit(
        "Alpha Test Kit compatibility identity failed: README is missing the compatibility self-check marker"
    )
for marker in (
    "Create /config/custom_components/frakon_dashboard",
    "manifest.json and __init__.py are at the ZIP root",
    "not under a nested custom_components/frakon_dashboard directory",
):
    if marker not in readme:
        raise SystemExit(
            f"Alpha Test Kit compatibility identity failed: README is missing HACS root-layout marker {marker!r}"
        )

print(
    "Alpha Test Kit Home Assistant compatibility identity: OK "
    f"({EXPECTED_MINIMUM}+; {EXPECTED_ARCHIVE_LAYOUT})"
)

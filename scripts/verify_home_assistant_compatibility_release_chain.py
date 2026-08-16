from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_MINIMUM = "2025.1.0"
EXPECTED_MARKER = "Home Assistant minimum compatibility: OK (2025.1.0+)"


def text(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f"Home Assistant compatibility release chain failed: missing {relative}")
    return path.read_text(encoding="utf-8")


def require(relative: str, *markers: str) -> None:
    source = text(relative)
    missing = [marker for marker in markers if marker not in source]
    if missing:
        raise SystemExit(
            f"Home Assistant compatibility release chain failed: {relative} is missing markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


hacs = json.loads(text("hacs.json"))
if hacs.get("homeassistant") != EXPECTED_MINIMUM:
    raise SystemExit(
        "Home Assistant compatibility release chain failed: "
        f"hacs.json minimum is {hacs.get('homeassistant')!r}, expected {EXPECTED_MINIMUM!r}"
    )

frontend = text("custom_components/frakon_dashboard/frontend.py")
if "LOVELACE_DATA" in frontend:
    raise SystemExit(
        "Home Assistant compatibility release chain failed: frontend.py uses the newer-only LOVELACE_DATA symbol"
    )
for marker in (
    "DOMAIN as LOVELACE_DOMAIN",
    "def _lovelace_resource_state",
    'lovelace.get("resource_mode", lovelace.get("mode"))',
    'getattr(lovelace, "resource_mode", getattr(lovelace, "mode", None))',
    "await collection.async_get_info()",
    "HA 2025.1 minimum",
):
    if marker not in frontend:
        raise SystemExit(
            f"Home Assistant compatibility release chain failed: frontend.py is missing {marker!r}"
        )

require(
    "scripts/verify_home_assistant_minimum_compatibility.py",
    'EXPECTED_MINIMUM = "2025.1.0"',
    "Home Assistant 2025.1 Lovelace dict shape is not supported",
    "Modern Home Assistant LovelaceData/HassKey shape is not supported",
    "HA 2025.1 storage-mode frontend registration did not succeed",
    'print(f"Home Assistant minimum compatibility: OK ({EXPECTED_MINIMUM}+)"',
)
require(
    "scripts/verify_hacs_release.py",
    'EXPECTED_MINIMUM_HOME_ASSISTANT = "2025.1.0"',
    "Packaged frontend helper uses LOVELACE_DATA",
    "HA 2025.1 compatibility marker",
)
require(
    "scripts/verify_home_assistant_install.py",
    'MINIMUM_HOME_ASSISTANT = "2025.1.0"',
    'version_file = root / ".HA_VERSION"',
    "parsed_home_assistant_version < MINIMUM_HOME_ASSISTANT_TUPLE",
    "Home Assistant Core version:",
    "frontend helper uses a Lovelace symbol unavailable on the declared HA 2025.1 minimum",
    EXPECTED_MARKER,
)
require(
    "scripts/verify_alpha_test_kit.py",
    "Embedded frontend helper is incompatible with the declared HA 2025.1 minimum",
    EXPECTED_MARKER,
)
require(
    "scripts/build_alpha_test_kit.py",
    'MINIMUM_HOME_ASSISTANT = str(HACS.get("homeassistant", ""))',
    '"minimumHomeAssistant": MINIMUM_HOME_ASSISTANT',
    "Minimum Home Assistant Core: {MINIMUM_HOME_ASSISTANT}",
    EXPECTED_MARKER,
    "Home Assistant 2025.1 dictionary shape",
)
require(
    "scripts/verify_alpha_test_kit_compatibility_identity.py",
    'EXPECTED_MINIMUM = "2025.1.0"',
    'manifest.get("minimumHomeAssistant")',
    "Minimum Home Assistant Core: {EXPECTED_MINIMUM}",
    "Alpha Test Kit Home Assistant compatibility identity: OK",
)
require(
    "docs/home-assistant-alpha-test.md",
    EXPECTED_MARKER,
    "Home Assistant Core 2025.1.0 or newer",
    "iot_class=calculated",
)
require(
    "docs/home-assistant-alpha-test-report-template.md",
    EXPECTED_MARKER,
    "must be 2025.1.0 or newer",
    "iot_class: calculated",
)
require(
    "README.md",
    "declared minimum supported Home Assistant Core version is **2025.1.0**",
    EXPECTED_MARKER,
    "iot_class=calculated",
)
require(
    ".github/workflows/ci.yml",
    "python scripts/verify_home_assistant_minimum_compatibility.py",
    "python scripts/verify_home_assistant_compatibility_release_chain.py",
    "python scripts/verify_alpha_test_kit_compatibility_identity.py",
    "2024.12.5",
    "2026.8.0",
    "install self-check accepted Home Assistant below the declared minimum",
)

print("Home Assistant compatibility release chain: OK")

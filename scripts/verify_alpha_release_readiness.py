from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = json.loads((ROOT / "package.json").read_text())
HACS = json.loads((ROOT / "hacs.json").read_text())
HA_MANIFEST = json.loads((ROOT / "custom_components/frakon_dashboard/manifest.json").read_text())
VITE = (ROOT / "vite.config.ts").read_text()
INDEX = (ROOT / "src/index.ts").read_text()
INTEGRATION_ROOT = ROOT / "custom_components/frakon_dashboard"
INIT_SOURCE = (INTEGRATION_ROOT / "__init__.py").read_text()
CONST_SOURCE = (INTEGRATION_ROOT / "const.py").read_text()
FRONTEND_HELPER = INTEGRATION_ROOT / "frontend.py"
FRONTEND_HELPER_SOURCE = FRONTEND_HELPER.read_text() if FRONTEND_HELPER.is_file() else ""
BUILD_INFO_PROVIDER = INTEGRATION_ROOT / "build_info.py"
BUILD_INFO_WEBSOCKET = INTEGRATION_ROOT / "build_websocket.py"
RELEASE_PACKAGER = ROOT / "scripts/build_hacs_release.py"
INSTALL_SELF_CHECK = ROOT / "scripts/verify_home_assistant_install.py"

errors: list[str] = []

package_version = str(PACKAGE.get("version", ""))
manifest_version = str(HA_MANIFEST.get("version", ""))
if package_version != manifest_version:
    errors.append(f"version mismatch: package.json={package_version!r}, HA manifest={manifest_version!r}")

runtime_version_match = re.search(r'^INTEGRATION_VERSION\s*=\s*["\']([^"\']+)["\']', CONST_SOURCE, re.MULTILINE)
runtime_version = runtime_version_match.group(1) if runtime_version_match else ""
if runtime_version != package_version:
    errors.append(f"runtime integration version mismatch: const.py={runtime_version!r}, package.json={package_version!r}")

if HA_MANIFEST.get("domain") != "frakon_dashboard":
    errors.append("HA manifest domain must be frakon_dashboard")
if HA_MANIFEST.get("config_flow") is not True:
    errors.append("HA manifest must enable config_flow")
if HA_MANIFEST.get("single_config_entry") is not True:
    errors.append("HA manifest must declare single_config_entry")
if set(HA_MANIFEST.get("dependencies", [])) != {"http", "lovelace"}:
    errors.append("HA manifest must depend on http and lovelace for bundled frontend registration")
if HA_MANIFEST.get("issue_tracker") != "https://github.com/Krlesul/frakon-dashboard/issues":
    errors.append("HA manifest must expose the GitHub issue tracker required by HACS")

if HACS.get("zip_release") is not True:
    errors.append("HACS must use zip_release so the built frontend is bundled with the integration")
if HACS.get("hide_default_branch") is not True:
    errors.append("HACS default branch must be hidden because source branches do not contain the built frontend bundle")
if HACS.get("filename") != "frakon_dashboard.zip":
    errors.append(f"HACS filename must be frakon_dashboard.zip, got {HACS.get('filename')!r}")

if not re.search(r"fileName:\s*\(\)\s*=>\s*['\"]frakon-dashboard\.js['\"]", VITE):
    errors.append("Vite library output must stay frakon-dashboard.js")
if "entry: 'src/index.ts'" not in VITE and 'entry: "src/index.ts"' not in VITE:
    errors.append("Vite library entry must stay src/index.ts")

required_card_imports = [
    "./cards/frakon-card",
    "./cards/sensor/sensor-card",
    "./cards/room/room-card",
    "./cards/switch/switch-card",
    "./cards/action/action-card",
    "./cards/light/light-card",
    "./cards/climate/climate-card",
    "./cards/fan/fan-card",
    "./cards/binary-sensor/binary-sensor-card",
    "./cards/cover/cover-card",
    "./cards/lock/lock-card",
    "./cards/camera/camera-card",
    "./cards/media/media-player-card",
    "./cards/energy/energy-card",
    "./cards/vehicle/vehicle-card",
    "./dashboard/dashboard-card",
    "./dashboard/canvas-dashboard-card",
]
for import_path in required_card_imports:
    if import_path not in INDEX:
        errors.append(f"production entrypoint is missing {import_path}")

if not FRONTEND_HELPER.is_file():
    errors.append("bundled frontend runtime helper is missing")
elif "?v={INTEGRATION_VERSION}" not in FRONTEND_HELPER_SOURCE:
    errors.append("bundled frontend resource URL must be cache-busted with INTEGRATION_VERSION")
if not BUILD_INFO_PROVIDER.is_file():
    errors.append("runtime build-info provider is missing")
if not BUILD_INFO_WEBSOCKET.is_file():
    errors.append("runtime build-info WebSocket endpoint is missing")
if "from .build_websocket import register_build_info_command" not in INIT_SOURCE:
    errors.append("integration __init__ must import register_build_info_command")
if "register_build_info_command(hass)" not in INIT_SOURCE:
    errors.append("integration __init__ must register the build-info WebSocket command")
if not RELEASE_PACKAGER.is_file():
    errors.append("HACS release packager is missing")
if not INSTALL_SELF_CHECK.is_file():
    errors.append("Home Assistant install self-check is missing")

if not package_version or "alpha" not in package_version:
    errors.append("current release readiness policy requires an explicit alpha package version")

if errors:
    raise SystemExit("Alpha release readiness failed:\n- " + "\n- ".join(errors))

print(f"Alpha release readiness OK: {package_version}")

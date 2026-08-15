from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "custom_components/frakon_dashboard/frontend.py"
HACS = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
EXPECTED_MINIMUM = "2025.1.0"
PACKAGE = "frakon_dashboard_minimum_compat"

if HACS.get("homeassistant") != EXPECTED_MINIMUM:
    raise SystemExit(
        "Home Assistant minimum compatibility failed: "
        f"hacs.json declares {HACS.get('homeassistant')!r}, expected {EXPECTED_MINIMUM!r}"
    )

source = FRONTEND.read_text(encoding="utf-8")
for forbidden in ("LOVELACE_DATA",):
    if forbidden in source:
        raise SystemExit(
            f"Home Assistant minimum compatibility failed: frontend.py imports/uses unavailable 2025.1 symbol {forbidden}"
        )
for marker in (
    "DOMAIN as LOVELACE_DOMAIN",
    "def _lovelace_resource_state",
    'lovelace.get("resource_mode", lovelace.get("mode"))',
    'getattr(lovelace, "resource_mode", getattr(lovelace, "mode", None))',
    "await collection.async_get_info()",
    "HA 2025.1 minimum",
):
    if marker not in source:
        raise SystemExit(
            f"Home Assistant minimum compatibility failed: frontend.py is missing marker {marker!r}"
        )

# Load the real frontend.py against tiny Home Assistant stubs so the compatibility
# helper is executed without requiring Home Assistant in CI.
package = ModuleType(PACKAGE)
package.__path__ = [str(FRONTEND.parent)]  # type: ignore[attr-defined]
sys.modules[PACKAGE] = package

homeassistant = ModuleType("homeassistant")
components = ModuleType("homeassistant.components")
http = ModuleType("homeassistant.components.http")
lovelace = ModuleType("homeassistant.components.lovelace")
lovelace_const = ModuleType("homeassistant.components.lovelace.const")
ha_const = ModuleType("homeassistant.const")
core = ModuleType("homeassistant.core")

class StaticPathConfig:
    def __init__(self, url_path: str, path: str, cache_headers: bool = True) -> None:
        self.url_path = url_path
        self.path = path
        self.cache_headers = cache_headers

class HomeAssistant:
    pass

http.StaticPathConfig = StaticPathConfig  # type: ignore[attr-defined]
lovelace_const.CONF_RESOURCE_TYPE_WS = "res_type"  # type: ignore[attr-defined]
lovelace_const.DOMAIN = "lovelace"  # type: ignore[attr-defined]
lovelace_const.MODE_STORAGE = "storage"  # type: ignore[attr-defined]
ha_const.CONF_ID = "id"  # type: ignore[attr-defined]
ha_const.CONF_TYPE = "type"  # type: ignore[attr-defined]
ha_const.CONF_URL = "url"  # type: ignore[attr-defined]
core.HomeAssistant = HomeAssistant  # type: ignore[attr-defined]

for name, module in (
    ("homeassistant", homeassistant),
    ("homeassistant.components", components),
    ("homeassistant.components.http", http),
    ("homeassistant.components.lovelace", lovelace),
    ("homeassistant.components.lovelace.const", lovelace_const),
    ("homeassistant.const", ha_const),
    ("homeassistant.core", core),
):
    sys.modules[name] = module

integration_const = ModuleType(f"{PACKAGE}.const")
integration_const.FRONTEND_FILENAME = "frakon-dashboard.js"  # type: ignore[attr-defined]
integration_const.FRONTEND_URL_PATH = "/frakon-dashboard"  # type: ignore[attr-defined]
integration_const.INTEGRATION_VERSION = "test"  # type: ignore[attr-defined]
sys.modules[integration_const.__name__] = integration_const

spec = importlib.util.spec_from_file_location(f"{PACKAGE}.frontend", FRONTEND)
if spec is None or spec.loader is None:
    raise SystemExit("Home Assistant minimum compatibility failed: cannot load frontend.py")
frontend = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = frontend
spec.loader.exec_module(frontend)
state = frontend._lovelace_resource_state

old_collection = object()
old_hass = SimpleNamespace(
    data={
        "lovelace": {
            "mode": "storage",
            "resources": old_collection,
        }
    }
)
if state(old_hass) != ("storage", old_collection):
    raise SystemExit("Home Assistant 2025.1 Lovelace dict shape is not supported")

class HassKey(str):
    """Mirror Home Assistant's runtime HassKey behavior."""

modern_collection = object()
modern_data = SimpleNamespace(resource_mode="storage", resources=modern_collection)
modern_hass = SimpleNamespace(data={HassKey("lovelace"): modern_data})
if state(modern_hass) != ("storage", modern_collection):
    raise SystemExit("Modern Home Assistant LovelaceData/HassKey shape is not supported")

modern_yaml = SimpleNamespace(resource_mode="yaml", resources=modern_collection)
if state(SimpleNamespace(data={HassKey("lovelace"): modern_yaml})) != ("yaml", modern_collection):
    raise SystemExit("Modern Lovelace resource_mode is not preserved")

if state(SimpleNamespace(data={})) is not None:
    raise SystemExit("Missing Lovelace state must remain non-fatal")
if state(SimpleNamespace(data={"lovelace": {"mode": "storage"}})) is not None:
    raise SystemExit("Incomplete legacy Lovelace state must fail closed")

print(f"Home Assistant minimum compatibility: OK ({EXPECTED_MINIMUM}+)" )

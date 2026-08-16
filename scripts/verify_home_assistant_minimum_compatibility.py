from __future__ import annotations

import asyncio
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import ModuleType, SimpleNamespace
from typing import Any

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
# path is executed without requiring Home Assistant in CI.
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


class FakeHTTP:
    def __init__(self) -> None:
        self.static_configs: list[StaticPathConfig] = []

    async def async_register_static_paths(self, configs: list[StaticPathConfig]) -> None:
        self.static_configs.extend(configs)


class FakeCollection:
    def __init__(self, items: list[dict[str, Any]] | None = None) -> None:
        self.items = list(items or [])
        self.info_calls = 0
        self.created: list[dict[str, Any]] = []
        self.updated: list[tuple[str, dict[str, Any]]] = []

    async def async_get_info(self) -> dict[str, int]:
        self.info_calls += 1
        return {"resources": len(self.items)}

    def async_items(self) -> list[dict[str, Any]]:
        return self.items

    async def async_create_item(self, data: dict[str, Any]) -> None:
        self.created.append(dict(data))

    async def async_update_item(self, item_id: str, data: dict[str, Any]) -> None:
        self.updated.append((item_id, dict(data)))


async def exercise_registration(lovelace_state: object) -> tuple[bool, FakeHTTP]:
    fake_http = FakeHTTP()
    hass = SimpleNamespace(data={HassKey("lovelace"): lovelace_state}, http=fake_http)
    result = await frontend.async_register_frontend(hass)
    return result, fake_http


with tempfile.TemporaryDirectory(prefix="frakon-ha-minimum-") as temp_dir:
    bundle = Path(temp_dir) / "frakon-dashboard.js"
    bundle.write_text("// minimum compatibility probe\n", encoding="utf-8")
    original_frontend_file_path = frontend.frontend_file_path
    frontend.frontend_file_path = lambda: bundle
    try:
        legacy_collection = FakeCollection()
        result, fake_http = asyncio.run(
            exercise_registration({"mode": "storage", "resources": legacy_collection})
        )
        if result is not True:
            raise SystemExit("HA 2025.1 storage-mode frontend registration did not succeed")
        if legacy_collection.info_calls != 1:
            raise SystemExit("HA 2025.1 storage collection was not loaded before inspection")
        if legacy_collection.created != [
            {
                "res_type": "module",
                "url": "/frakon-dashboard/frakon-dashboard.js?v=test",
            }
        ]:
            raise SystemExit("HA 2025.1 storage-mode resource creation is incompatible")
        if legacy_collection.updated:
            raise SystemExit("HA 2025.1 fresh resource registration unexpectedly updated an item")
        if len(fake_http.static_configs) != 1:
            raise SystemExit("HA 2025.1 static frontend path was not registered")
        static_config = fake_http.static_configs[0]
        if static_config.url_path != "/frakon-dashboard" or static_config.cache_headers is not False:
            raise SystemExit("HA 2025.1 static path registration contract drifted")

        modern_existing = FakeCollection(
            [
                {
                    "id": "frakon-old",
                    "type": "js",
                    "url": "/frakon-dashboard/frakon-dashboard.js?v=old",
                }
            ]
        )
        modern_state = SimpleNamespace(resource_mode="storage", resources=modern_existing)
        result, _ = asyncio.run(exercise_registration(modern_state))
        if result is not True:
            raise SystemExit("Modern storage-mode frontend registration did not succeed")
        if modern_existing.created:
            raise SystemExit("Modern existing FRAKON resource was duplicated")
        if modern_existing.updated != [
            (
                "frakon-old",
                {
                    "res_type": "module",
                    "url": "/frakon-dashboard/frakon-dashboard.js?v=test",
                },
            )
        ]:
            raise SystemExit("Modern stale FRAKON resource was not repaired canonically")

        yaml_collection = FakeCollection()
        yaml_state = SimpleNamespace(resource_mode="yaml", resources=yaml_collection)
        result, yaml_http = asyncio.run(exercise_registration(yaml_state))
        if result is not True:
            raise SystemExit("YAML resource mode must remain a non-fatal manual-registration path")
        if yaml_collection.info_calls or yaml_collection.created or yaml_collection.updated:
            raise SystemExit("YAML resource mode must not mutate Lovelace resource storage")
        if len(yaml_http.static_configs) != 1:
            raise SystemExit("YAML mode must still serve the bundled static frontend")
    finally:
        frontend.frontend_file_path = original_frontend_file_path

print(f"Home Assistant minimum compatibility: OK ({EXPECTED_MINIMUM}+)")

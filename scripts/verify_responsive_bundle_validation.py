from __future__ import annotations

import importlib.util
import sys
from copy import deepcopy
from pathlib import Path
from types import ModuleType
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MODULE_DIR = ROOT / "custom_components" / "frakon_dashboard"
PACKAGE = "frakon_dashboard_validation_contract"


def load_module(name: str) -> ModuleType:
    path = MODULE_DIR / f"{name}.py"
    spec = importlib.util.spec_from_file_location(f"{PACKAGE}.{name}", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load validation module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


package = ModuleType(PACKAGE)
package.__path__ = [str(MODULE_DIR)]  # type: ignore[attr-defined]
sys.modules[PACKAGE] = package
const = load_module("const")
load_module("document_validation")
validation = load_module("responsive_bundle_validation")

validate_bundle = validation.validate_responsive_bundle
validate_envelope = validation.validate_responsive_revision_envelope
MAX_SERIALIZED_BYTES = const.RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES
ValidationError = validation.ResponsiveBundleValidationError


def canvas_document(breakpoint: str = "desktop") -> dict[str, Any]:
    return {
        "version": 2,
        "id": "home",
        "title": "Home",
        "breakpoint": breakpoint,
        "layout": {
            "mode": "canvas",
            "width": 1200,
            "minHeight": 800,
            "snap": {"enabled": True, "size": 8},
        },
        "items": [
            {
                "id": "light",
                "card": {"type": "custom:frakon-light-card"},
                "frame": {"x": 20, "y": 20, "width": 280, "height": 180},
            },
            {
                "id": "camera",
                "card": {"type": "custom:frakon-camera-card"},
                "frame": {"x": 340, "y": 20, "width": 360, "height": 240},
            },
        ],
        "constraints": [
            {
                "id": "light-left-camera",
                "kind": "right-of",
                "sourceId": "light",
                "targetId": "camera",
                "gap": 40,
            }
        ],
    }


def valid_bundle() -> dict[str, Any]:
    return {
        "kind": "responsive-canvas-v2",
        "id": "home",
        "title": "Home responsive",
        "defaultBreakpoint": "desktop",
        "documents": {"desktop": canvas_document()},
    }


def valid_envelope() -> dict[str, Any]:
    return {
        "document": valid_bundle(),
        "revision": "rev-2",
        "parentRevision": "rev-1",
        "updatedAt": 1_700_000_000_000,
        "clientId": "tablet",
    }


def expect_invalid_bundle(payload: dict[str, Any], label: str) -> None:
    try:
        validate_bundle(payload)
    except ValidationError:
        return
    raise SystemExit(f"Responsive bundle validator accepted invalid fixture: {label}")


def expect_invalid_envelope(payload: dict[str, Any], label: str) -> None:
    try:
        validate_envelope(payload)
    except ValidationError:
        return
    raise SystemExit(f"Responsive revision validator accepted invalid fixture: {label}")


bundle = valid_bundle()
if validate_bundle(bundle) != bundle:
    raise SystemExit("Responsive bundle validator must return a valid payload unchanged.")
envelope = valid_envelope()
if validate_envelope(envelope, "home") != envelope:
    raise SystemExit("Responsive revision validator must return a valid envelope unchanged.")

payload = valid_bundle()
payload["documents"]["desktop"]["items"][0]["hidden"] = False
expect_invalid_bundle(payload, "persisted v2 hidden field")

payload = valid_bundle()
del payload["documents"]["desktop"]["items"][0]["card"]["type"]
expect_invalid_bundle(payload, "missing v2 card.type")

payload = valid_bundle()
payload["documents"]["desktop"]["layout"]["snap"] = {"enabled": True, "size": 0}
expect_invalid_bundle(payload, "invalid v2 snap settings")

payload = valid_bundle()
payload["documents"]["desktop"]["items"][0]["minWidth"] = 300
expect_invalid_bundle(payload, "frame width below canonical minWidth")

payload = valid_bundle()
payload["documents"]["desktop"]["items"][1]["maxHeight"] = 200
expect_invalid_bundle(payload, "frame height above canonical maxHeight")

payload = valid_bundle()
payload["documents"]["desktop"]["items"][0]["maxWidth"] = 1300
expect_invalid_bundle(payload, "item maxWidth outside canvas")

payload = valid_bundle()
payload["documents"]["desktop"]["id"] = "other"
expect_invalid_bundle(payload, "breakpoint dashboard id substitution")

payload = valid_bundle()
payload["documents"]["desktop"]["breakpoint"] = "tablet"
expect_invalid_bundle(payload, "breakpoint key substitution")

payload = valid_bundle()
payload["documents"]["desktop"]["constraints"] = [
    {
        "id": "a-to-b",
        "kind": "right-of",
        "sourceId": "light",
        "targetId": "camera",
    },
    {
        "id": "b-to-a",
        "kind": "right-of",
        "sourceId": "camera",
        "targetId": "light",
    },
]
expect_invalid_bundle(payload, "enabled constraint dependency cycle")

payload = valid_bundle()
payload["defaultBreakpoint"] = "mobile"
expect_invalid_bundle(payload, "missing default breakpoint document")

payload = valid_bundle()
payload["documents"]["desktop"]["items"][0]["card"]["oversized"] = "x" * MAX_SERIALIZED_BYTES
expect_invalid_bundle(payload, "responsive bundle above serialized byte limit")

payload = valid_envelope()
payload["updatedAt"] = 10.5
expect_invalid_envelope(payload, "fractional updatedAt")

payload = valid_envelope()
payload["updatedAt"] = True
expect_invalid_envelope(payload, "boolean updatedAt")

payload = valid_envelope()
payload["updatedAt"] = 9_007_199_254_740_992
expect_invalid_envelope(payload, "updatedAt above JavaScript safe integer")

payload = valid_envelope()
payload["parentRevision"] = payload["revision"]
expect_invalid_envelope(payload, "self-parenting revision")

try:
    validate_envelope(valid_envelope(), "other")
except ValidationError:
    pass
else:
    raise SystemExit("Responsive revision validator accepted dashboard-id substitution.")

print("Responsive bundle validation contract: OK")

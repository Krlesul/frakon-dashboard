from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "custom_components" / "frakon_dashboard" / "document_validation.py"


def load_validator() -> ModuleType:
    spec = importlib.util.spec_from_file_location("frakon_dashboard_document_validation", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load validator module: {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


validation = load_validator()
validate = validation.validate_dashboard_document
ValidationError = validation.DashboardDocumentValidationError


def valid_v1() -> dict[str, Any]:
    return {
        "version": 1,
        "id": "home",
        "title": "Home",
        "breakpoint": "desktop",
        "columns": 12,
        "rowHeight": 48,
        "gap": 12,
        "items": [
            {
                "id": "front",
                "card": {"type": "custom:frakon-card"},
                "x": 7,
                "y": 5,
                "w": 3,
                "h": 2,
            },
            {
                "id": "hidden",
                "card": {"type": "custom:frakon-sensor-card"},
                "x": 1,
                "y": 3,
                "w": 2,
                "h": 2,
                "hidden": True,
            },
        ],
        "constraints": [
            {
                "id": "hidden-left-front",
                "kind": "align-left",
                "sourceId": "hidden",
                "targetId": "front",
                "priority": 40,
            }
        ],
    }


def valid_v2() -> dict[str, Any]:
    return {
        "version": 2,
        "id": "canvas",
        "title": "Canvas",
        "breakpoint": "desktop",
        "layout": {
            "mode": "canvas",
            "width": 1200,
            "minHeight": 800,
            "snap": {"enabled": True, "size": 8},
        },
        "items": [
            {
                "id": "camera",
                "card": {"type": "custom:frakon-camera-card"},
                "frame": {"x": 40, "y": 60, "width": 320, "height": 220},
            }
        ],
    }


def expect_invalid(payload: dict[str, Any], label: str) -> None:
    try:
        validate(payload, {1, 2}, max_items=2000, max_constraints=4000)
    except ValidationError:
        return
    raise SystemExit(f"Validator accepted invalid fixture: {label}")


if validate(valid_v1(), {1, 2}) != valid_v1():
    raise SystemExit("Validator must return a valid v1 payload unchanged")
if validate(valid_v2(), {1, 2}) != valid_v2():
    raise SystemExit("Validator must return a valid v2 payload unchanged")

payload = valid_v1()
payload["items"].append(dict(payload["items"][0]))
expect_invalid(payload, "duplicate v1 item id")

payload = valid_v1()
payload["constraints"][0]["targetId"] = "missing"
expect_invalid(payload, "dangling v1 constraint")

payload = valid_v1()
payload["items"][1]["minW"] = None
expect_invalid(payload, "null optional v1 numeric field")

payload = valid_v1()
payload["items"][0]["x"] = 11
payload["items"][0]["w"] = 3
expect_invalid(payload, "v1 item outside grid")

payload = valid_v1()
payload["items"][0]["hidden"] = "yes"
expect_invalid(payload, "invalid v1 hidden flag")

payload = valid_v2()
payload["items"].append(dict(payload["items"][0]))
expect_invalid(payload, "duplicate v2 item id")

payload = valid_v2()
payload["layout"]["snap"] = {"enabled": True, "size": 0}
expect_invalid(payload, "invalid v2 snap settings")

payload = valid_v2()
payload["items"][0]["frame"] = {"x": 1100, "y": 0, "width": 200, "height": 100}
expect_invalid(payload, "v2 frame outside canvas")

try:
    validate(valid_v1(), {2})
except ValidationError:
    pass
else:
    raise SystemExit("Validator accepted v1 when readable versions only allowed v2")

print("Dashboard document validation contract: OK")

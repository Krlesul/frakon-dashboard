from __future__ import annotations

import importlib.util
from copy import deepcopy
from pathlib import Path
from types import ModuleType
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "custom_components" / "frakon_dashboard" / "document_validation.py"


def load_validator() -> ModuleType:
    spec = importlib.util.spec_from_file_location("frakon_dashboard_document_validation_size", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load validator module: {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


validation = load_validator()
validate = validation.validate_dashboard_document
ValidationError = validation.DashboardDocumentValidationError
LIMIT = validation.DEFAULT_MAX_SERIALIZED_BYTES


def valid_document(version: int) -> dict[str, Any]:
    if version == 1:
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
                    "id": "card",
                    "card": {"type": "custom:frakon-card"},
                    "x": 0,
                    "y": 0,
                    "w": 2,
                    "h": 2,
                }
            ],
        }
    return {
        "version": 2,
        "id": "home",
        "title": "Home",
        "breakpoint": "desktop",
        "layout": {
            "mode": "canvas",
            "width": 1200,
            "minHeight": 800,
            "snap": {"enabled": True, "size": 8},
        },
        "items": [
            {
                "id": "card",
                "card": {"type": "custom:frakon-card"},
                "frame": {"x": 0, "y": 0, "width": 240, "height": 160},
            }
        ],
    }


def expect_invalid(payload: dict[str, Any], label: str) -> None:
    try:
        validate(payload, {1, 2})
    except ValidationError:
        return
    raise SystemExit(f"Validator accepted invalid JSON/size fixture: {label}")


for version in (1, 2):
    baseline = valid_document(version)
    if validate(baseline, {1, 2}) != baseline:
        raise SystemExit(f"Validator changed valid v{version} payload")

    oversized = deepcopy(baseline)
    oversized["items"][0]["card"]["payload"] = "x" * LIMIT
    expect_invalid(oversized, f"oversized v{version} card payload")

    non_finite = deepcopy(baseline)
    non_finite["items"][0]["card"]["threshold"] = float("inf")
    expect_invalid(non_finite, f"non-finite v{version} nested card value")

print(f"Dashboard document size/JSON contract: OK ({LIMIT} bytes)")

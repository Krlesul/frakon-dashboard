from __future__ import annotations

import math
from typing import Any, Collection

BREAKPOINTS = {"mobile", "tablet", "desktop", "wide"}
CONSTRAINT_KINDS = {
    "align-left",
    "align-center-x",
    "align-right",
    "align-top",
    "align-center-y",
    "align-bottom",
    "below",
    "right-of",
    "match-width",
    "match-height",
}


class DashboardDocumentValidationError(ValueError):
    """Raised when a dashboard payload is structurally unsafe to persist."""


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _positive_number(value: Any) -> bool:
    return _finite_number(value) and value > 0


def _optional_finite(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or _finite_number(mapping[field])


def _optional_positive(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or _positive_number(mapping[field])


def _optional_bool(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or isinstance(mapping[field], bool)


def _require_identifier(value: Any, label: str, max_length: int = 128) -> str:
    if not isinstance(value, str) or not value or len(value) > max_length:
        raise DashboardDocumentValidationError(
            f"{label} must be a non-empty string up to {max_length} characters."
        )
    return value


def _validate_constraints(
    constraints: Any,
    item_ids: set[str],
    max_constraints: int,
) -> None:
    if constraints is None:
        return
    if not isinstance(constraints, list) or len(constraints) > max_constraints:
        raise DashboardDocumentValidationError(
            f"constraints must be a list with at most {max_constraints} entries."
        )

    constraint_ids: set[str] = set()
    for entry in constraints:
        if not isinstance(entry, dict):
            raise DashboardDocumentValidationError("constraints must contain objects.")
        constraint_id = _require_identifier(entry.get("id"), "constraint.id", 256)
        if constraint_id in constraint_ids:
            raise DashboardDocumentValidationError(f"Duplicate constraint id: {constraint_id}.")
        kind = entry.get("kind")
        if kind not in CONSTRAINT_KINDS:
            raise DashboardDocumentValidationError(
                f"Constraint {constraint_id} has unsupported kind {kind!r}."
            )
        source_id = _require_identifier(entry.get("sourceId"), f"constraint {constraint_id} sourceId")
        target_id = _require_identifier(entry.get("targetId"), f"constraint {constraint_id} targetId")
        if source_id == target_id:
            raise DashboardDocumentValidationError(
                f"Constraint {constraint_id} cannot reference the same item twice."
            )
        if source_id not in item_ids or target_id not in item_ids:
            raise DashboardDocumentValidationError(
                f"Constraint {constraint_id} references an unknown item."
            )
        for field in ("gap", "priority"):
            if not _optional_finite(entry, field):
                raise DashboardDocumentValidationError(
                    f"Constraint {constraint_id} has invalid {field}."
                )
        if not _optional_bool(entry, "enabled"):
            raise DashboardDocumentValidationError(
                f"Constraint {constraint_id} has invalid enabled flag."
            )
        constraint_ids.add(constraint_id)


def _validate_v1_item(item: Any, columns: float) -> str:
    if not isinstance(item, dict):
        raise DashboardDocumentValidationError("Version 1 items must be objects.")
    item_id = _require_identifier(item.get("id"), "item.id")
    card = item.get("card")
    if not isinstance(card, dict) or not isinstance(card.get("type"), str) or not card["type"]:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} requires card.type.")

    for field in ("x", "y", "w", "h"):
        if not _finite_number(item.get(field)):
            raise DashboardDocumentValidationError(
                f"Dashboard item {item_id} requires finite numeric {field}."
            )
    x = item["x"]
    y = item["y"]
    width = item["w"]
    height = item["h"]
    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > columns:
        raise DashboardDocumentValidationError(
            f"Dashboard item {item_id} geometry is outside the version 1 grid."
        )

    for field in ("minW", "minH", "maxW", "maxH"):
        if not _optional_positive(item, field):
            raise DashboardDocumentValidationError(f"Dashboard item {item_id} has invalid {field}.")
    if "minW" in item and "maxW" in item and item["minW"] > item["maxW"]:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} has minW greater than maxW.")
    if "minH" in item and "maxH" in item and item["minH"] > item["maxH"]:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} has minH greater than maxH.")
    if not _optional_bool(item, "locked") or not _optional_bool(item, "hidden"):
        raise DashboardDocumentValidationError(
            f"Dashboard item {item_id} has invalid locked/hidden state."
        )
    return item_id


def _validate_v1(document: dict[str, Any], max_items: int, max_constraints: int) -> None:
    if not isinstance(document.get("title"), str):
        raise DashboardDocumentValidationError("Version 1 dashboard requires title.")
    if document.get("breakpoint") not in BREAKPOINTS:
        raise DashboardDocumentValidationError("Version 1 dashboard requires a supported breakpoint.")
    columns = document.get("columns")
    row_height = document.get("rowHeight")
    gap = document.get("gap")
    if not _positive_number(columns):
        raise DashboardDocumentValidationError("Version 1 dashboard requires positive finite columns.")
    if not _positive_number(row_height):
        raise DashboardDocumentValidationError("Version 1 dashboard requires positive finite rowHeight.")
    if not _finite_number(gap) or gap < 0:
        raise DashboardDocumentValidationError("Version 1 dashboard requires non-negative finite gap.")

    items = document.get("items")
    if not isinstance(items, list) or len(items) > max_items:
        raise DashboardDocumentValidationError(f"items must be a list with at most {max_items} entries.")
    item_ids: set[str] = set()
    for item in items:
        item_id = _validate_v1_item(item, columns)
        if item_id in item_ids:
            raise DashboardDocumentValidationError(f"Duplicate dashboard item id: {item_id}.")
        item_ids.add(item_id)
    _validate_constraints(document.get("constraints"), item_ids, max_constraints)


def _validate_v2_item(item: Any, canvas_width: float) -> str:
    if not isinstance(item, dict):
        raise DashboardDocumentValidationError("Version 2 items must be objects.")
    item_id = _require_identifier(item.get("id"), "item.id")
    card = item.get("card")
    if not isinstance(card, dict) or not isinstance(card.get("type"), str) or not card["type"]:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} requires card.type.")
    frame = item.get("frame")
    if not isinstance(frame, dict):
        raise DashboardDocumentValidationError(f"Canvas item {item_id} requires frame.")
    for field in ("x", "y", "width", "height"):
        if not _finite_number(frame.get(field)):
            raise DashboardDocumentValidationError(
                f"Canvas item {item_id} requires finite frame.{field}."
            )
    if (
        frame["x"] < 0
        or frame["y"] < 0
        or frame["width"] <= 0
        or frame["height"] <= 0
        or frame["x"] + frame["width"] > canvas_width
    ):
        raise DashboardDocumentValidationError(f"Canvas item {item_id} frame is outside the canvas.")
    for field in ("minWidth", "minHeight", "maxWidth", "maxHeight"):
        if not _optional_positive(item, field):
            raise DashboardDocumentValidationError(f"Canvas item {item_id} has invalid {field}.")
    if "minWidth" in item and "maxWidth" in item and item["minWidth"] > item["maxWidth"]:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has minWidth greater than maxWidth.")
    if "minHeight" in item and "maxHeight" in item and item["minHeight"] > item["maxHeight"]:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has minHeight greater than maxHeight.")
    if not _optional_bool(item, "locked"):
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has invalid locked state.")
    return item_id


def _validate_v2(document: dict[str, Any], max_items: int, max_constraints: int) -> None:
    if not isinstance(document.get("title"), str):
        raise DashboardDocumentValidationError("Version 2 dashboard requires title.")
    if document.get("breakpoint") not in BREAKPOINTS:
        raise DashboardDocumentValidationError("Version 2 dashboard requires a supported breakpoint.")
    layout = document.get("layout")
    if not isinstance(layout, dict) or layout.get("mode") != "canvas":
        raise DashboardDocumentValidationError("Version 2 dashboard requires layout.mode=canvas.")
    width = layout.get("width")
    min_height = layout.get("minHeight")
    snap = layout.get("snap")
    if not _positive_number(width) or not _positive_number(min_height):
        raise DashboardDocumentValidationError("Version 2 canvas width/minHeight must be positive finite numbers.")
    if not isinstance(snap, dict) or not isinstance(snap.get("enabled"), bool) or not _positive_number(snap.get("size")):
        raise DashboardDocumentValidationError("Version 2 canvas requires valid snap settings.")

    items = document.get("items")
    if not isinstance(items, list) or len(items) > max_items:
        raise DashboardDocumentValidationError(f"items must be a list with at most {max_items} entries.")
    item_ids: set[str] = set()
    for item in items:
        item_id = _validate_v2_item(item, width)
        if item_id in item_ids:
            raise DashboardDocumentValidationError(f"Duplicate dashboard item id: {item_id}.")
        item_ids.add(item_id)
    _validate_constraints(document.get("constraints"), item_ids, max_constraints)


def validate_dashboard_document(
    document: Any,
    readable_versions: Collection[int],
    *,
    max_items: int = 2000,
    max_constraints: int = 4000,
) -> dict[str, Any]:
    """Return document unchanged when valid, otherwise raise a validation error."""
    if not isinstance(document, dict):
        raise DashboardDocumentValidationError("Dashboard document must be an object.")
    _require_identifier(document.get("id"), "dashboard.id")
    version = document.get("version")
    if version not in readable_versions:
        raise DashboardDocumentValidationError(f"Unsupported dashboard document version: {version}.")
    if version == 1:
        _validate_v1(document, max_items, max_constraints)
    elif version == 2:
        _validate_v2(document, max_items, max_constraints)
    else:
        raise DashboardDocumentValidationError(f"Unsupported dashboard document version: {version}.")
    return document

from __future__ import annotations

import json
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
DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000


class DashboardDocumentValidationError(ValueError):
    """Raised when a dashboard payload is structurally unsafe to persist."""


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _integer_number(value: Any) -> bool:
    return _finite_number(value) and float(value).is_integer()


def _positive_number(value: Any) -> bool:
    return _finite_number(value) and value > 0


def _positive_integer(value: Any) -> bool:
    return _integer_number(value) and value > 0


def _optional_finite(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or _finite_number(mapping[field])


def _optional_positive(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or _positive_number(mapping[field])


def _optional_positive_integer(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or _positive_integer(mapping[field])


def _optional_bool(mapping: dict[str, Any], field: str) -> bool:
    return field not in mapping or isinstance(mapping[field], bool)


def dashboard_serialized_bytes(value: Any) -> int | None:
    """Return compact UTF-8 JSON byte size, or None for unsafe JSON values."""
    try:
        serialized = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        )
        return len(serialized.encode("utf-8"))
    except (TypeError, ValueError, UnicodeEncodeError):
        return None


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


def _validate_v1_item(item: Any, columns: int) -> str:
    if not isinstance(item, dict):
        raise DashboardDocumentValidationError("Version 1 items must be objects.")
    item_id = _require_identifier(item.get("id"), "item.id")
    card = item.get("card")
    if not isinstance(card, dict) or not isinstance(card.get("type"), str) or not card["type"]:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} requires card.type.")

    for field in ("x", "y", "w", "h"):
        if not _integer_number(item.get(field)):
            raise DashboardDocumentValidationError(
                f"Dashboard item {item_id} requires integer {field}."
            )
    x = int(item["x"])
    y = int(item["y"])
    width = int(item["w"])
    height = int(item["h"])
    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > columns:
        raise DashboardDocumentValidationError(
            f"Dashboard item {item_id} geometry is outside the version 1 grid."
        )

    for field in ("minW", "minH", "maxW", "maxH"):
        if not _optional_positive_integer(item, field):
            raise DashboardDocumentValidationError(
                f"Dashboard item {item_id} has invalid integer {field}."
            )
    if "minW" in item and "maxW" in item and item["minW"] > item["maxW"]:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} has minW greater than maxW.")
    if "minH" in item and "maxH" in item and item["minH"] > item["maxH"]:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} has minH greater than maxH.")
    if "maxW" in item and item["maxW"] > columns:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} has maxW outside the grid.")
    if "minW" in item and item["minW"] > columns:
        raise DashboardDocumentValidationError(f"Dashboard item {item_id} has minW outside the grid.")

    min_width = int(item.get("minW", 1))
    max_width = int(item.get("maxW", columns))
    min_height = int(item.get("minH", 1))
    max_height = int(item["maxH"]) if "maxH" in item else max(min_height, 24)
    if width < min_width or width > max_width:
        raise DashboardDocumentValidationError(
            f"Dashboard item {item_id} width is outside its canonical min/max bounds."
        )
    if height < min_height or height > max_height:
        raise DashboardDocumentValidationError(
            f"Dashboard item {item_id} height is outside its canonical min/max bounds."
        )

    if not _optional_bool(item, "locked") or not _optional_bool(item, "hidden"):
        raise DashboardDocumentValidationError(
            f"Dashboard item {item_id} has invalid locked/hidden state."
        )
    return item_id


def _v1_items_overlap(first: dict[str, Any], second: dict[str, Any]) -> bool:
    return (
        first["x"] < second["x"] + second["w"]
        and first["x"] + first["w"] > second["x"]
        and first["y"] < second["y"] + second["h"]
        and first["y"] + first["h"] > second["y"]
    )


def _validate_v1(document: dict[str, Any], max_items: int, max_constraints: int) -> None:
    if not isinstance(document.get("title"), str):
        raise DashboardDocumentValidationError("Version 1 dashboard requires title.")
    if document.get("breakpoint") not in BREAKPOINTS:
        raise DashboardDocumentValidationError("Version 1 dashboard requires a supported breakpoint.")
    columns = document.get("columns")
    row_height = document.get("rowHeight")
    gap = document.get("gap")
    if not _positive_integer(columns):
        raise DashboardDocumentValidationError("Version 1 dashboard requires positive integer columns.")
    if not _positive_integer(row_height) or row_height < 24:
        raise DashboardDocumentValidationError("Version 1 dashboard requires integer rowHeight >= 24.")
    if not _integer_number(gap) or gap < 0:
        raise DashboardDocumentValidationError("Version 1 dashboard requires non-negative integer gap.")

    items = document.get("items")
    if not isinstance(items, list) or len(items) > max_items:
        raise DashboardDocumentValidationError(f"items must be a list with at most {max_items} entries.")
    item_ids: set[str] = set()
    for item in items:
        item_id = _validate_v1_item(item, int(columns))
        if item_id in item_ids:
            raise DashboardDocumentValidationError(f"Duplicate dashboard item id: {item_id}.")
        item_ids.add(item_id)

    for index, item in enumerate(items):
        for other in items[index + 1 :]:
            if _v1_items_overlap(item, other):
                raise DashboardDocumentValidationError(
                    f"Dashboard items {item['id']} and {other['id']} overlap in the version 1 grid."
                )

    _validate_constraints(document.get("constraints"), item_ids, max_constraints)


def _validate_v2_item(item: Any, canvas_width: float) -> str:
    if not isinstance(item, dict):
        raise DashboardDocumentValidationError("Version 2 items must be objects.")
    item_id = _require_identifier(item.get("id"), "item.id")
    if "hidden" in item:
        raise DashboardDocumentValidationError(
            f"Canvas item {item_id} cannot persist hidden state until native v2 hidden semantics are enabled."
        )
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

    min_width = item.get("minWidth")
    min_height = item.get("minHeight")
    max_width = item.get("maxWidth")
    max_height = item.get("maxHeight")
    if min_width is not None and min_width > canvas_width:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has minWidth outside the canvas.")
    if max_width is not None and max_width > canvas_width:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has maxWidth outside the canvas.")
    if min_width is not None and max_width is not None and min_width > max_width:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has minWidth greater than maxWidth.")
    if min_height is not None and max_height is not None and min_height > max_height:
        raise DashboardDocumentValidationError(f"Canvas item {item_id} has minHeight greater than maxHeight.")

    effective_min_width = min_width if min_width is not None else 1
    effective_max_width = max_width if max_width is not None else canvas_width
    effective_min_height = min_height if min_height is not None else 1
    effective_max_height = max_height if max_height is not None else _MAX_SAFE_INTEGER
    if frame["width"] < effective_min_width or frame["width"] > effective_max_width:
        raise DashboardDocumentValidationError(
            f"Canvas item {item_id} width is outside its canonical min/max bounds."
        )
    if frame["height"] < effective_min_height or frame["height"] > effective_max_height:
        raise DashboardDocumentValidationError(
            f"Canvas item {item_id} height is outside its canonical min/max bounds."
        )
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
    max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES,
) -> dict[str, Any]:
    """Return document unchanged when valid, otherwise raise a validation error."""
    if not isinstance(document, dict):
        raise DashboardDocumentValidationError("Dashboard document must be an object.")
    _require_identifier(document.get("id"), "dashboard.id")
    version = document.get("version")
    if not isinstance(version, int) or isinstance(version, bool) or version not in readable_versions:
        raise DashboardDocumentValidationError(f"Unsupported dashboard document version: {version}.")
    if "constraints" in document and document["constraints"] is None:
        raise DashboardDocumentValidationError(
            "constraints must be omitted or provided as a list; explicit null is not valid."
        )
    serialized_bytes = dashboard_serialized_bytes(document)
    if serialized_bytes is None:
        raise DashboardDocumentValidationError("Dashboard document is not safely JSON serializable.")
    if serialized_bytes > max_serialized_bytes:
        raise DashboardDocumentValidationError(
            f"Dashboard document exceeds the {max_serialized_bytes}-byte persistence limit."
        )
    if version == 1:
        _validate_v1(document, max_items, max_constraints)
    elif version == 2:
        _validate_v2(document, max_items, max_constraints)
    else:
        raise DashboardDocumentValidationError(f"Unsupported dashboard document version: {version}.")
    return document


_MAX_SAFE_INTEGER = 9_007_199_254_740_991

from __future__ import annotations

import json
from typing import Any

from .const import (
    READABLE_RESPONSIVE_BUNDLE_KINDS,
    RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
    RESPONSIVE_CANVAS_V2_MAX_ITEMS,
    RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
)
from .document_validation import DashboardDocumentValidationError, validate_dashboard_document

BREAKPOINTS = ("mobile", "tablet", "desktop", "wide")
_MAX_SAFE_INTEGER = 9_007_199_254_740_991


class ResponsiveBundleValidationError(ValueError):
    """Raised when a responsive canvas bundle or revision is unsafe to accept."""


def _require_identifier(value: Any, label: str, max_length: int) -> str:
    if not isinstance(value, str) or not value or len(value) > max_length:
        raise ResponsiveBundleValidationError(
            f"{label} must be a non-empty string up to {max_length} characters."
        )
    return value


def _require_safe_timestamp(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise ResponsiveBundleValidationError("updatedAt must be an integer.")
    if value < 0 or value > _MAX_SAFE_INTEGER:
        raise ResponsiveBundleValidationError("updatedAt must be a non-negative safe integer.")
    return value


def _has_enabled_constraint_cycle(document: dict[str, Any]) -> bool:
    edges: dict[str, list[str]] = {}
    for constraint in document.get("constraints", []):
        if constraint.get("enabled") is False:
            continue
        edges.setdefault(constraint["sourceId"], []).append(constraint["targetId"])

    state: dict[str, int] = {}

    def visit(node: str) -> bool:
        current = state.get(node, 0)
        if current == 1:
            return True
        if current == 2:
            return False
        state[node] = 1
        for target in edges.get(node, []):
            if visit(target):
                return True
        state[node] = 2
        return False

    return any(visit(node) for node in edges)


def validate_responsive_bundle(bundle: Any) -> dict[str, Any]:
    """Return a responsive bundle unchanged when it satisfies the alpha read contract."""
    if not isinstance(bundle, dict):
        raise ResponsiveBundleValidationError("Responsive dashboard bundle must be an object.")
    if bundle.get("kind") not in READABLE_RESPONSIVE_BUNDLE_KINDS:
        raise ResponsiveBundleValidationError(
            f"Unsupported responsive dashboard bundle kind: {bundle.get('kind')!r}."
        )

    dashboard_id = _require_identifier(bundle.get("id"), "responsive bundle id", 128)
    title = bundle.get("title")
    if not isinstance(title, str) or len(title) > 256:
        raise ResponsiveBundleValidationError("Responsive bundle title must be a string up to 256 characters.")

    documents = bundle.get("documents")
    if not isinstance(documents, dict) or not documents:
        raise ResponsiveBundleValidationError(
            "Responsive canvas bundle requires at least one breakpoint document."
        )
    if len(documents) > len(BREAKPOINTS):
        raise ResponsiveBundleValidationError(
            "Responsive canvas bundle contains too many breakpoint documents."
        )

    default_breakpoint = bundle.get("defaultBreakpoint")
    if default_breakpoint not in BREAKPOINTS or default_breakpoint not in documents:
        raise ResponsiveBundleValidationError(
            "Responsive bundle defaultBreakpoint must reference a present document."
        )

    total_items = 0
    for breakpoint, document in documents.items():
        if breakpoint not in BREAKPOINTS:
            raise ResponsiveBundleValidationError(
                f"Unsupported responsive canvas breakpoint: {breakpoint!r}."
            )
        try:
            validated = validate_dashboard_document(
                document,
                {2},
                max_items=RESPONSIVE_CANVAS_V2_MAX_ITEMS,
                max_constraints=RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
            )
        except DashboardDocumentValidationError as err:
            raise ResponsiveBundleValidationError(str(err)) from err

        if validated.get("id") != dashboard_id:
            raise ResponsiveBundleValidationError(
                "Responsive breakpoint dashboard id must match the bundle id."
            )
        if validated.get("breakpoint") != breakpoint:
            raise ResponsiveBundleValidationError(
                "Responsive breakpoint document.breakpoint must match its bundle key."
            )
        if _has_enabled_constraint_cycle(validated):
            raise ResponsiveBundleValidationError(
                f"Responsive breakpoint {breakpoint} contains an enabled constraint dependency cycle."
            )

        total_items += len(validated["items"])
        if total_items > RESPONSIVE_CANVAS_V2_MAX_ITEMS:
            raise ResponsiveBundleValidationError(
                f"Responsive canvas bundle may contain at most {RESPONSIVE_CANVAS_V2_MAX_ITEMS} items across all breakpoints."
            )

    try:
        serialized_bytes = len(
            json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        )
    except (TypeError, ValueError) as err:
        raise ResponsiveBundleValidationError(
            "Responsive canvas bundle must be JSON serializable."
        ) from err
    if serialized_bytes > RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES:
        raise ResponsiveBundleValidationError(
            f"Responsive canvas bundle exceeds the {RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES} byte storage limit."
        )

    return bundle


def validate_responsive_revision_envelope(
    envelope: Any,
    expected_dashboard_id: str | None = None,
) -> dict[str, Any]:
    """Validate a responsive revision envelope without coercing any persisted value."""
    if not isinstance(envelope, dict):
        raise ResponsiveBundleValidationError("Responsive revision envelope must be an object.")

    document = validate_responsive_bundle(envelope.get("document"))
    if expected_dashboard_id is not None and document.get("id") != expected_dashboard_id:
        raise ResponsiveBundleValidationError(
            "Responsive revision dashboard id does not match the requested dashboard."
        )

    revision = _require_identifier(envelope.get("revision"), "responsive revision", 256)
    parent_revision = envelope.get("parentRevision")
    if parent_revision is not None:
        parent_revision = _require_identifier(parent_revision, "responsive parent revision", 256)
        if parent_revision == revision:
            raise ResponsiveBundleValidationError(
                "Responsive revision cannot reference itself as parentRevision."
            )

    _require_safe_timestamp(envelope.get("updatedAt"))
    _require_identifier(envelope.get("clientId"), "responsive client id", 128)
    return envelope

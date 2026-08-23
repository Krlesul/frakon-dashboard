from __future__ import annotations

import math
from typing import Any

import voluptuous as vol

CONSTRAINT_KINDS = frozenset(
    {
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
)


def _finite_optional(value: Any, *, name: str) -> None:
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise vol.Invalid(f"{name} must be a finite number when provided.")


def _has_enabled_cycle(edges: dict[str, list[str]]) -> bool:
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


def validate_responsive_constraints(
    constraints: Any,
    *,
    item_ids: set[str],
    breakpoint: str,
    max_constraints: int,
) -> None:
    if not isinstance(constraints, list) or len(constraints) > max_constraints:
        raise vol.Invalid(
            f"Responsive breakpoint constraints must be a list with at most {max_constraints} entries."
        )

    seen_ids: set[str] = set()
    enabled_edges: dict[str, list[str]] = {}
    for constraint in constraints:
        if not isinstance(constraint, dict):
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} constraints must be objects.")
        constraint_id = constraint.get("id")
        if not isinstance(constraint_id, str) or not constraint_id:
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} constraint requires a non-empty id.")
        if constraint_id in seen_ids:
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} contains duplicate constraint id {constraint_id}.")
        seen_ids.add(constraint_id)

        kind = constraint.get("kind")
        if kind not in CONSTRAINT_KINDS:
            raise vol.Invalid(f"Responsive constraint {constraint_id} uses unsupported kind {kind}.")
        source_id = constraint.get("sourceId")
        target_id = constraint.get("targetId")
        if not isinstance(source_id, str) or source_id not in item_ids:
            raise vol.Invalid(f"Responsive constraint {constraint_id} references missing source item {source_id}.")
        if not isinstance(target_id, str) or target_id not in item_ids:
            raise vol.Invalid(f"Responsive constraint {constraint_id} references missing target item {target_id}.")
        if source_id == target_id:
            raise vol.Invalid(f"Responsive constraint {constraint_id} cannot reference the same source and target item.")

        _finite_optional(constraint.get("gap"), name=f"Responsive constraint {constraint_id} gap")
        _finite_optional(constraint.get("priority"), name=f"Responsive constraint {constraint_id} priority")
        enabled = constraint.get("enabled")
        if enabled is not None and not isinstance(enabled, bool):
            raise vol.Invalid(f"Responsive constraint {constraint_id} enabled must be boolean when provided.")
        if enabled is not False:
            enabled_edges.setdefault(source_id, []).append(target_id)

    if _has_enabled_cycle(enabled_edges):
        raise vol.Invalid(f"Responsive breakpoint {breakpoint} contains an enabled constraint dependency cycle.")

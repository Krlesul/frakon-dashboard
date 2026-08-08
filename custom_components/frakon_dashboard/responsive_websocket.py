from __future__ import annotations

import json
import logging
import math
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import (
    READABLE_RESPONSIVE_BUNDLE_KINDS,
    RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    RESPONSIVE_CANVAS_V2_KIND,
    RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
    RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
    RESPONSIVE_CANVAS_V2_MAX_ITEMS,
    RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
    RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
    RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
    WRITABLE_RESPONSIVE_BUNDLE_KINDS,
)
from .responsive_constraint_validation import validate_responsive_constraints
from .responsive_storage import FrakonResponsiveDashboardStorage

_LOGGER = logging.getLogger(__name__)

DASHBOARD_ID = vol.All(str, vol.Length(min=1, max=128))
REVISION_ID = vol.All(str, vol.Length(min=1, max=256))
CLIENT_ID = vol.All(str, vol.Length(min=1, max=128))
BREAKPOINTS = ("mobile", "tablet", "desktop", "wide")
EXPECTED_REVISION = vol.Any(None, REVISION_ID)


def _finite_number(value: Any, *, name: str, positive: bool = False, non_negative: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise vol.Invalid(f"{name} must be a finite number.")
    number = float(value)
    if positive and number <= 0:
        raise vol.Invalid(f"{name} must be positive.")
    if non_negative and number < 0:
        raise vol.Invalid(f"{name} must be non-negative.")
    return number


def _validate_frame(frame: Any, *, item_id: str) -> None:
    if not isinstance(frame, dict):
        raise vol.Invalid(f"Responsive item {item_id} requires a frame object.")
    _finite_number(frame.get("x"), name=f"Responsive item {item_id} frame.x", non_negative=True)
    _finite_number(frame.get("y"), name=f"Responsive item {item_id} frame.y", non_negative=True)
    _finite_number(frame.get("width"), name=f"Responsive item {item_id} frame.width", positive=True)
    _finite_number(frame.get("height"), name=f"Responsive item {item_id} frame.height", positive=True)


def _validate_canvas_document(document: dict[str, Any], dashboard_id: str, breakpoint: str) -> int:
    if document.get("version") != 2:
        raise vol.Invalid("Responsive canvas bundles only accept dashboard document version 2.")
    if document.get("id") != dashboard_id:
        raise vol.Invalid("Responsive breakpoint dashboard id must match the bundle id.")
    if document.get("breakpoint") != breakpoint:
        raise vol.Invalid("Responsive breakpoint document.breakpoint must match its bundle key.")

    items = document.get("items")
    if not isinstance(items, list) or len(items) > RESPONSIVE_CANVAS_V2_MAX_ITEMS:
        raise vol.Invalid(
            f"Responsive breakpoint items must be a list with at most {RESPONSIVE_CANVAS_V2_MAX_ITEMS} entries."
        )
    seen_ids: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} items must be objects.")
        item_id = item.get("id")
        if not isinstance(item_id, str) or not item_id:
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} item requires a non-empty id.")
        if item_id in seen_ids:
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} contains duplicate item id {item_id}.")
        seen_ids.add(item_id)
        _validate_frame(item.get("frame"), item_id=item_id)

    validate_responsive_constraints(
        document.get("constraints", []),
        item_ids=seen_ids,
        breakpoint=breakpoint,
        max_constraints=RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
    )

    layout = document.get("layout")
    if not isinstance(layout, dict) or layout.get("mode") != "canvas":
        raise vol.Invalid("Responsive breakpoint requires layout.mode=canvas.")
    _finite_number(layout.get("width"), name="Responsive breakpoint layout.width", positive=True)
    _finite_number(layout.get("minHeight"), name="Responsive breakpoint layout.minHeight", positive=True)

    return len(items)


def _validate_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    kind = bundle.get("kind")
    if kind not in READABLE_RESPONSIVE_BUNDLE_KINDS:
        raise vol.Invalid(f"Unsupported responsive dashboard bundle kind: {kind}.")
    dashboard_id = bundle.get("id")
    documents = bundle.get("documents")
    default_breakpoint = bundle.get("defaultBreakpoint")
    if not isinstance(dashboard_id, str) or not dashboard_id:
        raise vol.Invalid("Responsive bundle requires an id.")
    if not isinstance(documents, dict) or not documents:
        raise vol.Invalid("Responsive canvas bundle requires at least one breakpoint document.")
    if len(documents) > len(BREAKPOINTS):
        raise vol.Invalid("Responsive canvas bundle contains too many breakpoint documents.")
    if default_breakpoint not in BREAKPOINTS or default_breakpoint not in documents:
        raise vol.Invalid("Responsive bundle defaultBreakpoint must reference a present document.")

    total_items = 0
    for breakpoint, document in documents.items():
        if breakpoint not in BREAKPOINTS:
            raise vol.Invalid(f"Unsupported responsive canvas breakpoint: {breakpoint}.")
        if not isinstance(document, dict):
            raise vol.Invalid(f"Responsive breakpoint {breakpoint} must contain a dashboard document.")
        total_items += _validate_canvas_document(document, dashboard_id, breakpoint)
        if total_items > RESPONSIVE_CANVAS_V2_MAX_ITEMS:
            raise vol.Invalid(
                f"Responsive canvas bundle may contain at most {RESPONSIVE_CANVAS_V2_MAX_ITEMS} items across all breakpoints."
            )

    try:
        serialized_bytes = len(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    except (TypeError, ValueError) as err:
        raise vol.Invalid("Responsive canvas bundle must be JSON serializable.") from err
    if serialized_bytes > RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES:
        raise vol.Invalid(
            f"Responsive canvas bundle exceeds the {RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES} byte storage limit."
        )
    return bundle


def _audit_blocked_persistence(
    *,
    operation: str,
    dashboard_id: str,
    contract_version: int,
    reason: str,
) -> None:
    _LOGGER.warning(
        "Blocked FRAKON responsive dashboard persistence operation=%s dashboard_id=%s contract_version=%s reason=%s",
        operation,
        dashboard_id,
        contract_version,
        reason,
    )


def _send_write_disabled(
    connection: websocket_api.ActiveConnection,
    msg_id: int,
    *,
    operation: str,
    dashboard_id: str,
    contract_version: int,
) -> None:
    _audit_blocked_persistence(
        operation=operation,
        dashboard_id=dashboard_id,
        contract_version=contract_version,
        reason="write-disabled",
    )
    connection.send_error(
        msg_id,
        "unsupported_responsive_write",
        f"Responsive dashboard bundle kind {RESPONSIVE_CANVAS_V2_KIND} is readable but not enabled for server-side writes.",
    )


RESPONSIVE_BUNDLE = vol.All(
    vol.Schema(
        {
            vol.Required("kind"): vol.In(READABLE_RESPONSIVE_BUNDLE_KINDS),
            vol.Required("id"): DASHBOARD_ID,
            vol.Required("title"): vol.All(str, vol.Length(max=256)),
            vol.Required("defaultBreakpoint"): vol.In(BREAKPOINTS),
            vol.Required("documents"): dict,
        },
        extra=vol.ALLOW_EXTRA,
    ),
    _validate_bundle,
)

RESPONSIVE_REVISION_ENVELOPE = vol.Schema(
    {
        vol.Required("document"): RESPONSIVE_BUNDLE,
        vol.Required("revision"): REVISION_ID,
        vol.Optional("parentRevision"): vol.Any(None, REVISION_ID),
        vol.Required("updatedAt"): vol.Coerce(int),
        vol.Required("clientId"): CLIENT_ID,
    },
    extra=vol.ALLOW_EXTRA,
)


def register_responsive_commands(
    hass: HomeAssistant,
    storage: FrakonResponsiveDashboardStorage,
) -> None:
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
            vol.Required("dashboard_id"): DASHBOARD_ID,
        }
    )
    @websocket_api.async_response
    async def handle_load_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        envelope = await storage.load_revision(msg["dashboard_id"])
        if envelope is None:
            connection.send_result(msg["id"], None)
            return
        try:
            validated = RESPONSIVE_REVISION_ENVELOPE(envelope)
        except vol.Invalid as err:
            connection.send_error(msg["id"], "invalid_responsive_bundle", str(err))
            return
        connection.send_result(msg["id"], validated)

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
            vol.Required("contractVersion"): vol.Coerce(int),
            vol.Required("envelope"): RESPONSIVE_REVISION_ENVELOPE,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_save_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        envelope = dict(msg["envelope"])
        bundle = envelope["document"]
        dashboard_id = bundle["id"]
        contract_version = msg["contractVersion"]

        if contract_version != RESPONSIVE_CANVAS_V2_CONTRACT_VERSION:
            _audit_blocked_persistence(
                operation="save",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
                reason="contract-incompatible",
            )
            connection.send_error(
                msg["id"],
                "responsive_contract_incompatible",
                f"Responsive contract version {contract_version} is not supported; expected {RESPONSIVE_CANVAS_V2_CONTRACT_VERSION}.",
            )
            return

        kind = bundle.get("kind")
        if kind not in WRITABLE_RESPONSIVE_BUNDLE_KINDS:
            _send_write_disabled(
                connection,
                msg["id"],
                operation="save",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
            )
            return

        expected_revision = msg.get("expectedRevision")
        if envelope.get("parentRevision") != expected_revision:
            connection.send_error(
                msg["id"],
                "invalid_parent_revision",
                "Envelope parentRevision must match expectedRevision.",
            )
            return
        if expected_revision is not None and envelope.get("revision") == expected_revision:
            connection.send_error(
                msg["id"],
                "invalid_revision",
                "A saved responsive revision must differ from its parent revision.",
            )
            return

        saved, remote = await storage.save_revision(envelope, expected_revision)
        if saved:
            connection.send_result(msg["id"], {"status": "saved", "envelope": remote})
            return
        if not remote:
            connection.send_error(
                msg["id"],
                "revision_conflict",
                "Responsive dashboard was removed while this client held an older revision.",
            )
            return
        connection.send_result(msg["id"], {"status": "conflict", "remote": remote})

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
            vol.Required("contractVersion"): vol.Coerce(int),
            vol.Required("dashboard_id"): DASHBOARD_ID,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_remove_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        dashboard_id = msg["dashboard_id"]
        contract_version = msg["contractVersion"]
        if contract_version != RESPONSIVE_CANVAS_V2_CONTRACT_VERSION:
            _audit_blocked_persistence(
                operation="remove",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
                reason="contract-incompatible",
            )
            connection.send_error(
                msg["id"],
                "responsive_contract_incompatible",
                f"Responsive contract version {contract_version} is not supported; expected {RESPONSIVE_CANVAS_V2_CONTRACT_VERSION}.",
            )
            return
        if RESPONSIVE_CANVAS_V2_KIND not in WRITABLE_RESPONSIVE_BUNDLE_KINDS:
            _send_write_disabled(
                connection,
                msg["id"],
                operation="remove",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
            )
            return

        removed, remote = await storage.remove_revision(dashboard_id, msg.get("expectedRevision"))
        if removed:
            connection.send_result(msg["id"], {"status": "removed"})
            return
        connection.send_result(msg["id"], {"status": "conflict", "remote": remote})

    websocket_api.async_register_command(hass, handle_load_responsive_revision)
    websocket_api.async_register_command(hass, handle_save_responsive_revision)
    websocket_api.async_register_command(hass, handle_remove_responsive_revision)

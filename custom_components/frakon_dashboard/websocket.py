from __future__ import annotations

import math
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import (
    READABLE_DOCUMENT_VERSIONS,
    READABLE_RESPONSIVE_BUNDLE_KINDS,
    RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
    RESPONSIVE_CANVAS_V2_KIND,
    RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
    RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
    RESPONSIVE_CANVAS_V2_MAX_ITEMS,
    RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
    RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
    RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
    RESPONSIVE_CANVAS_V2_STORAGE_KEY,
    WRITABLE_DOCUMENT_VERSIONS,
    WRITABLE_RESPONSIVE_BUNDLE_KINDS,
)
from .storage import FrakonDashboardStorage

DASHBOARD_ID = vol.All(str, vol.Length(min=1, max=128))
REVISION_ID = vol.All(str, vol.Length(min=1, max=256))
CLIENT_ID = vol.All(str, vol.Length(min=1, max=128))
BREAKPOINTS = ("mobile", "tablet", "desktop", "wide")
V1_CONSTRAINT_KINDS = {
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


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _optional_finite_number(value: Any) -> bool:
    return value is None or _finite_number(value)


def _validate_v1_item(item: Any) -> str:
    if not isinstance(item, dict):
        raise vol.Invalid("Dashboard version 1 items must be objects.")
    item_id = item.get("id")
    if not isinstance(item_id, str) or not item_id or len(item_id) > 128:
        raise vol.Invalid("Dashboard version 1 item.id must be a non-empty string up to 128 characters.")
    card = item.get("card")
    if not isinstance(card, dict) or not isinstance(card.get("type"), str) or not card["type"]:
        raise vol.Invalid(f"Dashboard item {item_id} requires card.type.")
    for field in ("x", "y", "w", "h"):
        if not _finite_number(item.get(field)):
            raise vol.Invalid(f"Dashboard item {item_id} requires finite numeric {field}.")
    for field in ("minW", "minH", "maxW", "maxH"):
        if field in item and not _optional_finite_number(item.get(field)):
            raise vol.Invalid(f"Dashboard item {item_id} has invalid {field}.")
    for field in ("locked", "hidden"):
        if field in item and not isinstance(item.get(field), bool):
            raise vol.Invalid(f"Dashboard item {item_id} has invalid {field} flag.")
    return item_id


def _validate_v1_constraints(document: dict[str, Any], item_ids: set[str]) -> None:
    constraints = document.get("constraints")
    if constraints is None:
        return
    if not isinstance(constraints, list) or len(constraints) > RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS:
        raise vol.Invalid(
            f"Dashboard version 1 constraints must be a list with at most {RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS} entries."
        )

    constraint_ids: set[str] = set()
    for constraint in constraints:
        if not isinstance(constraint, dict):
            raise vol.Invalid("Dashboard version 1 constraints must be objects.")
        constraint_id = constraint.get("id")
        if not isinstance(constraint_id, str) or not constraint_id or constraint_id in constraint_ids:
            raise vol.Invalid("Dashboard version 1 constraint ids must be non-empty and unique.")
        kind = constraint.get("kind")
        if kind not in V1_CONSTRAINT_KINDS:
            raise vol.Invalid(f"Dashboard constraint {constraint_id} has unsupported kind {kind!r}.")
        source_id = constraint.get("sourceId")
        target_id = constraint.get("targetId")
        if not isinstance(source_id, str) or not isinstance(target_id, str):
            raise vol.Invalid(f"Dashboard constraint {constraint_id} requires sourceId and targetId.")
        if source_id == target_id:
            raise vol.Invalid(f"Dashboard constraint {constraint_id} cannot reference the same item twice.")
        if source_id not in item_ids or target_id not in item_ids:
            raise vol.Invalid(f"Dashboard constraint {constraint_id} references an unknown item.")
        for field in ("gap", "priority"):
            if field in constraint and not _optional_finite_number(constraint.get(field)):
                raise vol.Invalid(f"Dashboard constraint {constraint_id} has invalid {field}.")
        if "enabled" in constraint and not isinstance(constraint.get("enabled"), bool):
            raise vol.Invalid(f"Dashboard constraint {constraint_id} has invalid enabled flag.")
        constraint_ids.add(constraint_id)


def _validate_v1_document(document: dict[str, Any]) -> None:
    title = document.get("title")
    if not isinstance(title, str):
        raise vol.Invalid("Dashboard version 1 requires title.")
    if document.get("breakpoint") not in BREAKPOINTS:
        raise vol.Invalid("Dashboard version 1 requires a supported breakpoint.")
    columns = document.get("columns")
    row_height = document.get("rowHeight")
    gap = document.get("gap")
    if not _finite_number(columns) or columns <= 0:
        raise vol.Invalid("Dashboard version 1 requires positive finite columns.")
    if not _finite_number(row_height) or row_height <= 0:
        raise vol.Invalid("Dashboard version 1 requires positive finite rowHeight.")
    if not _finite_number(gap) or gap < 0:
        raise vol.Invalid("Dashboard version 1 requires non-negative finite gap.")

    item_ids: set[str] = set()
    for item in document.get("items", []):
        item_id = _validate_v1_item(item)
        if item_id in item_ids:
            raise vol.Invalid(f"Duplicate dashboard item id: {item_id}.")
        item_ids.add(item_id)
    _validate_v1_constraints(document, item_ids)


def _validate_document_shape(document: dict[str, Any]) -> dict[str, Any]:
    version = document.get("version")
    if version not in READABLE_DOCUMENT_VERSIONS:
        raise vol.Invalid(f"Unsupported dashboard document version: {version}.")

    if version == 1:
        _validate_v1_document(document)
    elif version == 2:
        layout = document.get("layout")
        if not isinstance(layout, dict) or layout.get("mode") != "canvas":
            raise vol.Invalid("Dashboard document version 2 requires layout.mode=canvas.")
        if not isinstance(layout.get("width"), (int, float)) or layout["width"] <= 0:
            raise vol.Invalid("Dashboard document version 2 requires a positive layout.width.")
        if not isinstance(layout.get("minHeight"), (int, float)) or layout["minHeight"] <= 0:
            raise vol.Invalid("Dashboard document version 2 requires a positive layout.minHeight.")

    return document


DASHBOARD_DOCUMENT = vol.All(
    vol.Schema(
        {
            vol.Required("id"): DASHBOARD_ID,
            vol.Required("version"): vol.Coerce(int),
            vol.Required("items"): vol.All(list, vol.Length(max=2000)),
        },
        extra=vol.ALLOW_EXTRA,
    ),
    _validate_document_shape,
)
REVISION_ENVELOPE = vol.Schema(
    {
        vol.Required("document"): DASHBOARD_DOCUMENT,
        vol.Required("revision"): REVISION_ID,
        vol.Optional("parentRevision"): vol.Any(None, REVISION_ID),
        vol.Required("updatedAt"): vol.Coerce(int),
        vol.Required("clientId"): CLIENT_ID,
    },
    extra=vol.ALLOW_EXTRA,
)
EXPECTED_REVISION = vol.Any(None, REVISION_ID)


def _document_write_enabled(document: dict[str, Any]) -> bool:
    return document.get("version") in WRITABLE_DOCUMENT_VERSIONS


def _send_write_version_error(
    connection: websocket_api.ActiveConnection,
    msg_id: int,
    document: dict[str, Any],
) -> None:
    version = document.get("version")
    connection.send_error(
        msg_id,
        "unsupported_write_version",
        f"Dashboard document version {version} is readable but not enabled for server-side writes.",
    )


def register_websocket_commands(hass: HomeAssistant, storage: FrakonDashboardStorage) -> None:
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/capabilities",
        }
    )
    @websocket_api.async_response
    async def handle_capabilities(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        connection.send_result(
            msg["id"],
            {
                "readableDocumentVersions": sorted(READABLE_DOCUMENT_VERSIONS),
                "writableDocumentVersions": sorted(WRITABLE_DOCUMENT_VERSIONS),
                "revisionSync": True,
                "maxItems": 2000,
                "responsiveCanvasV2": {
                    "contractVersion": RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
                    "read": RESPONSIVE_CANVAS_V2_KIND in READABLE_RESPONSIVE_BUNDLE_KINDS,
                    "write": RESPONSIVE_CANVAS_V2_KIND in WRITABLE_RESPONSIVE_BUNDLE_KINDS,
                    "atomicRevision": True,
                    "breakpoints": list(BREAKPOINTS),
                    "maxItems": RESPONSIVE_CANVAS_V2_MAX_ITEMS,
                    "maxConstraints": RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
                    "maxSerializedBytes": RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
                    "storageNamespace": RESPONSIVE_CANVAS_V2_STORAGE_KEY,
                    "loadEndpoint": RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
                    "dryRunEndpoint": RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
                    "saveEndpoint": RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
                    "removeEndpoint": RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
                },
            },
        )

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/load",
            vol.Required("dashboard_id"): DASHBOARD_ID,
        }
    )
    @websocket_api.async_response
    async def handle_load(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        connection.send_result(msg["id"], await storage.load(msg["dashboard_id"]))

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/save",
            vol.Required("document"): DASHBOARD_DOCUMENT,
        }
    )
    async def handle_save(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        document = dict(msg["document"])
        if not _document_write_enabled(document):
            _send_write_version_error(connection, msg["id"], document)
            return
        await storage.save(document)
        connection.send_result(msg["id"], None)

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/remove",
            vol.Required("dashboard_id"): DASHBOARD_ID,
        }
    )
    async def handle_remove(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        await storage.remove(msg["dashboard_id"])
        connection.send_result(msg["id"], None)

    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/load_revision",
            vol.Required("dashboard_id"): DASHBOARD_ID,
        }
    )
    @websocket_api.async_response
    async def handle_load_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        connection.send_result(msg["id"], await storage.load_revision(msg["dashboard_id"]))

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/save_revision",
            vol.Required("envelope"): REVISION_ENVELOPE,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_save_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        envelope = dict(msg["envelope"])
        document = envelope["document"]
        expected_revision = msg.get("expectedRevision")
        if not _document_write_enabled(document):
            _send_write_version_error(connection, msg["id"], document)
            return
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
                "A saved revision must differ from its parent revision.",
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
                "Dashboard was removed while this client still held an older revision.",
            )
            return
        connection.send_result(msg["id"], {"status": "conflict", "remote": remote})

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): "frakon/dashboard/remove_revision",
            vol.Required("dashboard_id"): DASHBOARD_ID,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_remove_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        removed, remote = await storage.remove_revision(msg["dashboard_id"], msg.get("expectedRevision"))
        if not removed:
            revision = remote.get("revision") if remote else "unknown"
            connection.send_error(
                msg["id"],
                "revision_conflict",
                f"Dashboard revision changed; current revision is {revision}.",
            )
            return
        connection.send_result(msg["id"], None)

    websocket_api.async_register_command(hass, handle_capabilities)
    websocket_api.async_register_command(hass, handle_load)
    websocket_api.async_register_command(hass, handle_save)
    websocket_api.async_register_command(hass, handle_remove)
    websocket_api.async_register_command(hass, handle_load_revision)
    websocket_api.async_register_command(hass, handle_save_revision)
    websocket_api.async_register_command(hass, handle_remove_revision)

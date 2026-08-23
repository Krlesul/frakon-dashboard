from __future__ import annotations

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
from .document_validation import DashboardDocumentValidationError, validate_dashboard_document
from .storage import FrakonDashboardStorage

_MAX_SAFE_INTEGER = 9_007_199_254_740_991
DASHBOARD_ID = vol.All(str, vol.Length(min=1, max=128))
REVISION_ID = vol.All(str, vol.Length(min=1, max=256))
CLIENT_ID = vol.All(str, vol.Length(min=1, max=128))
BREAKPOINTS = ("mobile", "tablet", "desktop", "wide")


def _strict_integer(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise vol.Invalid("value must be an integer")
    return value


def _strict_document_version(value: Any) -> int:
    version = _strict_integer(value)
    if version not in READABLE_DOCUMENT_VERSIONS:
        raise vol.Invalid(f"unsupported dashboard document version: {version}")
    return version


def _strict_updated_at(value: Any) -> int:
    timestamp = _strict_integer(value)
    if timestamp < 0 or timestamp > _MAX_SAFE_INTEGER:
        raise vol.Invalid("updatedAt must be a non-negative safe integer")
    return timestamp


def _validate_document_shape(document: dict[str, Any]) -> dict[str, Any]:
    try:
        return validate_dashboard_document(
            document,
            READABLE_DOCUMENT_VERSIONS,
            max_items=RESPONSIVE_CANVAS_V2_MAX_ITEMS,
            max_constraints=RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
        )
    except DashboardDocumentValidationError as err:
        raise vol.Invalid(str(err)) from err


DASHBOARD_DOCUMENT = vol.All(
    vol.Schema(
        {
            vol.Required("id"): DASHBOARD_ID,
            vol.Required("version"): _strict_document_version,
            vol.Required("items"): vol.All(list, vol.Length(max=RESPONSIVE_CANVAS_V2_MAX_ITEMS)),
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
        vol.Required("updatedAt"): _strict_updated_at,
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


def _validate_stored_document(value: Any, expected_dashboard_id: str) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    version = value.get("version")
    if not isinstance(version, int) or isinstance(version, bool):
        return None
    try:
        document = validate_dashboard_document(
            value,
            READABLE_DOCUMENT_VERSIONS,
            max_items=RESPONSIVE_CANVAS_V2_MAX_ITEMS,
            max_constraints=RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
        )
    except DashboardDocumentValidationError:
        return None
    if document.get("id") != expected_dashboard_id:
        return None
    return document


def _validate_stored_revision(value: Any, expected_dashboard_id: str) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    document = _validate_stored_document(value.get("document"), expected_dashboard_id)
    if document is None:
        return None

    revision = value.get("revision")
    parent_revision = value.get("parentRevision")
    updated_at = value.get("updatedAt")
    client_id = value.get("clientId")
    if not isinstance(revision, str) or not revision or len(revision) > 256:
        return None
    if parent_revision is not None:
        if not isinstance(parent_revision, str) or not parent_revision or len(parent_revision) > 256:
            return None
        if parent_revision == revision:
            return None
    if (
        not isinstance(updated_at, int)
        or isinstance(updated_at, bool)
        or updated_at < 0
        or updated_at > _MAX_SAFE_INTEGER
    ):
        return None
    if not isinstance(client_id, str) or not client_id or len(client_id) > 128:
        return None
    return value


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
                "maxItems": RESPONSIVE_CANVAS_V2_MAX_ITEMS,
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
        dashboard_id = msg["dashboard_id"]
        stored = await storage.load(dashboard_id)
        if stored is None:
            connection.send_result(msg["id"], None)
            return
        document = _validate_stored_document(stored, dashboard_id)
        if document is None:
            connection.send_error(
                msg["id"],
                "invalid_stored_document",
                "Stored FRAKON Dashboard data failed validation.",
            )
            return
        connection.send_result(msg["id"], document)

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
        try:
            await storage.save(document)
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_document", str(err))
            return
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
        dashboard_id = msg["dashboard_id"]
        stored = await storage.load_revision(dashboard_id)
        if stored is None:
            connection.send_result(msg["id"], None)
            return
        envelope = _validate_stored_revision(stored, dashboard_id)
        if envelope is None:
            connection.send_error(
                msg["id"],
                "invalid_stored_revision",
                "Stored FRAKON Dashboard revision failed validation.",
            )
            return
        connection.send_result(msg["id"], envelope)

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
        try:
            saved, remote = await storage.save_revision(envelope, expected_revision)
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_revision", str(err))
            return
        if saved:
            saved_envelope = _validate_stored_revision(remote, document["id"])
            if saved_envelope is None:
                connection.send_error(
                    msg["id"],
                    "invalid_saved_revision",
                    "Saved FRAKON Dashboard revision failed validation.",
                )
                return
            connection.send_result(msg["id"], {"status": "saved", "envelope": saved_envelope})
            return
        if not remote:
            connection.send_error(
                msg["id"],
                "revision_conflict",
                "Dashboard was removed while this client still held an older revision.",
            )
            return
        remote_envelope = _validate_stored_revision(remote, document["id"])
        if remote_envelope is None:
            connection.send_error(
                msg["id"],
                "invalid_stored_revision",
                "Stored remote FRAKON Dashboard revision failed validation.",
            )
            return
        if remote_envelope["document"].get("version") != document.get("version"):
            connection.send_error(
                msg["id"],
                "revision_version_conflict",
                "Stored remote dashboard revision uses another document version.",
            )
            return
        connection.send_result(msg["id"], {"status": "conflict", "remote": remote_envelope})

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
        dashboard_id = msg["dashboard_id"]
        removed, remote = await storage.remove_revision(dashboard_id, msg.get("expectedRevision"))
        if not removed:
            remote_envelope = _validate_stored_revision(remote, dashboard_id)
            if remote_envelope is None:
                connection.send_error(
                    msg["id"],
                    "invalid_stored_revision",
                    "Stored FRAKON Dashboard revision failed validation.",
                )
                return
            connection.send_error(
                msg["id"],
                "revision_conflict",
                f"Dashboard revision changed; current revision is {remote_envelope['revision']}.",
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

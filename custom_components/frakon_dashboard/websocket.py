from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .storage import FrakonDashboardStorage

DASHBOARD_ID = vol.All(str, vol.Length(min=1, max=128))
REVISION_ID = vol.All(str, vol.Length(min=1, max=256))
CLIENT_ID = vol.All(str, vol.Length(min=1, max=128))
DASHBOARD_DOCUMENT = vol.Schema(
    {
        vol.Required("id"): DASHBOARD_ID,
        vol.Required("version"): vol.Coerce(int),
        vol.Required("items"): vol.All(list, vol.Length(max=2000)),
    },
    extra=vol.ALLOW_EXTRA,
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


def register_websocket_commands(hass: HomeAssistant, storage: FrakonDashboardStorage) -> None:
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
        if document.get("version") != 1:
            connection.send_error(msg["id"], "unsupported_version", "Only dashboard document version 1 is supported.")
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
        if document.get("version") != 1:
            connection.send_error(msg["id"], "unsupported_version", "Only dashboard document version 1 is supported.")
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

    websocket_api.async_register_command(hass, handle_load)
    websocket_api.async_register_command(hass, handle_save)
    websocket_api.async_register_command(hass, handle_remove)
    websocket_api.async_register_command(hass, handle_load_revision)
    websocket_api.async_register_command(hass, handle_save_revision)
    websocket_api.async_register_command(hass, handle_remove_revision)

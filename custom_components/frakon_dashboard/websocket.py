from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .storage import FrakonDashboardStorage

DASHBOARD_ID = vol.All(str, vol.Length(min=1, max=128))
DASHBOARD_DOCUMENT = vol.Schema(
    {
        vol.Required("id"): DASHBOARD_ID,
        vol.Required("version"): vol.Coerce(int),
        vol.Required("items"): list,
    },
    extra=vol.ALLOW_EXTRA,
)


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

    websocket_api.async_register_command(hass, handle_load)
    websocket_api.async_register_command(hass, handle_save)
    websocket_api.async_register_command(hass, handle_remove)

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .build_info import read_build_info

BUILD_INFO_ENDPOINT = "frakon/dashboard/build_info"


def register_build_info_command(hass: HomeAssistant) -> None:
    @websocket_api.websocket_command({vol.Required("type"): BUILD_INFO_ENDPOINT})
    @websocket_api.async_response
    async def handle_build_info(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        connection.send_result(msg["id"], read_build_info())

    websocket_api.async_register_command(hass, handle_build_info)

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DATA_BACKEND, DATA_WEBSOCKET_REGISTERED, DOMAIN
from .responsive_websocket import register_responsive_write_command
from .storage import FrakonDashboardStorage
from .websocket import register_websocket_commands


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    data = hass.data.setdefault(DOMAIN, {})
    storage = data.get(DATA_BACKEND)
    if storage is None:
        storage = FrakonDashboardStorage(hass)
        data[DATA_BACKEND] = storage

    if not data.get(DATA_WEBSOCKET_REGISTERED):
        register_websocket_commands(hass, storage)
        register_responsive_write_command(hass, storage)
        data[DATA_WEBSOCKET_REGISTERED] = True

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # WebSocket commands are registered for the Home Assistant process lifetime.
    # Keeping the backend object prevents dangling handlers after an entry reload.
    return True

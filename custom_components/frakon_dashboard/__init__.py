from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DATA_BACKEND,
    DATA_FRONTEND_REGISTERED,
    DATA_WEBSOCKET_REGISTERED,
    DOMAIN,
)
from .frontend import async_register_frontend
from .responsive_storage import FrakonResponsiveDashboardStorage
from .responsive_websocket import register_responsive_commands
from .storage import FrakonDashboardStorage
from .websocket import register_websocket_commands

DATA_RESPONSIVE_BACKEND = "responsive_backend"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    data = hass.data.setdefault(DOMAIN, {})
    storage = data.get(DATA_BACKEND)
    if storage is None:
        storage = FrakonDashboardStorage(hass)
        data[DATA_BACKEND] = storage

    responsive_storage = data.get(DATA_RESPONSIVE_BACKEND)
    if responsive_storage is None:
        responsive_storage = FrakonResponsiveDashboardStorage(hass)
        data[DATA_RESPONSIVE_BACKEND] = responsive_storage

    if not data.get(DATA_WEBSOCKET_REGISTERED):
        register_websocket_commands(hass, storage)
        register_responsive_commands(hass, responsive_storage)
        data[DATA_WEBSOCKET_REGISTERED] = True

    if not data.get(DATA_FRONTEND_REGISTERED):
        if await async_register_frontend(hass):
            data[DATA_FRONTEND_REGISTERED] = True

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # WebSocket commands and the static frontend path are registered for the
    # Home Assistant process lifetime. Keeping backend objects prevents dangling
    # handlers after a config-entry reload.
    return True

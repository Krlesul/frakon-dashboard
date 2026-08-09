from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import (
    CONF_RESOURCE_TYPE_WS,
    LOVELACE_DATA,
    MODE_STORAGE,
)
from homeassistant.const import CONF_ID, CONF_TYPE, CONF_URL
from homeassistant.core import HomeAssistant

from .const import FRONTEND_FILENAME, FRONTEND_URL_PATH

_LOGGER = logging.getLogger(__name__)


def frontend_file_path() -> Path:
    return Path(__file__).parent / "frontend" / FRONTEND_FILENAME


def frontend_resource_url(version: str) -> str:
    return f"{FRONTEND_URL_PATH}/{FRONTEND_FILENAME}?v={version}"


async def async_register_frontend(hass: HomeAssistant, version: str) -> bool:
    """Serve bundled JS and ensure it is a Lovelace module in storage mode."""
    frontend_file = frontend_file_path()
    if not frontend_file.is_file():
        _LOGGER.warning(
            "FRAKON frontend bundle is missing at %s; install a packaged release before using dashboard cards",
            frontend_file,
        )
        return False

    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL_PATH, str(frontend_file.parent), True)]
    )

    lovelace = hass.data.get(LOVELACE_DATA)
    if lovelace is None:
        _LOGGER.warning("Lovelace is not initialized; FRAKON frontend resource was not registered")
        return True

    if lovelace.resource_mode != MODE_STORAGE:
        _LOGGER.warning(
            "Lovelace resources are managed in YAML mode; add %s as a module resource manually",
            frontend_resource_url(version),
        )
        return True

    collection = lovelace.resources
    await collection.async_get_info()
    target_url = frontend_resource_url(version)
    prefix = f"{FRONTEND_URL_PATH}/{FRONTEND_FILENAME}"

    for item in collection.async_items() or []:
        existing_url = item.get(CONF_URL)
        if not isinstance(existing_url, str) or not existing_url.startswith(prefix):
            continue
        item_id = item.get(CONF_ID)
        if item_id is None:
            continue
        if existing_url != target_url or item.get(CONF_TYPE) != "module":
            await collection.async_update_item(
                item_id,
                {CONF_RESOURCE_TYPE_WS: "module", CONF_URL: target_url},
            )
        return True

    await collection.async_create_item(
        {CONF_RESOURCE_TYPE_WS: "module", CONF_URL: target_url}
    )
    return True

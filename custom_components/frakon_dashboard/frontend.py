from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import (
    CONF_RESOURCE_TYPE_WS,
    DOMAIN as LOVELACE_DOMAIN,
    MODE_STORAGE,
)
from homeassistant.const import CONF_ID, CONF_TYPE, CONF_URL
from homeassistant.core import HomeAssistant

from .const import FRONTEND_FILENAME, FRONTEND_URL_PATH, INTEGRATION_VERSION

_LOGGER = logging.getLogger(__name__)


def frontend_file_path() -> Path:
    return Path(__file__).parent / "frontend" / FRONTEND_FILENAME


def frontend_resource_url() -> str:
    return f"{FRONTEND_URL_PATH}/{FRONTEND_FILENAME}?v={INTEGRATION_VERSION}"


def _lovelace_resource_state(hass: HomeAssistant) -> tuple[Any, Any] | None:
    """Return resource mode and collection across HA 2025.1+ Lovelace data shapes.

    Home Assistant 2025.1 stores a dictionary at hass.data["lovelace"] with
    ``mode`` and ``resources`` keys. Newer Home Assistant releases use a
    LovelaceData dataclass keyed by HassKey("lovelace") and expose
    ``resource_mode`` plus ``resources`` attributes. HassKey is a runtime str
    subclass, so the stable DOMAIN string resolves both generations.
    """
    lovelace = hass.data.get(LOVELACE_DOMAIN)
    if lovelace is None:
        return None

    if isinstance(lovelace, dict):
        mode = lovelace.get("resource_mode", lovelace.get("mode"))
        resources = lovelace.get("resources")
    else:
        mode = getattr(lovelace, "resource_mode", getattr(lovelace, "mode", None))
        resources = getattr(lovelace, "resources", None)

    if mode is None or resources is None:
        return None
    return mode, resources


async def async_register_frontend(hass: HomeAssistant) -> bool:
    """Serve bundled JS and ensure it is a Lovelace module in storage mode."""
    frontend_file = frontend_file_path()
    if not frontend_file.is_file():
        _LOGGER.warning(
            "FRAKON frontend bundle is missing at %s; install a packaged release before using dashboard cards",
            frontend_file,
        )
        return False

    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL_PATH, str(frontend_file.parent), False)]
    )

    state = _lovelace_resource_state(hass)
    if state is None:
        _LOGGER.warning("Lovelace is not initialized; FRAKON frontend resource was not registered")
        return True

    resource_mode, collection = state
    if resource_mode != MODE_STORAGE:
        _LOGGER.warning(
            "Lovelace resources are managed in YAML mode; add %s as a module resource manually",
            frontend_resource_url(),
        )
        return True

    # async_get_info() loads ResourceStorageCollection before async_items() on
    # the declared HA 2025.1 minimum and remains supported on newer releases.
    await collection.async_get_info()
    target_url = frontend_resource_url()
    resource_prefix = f"{FRONTEND_URL_PATH}/{FRONTEND_FILENAME}"

    for item in collection.async_items() or []:
        existing_url = item.get(CONF_URL)
        if not isinstance(existing_url, str) or not existing_url.startswith(resource_prefix):
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

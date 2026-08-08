from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import RESPONSIVE_CANVAS_V2_STORAGE_KEY

RESPONSIVE_STORAGE_VERSION = 1


class FrakonResponsiveDashboardStorage:
    """Dedicated Home Assistant Store namespace for responsive canvas bundles."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(
            hass,
            RESPONSIVE_STORAGE_VERSION,
            RESPONSIVE_CANVAS_V2_STORAGE_KEY,
        )
        self._lock = asyncio.Lock()
        self._envelopes: dict[str, dict[str, Any]] | None = None

    async def _ensure_loaded(self) -> dict[str, dict[str, Any]]:
        if self._envelopes is not None:
            return self._envelopes
        stored = await self._store.async_load()
        raw = stored.get("envelopes", {}) if isinstance(stored, dict) else {}
        self._envelopes = {
            key: deepcopy(value)
            for key, value in raw.items()
            if isinstance(key, str)
            and isinstance(value, dict)
            and isinstance(value.get("document"), dict)
            and value["document"].get("kind") == "responsive-canvas-v2"
        }
        return self._envelopes

    async def _persist(self) -> None:
        await self._store.async_save({"envelopes": self._envelopes or {}})

    async def load_revision(self, dashboard_id: str) -> dict[str, Any] | None:
        async with self._lock:
            envelopes = await self._ensure_loaded()
            envelope = envelopes.get(dashboard_id)
            return deepcopy(envelope) if envelope is not None else None

    async def save_revision(
        self,
        envelope: dict[str, Any],
        expected_revision: str | None,
    ) -> tuple[bool, dict[str, Any]]:
        document = envelope["document"]
        dashboard_id = document["id"]
        async with self._lock:
            envelopes = await self._ensure_loaded()
            current = envelopes.get(dashboard_id)
            current_revision = current.get("revision") if current else None
            if current_revision != expected_revision:
                return False, deepcopy(current) if current is not None else {}
            stored = deepcopy(envelope)
            envelopes[dashboard_id] = stored
            await self._persist()
            return True, deepcopy(stored)

    async def remove_revision(
        self,
        dashboard_id: str,
        expected_revision: str | None,
    ) -> tuple[bool, dict[str, Any] | None]:
        async with self._lock:
            envelopes = await self._ensure_loaded()
            current = envelopes.get(dashboard_id)
            if current is None:
                return True, None
            if expected_revision is not None and current.get("revision") != expected_revision:
                return False, deepcopy(current)
            envelopes.pop(dashboard_id, None)
            await self._persist()
            return True, None

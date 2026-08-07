from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION


class FrakonDashboardStorage:
    """Persistent Home Assistant-side storage for FRAKON dashboard documents."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._lock = asyncio.Lock()
        self._documents: dict[str, dict[str, Any]] | None = None

    async def _ensure_loaded(self) -> dict[str, dict[str, Any]]:
        if self._documents is not None:
            return self._documents

        stored = await self._store.async_load()
        raw_documents = stored.get("documents", {}) if isinstance(stored, dict) else {}
        self._documents = {
            key: deepcopy(value)
            for key, value in raw_documents.items()
            if isinstance(key, str) and isinstance(value, dict)
        }
        return self._documents

    async def load(self, dashboard_id: str) -> dict[str, Any] | None:
        async with self._lock:
            documents = await self._ensure_loaded()
            document = documents.get(dashboard_id)
            return deepcopy(document) if document is not None else None

    async def save(self, document: dict[str, Any]) -> None:
        dashboard_id = document["id"]
        async with self._lock:
            documents = await self._ensure_loaded()
            documents[dashboard_id] = deepcopy(document)
            await self._store.async_save({"documents": documents})

    async def remove(self, dashboard_id: str) -> bool:
        async with self._lock:
            documents = await self._ensure_loaded()
            existed = dashboard_id in documents
            documents.pop(dashboard_id, None)
            if existed:
                await self._store.async_save({"documents": documents})
            return existed

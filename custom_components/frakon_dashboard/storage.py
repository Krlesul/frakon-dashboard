from __future__ import annotations

import asyncio
from copy import deepcopy
from time import time_ns
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION


class FrakonDashboardStorage:
    """Persistent Home Assistant-side storage for FRAKON dashboard documents."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._lock = asyncio.Lock()
        self._envelopes: dict[str, dict[str, Any]] | None = None

    @staticmethod
    def _server_revision(document: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any]:
        now = time_ns() // 1_000_000
        return {
            "document": deepcopy(document),
            "revision": f"ha-{now:x}-{uuid4().hex[:12]}",
            "parentRevision": previous.get("revision") if previous else None,
            "updatedAt": now,
            "clientId": "home-assistant",
        }

    async def _ensure_loaded(self) -> dict[str, dict[str, Any]]:
        if self._envelopes is not None:
            return self._envelopes

        stored = await self._store.async_load()
        raw_envelopes = stored.get("envelopes", {}) if isinstance(stored, dict) else {}
        self._envelopes = {
            key: deepcopy(value)
            for key, value in raw_envelopes.items()
            if isinstance(key, str) and isinstance(value, dict) and isinstance(value.get("document"), dict)
        }

        # Migrate the short-lived pre-revision storage format without losing dashboards.
        if not self._envelopes and isinstance(stored, dict):
            raw_documents = stored.get("documents", {})
            if isinstance(raw_documents, dict):
                for key, value in raw_documents.items():
                    if isinstance(key, str) and isinstance(value, dict):
                        self._envelopes[key] = self._server_revision(value, None)
                if self._envelopes:
                    await self._persist()

        return self._envelopes

    async def _persist(self) -> None:
        await self._store.async_save({"envelopes": self._envelopes or {}})

    async def load(self, dashboard_id: str) -> dict[str, Any] | None:
        async with self._lock:
            envelopes = await self._ensure_loaded()
            envelope = envelopes.get(dashboard_id)
            return deepcopy(envelope["document"]) if envelope is not None else None

    async def save(self, document: dict[str, Any]) -> dict[str, Any]:
        dashboard_id = document["id"]
        async with self._lock:
            envelopes = await self._ensure_loaded()
            envelope = self._server_revision(document, envelopes.get(dashboard_id))
            envelopes[dashboard_id] = envelope
            await self._persist()
            return deepcopy(envelope)

    async def remove(self, dashboard_id: str) -> bool:
        async with self._lock:
            envelopes = await self._ensure_loaded()
            existed = dashboard_id in envelopes
            envelopes.pop(dashboard_id, None)
            if existed:
                await self._persist()
            return existed

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

            stored_envelope = deepcopy(envelope)
            envelopes[dashboard_id] = stored_envelope
            await self._persist()
            return True, deepcopy(stored_envelope)

    async def remove_revision(self, dashboard_id: str, expected_revision: str | None) -> tuple[bool, dict[str, Any] | None]:
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

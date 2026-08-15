from __future__ import annotations

import asyncio
from copy import deepcopy
from time import time_ns
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    READABLE_DOCUMENT_VERSIONS,
    RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
    RESPONSIVE_CANVAS_V2_MAX_ITEMS,
    STORAGE_KEY,
    STORAGE_VERSION,
)
from .document_validation import DashboardDocumentValidationError, validate_dashboard_document

_MAX_SAFE_INTEGER = 9_007_199_254_740_991


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

    @staticmethod
    def _validated_document(value: Any, expected_dashboard_id: str | None = None) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        version = value.get("version")
        if not isinstance(version, int) or isinstance(version, bool):
            return None
        try:
            document = validate_dashboard_document(
                value,
                READABLE_DOCUMENT_VERSIONS,
                max_items=RESPONSIVE_CANVAS_V2_MAX_ITEMS,
                max_constraints=RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
            )
        except DashboardDocumentValidationError:
            return None
        if expected_dashboard_id is not None and document.get("id") != expected_dashboard_id:
            return None
        return document

    @classmethod
    def _validated_envelope(
        cls,
        value: Any,
        expected_dashboard_id: str | None = None,
    ) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        document = cls._validated_document(value.get("document"), expected_dashboard_id)
        if document is None:
            return None

        revision = value.get("revision")
        parent_revision = value.get("parentRevision")
        updated_at = value.get("updatedAt")
        client_id = value.get("clientId")
        if not isinstance(revision, str) or not revision or len(revision) > 256:
            return None
        if parent_revision is not None:
            if not isinstance(parent_revision, str) or not parent_revision or len(parent_revision) > 256:
                return None
            if parent_revision == revision:
                return None
        if (
            not isinstance(updated_at, int)
            or isinstance(updated_at, bool)
            or updated_at < 0
            or updated_at > _MAX_SAFE_INTEGER
        ):
            return None
        if not isinstance(client_id, str) or not client_id or len(client_id) > 128:
            return None
        return value

    async def _ensure_loaded(self) -> dict[str, dict[str, Any]]:
        if self._envelopes is not None:
            return self._envelopes

        stored = await self._store.async_load()
        raw_envelopes = stored.get("envelopes", {}) if isinstance(stored, dict) else {}
        self._envelopes = {}
        if isinstance(raw_envelopes, dict):
            for key, value in raw_envelopes.items():
                if not isinstance(key, str) or not key:
                    continue
                envelope = self._validated_envelope(value, key)
                if envelope is not None:
                    self._envelopes[key] = deepcopy(envelope)

        # Migrate the short-lived pre-revision storage format without turning
        # malformed legacy data into a new server revision.
        if not self._envelopes and isinstance(stored, dict):
            raw_documents = stored.get("documents", {})
            if isinstance(raw_documents, dict):
                for key, value in raw_documents.items():
                    if not isinstance(key, str) or not key:
                        continue
                    document = self._validated_document(value, key)
                    if document is not None:
                        self._envelopes[key] = self._server_revision(document, None)
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
        dashboard_id = document.get("id") if isinstance(document, dict) else None
        if not isinstance(dashboard_id, str) or not dashboard_id:
            raise ValueError("Dashboard document requires a valid id.")
        exact = self._validated_document(document, dashboard_id)
        if exact is None:
            raise ValueError("Invalid or non-canonical FRAKON dashboard document.")
        async with self._lock:
            envelopes = await self._ensure_loaded()
            previous = envelopes.get(dashboard_id)
            if previous is not None and previous["document"].get("version") != exact.get("version"):
                raise ValueError("Dashboard document version cannot change through the standard save endpoint.")
            envelope = self._server_revision(exact, previous)
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
        exact_envelope = self._validated_envelope(envelope)
        if exact_envelope is None:
            raise ValueError("Invalid FRAKON dashboard revision envelope.")
        document = exact_envelope["document"]
        dashboard_id = document["id"]
        if exact_envelope.get("parentRevision") != expected_revision:
            raise ValueError("Dashboard revision parent does not match expected revision.")

        async with self._lock:
            envelopes = await self._ensure_loaded()
            current = envelopes.get(dashboard_id)
            current_revision = current.get("revision") if current else None
            if current_revision != expected_revision:
                return False, deepcopy(current) if current is not None else {}
            if current is not None and current["document"].get("version") != document.get("version"):
                return False, deepcopy(current)

            stored_envelope = deepcopy(exact_envelope)
            envelopes[dashboard_id] = stored_envelope
            await self._persist()
            return True, deepcopy(stored_envelope)

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

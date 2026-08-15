from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import RESPONSIVE_CANVAS_V2_STORAGE_KEY
from .responsive_bundle_validation import (
    ResponsiveBundleValidationError,
    validate_responsive_revision_envelope,
)

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

    @staticmethod
    def _validated_envelope(
        value: Any,
        expected_dashboard_id: str,
    ) -> dict[str, Any] | None:
        try:
            return validate_responsive_revision_envelope(value, expected_dashboard_id)
        except ResponsiveBundleValidationError:
            return None

    @staticmethod
    def _validate_expected_revision(expected_revision: str | None) -> None:
        if expected_revision is None:
            return
        if not isinstance(expected_revision, str) or not expected_revision or len(expected_revision) > 256:
            raise ValueError("expected_revision must be a non-empty string up to 256 characters.")

    async def _ensure_loaded(self) -> dict[str, dict[str, Any]]:
        if self._envelopes is not None:
            return self._envelopes
        stored = await self._store.async_load()
        raw = stored.get("envelopes", {}) if isinstance(stored, dict) else {}
        envelopes: dict[str, dict[str, Any]] = {}
        if isinstance(raw, dict):
            for key, value in raw.items():
                if not isinstance(key, str) or not key or len(key) > 128:
                    continue
                validated = self._validated_envelope(value, key)
                if validated is not None:
                    envelopes[key] = deepcopy(validated)
        self._envelopes = envelopes
        return self._envelopes

    async def _persist(self) -> None:
        await self._store.async_save({"envelopes": self._envelopes or {}})

    async def load_revision(self, dashboard_id: str) -> dict[str, Any] | None:
        if not isinstance(dashboard_id, str) or not dashboard_id or len(dashboard_id) > 128:
            raise ValueError("dashboard_id must be a non-empty string up to 128 characters.")
        async with self._lock:
            envelopes = await self._ensure_loaded()
            envelope = envelopes.get(dashboard_id)
            return deepcopy(envelope) if envelope is not None else None

    async def save_revision(
        self,
        envelope: dict[str, Any],
        expected_revision: str | None,
    ) -> tuple[bool, dict[str, Any]]:
        self._validate_expected_revision(expected_revision)
        try:
            validated = validate_responsive_revision_envelope(envelope)
        except ResponsiveBundleValidationError as err:
            raise ValueError(str(err)) from err

        document = validated["document"]
        dashboard_id = document["id"]
        if validated.get("parentRevision") != expected_revision:
            raise ValueError("Responsive revision parentRevision must match expected_revision.")
        if expected_revision is not None and validated.get("revision") == expected_revision:
            raise ValueError("Responsive revision must differ from its parent revision.")

        async with self._lock:
            envelopes = await self._ensure_loaded()
            current = envelopes.get(dashboard_id)
            current_revision = current.get("revision") if current else None
            if current_revision != expected_revision:
                return False, deepcopy(current) if current is not None else {}
            stored = deepcopy(validated)
            envelopes[dashboard_id] = stored
            await self._persist()
            return True, deepcopy(stored)

    async def remove_revision(
        self,
        dashboard_id: str,
        expected_revision: str | None,
    ) -> tuple[bool, dict[str, Any] | None]:
        if not isinstance(dashboard_id, str) or not dashboard_id or len(dashboard_id) > 128:
            raise ValueError("dashboard_id must be a non-empty string up to 128 characters.")
        self._validate_expected_revision(expected_revision)
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

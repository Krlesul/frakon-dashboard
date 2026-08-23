from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import (
    READABLE_RESPONSIVE_BUNDLE_KINDS,
    RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
    RESPONSIVE_CANVAS_V2_KIND,
    RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
    RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
    RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
    WRITABLE_RESPONSIVE_BUNDLE_KINDS,
)
from .responsive_bundle_validation import (
    BREAKPOINTS,
    ResponsiveBundleValidationError,
    validate_responsive_bundle,
    validate_responsive_revision_envelope,
)
from .responsive_storage import FrakonResponsiveDashboardStorage

_LOGGER = logging.getLogger(__name__)
_MAX_SAFE_INTEGER = 9_007_199_254_740_991

DASHBOARD_ID = vol.All(str, vol.Length(min=1, max=128))
REVISION_ID = vol.All(str, vol.Length(min=1, max=256))
CLIENT_ID = vol.All(str, vol.Length(min=1, max=128))
EXPECTED_REVISION = vol.Any(None, REVISION_ID)


def _strict_integer(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise vol.Invalid("value must be an integer")
    return value


def _strict_updated_at(value: Any) -> int:
    timestamp = _strict_integer(value)
    if timestamp < 0 or timestamp > _MAX_SAFE_INTEGER:
        raise vol.Invalid("updatedAt must be a non-negative safe integer")
    return timestamp


def _strict_contract_version(value: Any) -> int:
    contract_version = _strict_integer(value)
    if contract_version < 0 or contract_version > _MAX_SAFE_INTEGER:
        raise vol.Invalid("contractVersion must be a non-negative safe integer")
    return contract_version


def _validate_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    try:
        return validate_responsive_bundle(bundle)
    except ResponsiveBundleValidationError as err:
        raise vol.Invalid(str(err)) from err


def _validate_revision_envelope(envelope: dict[str, Any]) -> dict[str, Any]:
    try:
        return validate_responsive_revision_envelope(envelope)
    except ResponsiveBundleValidationError as err:
        raise vol.Invalid(str(err)) from err


RESPONSIVE_BUNDLE = vol.All(
    vol.Schema(
        {
            vol.Required("kind"): vol.In(READABLE_RESPONSIVE_BUNDLE_KINDS),
            vol.Required("id"): DASHBOARD_ID,
            vol.Required("title"): vol.All(str, vol.Length(max=256)),
            vol.Required("defaultBreakpoint"): vol.In(BREAKPOINTS),
            vol.Required("documents"): dict,
        },
        extra=vol.ALLOW_EXTRA,
    ),
    _validate_bundle,
)

RESPONSIVE_REVISION_ENVELOPE = vol.All(
    vol.Schema(
        {
            vol.Required("document"): RESPONSIVE_BUNDLE,
            vol.Required("revision"): REVISION_ID,
            vol.Optional("parentRevision"): vol.Any(None, REVISION_ID),
            vol.Required("updatedAt"): _strict_updated_at,
            vol.Required("clientId"): CLIENT_ID,
        },
        extra=vol.ALLOW_EXTRA,
    ),
    _validate_revision_envelope,
)


def _validate_stored_responsive_revision(
    value: Any,
    expected_dashboard_id: str,
) -> dict[str, Any] | None:
    try:
        return validate_responsive_revision_envelope(value, expected_dashboard_id)
    except ResponsiveBundleValidationError:
        return None


def _audit_blocked_persistence(
    *,
    operation: str,
    dashboard_id: str,
    contract_version: int,
    reason: str,
) -> None:
    _LOGGER.warning(
        "Blocked FRAKON responsive dashboard persistence operation=%s dashboard_id=%s contract_version=%s reason=%s",
        operation,
        dashboard_id,
        contract_version,
        reason,
    )


def _send_write_disabled(
    connection: websocket_api.ActiveConnection,
    msg_id: int,
    *,
    operation: str,
    dashboard_id: str,
    contract_version: int,
) -> None:
    _audit_blocked_persistence(
        operation=operation,
        dashboard_id=dashboard_id,
        contract_version=contract_version,
        reason="write-disabled",
    )
    connection.send_error(
        msg_id,
        "unsupported_responsive_write",
        f"Responsive dashboard bundle kind {RESPONSIVE_CANVAS_V2_KIND} is readable but not enabled for server-side writes.",
    )


def _validate_candidate_lineage(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    envelope: dict[str, Any],
    expected_revision: str | None,
) -> bool:
    if envelope.get("parentRevision") != expected_revision:
        connection.send_error(
            msg["id"],
            "invalid_parent_revision",
            "Envelope parentRevision must match expectedRevision.",
        )
        return False
    if expected_revision is not None and envelope.get("revision") == expected_revision:
        connection.send_error(
            msg["id"],
            "invalid_revision",
            "A responsive revision must differ from its parent revision.",
        )
        return False
    return True


def register_responsive_commands(
    hass: HomeAssistant,
    storage: FrakonResponsiveDashboardStorage,
) -> None:
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
            vol.Required("dashboard_id"): DASHBOARD_ID,
        }
    )
    @websocket_api.async_response
    async def handle_load_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        dashboard_id = msg["dashboard_id"]
        try:
            envelope = await storage.load_revision(dashboard_id)
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_dashboard_id", str(err))
            return
        if envelope is None:
            connection.send_result(msg["id"], None)
            return
        validated = _validate_stored_responsive_revision(envelope, dashboard_id)
        if validated is None:
            connection.send_error(
                msg["id"],
                "invalid_responsive_bundle",
                "Stored FRAKON responsive dashboard revision failed validation.",
            )
            return
        connection.send_result(msg["id"], validated)

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
            vol.Required("contractVersion"): _strict_contract_version,
            vol.Required("envelope"): RESPONSIVE_REVISION_ENVELOPE,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_dry_run_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        envelope = dict(msg["envelope"])
        bundle = envelope["document"]
        dashboard_id = bundle["id"]
        contract_version = msg["contractVersion"]
        if contract_version != RESPONSIVE_CANVAS_V2_CONTRACT_VERSION:
            connection.send_error(
                msg["id"],
                "responsive_contract_incompatible",
                f"Responsive contract version {contract_version} is not supported; expected {RESPONSIVE_CANVAS_V2_CONTRACT_VERSION}.",
            )
            return

        expected_revision = msg.get("expectedRevision")
        if not _validate_candidate_lineage(connection, msg, envelope, expected_revision):
            return

        try:
            remote = await storage.load_revision(dashboard_id)
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_dashboard_id", str(err))
            return
        if remote is not None:
            validated_remote = _validate_stored_responsive_revision(remote, dashboard_id)
            if validated_remote is None:
                connection.send_error(
                    msg["id"],
                    "invalid_stored_revision",
                    "Stored FRAKON responsive dashboard revision failed validation.",
                )
                return
            remote = validated_remote
        remote_revision = remote.get("revision") if remote else None
        if remote_revision != expected_revision:
            connection.send_result(msg["id"], {"status": "conflict", "remote": remote})
            return

        connection.send_result(
            msg["id"],
            {
                "status": "valid",
                "currentRevision": remote_revision,
                "writeEnabled": bundle.get("kind") in WRITABLE_RESPONSIVE_BUNDLE_KINDS,
            },
        )

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
            vol.Required("contractVersion"): _strict_contract_version,
            vol.Required("envelope"): RESPONSIVE_REVISION_ENVELOPE,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_save_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        envelope = dict(msg["envelope"])
        bundle = envelope["document"]
        dashboard_id = bundle["id"]
        contract_version = msg["contractVersion"]

        if contract_version != RESPONSIVE_CANVAS_V2_CONTRACT_VERSION:
            _audit_blocked_persistence(
                operation="save",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
                reason="contract-incompatible",
            )
            connection.send_error(
                msg["id"],
                "responsive_contract_incompatible",
                f"Responsive contract version {contract_version} is not supported; expected {RESPONSIVE_CANVAS_V2_CONTRACT_VERSION}.",
            )
            return

        kind = bundle.get("kind")
        if kind not in WRITABLE_RESPONSIVE_BUNDLE_KINDS:
            _send_write_disabled(
                connection,
                msg["id"],
                operation="save",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
            )
            return

        expected_revision = msg.get("expectedRevision")
        if not _validate_candidate_lineage(connection, msg, envelope, expected_revision):
            return

        try:
            saved, remote = await storage.save_revision(envelope, expected_revision)
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_responsive_revision", str(err))
            return
        if saved:
            saved_envelope = _validate_stored_responsive_revision(remote, dashboard_id)
            if saved_envelope is None:
                connection.send_error(
                    msg["id"],
                    "invalid_saved_revision",
                    "Saved FRAKON responsive dashboard revision failed validation.",
                )
                return
            connection.send_result(msg["id"], {"status": "saved", "envelope": saved_envelope})
            return
        if not remote:
            connection.send_error(
                msg["id"],
                "revision_conflict",
                "Responsive dashboard was removed while this client held an older revision.",
            )
            return
        remote_envelope = _validate_stored_responsive_revision(remote, dashboard_id)
        if remote_envelope is None:
            connection.send_error(
                msg["id"],
                "invalid_stored_revision",
                "Stored remote FRAKON responsive dashboard revision failed validation.",
            )
            return
        connection.send_result(msg["id"], {"status": "conflict", "remote": remote_envelope})

    @websocket_api.require_admin
    @websocket_api.async_response
    @websocket_api.websocket_command(
        {
            vol.Required("type"): RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
            vol.Required("contractVersion"): _strict_contract_version,
            vol.Required("dashboard_id"): DASHBOARD_ID,
            vol.Optional("expectedRevision", default=None): EXPECTED_REVISION,
        }
    )
    async def handle_remove_responsive_revision(
        hass: HomeAssistant,
        connection: websocket_api.ActiveConnection,
        msg: dict[str, Any],
    ) -> None:
        dashboard_id = msg["dashboard_id"]
        contract_version = msg["contractVersion"]
        if contract_version != RESPONSIVE_CANVAS_V2_CONTRACT_VERSION:
            _audit_blocked_persistence(
                operation="remove",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
                reason="contract-incompatible",
            )
            connection.send_error(
                msg["id"],
                "responsive_contract_incompatible",
                f"Responsive contract version {contract_version} is not supported; expected {RESPONSIVE_CANVAS_V2_CONTRACT_VERSION}.",
            )
            return
        if RESPONSIVE_CANVAS_V2_KIND not in WRITABLE_RESPONSIVE_BUNDLE_KINDS:
            _send_write_disabled(
                connection,
                msg["id"],
                operation="remove",
                dashboard_id=dashboard_id,
                contract_version=contract_version,
            )
            return

        try:
            removed, remote = await storage.remove_revision(dashboard_id, msg.get("expectedRevision"))
        except ValueError as err:
            connection.send_error(msg["id"], "invalid_responsive_revision", str(err))
            return
        if removed:
            connection.send_result(msg["id"], {"status": "removed"})
            return
        remote_envelope = _validate_stored_responsive_revision(remote, dashboard_id)
        if remote_envelope is None:
            connection.send_error(
                msg["id"],
                "invalid_stored_revision",
                "Stored FRAKON responsive dashboard revision failed validation.",
            )
            return
        connection.send_result(msg["id"], {"status": "conflict", "remote": remote_envelope})

    websocket_api.async_register_command(hass, handle_load_responsive_revision)
    websocket_api.async_register_command(hass, handle_dry_run_responsive_revision)
    websocket_api.async_register_command(hass, handle_save_responsive_revision)
    websocket_api.async_register_command(hass, handle_remove_responsive_revision)

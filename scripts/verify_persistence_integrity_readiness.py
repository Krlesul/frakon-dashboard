from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def source(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f"Persistence integrity readiness failed: missing {relative}")
    return path.read_text(encoding="utf-8")


def require(relative: str, *markers: str) -> None:
    text = source(relative)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise SystemExit(
            f"Persistence integrity readiness failed: {relative} is missing markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


def forbid(relative: str, *markers: str) -> None:
    text = source(relative)
    present = [marker for marker in markers if marker in text]
    if present:
        raise SystemExit(
            f"Persistence integrity readiness failed: {relative} contains forbidden markers:\n- "
            + "\n- ".join(repr(marker) for marker in present)
        )


require(
    "src/dashboard/dashboard-document-codec.ts",
    "isDashboardDocumentV1",
    "v1ItemsOverlap",
    "rowHeight < 24",
    "Invalid or non-canonical FRAKON dashboard document.",
    "JSON.stringify(structuredClone(document), null, 2)",
)
require(
    "src/dashboard/layout-model-v2.ts",
    "if ('hidden' in value) return false",
    "minWidth) && minWidth > canvasWidth",
    "value.frame.width < effectiveMinWidth",
)
require(
    "src/dashboard/dashboard-storage.ts",
    "requireValidDocument",
    "isDashboardDocumentV1",
    "structuredClone(value)",
)
for exact_storage_path in (
    "src/dashboard/dashboard-storage.ts",
    "src/dashboard/dashboard-storage-controller.ts",
    "src/dashboard/layout-store.ts",
    "src/dashboard/resilient-dashboard-storage.ts",
):
    forbid(exact_storage_path, "normalizeAndCompactDashboard(")

require(
    "src/dashboard/dashboard-storage-controller.ts",
    "isDashboardDocumentV1(document)",
    "structuredClone(document)",
    "Storage is an identity boundary",
)
require(
    "src/dashboard/layout-store.ts",
    "isDashboardDocumentV1(document)",
    "structuredClone(parsed)",
    "JSON.stringify(structuredClone(document), null, 2)",
)
require(
    "src/dashboard/resilient-dashboard-storage.ts",
    "isDashboardSyncOperation",
    "requireSyncOperation(candidate)",
    "Number.isSafeInteger(operation.queuedAt)",
    "operation.document.id === operation.id",
)
require(
    "src/dashboard/dashboard-revision.ts",
    "isDashboardRevisionEnvelope",
    "isDashboardDocumentV1(value) || isDashboardDocumentV2(value)",
    "Number.isSafeInteger(envelope.updatedAt)",
)
require(
    "src/dashboard/revisioned-dashboard-storage.ts",
    "Cannot persist an invalid or non-canonical dashboard revision document.",
    "isDashboardRevisionEnvelope(previous, document.id, document.version)",
    "isDashboardRevisionEnvelope(savedEnvelope, document.id, document.version)",
)
require(
    "src/dashboard/dashboard-conflict-resolver.ts",
    "escalateV1IntegrityConflicts",
    "escalateV2IntegrityConflicts",
    "Cannot merge invalid or non-canonical version 1",
    "Cannot merge invalid or non-canonical version 2",
)
require(
    "src/dashboard/dashboard-selective-conflict-resolution.ts",
    "complete && !isDashboardDocumentV1(document)",
    "non-canonical version 1 document",
)
require(
    "src/dashboard/dashboard-selective-conflict-resolution-v2.ts",
    "complete && !isDashboardDocumentV2(document)",
    "non-canonical version 2 document",
)

require(
    "custom_components/frakon_dashboard/document_validation.py",
    "def validate_dashboard_document",
    "Dashboard items",
    "overlap in the version 1 grid",
    "outside its canonical min/max bounds",
    'if "hidden" in item',
)
require(
    "custom_components/frakon_dashboard/storage.py",
    "validate_dashboard_document",
    "_validated_envelope",
    "version cannot change through the standard save endpoint",
)
require(
    "custom_components/frakon_dashboard/websocket.py",
    "_strict_document_version",
    "_strict_updated_at",
    "validate_dashboard_document",
    "revision_version_conflict",
)
for websocket_path in (
    "custom_components/frakon_dashboard/websocket.py",
    "custom_components/frakon_dashboard/responsive_websocket.py",
):
    forbid(websocket_path, "vol.Coerce(int)")

require(
    "custom_components/frakon_dashboard/responsive_bundle_validation.py",
    "validate_responsive_bundle",
    "validate_responsive_revision_envelope",
    "validate_dashboard_document",
    "enabled constraint dependency cycle",
)
require(
    "custom_components/frakon_dashboard/responsive_storage.py",
    "validate_responsive_revision_envelope",
    "expected_dashboard_id=key",
    "parentRevision must match expectedRevision",
)
require(
    "custom_components/frakon_dashboard/responsive_websocket.py",
    "_strict_contract_version",
    "_strict_updated_at",
    "_validate_stored_responsive_revision",
)

require(
    "scripts/verify_dashboard_document_validation.py",
    "boolean document version",
    "overlapping v1 items",
    "unsupported persisted v2 hidden state",
    "v2 frame width below minWidth",
)
require(
    "scripts/verify_responsive_bundle_validation.py",
    "persisted v2 hidden field",
    "frame width below canonical minWidth",
    "enabled constraint dependency cycle",
    "fractional updatedAt",
)
require(
    "scripts/verify_home_assistant_install.py",
    '"responsive_bundle_validation.py"',
    '"responsive_constraint_validation.py"',
    "Responsive bundle validator: OK",
    "responsive WebSocket persistence schema must not coerce integer values",
)

print("Persistence integrity readiness: OK")

from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONST_PATH = ROOT / "custom_components/frakon_dashboard/const.py"
WS_PATH = ROOT / "custom_components/frakon_dashboard/responsive_websocket.py"
STORAGE_PATH = ROOT / "custom_components/frakon_dashboard/responsive_storage.py"
BUNDLE_VALIDATOR_PATH = ROOT / "custom_components/frakon_dashboard/responsive_bundle_validation.py"
ACTION_PANEL_PATH = ROOT / "src/dashboard/responsive-v2-persistence-action-panel.ts"
DRY_RUN_PROOF_PATH = ROOT / "src/dashboard/responsive-v2-dry-run-storage-proof.ts"
SAVE_PANEL_PATH = ROOT / "src/dashboard/responsive-v2-save-panel.ts"
RECEIPT_PATH = ROOT / "src/dashboard/responsive-v2-server-validation-receipt.ts"
SAVE_COORDINATOR_PATH = ROOT / "src/dashboard/responsive-v2-editor-save-coordinator.ts"
PARENT_BRIDGE_PATH = ROOT / "src/dashboard/responsive-v2-parent-state-bridge.ts"
HEALTH_PANEL_PATH = ROOT / "src/dashboard/responsive-v2-health-panel.ts"


def assignments(path: Path) -> dict[str, ast.AST]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    result: dict[str, ast.AST] = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            result[node.targets[0].id] = node.value
    return result


def literal(node: ast.AST):
    return ast.literal_eval(node)


def function(tree: ast.AST, name: str) -> ast.AsyncFunctionDef:
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name:
            return node
    raise SystemExit(f"Missing responsive websocket handler {name!r}.")


def has_decorator(node: ast.AsyncFunctionDef, suffix: str) -> bool:
    for decorator in node.decorator_list:
        if isinstance(decorator, ast.Attribute) and decorator.attr == suffix:
            return True
    return False


def mutation_calls(node: ast.AsyncFunctionDef) -> list[str]:
    mutations: list[str] = []
    for child in ast.walk(node):
        if not isinstance(child, ast.Call) or not isinstance(child.func, ast.Attribute):
            continue
        if child.func.attr in {"save", "save_revision", "remove", "remove_revision"}:
            mutations.append(child.func.attr)
    return mutations


def require_snippets(path: Path, snippets: tuple[str, ...], label: str) -> str:
    source = path.read_text(encoding="utf-8")
    missing = [snippet for snippet in snippets if snippet not in source]
    if missing:
        raise SystemExit(f"{label} missing required invariant(s): {missing!r}")
    return source


def main() -> None:
    values = assignments(CONST_PATH)
    contract = literal(values["RESPONSIVE_CANVAS_V2_CONTRACT_VERSION"])
    if contract != 1:
        raise SystemExit(f"Responsive alpha contract must remain v1 before audited unlock, got {contract!r}.")

    writable = values["WRITABLE_RESPONSIVE_BUNDLE_KINDS"]
    if not isinstance(writable, ast.Call) or not isinstance(writable.func, ast.Name) or writable.func.id != "frozenset" or writable.args or writable.keywords:
        raise SystemExit("WRITABLE_RESPONSIVE_BUNDLE_KINDS must remain an empty frozenset before audited unlock.")

    dry_run_endpoint = literal(values["RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT"])
    if dry_run_endpoint != "frakon/dashboard/dry_run_responsive_revision":
        raise SystemExit(f"Unexpected responsive dry-run endpoint: {dry_run_endpoint!r}")

    source = require_snippets(
        WS_PATH,
        (
            "async def handle_dry_run_responsive_revision",
            "async def handle_save_responsive_revision",
            "async def handle_remove_responsive_revision",
            "@websocket_api.require_admin",
            '"unsupported_responsive_write"',
            "if RESPONSIVE_CANVAS_V2_KIND not in WRITABLE_RESPONSIVE_BUNDLE_KINDS",
            "_strict_contract_version",
            "_strict_updated_at",
            "validate_dashboard_document(",
            "_validate_stored_responsive_revision",
            "validated_remote = _validate_stored_responsive_revision(remote, dashboard_id)",
            "remote_envelope = _validate_stored_responsive_revision(remote, dashboard_id)",
        ),
        "Responsive backend write-lock and validation guard",
    )
    if "vol.Coerce(int)" in source:
        raise SystemExit("Responsive websocket must not coerce integer persistence metadata or contract versions.")

    require_snippets(
        STORAGE_PATH,
        (
            "validate_responsive_revision_envelope",
            "validated = self._validated_envelope(value, key)",
            'validated.get("parentRevision") != expected_revision',
            "self._validate_expected_revision(expected_revision)",
        ),
        "Responsive Home Assistant Store validation boundary",
    )
    require_snippets(
        BUNDLE_VALIDATOR_PATH,
        (
            "validate_dashboard_document(",
            "validate_responsive_bundle",
            "validate_responsive_revision_envelope",
            "_has_enabled_constraint_cycle",
            "_MAX_SAFE_INTEGER",
            "Responsive breakpoint dashboard id must match the bundle id.",
        ),
        "Standalone responsive bundle validation contract",
    )

    tree = ast.parse(source, filename=str(WS_PATH))
    dry_run = function(tree, "handle_dry_run_responsive_revision")
    if not has_decorator(dry_run, "require_admin"):
        raise SystemExit("Responsive dry-run handler must remain admin-only.")
    mutations = mutation_calls(dry_run)
    if mutations:
        raise SystemExit(f"Responsive dry-run must remain non-mutating, found storage mutation call(s): {mutations!r}")

    require_snippets(
        ACTION_PANEL_PATH,
        (
            "serverValidatedRevision",
            "this.serverValidatedRevision = preview.candidate.revision",
            "this.serverValidatedRevision !== event.detail.candidate.revision",
            "validationRequired",
            ".serverValidatedRevision=${this.serverValidatedRevision}",
            "const before = await this.readPersisted(preview.candidate.bundle.id)",
            "const after = await this.readPersisted(preview.candidate.bundle.id)",
            "responsiveV2DryRunStorageProof(before, after)",
            "storageInvariant",
        ),
        "Responsive editor dry-run receipt and storage-proof gate",
    )
    require_snippets(
        DRY_RUN_PROOF_PATH,
        (
            "responsiveV2DryRunStorageProof",
            "'unchanged'",
            "'changed-during-check'",
            "'unverifiable'",
            "beforeFingerprint === afterFingerprint",
        ),
        "Responsive dry-run persisted-state proof model",
    )
    require_snippets(
        RECEIPT_PATH,
        (
            "responsiveV2ServerValidationReceipt",
            "validatedRevision === candidateRevision",
            "candidateRevision.length > 0",
        ),
        "Responsive exact-candidate receipt model",
    )
    require_snippets(
        SAVE_PANEL_PATH,
        (
            "responsiveV2ServerValidationReceipt",
            "this.receipt().valid",
            "preview.wouldWrite && receipt.valid",
            "validationRequired",
            "serverValidatedRevision",
        ),
        "Responsive Save panel validation gate",
    )
    coordinator = require_snippets(
        SAVE_COORDINATOR_PATH,
        (
            "resolveResponsiveV2EditorConflict",
            "dryRunResponsiveCanvasV2Revision(",
            "persistResponsiveCanvasV2Revision(",
            "remote-removed",
        ),
        "Responsive conflict resolution validation gate",
    )
    resolve_start = coordinator.index("export async function resolveResponsiveV2EditorConflict")
    resolve_source = coordinator[resolve_start:]
    dry_run_pos = resolve_source.index("dryRunResponsiveCanvasV2Revision(")
    persist_pos = resolve_source.index("persistResponsiveCanvasV2Revision(")
    if dry_run_pos > persist_pos:
        raise SystemExit("Responsive conflict resolution must dry-run the resolved candidate before persistence.")

    require_snippets(
        PARENT_BRIDGE_PATH,
        ("applyResponsiveV2SavedStateToParent", "host.nativeV2Revision = revision", "host.applyNativeV2Snapshot(snapshot)"),
        "Responsive post-save parent state bridge",
    )
    require_snippets(
        HEALTH_PANEL_PATH,
        ("@frakon-responsive-v2-saved=${this.onSaved}", "applyResponsiveV2SavedStateToParent"),
        "Responsive post-save event wiring",
    )

    print(
        "Responsive alpha write lock verified: contract v1, empty write allowlist, admin guarded handlers, "
        "strict non-coercing metadata, dashboard-id-bound stored/conflict revisions, canonical v2 bundle validation, "
        "non-mutating dry-run, before/after storage proof, exact-candidate validation receipt, conflict dry-run, "
        "post-save state bridge."
    )


if __name__ == "__main__":
    main()

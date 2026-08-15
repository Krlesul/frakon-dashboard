from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = json.loads((ROOT / "package.json").read_text())
HACS = json.loads((ROOT / "hacs.json").read_text())
HA_MANIFEST = json.loads((ROOT / "custom_components/frakon_dashboard/manifest.json").read_text())
VITE = (ROOT / "vite.config.ts").read_text()
INDEX = (ROOT / "src/index.ts").read_text()
INTEGRATION_ROOT = ROOT / "custom_components/frakon_dashboard"
INIT_SOURCE = (INTEGRATION_ROOT / "__init__.py").read_text()
CONST_SOURCE = (INTEGRATION_ROOT / "const.py").read_text()
WEBSOCKET_SOURCE = (INTEGRATION_ROOT / "websocket.py").read_text()
RESPONSIVE_WEBSOCKET = INTEGRATION_ROOT / "responsive_websocket.py"
RESPONSIVE_WEBSOCKET_SOURCE = RESPONSIVE_WEBSOCKET.read_text() if RESPONSIVE_WEBSOCKET.is_file() else ""
RESPONSIVE_STORAGE = INTEGRATION_ROOT / "responsive_storage.py"
RESPONSIVE_STORAGE_SOURCE = RESPONSIVE_STORAGE.read_text() if RESPONSIVE_STORAGE.is_file() else ""
RESPONSIVE_BUNDLE_VALIDATOR = INTEGRATION_ROOT / "responsive_bundle_validation.py"
RESPONSIVE_BUNDLE_VALIDATOR_SOURCE = RESPONSIVE_BUNDLE_VALIDATOR.read_text() if RESPONSIVE_BUNDLE_VALIDATOR.is_file() else ""
RESPONSIVE_CONSTRAINT_VALIDATOR = INTEGRATION_ROOT / "responsive_constraint_validation.py"
FRONTEND_HELPER = INTEGRATION_ROOT / "frontend.py"
FRONTEND_HELPER_SOURCE = FRONTEND_HELPER.read_text() if FRONTEND_HELPER.is_file() else ""
BUILD_INFO_PROVIDER = INTEGRATION_ROOT / "build_info.py"
BUILD_INFO_WEBSOCKET = INTEGRATION_ROOT / "build_websocket.py"
DOCUMENT_VALIDATOR = INTEGRATION_ROOT / "document_validation.py"
DOCUMENT_VALIDATOR_SOURCE = DOCUMENT_VALIDATOR.read_text() if DOCUMENT_VALIDATOR.is_file() else ""
RELEASE_PACKAGER = ROOT / "scripts/build_hacs_release.py"
INSTALL_SELF_CHECK = ROOT / "scripts/verify_home_assistant_install.py"
INSTALL_SELF_CHECK_SOURCE = INSTALL_SELF_CHECK.read_text() if INSTALL_SELF_CHECK.is_file() else ""
DOCUMENT_VALIDATOR_CHECK = ROOT / "scripts/verify_dashboard_document_validation.py"
RESPONSIVE_VALIDATOR_CHECK = ROOT / "scripts/verify_responsive_bundle_validation.py"
RESPONSIVE_WRITE_LOCK_CHECK = ROOT / "scripts/verify_responsive_write_lock.py"
PERSISTENCE_INTEGRITY_CHECK = ROOT / "scripts/verify_persistence_integrity_readiness.py"
ALPHA_KIT_BUILDER = ROOT / "scripts/build_alpha_test_kit.py"
ALPHA_KIT_VERIFIER = ROOT / "scripts/verify_alpha_test_kit.py"
CI_WORKFLOW = ROOT / ".github/workflows/ci.yml"
CS_TRANSLATION = INTEGRATION_ROOT / "translations/cs.json"
ALPHA_TEST_GUIDE = ROOT / "docs/home-assistant-alpha-test.md"
ALPHA_REPORT_TEMPLATE = ROOT / "docs/home-assistant-alpha-test-report-template.md"
ALPHA_MIGRATION_GUIDE = ROOT / "docs/alpha-migration.md"

errors: list[str] = []

package_version = str(PACKAGE.get("version", ""))
manifest_version = str(HA_MANIFEST.get("version", ""))
if package_version != manifest_version:
    errors.append(f"version mismatch: package.json={package_version!r}, HA manifest={manifest_version!r}")

runtime_version_match = re.search(r'^INTEGRATION_VERSION\s*=\s*["\']([^"\']+)["\']', CONST_SOURCE, re.MULTILINE)
runtime_version = runtime_version_match.group(1) if runtime_version_match else ""
if runtime_version != package_version:
    errors.append(f"runtime integration version mismatch: const.py={runtime_version!r}, package.json={package_version!r}")

if HA_MANIFEST.get("domain") != "frakon_dashboard":
    errors.append("HA manifest domain must be frakon_dashboard")
if HA_MANIFEST.get("config_flow") is not True:
    errors.append("HA manifest must enable config_flow")
if HA_MANIFEST.get("single_config_entry") is not True:
    errors.append("HA manifest must declare single_config_entry")
if set(HA_MANIFEST.get("dependencies", [])) != {"http", "lovelace"}:
    errors.append("HA manifest must depend on http and lovelace for bundled frontend registration")
if HA_MANIFEST.get("issue_tracker") != "https://github.com/Krlesul/frakon-dashboard/issues":
    errors.append("HA manifest must expose the GitHub issue tracker required by HACS")

if HACS.get("zip_release") is not True:
    errors.append("HACS must use zip_release so the built frontend is bundled with the integration")
if HACS.get("hide_default_branch") is not True:
    errors.append("HACS default branch must be hidden because source branches do not contain the built frontend bundle")
if HACS.get("filename") != "frakon_dashboard.zip":
    errors.append(f"HACS filename must be frakon_dashboard.zip, got {HACS.get('filename')!r}")

if not re.search(r"fileName:\s*\(\)\s*=>\s*['\"]frakon-dashboard\.js['\"]", VITE):
    errors.append("Vite library output must stay frakon-dashboard.js")
if "entry: 'src/index.ts'" not in VITE and 'entry: "src/index.ts"' not in VITE:
    errors.append("Vite library entry must stay src/index.ts")

required_card_imports = [
    "./cards/frakon-card",
    "./cards/sensor/sensor-card",
    "./cards/room/room-card",
    "./cards/switch/switch-card",
    "./cards/action/action-card",
    "./cards/light/light-card",
    "./cards/climate/climate-card",
    "./cards/fan/fan-card",
    "./cards/binary-sensor/binary-sensor-card",
    "./cards/cover/cover-card",
    "./cards/lock/lock-card",
    "./cards/camera/camera-card",
    "./cards/media/media-player-card",
    "./cards/energy/energy-card",
    "./cards/vehicle/vehicle-card",
    "./dashboard/dashboard-card",
    "./dashboard/canvas-dashboard-card",
]
for import_path in required_card_imports:
    if import_path not in INDEX:
        errors.append(f"production entrypoint is missing {import_path}")

if not FRONTEND_HELPER.is_file():
    errors.append("bundled frontend runtime helper is missing")
elif "?v={INTEGRATION_VERSION}" not in FRONTEND_HELPER_SOURCE:
    errors.append("bundled frontend resource URL must be cache-busted with INTEGRATION_VERSION")
if not BUILD_INFO_PROVIDER.is_file():
    errors.append("runtime build-info provider is missing")
if not BUILD_INFO_WEBSOCKET.is_file():
    errors.append("runtime build-info WebSocket endpoint is missing")
if "from .build_websocket import register_build_info_command" not in INIT_SOURCE:
    errors.append("integration __init__ must import register_build_info_command")
if "register_build_info_command(hass)" not in INIT_SOURCE:
    errors.append("integration __init__ must register the build-info WebSocket command")

if not DOCUMENT_VALIDATOR.is_file():
    errors.append("dashboard document validator is missing")
else:
    for marker in (
        "class DashboardDocumentValidationError",
        "def validate_dashboard_document",
        "Duplicate dashboard item id",
        "overlap in the version 1 grid",
        "outside its canonical min/max bounds",
        "references an unknown item",
    ):
        if marker not in DOCUMENT_VALIDATOR_SOURCE:
            errors.append(f"dashboard document validator is missing marker {marker!r}")
if "from .document_validation import DashboardDocumentValidationError, validate_dashboard_document" not in WEBSOCKET_SOURCE:
    errors.append("websocket boundary must import the standalone document validator")
if "validate_dashboard_document(" not in WEBSOCKET_SOURCE:
    errors.append("websocket boundary must invoke validate_dashboard_document")
if "vol.Coerce(int)" in WEBSOCKET_SOURCE:
    errors.append("websocket persistence schema must not coerce integer values")

if not RESPONSIVE_BUNDLE_VALIDATOR.is_file():
    errors.append("responsive bundle validator is missing")
else:
    for marker in (
        "validate_responsive_bundle",
        "validate_responsive_revision_envelope",
        "validate_dashboard_document(",
        "enabled constraint dependency cycle",
        "_MAX_SAFE_INTEGER",
    ):
        if marker not in RESPONSIVE_BUNDLE_VALIDATOR_SOURCE:
            errors.append(f"responsive bundle validator is missing marker {marker!r}")
if not RESPONSIVE_CONSTRAINT_VALIDATOR.is_file():
    errors.append("responsive constraint validator is missing")
if not RESPONSIVE_STORAGE.is_file():
    errors.append("responsive Home Assistant Store is missing")
elif "validate_responsive_revision_envelope" not in RESPONSIVE_STORAGE_SOURCE:
    errors.append("responsive Home Assistant Store must use the shared responsive revision validator")
if not RESPONSIVE_WEBSOCKET.is_file():
    errors.append("responsive WebSocket boundary is missing")
else:
    for marker in ("_strict_contract_version", "_strict_updated_at", "_validate_stored_responsive_revision"):
        if marker not in RESPONSIVE_WEBSOCKET_SOURCE:
            errors.append(f"responsive WebSocket boundary is missing marker {marker!r}")
    if "vol.Coerce(int)" in RESPONSIVE_WEBSOCKET_SOURCE:
        errors.append("responsive WebSocket persistence schema must not coerce integer values")

for path, label in (
    (RELEASE_PACKAGER, "HACS release packager"),
    (INSTALL_SELF_CHECK, "Home Assistant install self-check"),
    (DOCUMENT_VALIDATOR_CHECK, "dashboard document validator contract check"),
    (RESPONSIVE_VALIDATOR_CHECK, "responsive bundle validator contract check"),
    (RESPONSIVE_WRITE_LOCK_CHECK, "responsive write-lock audit"),
    (PERSISTENCE_INTEGRITY_CHECK, "persistence integrity readiness audit"),
    (ALPHA_KIT_BUILDER, "Alpha Test Kit builder"),
    (ALPHA_KIT_VERIFIER, "Alpha Test Kit verifier"),
    (CI_WORKFLOW, "CI workflow"),
):
    if not path.is_file():
        errors.append(f"{label} is missing")

if not CS_TRANSLATION.is_file():
    errors.append("Czech config-flow translation is missing")
else:
    try:
        cs_translation = json.loads(CS_TRANSLATION.read_text())
        description = cs_translation["config"]["step"]["user"]["description"]
        already_configured = cs_translation["config"]["abort"]["already_configured"]
        if cs_translation.get("title") != "FRAKON Dashboard":
            errors.append("Czech translation title must be FRAKON Dashboard")
        if not isinstance(description, str) or len(description.strip()) < 20:
            errors.append("Czech config-flow description is missing or too short")
        if not isinstance(already_configured, str) or not already_configured.strip():
            errors.append("Czech already-configured translation is missing")
    except (KeyError, TypeError, json.JSONDecodeError) as exc:
        errors.append(f"Czech config-flow translation is invalid: {exc}")

if not ALPHA_TEST_GUIDE.is_file():
    errors.append("Home Assistant alpha test guide is missing")
else:
    guide = ALPHA_TEST_GUIDE.read_text()
    for marker in (
        "frakon-dashboard-alpha-test-kit.zip",
        "integrationSha256",
        "frontendSha256",
        "/config/custom_components/frakon_dashboard",
        "/frakon-dashboard/frakon-dashboard.js?v=",
        "Dashboard document validator: OK",
        "Responsive bundle validator: OK",
        "commits exactly the previewed geometry",
        "responsiveCanvasV2.write = false",
        "constraint dependency cycle",
    ):
        if marker not in guide:
            errors.append(f"alpha test guide is missing required marker {marker!r}")

if not ALPHA_REPORT_TEMPLATE.is_file():
    errors.append("Home Assistant alpha evidence report template is missing")
else:
    report = ALPHA_REPORT_TEMPLATE.read_text()
    for marker in (
        "## Build identity",
        "Integration ZIP SHA-256",
        "Frontend SHA-256",
        "Identity gate",
        "Dashboard document validator",
        "Responsive bundle validator",
        "## Home Assistant environment",
        "## Client matrix",
        "## Automatic layout",
        "## Storage / revisions / conflict handling",
        "Independently valid concurrent edits",
        "## Responsive server validation / write lock",
        "## Browser console / network",
        "## Defects found",
    ):
        if marker not in report:
            errors.append(f"alpha report template is missing {marker!r}")

if not ALPHA_MIGRATION_GUIDE.is_file():
    errors.append("alpha migration guide is missing")
else:
    migration = ALPHA_MIGRATION_GUIDE.read_text()
    for marker in (
        "/config/custom_components/frakon_dashboard",
        "/frakon-dashboard/frakon-dashboard.js?v=",
        "/local/frakon-dashboard.js",
        "storage: home-assistant",
        "hidden: true",
        "layout_group: security",
        "Responsive Canvas v2",
        "## 9. Rollback",
    ):
        if marker not in migration:
            errors.append(f"alpha migration guide is missing required marker {marker!r}")

for marker in (
    '"document_validation.py"',
    '"responsive_bundle_validation.py"',
    '"responsive_constraint_validation.py"',
    '"translations/cs.json"',
    "sourceCommit must identify a verified source revision",
    "frontendSha256",
    "installed frontend SHA-256 does not match build-info.json",
    "Dashboard document validator: OK",
    "Responsive bundle validator: OK",
    "runtime integration version does not match manifest",
    "Czech config flow: OK",
):
    if marker not in INSTALL_SELF_CHECK_SOURCE:
        errors.append(f"install self-check is missing preflight marker {marker!r}")

if DOCUMENT_VALIDATOR_CHECK.is_file():
    validator_check_source = DOCUMENT_VALIDATOR_CHECK.read_text()
    for marker in (
        "Dashboard document validation contract: OK",
        "boolean document version",
        "duplicate v1 item id",
        "overlapping v1 items",
        "unsupported persisted v2 hidden state",
        "v2 frame width below minWidth",
    ):
        if marker not in validator_check_source:
            errors.append(f"document validator contract check is missing marker {marker!r}")

if RESPONSIVE_VALIDATOR_CHECK.is_file():
    responsive_validator_check_source = RESPONSIVE_VALIDATOR_CHECK.read_text()
    for marker in (
        "Responsive bundle validation contract: OK",
        "persisted v2 hidden field",
        "frame width below canonical minWidth",
        "enabled constraint dependency cycle",
        "fractional updatedAt",
    ):
        if marker not in responsive_validator_check_source:
            errors.append(f"responsive validator contract check is missing marker {marker!r}")

if RESPONSIVE_WRITE_LOCK_CHECK.is_file():
    responsive_lock_source = RESPONSIVE_WRITE_LOCK_CHECK.read_text()
    for marker in (
        "WRITABLE_RESPONSIVE_BUNDLE_KINDS must remain an empty frozenset",
        "Responsive websocket must not coerce integer persistence metadata",
        "shared canonical v2 bundle validation",
    ):
        if marker not in responsive_lock_source:
            errors.append(f"responsive write-lock audit is missing marker {marker!r}")

if PERSISTENCE_INTEGRITY_CHECK.is_file():
    persistence_source = PERSISTENCE_INTEGRITY_CHECK.read_text()
    for marker in (
        "Persistence integrity readiness: OK",
        "normalizeAndCompactDashboard(",
        "escalateV1IntegrityConflicts",
        "vol.Coerce(int)",
        "Responsive bundle validator: OK",
    ):
        if marker not in persistence_source:
            errors.append(f"persistence integrity audit is missing marker {marker!r}")

if ALPHA_KIT_BUILDER.is_file():
    builder_source = ALPHA_KIT_BUILDER.read_text()
    for marker in (
        "frakon-dashboard-alpha-test-kit.zip",
        "integrationSha256",
        "frontendSha256",
        "verify_home_assistant_install.py",
        "home-assistant-alpha-test-report-template.md",
        "alpha-migration.md",
    ):
        if marker not in builder_source:
            errors.append(f"Alpha Test Kit builder is missing marker {marker!r}")

if ALPHA_KIT_VERIFIER.is_file():
    verifier_source = ALPHA_KIT_VERIFIER.read_text()
    for marker in (
        "integrationSha256",
        "frontendSha256",
        "build-info.json",
        "manifest.json",
        "document_validation.py",
        "responsive_bundle_validation.py",
        "responsive_constraint_validation.py",
        "Responsive bundle validator: OK",
        "bundled_frontend",
    ):
        if marker not in verifier_source:
            errors.append(f"Alpha Test Kit verifier is missing marker {marker!r}")

if CI_WORKFLOW.is_file():
    ci_source = CI_WORKFLOW.read_text()
    for marker in (
        "python scripts/verify_dashboard_document_validation.py",
        "python scripts/verify_responsive_bundle_validation.py",
        "python scripts/verify_responsive_write_lock.py",
        "python scripts/verify_persistence_integrity_readiness.py",
        "python scripts/build_alpha_test_kit.py",
        "python scripts/verify_alpha_test_kit.py",
        "Simulate Home Assistant install from alpha test kit",
        "CI identity tamper probe",
        "dist/frakon-dashboard-alpha-test-kit.zip",
        "verify_home_assistant_install.py /tmp/frakon-ha-config",
    ):
        if marker not in ci_source:
            errors.append(f"CI workflow is missing required Alpha safeguard {marker!r}")

if not package_version or "alpha" not in package_version:
    errors.append("current release readiness policy requires an explicit alpha package version")

if errors:
    raise SystemExit("Alpha release readiness failed:\n- " + "\n- ".join(errors))

print(f"Alpha release readiness OK: {package_version}")

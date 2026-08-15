from __future__ import annotations

from hashlib import sha256
from io import BytesIO
import json
import os
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PACKAGE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
VERSION = str(PACKAGE.get("version", ""))
EXPECTED_COMMIT = os.environ.get("GITHUB_SHA", "").strip()
KIT = DIST / "frakon-dashboard-alpha-test-kit.zip"
INTEGRATION = DIST / "frakon_dashboard.zip"
FRONTEND = DIST / "frakon-dashboard.js"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

REQUIRED = {
    "README.txt", "alpha-test-kit.json", "frakon_dashboard.zip", "frakon-dashboard.js",
    "verify_home_assistant_install.py", "home-assistant-alpha-test.md",
    "home-assistant-alpha-test-report-template.md", "alpha-migration.md",
}


def png_dimensions(data: bytes, label: str) -> tuple[int, int]:
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise SystemExit(f"{label} is not a valid PNG with an IHDR header")
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


if not KIT.is_file():
    raise SystemExit(f"Missing alpha test kit: {KIT}")
if not INTEGRATION.is_file() or not FRONTEND.is_file():
    raise SystemExit("Missing dist integration/frontend inputs used by the alpha test kit")

with zipfile.ZipFile(KIT) as archive:
    names = set(archive.namelist())
    missing = sorted(REQUIRED - names)
    unexpected_paths = sorted(name for name in names if "/" in name.strip("/"))
    if missing:
        raise SystemExit("Alpha test kit is missing:\n- " + "\n- ".join(missing))
    if unexpected_paths:
        raise SystemExit("Alpha test kit must use a flat top-level layout; found:\n- " + "\n- ".join(unexpected_paths))

    manifest = json.loads(archive.read("alpha-test-kit.json"))
    if manifest.get("format") != 1:
        raise SystemExit(f"Unexpected alpha test kit format: {manifest.get('format')!r}")
    if manifest.get("product") != "FRAKON Dashboard":
        raise SystemExit("Alpha test kit product identity is invalid")
    if manifest.get("version") != VERSION:
        raise SystemExit(f"Alpha test kit version mismatch: {manifest.get('version')!r} != {VERSION!r}")
    if manifest.get("installPath") != "/config/custom_components/frakon_dashboard":
        raise SystemExit("Alpha test kit install path is invalid")
    if manifest.get("frontendResource") != f"/frakon-dashboard/frakon-dashboard.js?v={VERSION}":
        raise SystemExit("Alpha test kit frontend resource identity is invalid")

    source_commit = manifest.get("sourceCommit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        raise SystemExit("Alpha test kit sourceCommit is missing")
    if EXPECTED_COMMIT:
        if source_commit != EXPECTED_COMMIT:
            raise SystemExit(f"Alpha test kit sourceCommit mismatch: {source_commit!r} != {EXPECTED_COMMIT!r}")
        if not re.fullmatch(r"[0-9a-fA-F]{7,64}", source_commit):
            raise SystemExit(f"CI alpha test kit sourceCommit is not a Git revision: {source_commit!r}")

    integration_bytes = archive.read("frakon_dashboard.zip")
    frontend_bytes = archive.read("frakon-dashboard.js")
    if integration_bytes != INTEGRATION.read_bytes():
        raise SystemExit("Alpha test kit does not contain the exact dist/frakon_dashboard.zip bytes")
    if frontend_bytes != FRONTEND.read_bytes():
        raise SystemExit("Alpha test kit does not contain the exact dist/frakon-dashboard.js bytes")

    integration_digest = sha256(integration_bytes).hexdigest()
    frontend_digest = sha256(frontend_bytes).hexdigest()
    if manifest.get("integrationSha256") != integration_digest:
        raise SystemExit("Alpha test kit integrationSha256 does not match embedded integration archive")
    if manifest.get("frontendSha256") != frontend_digest:
        raise SystemExit("Alpha test kit frontendSha256 does not match embedded frontend bundle")

    with zipfile.ZipFile(BytesIO(integration_bytes)) as integration_archive:
        prefix = "custom_components/frakon_dashboard/"
        brand_icon_path = f"{prefix}brand/icon.png"
        brand_icon_2x_path = f"{prefix}brand/icon@2x.png"
        build_info_path = f"{prefix}build-info.json"
        manifest_path = f"{prefix}manifest.json"
        validator_path = f"{prefix}document_validation.py"
        responsive_validator_path = f"{prefix}responsive_bundle_validation.py"
        responsive_constraint_validator_path = f"{prefix}responsive_constraint_validation.py"
        responsive_storage_path = f"{prefix}responsive_storage.py"
        responsive_websocket_path = f"{prefix}responsive_websocket.py"
        frontend_helper_path = f"{prefix}frontend.py"
        bundled_frontend_path = f"{prefix}frontend/frakon-dashboard.js"
        integration_names = set(integration_archive.namelist())
        for required_path in (
            brand_icon_path, brand_icon_2x_path, build_info_path, manifest_path, validator_path,
            responsive_validator_path, responsive_constraint_validator_path, responsive_storage_path,
            responsive_websocket_path, frontend_helper_path, bundled_frontend_path,
        ):
            if required_path not in integration_names:
                raise SystemExit(f"Embedded integration archive is missing {required_path}")
        brand_icon = integration_archive.read(brand_icon_path)
        brand_icon_2x = integration_archive.read(brand_icon_2x_path)
        build_info = json.loads(integration_archive.read(build_info_path))
        ha_manifest = json.loads(integration_archive.read(manifest_path))
        validator_source = integration_archive.read(validator_path)
        responsive_validator_source = integration_archive.read(responsive_validator_path)
        responsive_storage_source = integration_archive.read(responsive_storage_path)
        responsive_websocket_source = integration_archive.read(responsive_websocket_path)
        frontend_helper_source = integration_archive.read(frontend_helper_path)
        bundled_frontend = integration_archive.read(bundled_frontend_path)

    if png_dimensions(brand_icon, "Embedded brand/icon.png") != (256, 256):
        raise SystemExit("Embedded brand/icon.png must be exactly 256x256 pixels")
    if png_dimensions(brand_icon_2x, "Embedded brand/icon@2x.png") != (512, 512):
        raise SystemExit("Embedded brand/icon@2x.png must be exactly 512x512 pixels")
    if ha_manifest.get("domain") != "frakon_dashboard" or ha_manifest.get("version") != VERSION:
        raise SystemExit("Embedded Home Assistant manifest identity does not match the Alpha Test Kit")
    if ha_manifest.get("integration_type") != "service":
        raise SystemExit("Embedded Home Assistant manifest must declare integration_type=service")
    if ha_manifest.get("iot_class") != "calculated":
        raise SystemExit("Embedded Home Assistant manifest must declare iot_class=calculated")
    if ha_manifest.get("config_flow") is not True or ha_manifest.get("single_config_entry") is not True:
        raise SystemExit("Embedded Home Assistant manifest config entry contract is invalid")
    if set(ha_manifest.get("dependencies", [])) != {"http", "lovelace"}:
        raise SystemExit("Embedded Home Assistant manifest dependencies are invalid")
    if build_info.get("sourceCommit") != source_commit:
        raise SystemExit("Alpha Test Kit sourceCommit differs from embedded integration build-info.json")
    if build_info.get("frontendSha256") != frontend_digest:
        raise SystemExit("Embedded integration build-info frontendSha256 differs from Alpha Test Kit frontend hash")
    if bundled_frontend != frontend_bytes:
        raise SystemExit("Embedded integration frontend differs from Alpha Test Kit frontend bundle")
    for marker in (
        b"validate_dashboard_document", b"DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
        b"dashboard_serialized_bytes", b"max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES",
    ):
        if marker not in validator_source:
            raise SystemExit(f"Embedded integration document validator is missing {marker.decode()}")
    for marker in (
        b"validate_responsive_revision_envelope", b"dashboard_serialized_bytes",
        b"max_serialized_bytes=RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES",
    ):
        if marker not in responsive_validator_source:
            raise SystemExit(f"Embedded integration responsive bundle validator is missing {marker.decode()}")
    if b"validate_responsive_revision_envelope" not in responsive_storage_source:
        raise SystemExit("Embedded integration responsive Store is not wired to the shared validator")
    if b"validate_responsive_bundle" not in responsive_websocket_source or b"validate_responsive_revision_envelope" not in responsive_websocket_source:
        raise SystemExit("Embedded integration responsive WebSocket is not wired to the shared validator")
    if b"vol.Coerce(int)" in responsive_websocket_source:
        raise SystemExit("Embedded responsive WebSocket still coerces integer persistence metadata")
    if b"LOVELACE_DATA" in frontend_helper_source:
        raise SystemExit("Embedded frontend helper is incompatible with the declared HA 2025.1 minimum")
    for marker in (b"DOMAIN as LOVELACE_DOMAIN", b"def _lovelace_resource_state", b"await collection.async_get_info()"):
        if marker not in frontend_helper_source:
            raise SystemExit(f"Embedded frontend helper is missing HA minimum compatibility marker {marker.decode()}")

    test_guide = archive.read("home-assistant-alpha-test.md").decode("utf-8")
    report = archive.read("home-assistant-alpha-test-report-template.md").decode("utf-8")
    migration = archive.read("alpha-migration.md").decode("utf-8")
    self_check = archive.read("verify_home_assistant_install.py").decode("utf-8")
    readme = archive.read("README.txt").decode("utf-8")

    checks = [
        ("test guide", test_guide, "/config/custom_components/frakon_dashboard"),
        ("test guide", test_guide, "custom:frakon-dashboard-card"),
        ("test guide", test_guide, "Home Assistant manifest contract: OK"),
        ("test guide", test_guide, "Home Assistant minimum compatibility: OK (2025.1.0+)"),
        ("test guide", test_guide, "iot_class=calculated"),
        ("test guide", test_guide, "Dashboard serialized-byte guard: OK"),
        ("test guide", test_guide, "2,000,000"),
        ("test guide", test_guide, "Responsive bundle validator: OK"),
        ("test guide", test_guide, "contractVersion"),
        ("test guide", test_guide, "updatedAt"),
        ("test guide", test_guide, "requested dashboard ID"),
        ("report template", report, "## Final alpha decision"),
        ("report template", report, "Home Assistant manifest contract: OK"),
        ("report template", report, "Home Assistant minimum compatibility: OK (2025.1.0+)"),
        ("report template", report, "iot_class: calculated"),
        ("report template", report, "Dashboard serialized-byte guard: OK"),
        ("report template", report, "2,000,000"),
        ("report template", report, "Responsive bundle validator: OK"),
        ("report template", report, "Fractional `contractVersion`"),
        ("report template", report, "Stored responsive envelope with wrong dashboard ID"),
        ("migration guide", migration, "/local/frakon-dashboard.js"),
        ("migration guide", migration, "## 9. Rollback"),
        ("self-check", self_check, "frontend SHA-256"),
        ("self-check", self_check, "Home Assistant manifest contract: OK"),
        ("self-check", self_check, "Home Assistant minimum compatibility: OK (2025.1.0+)"),
        ("self-check", self_check, "Home Assistant brand assets: OK"),
        ("self-check", self_check, "Dashboard serialized-byte guard: OK"),
        ("self-check", self_check, "Dashboard document validator: OK"),
        ("self-check", self_check, "Responsive bundle validator: OK"),
        ("self-check", self_check, "validate_responsive_bundle"),
        ("self-check", self_check, "validate_responsive_revision_envelope"),
        ("README", readme, "Frontend SHA-256"),
        ("README", readme, "python verify_home_assistant_install.py"),
        ("README", readme, "Home Assistant manifest contract: OK"),
        ("README", readme, "Home Assistant minimum compatibility: OK (2025.1.0+)"),
        ("README", readme, "iot_class=calculated"),
        ("README", readme, "Home Assistant brand assets: OK"),
        ("README", readme, "Dashboard serialized-byte guard: OK"),
        ("README", readme, "Dashboard document validator: OK"),
        ("README", readme, "Responsive bundle validator: OK"),
        ("README", readme, "2,000,000"),
        ("README", readme, "writable-kind allowlist"),
    ]
    for label, content, marker in checks:
        if marker not in content:
            raise SystemExit(f"Alpha test kit {label} is missing required marker {marker!r}")

print(f"Alpha test kit verification OK: {KIT} ({VERSION})")

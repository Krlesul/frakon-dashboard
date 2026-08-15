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

REQUIRED = {
    "README.txt",
    "alpha-test-kit.json",
    "frakon_dashboard.zip",
    "frakon-dashboard.js",
    "verify_home_assistant_install.py",
    "home-assistant-alpha-test.md",
    "home-assistant-alpha-test-report-template.md",
    "alpha-migration.md",
}

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
        build_info_path = f"{prefix}build-info.json"
        manifest_path = f"{prefix}manifest.json"
        validator_path = f"{prefix}document_validation.py"
        bundled_frontend_path = f"{prefix}frontend/frakon-dashboard.js"
        integration_names = set(integration_archive.namelist())
        for required_path in (build_info_path, manifest_path, validator_path, bundled_frontend_path):
            if required_path not in integration_names:
                raise SystemExit(f"Embedded integration archive is missing {required_path}")
        build_info = json.loads(integration_archive.read(build_info_path))
        ha_manifest = json.loads(integration_archive.read(manifest_path))
        validator_source = integration_archive.read(validator_path)
        bundled_frontend = integration_archive.read(bundled_frontend_path)

    if ha_manifest.get("domain") != "frakon_dashboard" or ha_manifest.get("version") != VERSION:
        raise SystemExit("Embedded Home Assistant manifest identity does not match the Alpha Test Kit")
    if build_info.get("sourceCommit") != source_commit:
        raise SystemExit("Alpha Test Kit sourceCommit differs from embedded integration build-info.json")
    if build_info.get("frontendSha256") != frontend_digest:
        raise SystemExit("Embedded integration build-info frontendSha256 differs from Alpha Test Kit frontend hash")
    if bundled_frontend != frontend_bytes:
        raise SystemExit("Embedded integration frontend differs from Alpha Test Kit frontend bundle")
    if b"validate_dashboard_document" not in validator_source:
        raise SystemExit("Embedded integration document validator is invalid")

    test_guide = archive.read("home-assistant-alpha-test.md").decode("utf-8")
    report = archive.read("home-assistant-alpha-test-report-template.md").decode("utf-8")
    migration = archive.read("alpha-migration.md").decode("utf-8")
    self_check = archive.read("verify_home_assistant_install.py").decode("utf-8")
    readme = archive.read("README.txt").decode("utf-8")

    checks = [
        ("test guide", test_guide, "/config/custom_components/frakon_dashboard"),
        ("test guide", test_guide, "custom:frakon-dashboard-card"),
        ("report template", report, "## Final alpha decision"),
        ("migration guide", migration, "/local/frakon-dashboard.js"),
        ("migration guide", migration, "## 9. Rollback"),
        ("self-check", self_check, "frontend SHA-256"),
        ("self-check", self_check, "Dashboard document validator: OK"),
        ("README", readme, "Frontend SHA-256"),
        ("README", readme, "python verify_home_assistant_install.py"),
    ]
    for label, content, marker in checks:
        if marker not in content:
            raise SystemExit(f"Alpha test kit {label} is missing required marker {marker!r}")

print(f"Alpha test kit verification OK: {KIT} ({VERSION})")

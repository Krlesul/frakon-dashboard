from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "dist" / "frakon_dashboard.zip"
PREFIX = "custom_components/frakon_dashboard/"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

required = {
    f"{PREFIX}__init__.py",
    f"{PREFIX}brand/icon.png",
    f"{PREFIX}brand/icon@2x.png",
    f"{PREFIX}build_info.py",
    f"{PREFIX}build-info.json",
    f"{PREFIX}build_websocket.py",
    f"{PREFIX}config_flow.py",
    f"{PREFIX}const.py",
    f"{PREFIX}document_validation.py",
    f"{PREFIX}frontend.py",
    f"{PREFIX}frontend/frakon-dashboard.js",
    f"{PREFIX}manifest.json",
    f"{PREFIX}responsive_bundle_validation.py",
    f"{PREFIX}responsive_constraint_validation.py",
    f"{PREFIX}responsive_storage.py",
    f"{PREFIX}responsive_websocket.py",
    f"{PREFIX}storage.py",
    f"{PREFIX}websocket.py",
    f"{PREFIX}translations/en.json",
    f"{PREFIX}translations/cs.json",
    f"{PREFIX}translations/de.json",
    f"{PREFIX}translations/sk.json",
    f"{PREFIX}translations/pl.json",
}

required_frontend_markers = {
    b"frakon-card",
    b"frakon-sensor-card",
    b"frakon-room-card",
    b"frakon-switch-card",
    b"frakon-action-card",
    b"frakon-light-card",
    b"frakon-climate-card",
    b"frakon-fan-card",
    b"frakon-binary-sensor-card",
    b"frakon-cover-card",
    b"frakon-lock-card",
    b"frakon-camera-card",
    b"frakon-media-player-card",
    b"frakon-energy-card",
    b"frakon-vehicle-card",
    b"frakon-dashboard-card",
    b"frakon-canvas-dashboard-card",
}


def png_dimensions(data: bytes, label: str) -> tuple[int, int]:
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise SystemExit(f"Packaged {label} is not a valid PNG with an IHDR header")
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


if not ZIP_PATH.is_file():
    raise SystemExit(f"Missing HACS release archive: {ZIP_PATH}")

with ZipFile(ZIP_PATH) as archive:
    names = set(archive.namelist())
    missing = sorted(required - names)
    if missing:
        raise SystemExit("HACS release archive is incomplete:\n- " + "\n- ".join(missing))

    brand_icon = archive.read(f"{PREFIX}brand/icon.png")
    brand_icon_2x = archive.read(f"{PREFIX}brand/icon@2x.png")
    if png_dimensions(brand_icon, "brand/icon.png") != (256, 256):
        raise SystemExit("Packaged brand/icon.png must be exactly 256x256 pixels")
    if png_dimensions(brand_icon_2x, "brand/icon@2x.png") != (512, 512):
        raise SystemExit("Packaged brand/icon@2x.png must be exactly 512x512 pixels")

    manifest = json.loads(archive.read(f"{PREFIX}manifest.json"))
    package = json.loads((ROOT / "package.json").read_text())
    package_version = package.get("version")
    if manifest.get("version") != package_version:
        raise SystemExit(
            f"Packaged manifest version {manifest.get('version')!r} does not match package version {package_version!r}"
        )
    if manifest.get("domain") != "frakon_dashboard":
        raise SystemExit("Packaged manifest domain must be frakon_dashboard")
    if manifest.get("integration_type") != "service":
        raise SystemExit("Packaged manifest must declare integration_type=service")
    if manifest.get("config_flow") is not True or manifest.get("single_config_entry") is not True:
        raise SystemExit("Packaged manifest must keep config_flow and single_config_entry enabled")
    if set(manifest.get("dependencies", [])) != {"http", "lovelace"}:
        raise SystemExit("Packaged manifest dependencies must remain http + lovelace")

    build_info = json.loads(archive.read(f"{PREFIX}build-info.json"))
    source_commit = build_info.get("sourceCommit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        raise SystemExit("Packaged build-info.json is missing sourceCommit")
    expected_commit = os.environ.get("GITHUB_SHA")
    if expected_commit and source_commit != expected_commit:
        raise SystemExit(
            f"Packaged sourceCommit {source_commit!r} does not match GITHUB_SHA {expected_commit!r}"
        )

    frontend = archive.read(f"{PREFIX}frontend/frakon-dashboard.js")
    if len(frontend) < 10_000:
        raise SystemExit(f"Packaged frontend bundle is unexpectedly small: {len(frontend)} bytes")
    frontend_digest = sha256(frontend).hexdigest()
    if build_info.get("frontendSha256") != frontend_digest:
        raise SystemExit(
            "Packaged build-info.json frontendSha256 does not match packaged frontend bytes"
        )
    if frontend != (ROOT / "dist" / "frakon-dashboard.js").read_bytes():
        raise SystemExit("Packaged frontend differs from dist/frakon-dashboard.js")

    validator_source = archive.read(f"{PREFIX}document_validation.py")
    for marker in (
        b"validate_dashboard_document",
        b"DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
        b"dashboard_serialized_bytes",
        b"max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES",
    ):
        if marker not in validator_source:
            raise SystemExit(f"Packaged document validator is missing {marker.decode()}")
    responsive_validator_source = archive.read(f"{PREFIX}responsive_bundle_validation.py")
    for marker in (
        b"validate_responsive_revision_envelope",
        b"dashboard_serialized_bytes",
        b"max_serialized_bytes=RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES",
    ):
        if marker not in responsive_validator_source:
            raise SystemExit(f"Packaged responsive validator is missing {marker.decode()}")

    missing_markers = sorted(marker.decode() for marker in required_frontend_markers if marker not in frontend)
    if missing_markers:
        raise SystemExit("Packaged frontend is missing FRAKON card registrations:\n- " + "\n- ".join(missing_markers))
    if isinstance(package_version, str) and package_version.encode() not in frontend:
        raise SystemExit("Packaged frontend does not contain the embedded FRAKON version")
    if source_commit != "development" and source_commit.encode() not in frontend:
        raise SystemExit("Packaged frontend does not contain the embedded source commit")

print(f"HACS release archive verified: {ZIP_PATH.name} ({ZIP_PATH.stat().st_size} bytes)")

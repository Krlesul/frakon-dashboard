from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
from typing import Any
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "dist" / "frakon_dashboard.zip"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
EXPECTED_MINIMUM_HOME_ASSISTANT = "2025.1.0"
TRANSLATION_LANGUAGES = ("en", "cs", "de", "sk", "pl")

# HACS zip_release extracts the archive directly into
# /config/custom_components/<domain>. Integration files therefore belong at
# the ZIP root, not under custom_components/frakon_dashboard/.
required = {
    "__init__.py",
    "brand/icon.png",
    "brand/icon@2x.png",
    "build_info.py",
    "build-info.json",
    "build_websocket.py",
    "config_flow.py",
    "const.py",
    "document_validation.py",
    "frontend.py",
    "frontend/frakon-dashboard.js",
    "manifest.json",
    "responsive_bundle_validation.py",
    "responsive_constraint_validation.py",
    "responsive_storage.py",
    "responsive_websocket.py",
    "storage.py",
    "websocket.py",
    *(f"translations/{language}.json" for language in TRANSLATION_LANGUAGES),
}

required_frontend_markers = {
    b"frakon-card", b"frakon-sensor-card", b"frakon-room-card", b"frakon-switch-card",
    b"frakon-action-card", b"frakon-light-card", b"frakon-climate-card", b"frakon-fan-card",
    b"frakon-binary-sensor-card", b"frakon-cover-card", b"frakon-lock-card", b"frakon-camera-card",
    b"frakon-media-player-card", b"frakon-energy-card", b"frakon-vehicle-card",
    b"frakon-dashboard-card", b"frakon-canvas-dashboard-card",
}


def png_dimensions(data: bytes, label: str) -> tuple[int, int]:
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise SystemExit(f"Packaged {label} is not a valid PNG with an IHDR header")
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


def translation_leaf_paths(value: Any, prefix: tuple[str, ...] = ()) -> set[tuple[str, ...]]:
    if isinstance(value, dict):
        paths: set[tuple[str, ...]] = set()
        for key, child in value.items():
            if not isinstance(key, str) or not key:
                raise SystemExit(
                    f"Packaged translation has an invalid key below {'.'.join(prefix) or '<root>'}"
                )
            paths.update(translation_leaf_paths(child, (*prefix, key)))
        return paths
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(f"Packaged translation value at {'.'.join(prefix)} must be non-empty text")
    if "[%key:" in value:
        raise SystemExit(
            f"Packaged custom integration translation at {'.'.join(prefix)} contains a Core-only placeholder"
        )
    return {prefix}


def nested(mapping: object, *keys: str) -> object | None:
    current = mapping
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


if not ZIP_PATH.is_file():
    raise SystemExit(f"Missing HACS release archive: {ZIP_PATH}")

hacs = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
expected_hacs = {
    "name": "FRAKON Dashboard",
    "content_in_root": False,
    "zip_release": True,
    "hide_default_branch": True,
    "filename": "frakon_dashboard.zip",
    "render_readme": True,
    "homeassistant": EXPECTED_MINIMUM_HOME_ASSISTANT,
}
for key, expected in expected_hacs.items():
    if hacs.get(key) != expected:
        raise SystemExit(
            f"HACS repository manifest {key!r} is {hacs.get(key)!r}, expected {expected!r}"
        )
if not str(hacs.get("filename", "")).endswith(".zip"):
    raise SystemExit("HACS zip_release filename must end with .zip")

with ZipFile(ZIP_PATH) as archive:
    names = set(archive.namelist())
    missing = sorted(required - names)
    if missing:
        raise SystemExit("HACS release archive is incomplete:\n- " + "\n- ".join(missing))
    nested_layout = sorted(name for name in names if name.startswith("custom_components/"))
    if nested_layout:
        raise SystemExit(
            "HACS zip_release must contain integration files at the archive root, not under custom_components/:\n- "
            + "\n- ".join(nested_layout[:20])
        )
    if "strings.json" in names:
        raise SystemExit("Packaged custom integration must not include strings.json")

    translations: dict[str, dict[str, Any]] = {}
    for language in TRANSLATION_LANGUAGES:
        path = f"translations/{language}.json"
        document = json.loads(archive.read(path))
        if not isinstance(document, dict):
            raise SystemExit(f"Packaged {language} translation must contain an object")
        translations[language] = document

    english_paths = translation_leaf_paths(translations["en"])
    for language, translation in translations.items():
        if translation_leaf_paths(translation) != english_paths:
            raise SystemExit(f"Packaged {language} translation structure differs from en.json")
        if nested(translation, "title") != "FRAKON Dashboard":
            raise SystemExit(f"Packaged {language} translation title must remain FRAKON Dashboard")
        step_title = nested(translation, "config", "step", "user", "title")
        if not isinstance(step_title, str) or len(step_title.strip()) < 8 or step_title.strip() == "FRAKON Dashboard":
            raise SystemExit(f"Packaged {language} config-flow step title must describe the setup task")
        description = nested(translation, "config", "step", "user", "description")
        if not isinstance(description, str) or len(description.strip()) < 20:
            raise SystemExit(f"Packaged {language} config-flow description is missing or too short")
    if nested(translations["cs"], "config", "step", "user", "title") != "Nastavení ukládání dashboardů":
        raise SystemExit("Packaged Czech config-flow step title is not the expected localized setup heading")

    brand_icon = archive.read("brand/icon.png")
    brand_icon_2x = archive.read("brand/icon@2x.png")
    if png_dimensions(brand_icon, "brand/icon.png") != (256, 256):
        raise SystemExit("Packaged brand/icon.png must be exactly 256x256 pixels")
    if png_dimensions(brand_icon_2x, "brand/icon@2x.png") != (512, 512):
        raise SystemExit("Packaged brand/icon@2x.png must be exactly 512x512 pixels")

    manifest = json.loads(archive.read("manifest.json"))
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
    if manifest.get("iot_class") != "calculated":
        raise SystemExit("Packaged manifest must declare iot_class=calculated")
    if manifest.get("config_flow") is not True or manifest.get("single_config_entry") is not True:
        raise SystemExit("Packaged manifest must keep config_flow and single_config_entry enabled")
    if set(manifest.get("dependencies", [])) != {"http", "lovelace"}:
        raise SystemExit("Packaged manifest dependencies must remain http + lovelace")

    build_info = json.loads(archive.read("build-info.json"))
    source_commit = build_info.get("sourceCommit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        raise SystemExit("Packaged build-info.json is missing sourceCommit")
    expected_commit = os.environ.get("GITHUB_SHA")
    if expected_commit and source_commit != expected_commit:
        raise SystemExit(
            f"Packaged sourceCommit {source_commit!r} does not match GITHUB_SHA {expected_commit!r}"
        )

    frontend_helper_source = archive.read("frontend.py")
    if b"LOVELACE_DATA" in frontend_helper_source:
        raise SystemExit(
            "Packaged frontend helper uses LOVELACE_DATA, which is unavailable on the declared HA 2025.1 minimum"
        )
    for marker in (
        b"DOMAIN as LOVELACE_DOMAIN",
        b"def _lovelace_resource_state",
        b"HA 2025.1 minimum",
        b"await collection.async_get_info()",
    ):
        if marker not in frontend_helper_source:
            raise SystemExit(
                f"Packaged frontend helper is missing HA 2025.1 compatibility marker {marker.decode()}"
            )

    frontend = archive.read("frontend/frakon-dashboard.js")
    if len(frontend) < 10_000:
        raise SystemExit(f"Packaged frontend bundle is unexpectedly small: {len(frontend)} bytes")
    frontend_digest = sha256(frontend).hexdigest()
    if build_info.get("frontendSha256") != frontend_digest:
        raise SystemExit("Packaged build-info.json frontendSha256 does not match packaged frontend bytes")
    if frontend != (ROOT / "dist" / "frakon-dashboard.js").read_bytes():
        raise SystemExit("Packaged frontend differs from dist/frakon-dashboard.js")

    validator_source = archive.read("document_validation.py")
    for marker in (
        b"validate_dashboard_document",
        b"DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
        b"dashboard_serialized_bytes",
        b"max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES",
    ):
        if marker not in validator_source:
            raise SystemExit(f"Packaged document validator is missing {marker.decode()}")
    responsive_validator_source = archive.read("responsive_bundle_validation.py")
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

print(f"HACS release archive verified: {ZIP_PATH.name} ({ZIP_PATH.stat().st_size} bytes, root-layout OK)")

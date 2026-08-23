#!/usr/bin/env python3
"""Verify an installed FRAKON Dashboard alpha inside a Home Assistant config directory."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import sys
from typing import Any

DOMAIN = "frakon_dashboard"
MINIMUM_HOME_ASSISTANT = "2025.1.0"
MINIMUM_HOME_ASSISTANT_TUPLE = (2025, 1, 0)
TRANSLATION_LANGUAGES = ("en", "cs", "de", "sk", "pl")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
REQUIRED_FILES = (
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
    "manifest.json",
    "responsive_bundle_validation.py",
    "responsive_constraint_validation.py",
    "responsive_storage.py",
    "responsive_websocket.py",
    "storage.py",
    "websocket.py",
    "translations/en.json",
    "translations/cs.json",
    "translations/de.json",
    "translations/sk.json",
    "translations/pl.json",
    "frontend/frakon-dashboard.js",
)
FRONTEND_REGISTRATION_MARKERS = (
    "frakon-card", "frakon-sensor-card", "frakon-room-card", "frakon-switch-card",
    "frakon-action-card", "frakon-light-card", "frakon-climate-card", "frakon-fan-card",
    "frakon-binary-sensor-card", "frakon-cover-card", "frakon-lock-card", "frakon-camera-card",
    "frakon-media-player-card", "frakon-energy-card", "frakon-vehicle-card",
    "frakon-dashboard-card", "frakon-canvas-dashboard-card",
)


def fail(message: str) -> None:
    print(f"ERROR: {message}")
    raise SystemExit(1)


def read_json(path: Path, label: str) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - CLI diagnostic
        fail(f"cannot parse {label} at {path}: {exc}")


def nested(mapping: object, *keys: str) -> object | None:
    current = mapping
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def translation_leaf_paths(value: Any, prefix: tuple[str, ...] = ()) -> set[tuple[str, ...]]:
    if isinstance(value, dict):
        paths: set[tuple[str, ...]] = set()
        for key, child in value.items():
            if not isinstance(key, str) or not key:
                fail(f"invalid translation key below {'.'.join(prefix) or '<root>'}")
            paths.update(translation_leaf_paths(child, (*prefix, key)))
        return paths
    if not isinstance(value, str) or not value.strip():
        fail(f"translation value at {'.'.join(prefix)} must be non-empty text")
    if "[%key:" in value:
        fail(f"custom integration translation at {'.'.join(prefix)} contains a Core-only placeholder")
    return {prefix}


def png_dimensions(path: Path, expected: tuple[int, int]) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        fail(f"brand asset is not a valid PNG with an IHDR header: {path}")
    dimensions = (
        int.from_bytes(data[16:20], "big"),
        int.from_bytes(data[20:24], "big"),
    )
    if dimensions != expected:
        fail(f"brand asset {path.name} dimensions are {dimensions}, expected {expected}")
    return dimensions


def home_assistant_version_tuple(value: str) -> tuple[int, int, int] | None:
    """Parse the numeric Home Assistant YYYY.M.P prefix without extra dependencies."""
    match = re.match(r"^\s*(\d+)\.(\d+)(?:\.(\d+))?", value)
    if not match:
        return None
    return (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3) or 0),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=Path, help="Home Assistant config directory, e.g. /config")
    args = parser.parse_args()

    root = args.config.expanduser().resolve()
    version_file = root / ".HA_VERSION"
    if not version_file.is_file():
        fail(
            "missing Home Assistant .HA_VERSION in the config directory; "
            "run this self-check against the real Home Assistant config root"
        )
    home_assistant_version = version_file.read_text(encoding="utf-8").strip()
    parsed_home_assistant_version = home_assistant_version_tuple(home_assistant_version)
    if parsed_home_assistant_version is None:
        fail(f"cannot parse Home Assistant Core version from .HA_VERSION: {home_assistant_version!r}")
    if parsed_home_assistant_version < MINIMUM_HOME_ASSISTANT_TUPLE:
        fail(
            f"Home Assistant Core {home_assistant_version} is below the FRAKON minimum "
            f"{MINIMUM_HOME_ASSISTANT}"
        )

    integration = root / "custom_components" / DOMAIN
    if not integration.is_dir():
        fail(f"missing integration directory: {integration}")

    missing = [relative for relative in REQUIRED_FILES if not (integration / relative).is_file()]
    if missing:
        fail("missing required files: " + ", ".join(missing))
    if (integration / "strings.json").exists():
        fail("custom integration package must not include strings.json; use full translations/*.json files")

    icon_dimensions = png_dimensions(integration / "brand" / "icon.png", (256, 256))
    icon_2x_dimensions = png_dimensions(integration / "brand" / "icon@2x.png", (512, 512))

    manifest = read_json(integration / "manifest.json", "manifest.json")
    if not isinstance(manifest, dict):
        fail("manifest.json must contain an object")
    if manifest.get("domain") != DOMAIN:
        fail(f"manifest domain is {manifest.get('domain')!r}, expected {DOMAIN!r}")
    installed_version = manifest.get("version")
    if not isinstance(installed_version, str) or not installed_version.strip():
        fail(f"manifest version is missing or invalid: {installed_version!r}")
    installed_version = installed_version.strip()
    if manifest.get("integration_type") != "service":
        fail("manifest integration_type must be 'service'")
    if manifest.get("iot_class") != "calculated":
        fail("manifest iot_class must be 'calculated'")
    if manifest.get("config_flow") is not True:
        fail("manifest config_flow must be true")
    if manifest.get("single_config_entry") is not True:
        fail("manifest single_config_entry must be true")
    if set(manifest.get("dependencies") or []) != {"http", "lovelace"}:
        fail("manifest dependencies must be exactly http + lovelace")
    if manifest.get("documentation") != "https://github.com/Krlesul/frakon-dashboard":
        fail("manifest documentation URL is invalid")
    if manifest.get("issue_tracker") != "https://github.com/Krlesul/frakon-dashboard/issues":
        fail("manifest issue_tracker URL is invalid")
    if manifest.get("codeowners") != ["@Krlesul"]:
        fail("manifest codeowners are invalid")

    const_source = (integration / "const.py").read_text(encoding="utf-8")
    version_match = re.search(r'^INTEGRATION_VERSION\s*=\s*["\']([^"\']+)["\']', const_source, re.MULTILINE)
    runtime_version = version_match.group(1) if version_match else None
    if runtime_version != installed_version:
        fail(f"runtime integration version does not match manifest: {runtime_version!r} != {installed_version!r}")

    build_info = read_json(integration / "build-info.json", "build-info.json")
    if not isinstance(build_info, dict):
        fail("build-info.json must contain an object")
    source_commit = build_info.get("sourceCommit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        fail("build-info.json is missing sourceCommit")
    source_commit = source_commit.strip()
    if not re.fullmatch(r"[0-9a-fA-F]{7,64}", source_commit):
        fail(f"sourceCommit must identify a verified source revision, got {source_commit!r}")

    expected_frontend_sha = build_info.get("frontendSha256")
    if not isinstance(expected_frontend_sha, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", expected_frontend_sha):
        fail(f"build-info.json frontendSha256 is missing or invalid: {expected_frontend_sha!r}")
    expected_frontend_sha = expected_frontend_sha.lower()

    translation_documents: dict[str, dict[str, Any]] = {}
    for language in TRANSLATION_LANGUAGES:
        document = read_json(integration / "translations" / f"{language}.json", f"{language} translation")
        if not isinstance(document, dict):
            fail(f"{language} translation must contain an object")
        translation_documents[language] = document

    english_paths = translation_leaf_paths(translation_documents["en"])
    for language, document in translation_documents.items():
        paths = translation_leaf_paths(document)
        if paths != english_paths:
            fail(f"{language} translation structure differs from translations/en.json")
        if nested(document, "title") != "FRAKON Dashboard":
            fail(f"{language} translation title must be FRAKON Dashboard")
        step_title = nested(document, "config", "step", "user", "title")
        if not isinstance(step_title, str) or len(step_title.strip()) < 8 or step_title.strip() == "FRAKON Dashboard":
            fail(f"{language} config-flow step title must describe the setup task")
        description = nested(document, "config", "step", "user", "description")
        if not isinstance(description, str) or len(description.strip()) < 20:
            fail(f"{language} config-flow description is missing or unexpectedly short")
        already_configured = nested(document, "config", "abort", "already_configured")
        if not isinstance(already_configured, str) or not already_configured.strip():
            fail(f"{language} already-configured message is missing")

    cs_title = nested(translation_documents["cs"], "config", "step", "user", "title")
    if cs_title != "Nastavení ukládání dashboardů":
        fail(f"Czech config-flow step title is unexpected: {cs_title!r}")

    validator_source = (integration / "document_validation.py").read_text(encoding="utf-8")
    for marker in (
        "validate_dashboard_document", "Duplicate dashboard item id", "references an unknown item",
        "outside its canonical min/max bounds", "DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
        "def dashboard_serialized_bytes", "max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES",
    ):
        if marker not in validator_source:
            fail(f"dashboard document validator is missing marker {marker!r}")

    responsive_validator_source = (integration / "responsive_bundle_validation.py").read_text(encoding="utf-8")
    for marker in (
        "validate_responsive_bundle", "validate_responsive_revision_envelope", "validate_dashboard_document",
        "enabled constraint dependency cycle", "dashboard_serialized_bytes",
        "max_serialized_bytes=RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES",
    ):
        if marker not in responsive_validator_source:
            fail(f"responsive bundle validator is missing marker {marker!r}")

    websocket_source = (integration / "websocket.py").read_text(encoding="utf-8")
    if "validate_dashboard_document" not in websocket_source:
        fail("websocket boundary is not wired to dashboard document validation")
    if "vol.Coerce(int)" in websocket_source:
        fail("websocket persistence schema must not coerce integer values")

    responsive_websocket_source = (integration / "responsive_websocket.py").read_text(encoding="utf-8")
    for marker in ("_strict_contract_version", "_strict_updated_at", "validate_responsive_bundle", "validate_responsive_revision_envelope"):
        if marker not in responsive_websocket_source:
            fail(f"responsive WebSocket validation is missing marker {marker!r}")
    if "vol.Coerce(int)" in responsive_websocket_source:
        fail("responsive WebSocket persistence schema must not coerce integer values")

    responsive_storage_source = (integration / "responsive_storage.py").read_text(encoding="utf-8")
    if "validate_responsive_revision_envelope" not in responsive_storage_source:
        fail("responsive Home Assistant Store is not wired to the shared responsive validator")

    frontend_helper = (integration / "frontend.py").read_text(encoding="utf-8")
    if "?v={INTEGRATION_VERSION}" not in frontend_helper:
        fail("frontend resource URL is not cache-busted with INTEGRATION_VERSION")
    if "LOVELACE_DATA" in frontend_helper:
        fail("frontend helper uses a Lovelace symbol unavailable on the declared HA 2025.1 minimum")
    for marker in ("DOMAIN as LOVELACE_DOMAIN", "def _lovelace_resource_state", 'lovelace.get("resource_mode", lovelace.get("mode"))'):
        if marker not in frontend_helper:
            fail(f"frontend helper is missing HA 2025.1+ compatibility marker {marker!r}")

    frontend = integration / "frontend" / "frakon-dashboard.js"
    size = frontend.stat().st_size
    if size < 10_000:
        fail(f"frontend bundle looks unexpectedly small: {size} bytes")
    actual_frontend_sha = sha256(frontend.read_bytes()).hexdigest()
    if actual_frontend_sha != expected_frontend_sha:
        fail(f"installed frontend SHA-256 does not match build-info.json: {actual_frontend_sha} != {expected_frontend_sha}")

    source = frontend.read_text(encoding="utf-8", errors="ignore")
    for marker in FRONTEND_REGISTRATION_MARKERS:
        if marker not in source:
            fail(f"frontend bundle is missing registration marker {marker!r}")

    resource_url = f"/frakon-dashboard/frakon-dashboard.js?v={installed_version}"
    print("FRAKON Dashboard install self-check: OK")
    print(f"config: {root}")
    print(f"Home Assistant Core version: {home_assistant_version}")
    print(f"minimum Home Assistant Core: {MINIMUM_HOME_ASSISTANT}")
    print(f"integration: {integration}")
    print(f"version: {installed_version}")
    print(f"source commit: {source_commit}")
    print(f"frontend bytes: {size}")
    print(f"frontend SHA-256: {actual_frontend_sha}")
    print(f"verified frontend registrations: {len(FRONTEND_REGISTRATION_MARKERS)}")
    print(f"brand icon: {icon_dimensions[0]}x{icon_dimensions[1]}")
    print(f"brand icon @2x: {icon_2x_dimensions[0]}x{icon_2x_dimensions[1]}")
    print("Home Assistant manifest contract: OK")
    print("Home Assistant minimum compatibility: OK (2025.1.0+)")
    print("Home Assistant translations: OK (en, cs, de, sk, pl)")
    print("Home Assistant brand assets: OK")
    print("Dashboard serialized-byte guard: OK")
    print("Dashboard document validator: OK")
    print("Responsive bundle validator: OK")
    print("Czech config flow: OK")
    print(f"resource URL: {resource_url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

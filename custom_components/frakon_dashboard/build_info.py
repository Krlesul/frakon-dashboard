from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
from typing import Any

from .const import FRONTEND_FILENAME, INTEGRATION_VERSION, RESPONSIVE_CANVAS_V2_CONTRACT_VERSION

_BUILD_METADATA_FILENAME = "build-info.json"


def _integration_root() -> Path:
    return Path(__file__).resolve().parent


def _frontend_path() -> Path:
    return _integration_root() / "frontend" / FRONTEND_FILENAME


def _build_metadata() -> dict[str, Any]:
    path = _integration_root() / _BUILD_METADATA_FILENAME
    if not path.is_file():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}
    return value if isinstance(value, dict) else {}


def _frontend_sha256() -> str | None:
    path = _frontend_path()
    if not path.is_file():
        return None
    digest = sha256()
    try:
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    except OSError:
        return None
    return digest.hexdigest()


def read_build_info() -> dict[str, Any]:
    """Return sanitized build metadata for runtime diagnostics."""
    metadata = _build_metadata()
    source_commit = metadata.get("sourceCommit")
    if not isinstance(source_commit, str) or not source_commit.strip():
        source_commit = "development"

    result: dict[str, Any] = {
        "version": INTEGRATION_VERSION,
        "sourceCommit": source_commit.strip(),
        "responsiveContractVersion": RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    }
    frontend_digest = _frontend_sha256()
    if frontend_digest is not None:
        result["frontendSha256"] = frontend_digest
    return result

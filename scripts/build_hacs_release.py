from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
import shutil
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
FRONTEND_BUNDLE = DIST / "frakon-dashboard.js"
INTEGRATION_SOURCE = ROOT / "custom_components" / "frakon_dashboard"
OUTPUT = DIST / "frakon_dashboard.zip"

if not FRONTEND_BUNDLE.is_file():
    raise SystemExit(f"Missing frontend bundle: {FRONTEND_BUNDLE}")
if not INTEGRATION_SOURCE.is_dir():
    raise SystemExit(f"Missing integration directory: {INTEGRATION_SOURCE}")

source_commit = os.environ.get("GITHUB_SHA", "development").strip() or "development"
frontend_sha256 = sha256(FRONTEND_BUNDLE.read_bytes()).hexdigest()

with tempfile.TemporaryDirectory(prefix="frakon-release-") as temp_dir:
    temp = Path(temp_dir)
    staged = temp / "frakon_dashboard"
    shutil.copytree(
        INTEGRATION_SOURCE,
        staged,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", ".DS_Store"),
    )
    frontend_dir = staged / "frontend"
    frontend_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(FRONTEND_BUNDLE, frontend_dir / "frakon-dashboard.js")
    (staged / "build-info.json").write_text(
        json.dumps(
            {
                "sourceCommit": source_commit,
                "frontendSha256": frontend_sha256,
            },
            sort_keys=True,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    if OUTPUT.exists():
        OUTPUT.unlink()
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        # HACS zip_release extracts the release archive directly into
        # /config/custom_components/<domain>. Therefore integration files must
        # be at the ZIP root; including custom_components/frakon_dashboard here
        # would create a broken nested installation.
        for path in sorted(staged.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(staged).as_posix())

print(OUTPUT)

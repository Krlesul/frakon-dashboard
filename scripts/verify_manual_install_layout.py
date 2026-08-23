from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
INTEGRATION_ZIP = DIST / "frakon_dashboard.zip"
ALPHA_KIT = DIST / "frakon-dashboard-alpha-test-kit.zip"
INSTALL_PATH = "/config/custom_components/frakon_dashboard"
LAYOUT_ID = "integration-files-at-archive-root"


def fail(message: str) -> None:
    raise SystemExit(f"Manual install layout verification failed: {message}")


def source(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        fail(f"missing {relative}")
    return path.read_text(encoding="utf-8")


def require(relative: str, *markers: str) -> None:
    text = source(relative)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        fail(
            f"{relative} is missing install-layout markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


if not INTEGRATION_ZIP.is_file():
    fail(f"missing {INTEGRATION_ZIP}")
if not ALPHA_KIT.is_file():
    fail(f"missing {ALPHA_KIT}")

with ZipFile(INTEGRATION_ZIP) as archive:
    names = set(archive.namelist())
    for required in ("manifest.json", "__init__.py", "frontend/frakon-dashboard.js"):
        if required not in names:
            fail(f"integration ZIP is missing root entry {required!r}")
    nested = sorted(name for name in names if name.startswith("custom_components/"))
    if nested:
        fail(
            "integration ZIP contains nested custom_components paths; HACS zip_release "
            "must extract root files directly into the integration directory"
        )

with ZipFile(ALPHA_KIT) as archive:
    names = set(archive.namelist())
    for required in ("alpha-test-kit.json", "README.txt", "home-assistant-alpha-test.md"):
        if required not in names:
            fail(f"Alpha Test Kit is missing {required!r}")

    manifest = json.loads(archive.read("alpha-test-kit.json"))
    if manifest.get("installPath") != INSTALL_PATH:
        fail(
            f"Alpha Test Kit installPath is {manifest.get('installPath')!r}, "
            f"expected {INSTALL_PATH!r}"
        )
    if manifest.get("integrationArchiveLayout") != LAYOUT_ID:
        fail(
            "Alpha Test Kit integrationArchiveLayout must explicitly identify "
            f"{LAYOUT_ID!r}"
        )

    kit_readme = archive.read("README.txt").decode("utf-8")
    kit_guide = archive.read("home-assistant-alpha-test.md").decode("utf-8")

for label, text in (("Alpha Test Kit README", kit_readme), ("Alpha Test Kit guide", kit_guide)):
    for marker in (
        INSTALL_PATH,
        "frakon_dashboard.zip",
        "manifest.json",
        "__init__.py",
    ):
        if marker not in text:
            fail(f"{label} is missing {marker!r}")

# Static source-chain checks ensure a future documentation edit cannot silently
# contradict the exact artifacts that were just inspected above.
require(
    "scripts/build_hacs_release.py",
    "HACS zip_release extracts the release archive directly into",
    "path.relative_to(staged).as_posix()",
)
require(
    "scripts/verify_hacs_release.py",
    "integration files at the archive root",
    "not under custom_components/",
)
require(
    "scripts/build_alpha_test_kit.py",
    f'"installPath": "{INSTALL_PATH}"',
    f'"integrationArchiveLayout": "{LAYOUT_ID}"',
    f"Create {INSTALL_PATH} and extract frakon_dashboard.zip directly into that directory",
)
require(
    "README.md",
    "integration files (`manifest.json`, `__init__.py`, `frontend/`, `translations/`",
    f"create `{INSTALL_PATH}` and extract `frakon_dashboard.zip` **directly into that directory**",
    "do not extract the ZIP into `/config`",
)
require(
    "docs/home-assistant-alpha-test.md",
    "integration files are stored at the ZIP root",
    f"create the target directory `{INSTALL_PATH}`",
    "extract `frakon_dashboard.zip` **directly into that target directory**",
    f"{INSTALL_PATH}/manifest.json",
    f"{INSTALL_PATH}/__init__.py",
    "Do **not** extract `frakon_dashboard.zip` directly into `/config`",
)
require(
    ".github/workflows/ci.yml",
    f"mkdir -p /tmp/frakon-ha-config/custom_components/frakon_dashboard",
    "unzip -q /tmp/frakon-alpha-kit/frakon_dashboard.zip -d /tmp/frakon-ha-config/custom_components/frakon_dashboard",
    "test -f /tmp/frakon-ha-config/custom_components/frakon_dashboard/manifest.json",
    "test ! -e /tmp/frakon-ha-config/custom_components/frakon_dashboard/custom_components",
)

print("Manual install root-layout chain: OK")

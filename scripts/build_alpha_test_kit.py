from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PACKAGE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
HACS = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
VERSION = str(PACKAGE.get("version", ""))
MINIMUM_HOME_ASSISTANT = str(HACS.get("homeassistant", ""))
SOURCE_COMMIT = os.environ.get("GITHUB_SHA", "development").strip() or "development"
OUTPUT = DIST / "frakon-dashboard-alpha-test-kit.zip"

FILES: dict[str, Path] = {
    "frakon_dashboard.zip": DIST / "frakon_dashboard.zip",
    "frakon-dashboard.js": DIST / "frakon-dashboard.js",
    "verify_home_assistant_install.py": ROOT / "scripts" / "verify_home_assistant_install.py",
    "home-assistant-alpha-test.md": ROOT / "docs" / "home-assistant-alpha-test.md",
    "home-assistant-alpha-test-report-template.md": ROOT / "docs" / "home-assistant-alpha-test-report-template.md",
    "alpha-migration.md": ROOT / "docs" / "alpha-migration.md",
}

missing = [str(path) for path in FILES.values() if not path.is_file()]
if missing:
    raise SystemExit("Cannot build alpha test kit; missing files:\n- " + "\n- ".join(missing))
if not VERSION:
    raise SystemExit("package.json version is missing")
if MINIMUM_HOME_ASSISTANT != "2025.1.0":
    raise SystemExit(
        "Cannot build alpha test kit; Home Assistant minimum must remain 2025.1.0 "
        f"for the current compatibility contract, got {MINIMUM_HOME_ASSISTANT!r}"
    )

integration_sha256 = sha256(FILES["frakon_dashboard.zip"].read_bytes()).hexdigest()
frontend_sha256 = sha256(FILES["frakon-dashboard.js"].read_bytes()).hexdigest()

manifest = {
    "format": 1,
    "product": "FRAKON Dashboard",
    "version": VERSION,
    "minimumHomeAssistant": MINIMUM_HOME_ASSISTANT,
    "sourceCommit": SOURCE_COMMIT,
    "integrationArchive": "frakon_dashboard.zip",
    "integrationSha256": integration_sha256,
    "frontendBundle": "frakon-dashboard.js",
    "frontendSha256": frontend_sha256,
    "installPath": "/config/custom_components/frakon_dashboard",
    "frontendResource": f"/frakon-dashboard/frakon-dashboard.js?v={VERSION}",
    "testGuide": "home-assistant-alpha-test.md",
    "reportTemplate": "home-assistant-alpha-test-report-template.md",
    "migrationGuide": "alpha-migration.md",
    "selfCheck": "verify_home_assistant_install.py",
}

readme = f"""FRAKON Dashboard {VERSION} — Home Assistant Alpha Test Kit

Minimum Home Assistant Core: {MINIMUM_HOME_ASSISTANT}
Source commit: {SOURCE_COMMIT}
Integration ZIP SHA-256: {integration_sha256}
Frontend SHA-256: {frontend_sha256}

1. Read alpha-migration.md when upgrading an older development install.
2. Read home-assistant-alpha-test.md before installation.
3. Record minimum Home Assistant version, source commit and both SHA-256 values in the report template.
4. Extract frakon_dashboard.zip into the Home Assistant config directory.
5. Restart Home Assistant and add the FRAKON Dashboard integration.
6. From this test-kit directory run:

   python verify_home_assistant_install.py /path/to/home-assistant/config

7. Confirm the self-check frontend SHA-256 equals the value above and that it reports:

   Home Assistant manifest contract: OK
   Home Assistant minimum compatibility: OK (2025.1.0+)
   Home Assistant translations: OK (en, cs, de, sk, pl)
   Home Assistant brand assets: OK
   Dashboard serialized-byte guard: OK
   Dashboard document validator: OK
   Responsive bundle validator: OK
   Czech config flow: OK

   The manifest contract requires FRAKON Dashboard to be installed as a single-entry `service` integration with `iot_class=calculated`, the expected Home Assistant dependencies and repository URLs.
   The minimum compatibility contract verifies that the packaged Lovelace resource helper supports both the Home Assistant 2025.1 dictionary shape and the modern LovelaceData/HassKey shape without importing the newer-only LOVELACE_DATA symbol.
   The translation contract verifies that the installed custom integration contains complete, structurally matching English, Czech, German, Slovak and Polish translation files and no Core-only strings.json/placeholder model.

8. Confirm FRAKON Dashboard shows its packaged integration icon in Home Assistant on versions that support local custom-integration brand assets.
9. Record results and the required negative validation evidence in home-assistant-alpha-test-report-template.md, including a dashboard payload larger than 2,000,000 UTF-8 JSON bytes being rejected.

Do not copy frakon-dashboard.js to /config/www for the current bundled integration model.
The standalone JavaScript file is included only for artifact identity/debugging.
Responsive Canvas v2 writes remain intentionally locked; do not modify the writable-kind allowlist for alpha testing.
"""

DIST.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="frakon-alpha-kit-") as temp_dir:
    temp = Path(temp_dir)
    for archive_name, source in FILES.items():
        (temp / archive_name).write_bytes(source.read_bytes())
    (temp / "alpha-test-kit.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (temp / "README.txt").write_text(readme, encoding="utf-8")

    if OUTPUT.exists():
        OUTPUT.unlink()
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(temp.iterdir()):
            if path.is_file():
                archive.write(path, path.name)

print(OUTPUT)

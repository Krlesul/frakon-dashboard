from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "custom_components/frakon_dashboard/manifest.json"
PACKAGE = ROOT / "package.json"

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
package = json.loads(PACKAGE.read_text(encoding="utf-8"))


def source(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f"Home Assistant manifest contract failed; missing {relative}")
    return path.read_text(encoding="utf-8")


def require(relative: str, *markers: str) -> None:
    text = source(relative)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise SystemExit(
            f"Home Assistant manifest contract failed; {relative} is missing markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


required = {
    "domain",
    "name",
    "version",
    "documentation",
    "issue_tracker",
    "codeowners",
    "integration_type",
    "iot_class",
}
missing = sorted(required - manifest.keys())
if missing:
    raise SystemExit("Home Assistant manifest contract failed; missing keys:\n- " + "\n- ".join(missing))

# Mirror hassfest ordering: domain, name, then every remaining key alphabetically.
manifest_keys = list(manifest)
expected_key_order = [
    "domain",
    "name",
    *sorted(key for key in manifest_keys if key not in {"domain", "name"}),
]
if manifest_keys != expected_key_order:
    raise SystemExit(
        "Home Assistant manifest keys must follow hassfest ordering: "
        + ", ".join(expected_key_order)
    )

if manifest.get("domain") != "frakon_dashboard":
    raise SystemExit("Home Assistant manifest domain must be frakon_dashboard")
if manifest.get("name") != "FRAKON Dashboard":
    raise SystemExit("Home Assistant manifest name must be FRAKON Dashboard")
if manifest.get("version") != package.get("version"):
    raise SystemExit("Home Assistant manifest version must match package.json")
if manifest.get("integration_type") != "service":
    raise SystemExit("FRAKON Dashboard must declare integration_type=service")
if manifest.get("config_flow") is not True:
    raise SystemExit("FRAKON Dashboard manifest must enable config_flow")
if manifest.get("single_config_entry") is not True:
    raise SystemExit("FRAKON Dashboard manifest must remain single_config_entry")
if set(manifest.get("dependencies", [])) != {"http", "lovelace"}:
    raise SystemExit("FRAKON Dashboard manifest dependencies must remain http + lovelace")
if manifest.get("iot_class") != "calculated":
    raise SystemExit("FRAKON Dashboard manifest iot_class must be calculated because the dashboard service does not communicate with devices on its own")
if manifest.get("documentation") != "https://github.com/Krlesul/frakon-dashboard":
    raise SystemExit("FRAKON Dashboard manifest documentation URL is invalid")
if manifest.get("issue_tracker") != "https://github.com/Krlesul/frakon-dashboard/issues":
    raise SystemExit("FRAKON Dashboard manifest issue tracker URL is invalid")
if manifest.get("codeowners") != ["@Krlesul"]:
    raise SystemExit("FRAKON Dashboard manifest codeowners are invalid")

require(
    "scripts/verify_hacs_release.py",
    'manifest.get("integration_type") != "service"',
    'manifest.get("iot_class") != "calculated"',
    "Packaged manifest must declare integration_type=service",
)
require(
    "scripts/verify_home_assistant_install.py",
    'manifest.get("integration_type") != "service"',
    'manifest.get("iot_class") != "calculated"',
    'print("Home Assistant manifest contract: OK")',
)
require(
    "scripts/verify_alpha_test_kit.py",
    'ha_manifest.get("integration_type") != "service"',
    'ha_manifest.get("iot_class") != "calculated"',
    "Home Assistant manifest contract: OK",
)
require(
    "scripts/build_alpha_test_kit.py",
    "Home Assistant manifest contract: OK",
    "single-entry `service` integration",
    "iot_class=calculated",
)
require(
    "docs/home-assistant-alpha-test.md",
    "Home Assistant manifest contract: OK",
    "single-entry `service` integration",
    "iot_class=calculated",
)
require(
    "docs/home-assistant-alpha-test-report-template.md",
    "Home Assistant manifest contract: OK",
    "integration_type: service",
    "iot_class: calculated",
)
require(
    ".github/workflows/ci.yml",
    "python scripts/verify_manifest_contract.py",
)

print("Home Assistant manifest contract: OK")

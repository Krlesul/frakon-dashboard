from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "custom_components/frakon_dashboard/manifest.json"
PACKAGE = ROOT / "package.json"

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
package = json.loads(PACKAGE.read_text(encoding="utf-8"))

required = {
    "domain",
    "name",
    "version",
    "documentation",
    "issue_tracker",
    "codeowners",
    "integration_type",
}
missing = sorted(required - manifest.keys())
if missing:
    raise SystemExit("Home Assistant manifest contract failed; missing keys:\n- " + "\n- ".join(missing))

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
if manifest.get("iot_class") != "local_push":
    raise SystemExit("FRAKON Dashboard manifest iot_class must remain local_push for the current local WebSocket/resource model")
if manifest.get("documentation") != "https://github.com/Krlesul/frakon-dashboard":
    raise SystemExit("FRAKON Dashboard manifest documentation URL is invalid")
if manifest.get("issue_tracker") != "https://github.com/Krlesul/frakon-dashboard/issues":
    raise SystemExit("FRAKON Dashboard manifest issue tracker URL is invalid")
if manifest.get("codeowners") != ["@Krlesul"]:
    raise SystemExit("FRAKON Dashboard manifest codeowners are invalid")

print("Home Assistant manifest contract: OK")

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HACS_PATH = ROOT / "hacs.json"
EXPECTED = {
    "name": "FRAKON Dashboard",
    "content_in_root": False,
    "zip_release": True,
    "hide_default_branch": True,
    "filename": "frakon_dashboard.zip",
    "render_readme": True,
    "homeassistant": "2025.1.0",
}

if not HACS_PATH.is_file():
    raise SystemExit("HACS repository manifest contract failed: missing hacs.json")

try:
    hacs = json.loads(HACS_PATH.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as exc:
    raise SystemExit(f"HACS repository manifest contract failed: {exc}") from exc

if not isinstance(hacs, dict):
    raise SystemExit("HACS repository manifest contract failed: hacs.json must contain an object")

unexpected = sorted(set(hacs) - set(EXPECTED))
if unexpected:
    raise SystemExit(
        "HACS repository manifest contract failed: unexpected keys:\n- "
        + "\n- ".join(unexpected)
    )

for key, expected in EXPECTED.items():
    actual = hacs.get(key)
    if actual != expected:
        raise SystemExit(
            f"HACS repository manifest contract failed: {key}={actual!r}, expected {expected!r}"
        )

if not hacs["filename"].endswith(".zip"):
    raise SystemExit("HACS repository manifest contract failed: ZIP release filename must end in .zip")

print("HACS repository manifest contract: OK")

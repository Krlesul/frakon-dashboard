from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
INTEGRATION = ROOT / "custom_components" / "frakon_dashboard"
TRANSLATIONS = INTEGRATION / "translations"
CONFIG_FLOW = INTEGRATION / "config_flow.py"
EXPECTED_LANGUAGES = ("en", "cs", "de", "sk", "pl")

if (INTEGRATION / "strings.json").exists():
    raise SystemExit(
        "Custom translation contract failed: custom integrations must ship full translations/en.json text instead of strings.json"
    )

if not TRANSLATIONS.is_dir():
    raise SystemExit("Custom translation contract failed: translations directory is missing")

actual_languages = sorted(path.stem for path in TRANSLATIONS.glob("*.json"))
if actual_languages != sorted(EXPECTED_LANGUAGES):
    raise SystemExit(
        "Custom translation contract failed: translation languages are "
        f"{actual_languages!r}, expected {sorted(EXPECTED_LANGUAGES)!r}"
    )


def load(language: str) -> dict[str, Any]:
    path = TRANSLATIONS / f"{language}.json"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Custom translation contract failed: {path.name}: {exc}") from exc
    if not isinstance(value, dict):
        raise SystemExit(f"Custom translation contract failed: {path.name} must contain an object")
    return value


def leaf_paths(value: Any, prefix: tuple[str, ...] = ()) -> dict[tuple[str, ...], str]:
    if isinstance(value, dict):
        flattened: dict[tuple[str, ...], str] = {}
        for key, child in value.items():
            if not isinstance(key, str) or not key:
                raise SystemExit(
                    f"Custom translation contract failed: invalid key at {'.'.join(prefix) or '<root>'}"
                )
            flattened.update(leaf_paths(child, (*prefix, key)))
        return flattened
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(
            "Custom translation contract failed: translation leaf must be non-empty text at "
            + ".".join(prefix)
        )
    if "[%key:" in value:
        raise SystemExit(
            "Custom translation contract failed: custom integrations must not use Core translation placeholders at "
            + ".".join(prefix)
        )
    return {prefix: value}


translations = {language: load(language) for language in EXPECTED_LANGUAGES}
english_paths = leaf_paths(translations["en"])
required_paths = {
    ("title",),
    ("config", "step", "user", "title"),
    ("config", "step", "user", "description"),
    ("config", "abort", "already_configured"),
}
missing_required = sorted(".".join(path) for path in required_paths - set(english_paths))
if missing_required:
    raise SystemExit(
        "Custom translation contract failed: English source is missing:\n- "
        + "\n- ".join(missing_required)
    )

for language, document in translations.items():
    paths = leaf_paths(document)
    if set(paths) != set(english_paths):
        missing = sorted(".".join(path) for path in set(english_paths) - set(paths))
        extra = sorted(".".join(path) for path in set(paths) - set(english_paths))
        details = []
        if missing:
            details.append("missing: " + ", ".join(missing))
        if extra:
            details.append("extra: " + ", ".join(extra))
        raise SystemExit(
            f"Custom translation contract failed: {language}.json structure differs from en.json ({'; '.join(details)})"
        )
    if paths[("title",)] != "FRAKON Dashboard":
        raise SystemExit(f"Custom translation contract failed: {language}.json title must remain FRAKON Dashboard")
    if len(paths[("config", "step", "user", "description")].strip()) < 20:
        raise SystemExit(f"Custom translation contract failed: {language}.json user description is too short")

config_flow_source = CONFIG_FLOW.read_text(encoding="utf-8")
for marker in (
    'async_show_form(step_id="user")',
    "_abort_if_unique_id_configured()",
    'async_create_entry(title="FRAKON Dashboard", data={})',
):
    if marker not in config_flow_source:
        raise SystemExit(
            f"Custom translation contract failed: config_flow.py is missing expected marker {marker!r}"
        )

print("Home Assistant custom translation contract: OK (en, cs, de, sk, pl)")

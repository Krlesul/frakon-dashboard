from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_MARKER = "Home Assistant custom translation contract: OK (en, cs, de, sk, pl)"
INSTALL_MARKER = "Home Assistant translations: OK (en, cs, de, sk, pl)"
CZECH_SETUP_TITLE = "Nastavení ukládání dashboardů"


def text(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f"Translation release chain failed: missing {relative}")
    return path.read_text(encoding="utf-8")


def require(relative: str, *markers: str) -> None:
    source = text(relative)
    missing = [marker for marker in markers if marker not in source]
    if missing:
        raise SystemExit(
            f"Translation release chain failed: {relative} is missing markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


if (ROOT / "custom_components/frakon_dashboard/strings.json").exists():
    raise SystemExit("Translation release chain failed: custom integration must not include strings.json")

for language in ("en", "cs", "de", "sk", "pl"):
    if not (ROOT / f"custom_components/frakon_dashboard/translations/{language}.json").is_file():
        raise SystemExit(f"Translation release chain failed: missing translations/{language}.json")

require(
    "scripts/verify_custom_translation_contract.py",
    'EXPECTED_LANGUAGES = ("en", "cs", "de", "sk", "pl")',
    "custom integrations must ship full translations/en.json text instead of strings.json",
    "user step title must describe the setup task instead of repeating the integration name",
    SOURCE_MARKER,
)
require(
    "scripts/verify_hacs_release.py",
    'TRANSLATION_LANGUAGES = ("en", "cs", "de", "sk", "pl")',
    "Packaged custom integration must not include strings.json",
    "translation structure differs from en.json",
    CZECH_SETUP_TITLE,
)
require(
    "scripts/verify_alpha_test_kit.py",
    'TRANSLATION_LANGUAGES = ("en", "cs", "de", "sk", "pl")',
    "Embedded custom integration archive must not contain strings.json",
    "translation structure differs from en.json",
    INSTALL_MARKER,
    CZECH_SETUP_TITLE,
)
require(
    "scripts/verify_home_assistant_install.py",
    'TRANSLATION_LANGUAGES = ("en", "cs", "de", "sk", "pl")',
    "custom integration package must not include strings.json",
    "translation structure differs from translations/en.json",
    INSTALL_MARKER,
    CZECH_SETUP_TITLE,
)
require(
    "scripts/build_alpha_test_kit.py",
    INSTALL_MARKER,
    "complete, structurally matching English, Czech, German, Slovak and Polish translation files",
)
require(
    "docs/home-assistant-alpha-test.md",
    INSTALL_MARKER,
    "English, Czech, German, Slovak and Polish translation files",
    CZECH_SETUP_TITLE,
)
require(
    "docs/home-assistant-alpha-test-report-template.md",
    INSTALL_MARKER,
    "Installed EN/CS/DE/SK/PL translation structures match",
    CZECH_SETUP_TITLE,
)
require(
    ".github/workflows/ci.yml",
    "python scripts/verify_custom_translation_contract.py",
    "python scripts/verify_translation_release_chain.py",
)

print("Home Assistant translation release chain: OK (en, cs, de, sk, pl)")

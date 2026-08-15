from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def source(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f"Brand release-chain verification failed: missing {relative}")
    return path.read_text(encoding="utf-8")


def require(relative: str, *markers: str) -> None:
    text = source(relative)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise SystemExit(
            f"Brand release-chain verification failed: {relative} is missing markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


require(
    "scripts/verify_brand_assets.py",
    '"icon.png": (256, 256)',
    '"icon@2x.png": (512, 512)',
    'print("Home Assistant brand assets: OK")',
)
require(
    "scripts/verify_hacs_release.py",
    'brand/icon.png',
    'brand/icon@2x.png',
    'png_dimensions(archive.read',
    '(256, 256)',
    '(512, 512)',
)
require(
    "scripts/verify_home_assistant_install.py",
    '"brand/icon.png"',
    '"brand/icon@2x.png"',
    'Home Assistant brand assets: OK',
    'validate_png_dimensions',
)
require(
    "scripts/verify_alpha_test_kit.py",
    'brand_icon_path',
    'brand_icon_2x_path',
    'png_dimensions(integration_archive.read',
    'Home Assistant brand assets: OK',
)
require(
    "scripts/build_alpha_test_kit.py",
    'Home Assistant brand assets: OK',
)
require(
    "docs/home-assistant-alpha-test.md",
    'Home Assistant brand assets: OK',
    'brand/icon.png',
    'brand/icon@2x.png',
)
require(
    "docs/home-assistant-alpha-test-report-template.md",
    'Home Assistant brand assets: OK',
    'FRAKON integration icon',
)
require(
    ".github/workflows/ci.yml",
    'python scripts/verify_brand_assets.py',
    'python scripts/verify_brand_release_chain.py',
)

print("Home Assistant brand release chain: OK")

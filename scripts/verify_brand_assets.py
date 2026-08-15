from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "custom_components/frakon_dashboard/brand"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
EXPECTED = {
    "icon.png": (256, 256),
    "icon@2x.png": (512, 512),
}


def png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise SystemExit(f"Home Assistant brand asset is not a valid PNG with IHDR: {path}")
    if len(data) < 512:
        raise SystemExit(f"Home Assistant brand asset is unexpectedly small: {path} ({len(data)} bytes)")
    return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")


for name, expected in EXPECTED.items():
    path = BRAND / name
    if not path.is_file():
        raise SystemExit(f"Missing Home Assistant brand asset: {path}")
    actual = png_dimensions(path)
    if actual != expected:
        raise SystemExit(f"Home Assistant brand asset {name} must be {expected[0]}x{expected[1]}, got {actual[0]}x{actual[1]}")

print("Home Assistant brand assets: OK")

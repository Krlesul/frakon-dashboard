from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = 2_000_000


def text(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        raise SystemExit(f"Document size parity failed: missing {relative}")
    return path.read_text(encoding="utf-8")


def integer_constant(relative: str, name: str) -> int:
    source = text(relative)
    match = re.search(rf"\b{re.escape(name)}\s*=\s*([0-9_]+)", source)
    if not match:
        raise SystemExit(f"Document size parity failed: {relative} is missing {name}")
    return int(match.group(1).replace("_", ""))


def require(relative: str, *markers: str) -> None:
    source = text(relative)
    missing = [marker for marker in markers if marker not in source]
    if missing:
        raise SystemExit(
            f"Document size parity failed: {relative} is missing markers:\n- "
            + "\n- ".join(repr(marker) for marker in missing)
        )


limits = {
    "TypeScript dashboard": integer_constant(
        "src/dashboard/dashboard-document-limits.ts",
        "DASHBOARD_MAX_SERIALIZED_BYTES",
    ),
    "Python dashboard": integer_constant(
        "custom_components/frakon_dashboard/document_validation.py",
        "DASHBOARD_MAX_SERIALIZED_BYTES",
    ),
    "Responsive bundle": integer_constant(
        "custom_components/frakon_dashboard/const.py",
        "RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES",
    ),
}
for label, value in limits.items():
    if value != EXPECTED:
        raise SystemExit(
            f"Document size parity failed: {label} limit is {value}, expected {EXPECTED}"
        )

require(
    "src/dashboard/dashboard-document-codec.ts",
    "dashboardWithinSerializedByteLimit(value)",
)
require(
    "src/dashboard/layout-model-v2.ts",
    "dashboardWithinSerializedByteLimit(value)",
)
require(
    "custom_components/frakon_dashboard/document_validation.py",
    "def dashboard_serialized_bytes",
    "max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES",
    "serialized_bytes > max_serialized_bytes",
)
require(
    "custom_components/frakon_dashboard/responsive_bundle_validation.py",
    "dashboard_serialized_bytes",
    "max_serialized_bytes=RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES",
    "serialized_bytes > RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES",
)
require(
    "scripts/verify_dashboard_document_validation.py",
    "exactly at the serialized-byte limit",
    "dashboard one byte above serialized limit",
    "multibyte UTF-8 dashboard above serialized limit",
)
require(
    "scripts/verify_hacs_release.py",
    "DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
    "dashboard_serialized_bytes",
    "max_serialized_bytes: int = DASHBOARD_MAX_SERIALIZED_BYTES",
)
require(
    "scripts/verify_home_assistant_install.py",
    "DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
    "Dashboard serialized-byte guard: OK",
)
require(
    "scripts/verify_alpha_test_kit.py",
    "DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000",
    "Dashboard serialized-byte guard: OK",
    "2,000,000",
)
require(
    "scripts/build_alpha_test_kit.py",
    "Dashboard serialized-byte guard: OK",
    "2,000,000",
)
require(
    "docs/home-assistant-alpha-test.md",
    "Dashboard serialized-byte guard: OK",
    "2,000,000",
    "2,000,001",
    "multibyte",
)
require(
    "docs/home-assistant-alpha-test-report-template.md",
    "Dashboard serialized-byte guard: OK",
    "2,000,000",
    "2,000,001",
    "Multibyte UTF-8",
)
require(
    ".github/workflows/ci.yml",
    "python scripts/verify_dashboard_document_validation.py",
    "python scripts/verify_document_size_parity.py",
)

print("Dashboard serialized-byte parity: OK")

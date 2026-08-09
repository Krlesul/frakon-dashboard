from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONST_PATH = ROOT / "custom_components/frakon_dashboard/const.py"
WS_PATH = ROOT / "custom_components/frakon_dashboard/responsive_websocket.py"


def assignments(path: Path) -> dict[str, ast.AST]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    result: dict[str, ast.AST] = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            result[node.targets[0].id] = node.value
    return result


def literal(node: ast.AST):
    return ast.literal_eval(node)


def main() -> None:
    values = assignments(CONST_PATH)
    contract = literal(values["RESPONSIVE_CANVAS_V2_CONTRACT_VERSION"])
    if contract != 1:
        raise SystemExit(f"Responsive alpha contract must remain v1 before audited unlock, got {contract!r}.")

    writable = values["WRITABLE_RESPONSIVE_BUNDLE_KINDS"]
    if not isinstance(writable, ast.Call) or not isinstance(writable.func, ast.Name) or writable.func.id != "frozenset" or writable.args or writable.keywords:
        raise SystemExit("WRITABLE_RESPONSIVE_BUNDLE_KINDS must remain an empty frozenset before audited unlock.")

    source = WS_PATH.read_text(encoding="utf-8")
    required = (
        "async def handle_save_responsive_revision",
        "async def handle_remove_responsive_revision",
        "@websocket_api.require_admin",
        '"unsupported_responsive_write"',
        "if RESPONSIVE_CANVAS_V2_KIND not in WRITABLE_RESPONSIVE_BUNDLE_KINDS",
    )
    missing = [snippet for snippet in required if snippet not in source]
    if missing:
        raise SystemExit(f"Responsive alpha write-lock guard missing required invariant(s): {missing!r}")

    print("Responsive alpha write lock verified: contract v1, empty write allowlist, admin guarded handlers.")


if __name__ == "__main__":
    main()

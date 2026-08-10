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


def function(tree: ast.AST, name: str) -> ast.AsyncFunctionDef:
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name:
            return node
    raise SystemExit(f"Missing responsive websocket handler {name!r}.")


def has_decorator(node: ast.AsyncFunctionDef, suffix: str) -> bool:
    for decorator in node.decorator_list:
        if isinstance(decorator, ast.Attribute) and decorator.attr == suffix:
            return True
    return False


def mutation_calls(node: ast.AsyncFunctionDef) -> list[str]:
    mutations: list[str] = []
    for child in ast.walk(node):
        if not isinstance(child, ast.Call) or not isinstance(child.func, ast.Attribute):
            continue
        if child.func.attr in {"save", "save_revision", "remove", "remove_revision"}:
            mutations.append(child.func.attr)
    return mutations


def main() -> None:
    values = assignments(CONST_PATH)
    contract = literal(values["RESPONSIVE_CANVAS_V2_CONTRACT_VERSION"])
    if contract != 1:
        raise SystemExit(f"Responsive alpha contract must remain v1 before audited unlock, got {contract!r}.")

    writable = values["WRITABLE_RESPONSIVE_BUNDLE_KINDS"]
    if not isinstance(writable, ast.Call) or not isinstance(writable.func, ast.Name) or writable.func.id != "frozenset" or writable.args or writable.keywords:
        raise SystemExit("WRITABLE_RESPONSIVE_BUNDLE_KINDS must remain an empty frozenset before audited unlock.")

    dry_run_endpoint = literal(values["RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT"])
    if dry_run_endpoint != "frakon/dashboard/dry_run_responsive_revision":
        raise SystemExit(f"Unexpected responsive dry-run endpoint: {dry_run_endpoint!r}")

    source = WS_PATH.read_text(encoding="utf-8")
    required = (
        "async def handle_dry_run_responsive_revision",
        "async def handle_save_responsive_revision",
        "async def handle_remove_responsive_revision",
        "@websocket_api.require_admin",
        '"unsupported_responsive_write"',
        "if RESPONSIVE_CANVAS_V2_KIND not in WRITABLE_RESPONSIVE_BUNDLE_KINDS",
    )
    missing = [snippet for snippet in required if snippet not in source]
    if missing:
        raise SystemExit(f"Responsive alpha write-lock guard missing required invariant(s): {missing!r}")

    tree = ast.parse(source, filename=str(WS_PATH))
    dry_run = function(tree, "handle_dry_run_responsive_revision")
    if not has_decorator(dry_run, "require_admin"):
        raise SystemExit("Responsive dry-run handler must remain admin-only.")
    mutations = mutation_calls(dry_run)
    if mutations:
        raise SystemExit(f"Responsive dry-run must remain non-mutating, found storage mutation call(s): {mutations!r}")

    print(
        "Responsive alpha write lock verified: contract v1, empty write allowlist, "
        "admin guarded handlers, non-mutating dry-run."
    )


if __name__ == "__main__":
    main()

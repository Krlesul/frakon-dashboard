from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "custom_components" / "frakon_dashboard"


def module_exists(module: str) -> bool:
    relative = Path(*module.split("."))
    return (PACKAGE / f"{relative}.py").is_file() or (PACKAGE / relative / "__init__.py").is_file()


def main() -> None:
    errors: list[str] = []
    for path in sorted(PACKAGE.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom) or node.level != 1 or not node.module:
                continue
            if not module_exists(node.module):
                errors.append(f"{path.relative_to(ROOT)} imports missing relative module .{node.module}")

    if errors:
        raise SystemExit("FRAKON integration relative import check failed:\n- " + "\n- ".join(errors))

    print("FRAKON integration relative imports: OK")


if __name__ == "__main__":
    main()

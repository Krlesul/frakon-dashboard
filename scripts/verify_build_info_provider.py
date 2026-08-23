from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import types

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = ROOT / "custom_components" / "frakon_dashboard"
PACKAGE_NAME = "frakon_dashboard"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Cannot load {name} from {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> None:
    package = types.ModuleType(PACKAGE_NAME)
    package.__path__ = [str(PACKAGE_ROOT)]
    sys.modules[PACKAGE_NAME] = package

    const = load_module(f"{PACKAGE_NAME}.const", PACKAGE_ROOT / "const.py")
    build_info = load_module(f"{PACKAGE_NAME}.build_info", PACKAGE_ROOT / "build_info.py")

    info = build_info.read_build_info()
    if info.get("version") != const.INTEGRATION_VERSION:
        raise SystemExit(f"Build info version mismatch: {info!r}")
    if info.get("responsiveContractVersion") != const.RESPONSIVE_CANVAS_V2_CONTRACT_VERSION:
        raise SystemExit(f"Build info contract mismatch: {info!r}")
    if not isinstance(info.get("sourceCommit"), str) or not info["sourceCommit"]:
        raise SystemExit(f"Build info sourceCommit is invalid: {info!r}")
    checksum = info.get("frontendSha256")
    if checksum is not None and (not isinstance(checksum, str) or len(checksum) != 64):
        raise SystemExit(f"Build info frontendSha256 is invalid: {info!r}")

    print(
        "FRAKON build info provider: OK "
        f"version={info['version']} contract={info['responsiveContractVersion']} source={info['sourceCommit']}"
    )


if __name__ == "__main__":
    main()

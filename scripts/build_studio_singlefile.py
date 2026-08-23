#!/usr/bin/env python3
"""Build a self-contained FRAKON Studio HTML file from the Vite output."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUDIO_DIR = ROOT / "dist" / "studio"
INDEX = STUDIO_DIR / "index.html"
OUTPUT = STUDIO_DIR / "FRAKON-Studio.html"
SCRIPT_PATTERN = re.compile(
    r'<script\s+type="module"\s+crossorigin\s+src="\./(?P<src>assets/[^"]+\.js)"></script>'
)


def main() -> None:
    if not INDEX.is_file():
        raise SystemExit(f"Studio index is missing: {INDEX}")

    html = INDEX.read_text(encoding="utf-8")
    match = SCRIPT_PATTERN.search(html)
    if match is None:
        raise SystemExit("Could not locate the production Studio module script in index.html")

    script_path = STUDIO_DIR / match.group("src")
    if not script_path.is_file():
        raise SystemExit(f"Studio bundle is missing: {script_path}")

    javascript = script_path.read_text(encoding="utf-8")
    javascript = re.sub(r"\n?//# sourceMappingURL=.*?\s*$", "\n", javascript)
    javascript = javascript.replace("</script>", "<\\/script>")
    inline_script = f'<script type="module">\n{javascript}\n</script>'

    single_file = SCRIPT_PATTERN.sub(lambda _match: inline_script, html, count=1)
    OUTPUT.write_text(single_file, encoding="utf-8")

    if "./assets/" in single_file:
        raise SystemExit("Self-contained Studio HTML still references an external asset")
    if "frakon-studio-app" not in single_file:
        raise SystemExit("Self-contained Studio HTML is missing the Studio app registration")

    print(f"FRAKON Studio single-file HTML: OK ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

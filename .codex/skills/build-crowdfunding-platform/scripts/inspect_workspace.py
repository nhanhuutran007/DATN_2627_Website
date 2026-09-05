#!/usr/bin/env python3
"""Report crowdfunding-project structure and Git state without modifying files."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


COMPONENT_MARKERS = {
    "frontend": ["frontend/package.json", "package.json"],
    "backend": ["backend/pom.xml", "backend/build.gradle", "pom.xml", "build.gradle"],
    "ai_service": [
        "ai-service/pyproject.toml",
        "ai-service/requirements.txt",
        "pyproject.toml",
        "requirements.txt",
    ],
    "infrastructure": [
        "infra/compose.yaml",
        "infra/docker-compose.yml",
        "compose.yaml",
        "docker-compose.yml",
    ],
}


def git(root: Path, *args: str) -> str | None:
    command = [
        "git",
        "-c",
        f"safe.directory={root.as_posix()}",
        "-C",
        str(root),
        *args,
    ]
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".", help="Repository root")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        parser.error(f"not a directory: {root}")

    components = {}
    for component, markers in COMPONENT_MARKERS.items():
        found = [marker for marker in markers if (root / marker).is_file()]
        components[component] = {"present": bool(found), "markers": found}

    status = git(root, "status", "--short")
    report = {
        "root": str(root),
        "project_spec": {
            "readme": (root / "README.md").is_file(),
            "main_pdf": (root / "main.pdf").is_file(),
        },
        "components": components,
        "git": {
            "available": status is not None,
            "branch": git(root, "branch", "--show-current"),
            "upstream": git(root, "rev-parse", "--abbrev-ref", "@{upstream}"),
            "remote_origin": git(root, "remote", "get-url", "origin"),
            "changes": status.splitlines() if status else [],
        },
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

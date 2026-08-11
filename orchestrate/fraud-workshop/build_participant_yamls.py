#!/usr/bin/env python3
"""Build per-participant agent YAML files (N=1…30) and publish them for download.

Only agent-spec-N.yaml is produced — credentials are sent by e-mail.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from generate_specs import render_agent

ROOT = Path(__file__).resolve().parent
YAMLS_DIR = ROOT / "specs"
DOWNLOADS_DIR = ROOT.parent.parent / "docs" / "assets" / "downloads" / "fraud-workshop"


def build_one(n: int, output_dir: Path) -> Path:
    """Write agent-spec-N.yaml and return its path."""
    yaml_path = output_dir / f"agent-spec-{n}.yaml"
    yaml_path.write_text(render_agent(n), encoding="utf-8")
    return yaml_path


def publish_downloads(built: list[Path]) -> None:
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    for yaml_path in built:
        shutil.copy2(yaml_path, DOWNLOADS_DIR / yaml_path.name)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build agent YAML files per participant")
    parser.add_argument("--from", dest="from_n", type=int, default=1)
    parser.add_argument("--to", dest="to_n", type=int, default=30)
    parser.add_argument(
        "--out",
        dest="out_dir",
        type=Path,
        default=YAMLS_DIR,
    )
    parser.add_argument(
        "--no-publish",
        action="store_true",
        help="Skip copying to docs/assets/downloads/fraud-workshop/",
    )
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    built: list[Path] = []
    for n in range(args.from_n, args.to_n + 1):
        built.append(build_one(n, args.out_dir))
        print(f"✓ {built[-1].name}")

    if not args.no_publish:
        publish_downloads(built)
        print(f"\n{DOWNLOADS_DIR}/ — {len(built)} YAML files publicados para descarga.")

    print(f"\nImportar (ejemplo N=3):")
    print("  orchestrate agents import --file agent-spec-3.yaml")


if __name__ == "__main__":
    main()

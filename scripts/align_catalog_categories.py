#!/usr/bin/env python3
"""
Align Rabbitor_all_products.csv with the Essentials display category matrix.

Usage:
    python3 scripts/align_catalog_categories.py
    python3 scripts/align_catalog_categories.py --input Rabbitor_all_products.csv --output Rabbitor_fixed_catalog.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from catalog_category_mapping import CATEGORY_MAPPING, display_category, segment_slug  # noqa: E402


def align_catalog(input_path: Path, output_path: Path) -> None:
    with input_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])

    for col in ("Display_Category", "Segment_Slug"):
        if col not in fieldnames:
            fieldnames.append(col)

    mapped = 0
    for row in rows:
        source = (row.get("Category") or "").strip()
        row["Display_Category"] = display_category(source)
        row["Segment_Slug"] = segment_slug(source)
        if source in CATEGORY_MAPPING:
            mapped += 1

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Read {len(rows)} products from {input_path}")
    print(f"Mapped {mapped} essentials rows via architectural matrix")
    print(f"Saved aligned catalog → {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Align product CSV to display categories")
    parser.add_argument(
        "--input",
        type=Path,
        default=ROOT / "Rabbitor_all_products.csv",
        help="Raw production CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "Rabbitor_fixed_catalog.csv",
        help="Output CSV with Display_Category + Segment_Slug",
    )
    args = parser.parse_args()
    if not args.input.is_file():
        raise SystemExit(f"Input not found: {args.input}")
    align_catalog(args.input, args.output)


if __name__ == "__main__":
    main()

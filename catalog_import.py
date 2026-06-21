"""
catalog_import.py
-----------------
1. Deactivates every existing MasterCatalogItem via the admin API.
2. Converts Rabbitor_all_products.csv into the bulk-upload CSV format.
3. POSTs the CSV to /api/admin/catalog/bulk-upload in 500-row chunks.

Usage:
    source venv/bin/activate
    python3 catalog_import.py
"""

import csv
import io
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))

from catalog_category_mapping import (  # noqa: E402
    NON_ESSENTIALS_SOURCE_CATEGORIES,
    item_type,
    segment_slug,
    store_type,
)

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL     = "https://rabbitor.elseif.ai"
SESSION_FILE = "/tmp/rabbit_session.json"
SOURCE_CSV   = ROOT / "Rabbitor_all_products.csv"
CHUNK_SIZE   = 500   # rows per upload batch

# ── Auth ──────────────────────────────────────────────────────────────────────
with open(SESSION_FILE) as f:
    _cookies = json.load(f)
TOKEN = next(c["value"] for c in _cookies if c["name"] == "rabbit_session")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def api_get(path, **kwargs):
    return requests.get(f"{BASE_URL}{path}", headers=HEADERS, timeout=30, **kwargs)


def api_patch(path, body):
    return requests.patch(f"{BASE_URL}{path}", headers=HEADERS, json=body, timeout=30)


def api_post_csv(path, csv_text: str):
    return requests.post(
        f"{BASE_URL}{path}",
        headers=HEADERS,
        files={"file": ("import.csv", csv_text.encode(), "text/csv")},
        timeout=120,
    )


# ── Step 2: Build upload CSV from Rabbitor_all_products.csv ───────────────────
def build_upload_rows() -> list[dict]:
    rows = []
    with SOURCE_CSV.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("Item Name") or "").strip()
            if not name:
                continue

            cat   = (row.get("Category") or "general").strip()
            if cat in NON_ESSENTIALS_SOURCE_CATEGORIES:
                continue

            brand = (row.get("Brand") or "").strip()
            pack  = (row.get("Pack Size") or "").strip()
            price = row.get("Price (INR)") or row.get("MRP (INR)") or "0"
            img   = (row.get("Image URL") or "").strip()
            pid   = (row.get("product_id") or "").strip()

            desc_parts = [p for p in [brand, pack] if p]
            description = " · ".join(desc_parts) if desc_parts else ""

            rows.append({
                "sku":         f"RB-{pid[:12]}" if pid else "",
                "name":        name,
                "category":    segment_slug(cat),
                "subcategory": cat,
                "base_price":  price,
                "description": description,
                "image_url":   img,
                "store_type":  store_type(cat),
                "unit":        pack or "piece",
                "type":        item_type(cat),
            })

    print(f"Prepared {len(rows)} rows from {SOURCE_CSV.name}\n")
    return rows


def rows_to_csv(rows: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue()


# ── Step 1: Deactivate all existing catalog items ─────────────────────────────
def deactivate_all():
    print("Fetching existing catalog items...")
    resp = api_get("/api/admin/catalog?take=1000")
    resp.raise_for_status()
    items = resp.json().get("items") or resp.json().get("data", [])
    print(f"  Found {len(items)} items to deactivate.")

    failed = 0
    for i, item in enumerate(items, 1):
        r = api_patch(f"/api/admin/catalog/{item['id']}", {"isActive": False})
        if r.status_code not in (200, 204):
            failed += 1
            print(f"  [!] Failed to deactivate {item['id']}: {r.status_code}")
        if i % 25 == 0:
            print(f"  Deactivated {i}/{len(items)}...")
        time.sleep(0.05)   # gentle rate-limit

    print(f"  Done. {len(items) - failed} deactivated, {failed} failed.\n")


# ── Step 3: Upload in chunks ───────────────────────────────────────────────────
def upload_chunks(rows: list[dict]):
    total  = len(rows)
    chunks = [rows[i:i + CHUNK_SIZE] for i in range(0, total, CHUNK_SIZE)]
    print(f"Uploading {total} products in {len(chunks)} chunk(s) of {CHUNK_SIZE}...")

    upserted_total = 0
    for idx, chunk in enumerate(chunks, 1):
        csv_text = rows_to_csv(chunk)
        r = api_post_csv("/api/admin/catalog/bulk-upload", csv_text)
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        if r.status_code == 200 and body.get("success"):
            n = body.get("upserted", len(chunk))
            upserted_total += n
            print(f"  Chunk {idx}/{len(chunks)}: {n} upserted  (running total: {upserted_total})")
        else:
            print(f"  [!] Chunk {idx} failed: {r.status_code} — {r.text[:200]}")
        time.sleep(0.3)

    print(f"\nUpload complete: {upserted_total} items imported into Global Catalog.")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    deactivate_all()
    rows = build_upload_rows()
    upload_chunks(rows)
    print("\nDone. Refresh https://rabbitor.elseif.ai/admin/global-catalog to verify.")

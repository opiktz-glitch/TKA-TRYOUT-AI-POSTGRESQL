"""
Script migrasi SEKALI JALAN untuk database Postgres yang sudah ada.

Menambahkan 2 kolom baru ke t_question untuk fitur soal bergambar:
- image_data (BYTEA, nullable)
- image_mime_type (VARCHAR(50), nullable)

Base.metadata.create_all() di main.py CUMA membuat tabel yang belum
ada -- tidak pernah mengubah/menambah kolom ke tabel yang sudah ada.
Karena tabel t_question kamu sudah ada isinya, kolom baru ini perlu
ditambah manual lewat ALTER TABLE, sekali ini saja.

Aman dijalankan berkali-kali: "ADD COLUMN IF NOT EXISTS" bawaan
Postgres membuat script ini idempotent dengan sendirinya (tidak
perlu cek manual seperti versi SQLite dulu).

Cara pakai (dari folder backend/, .env/DATABASE_URL sudah mengarah
ke Postgres seperti biasa):
    python scripts/add_question_image_columns.py
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import text  # noqa: E402

from config import DATABASE_URL  # noqa: E402
from database import engine  # noqa: E402


def main():
    if DATABASE_URL.startswith("sqlite"):
        print(
            "STOP: DATABASE_URL saat ini masih SQLite. Script ini pakai "
            "sintaks Postgres (BYTEA, ADD COLUMN IF NOT EXISTS) -- isi dulu "
            "DATABASE_URL dengan connection string Postgres di .env."
        )
        sys.exit(1)

    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE t_question ADD COLUMN IF NOT EXISTS image_data BYTEA")
        )
        conn.execute(
            text(
                "ALTER TABLE t_question "
                "ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(50)"
            )
        )

    print("Selesai: kolom image_data & image_mime_type siap dipakai di t_question.")


if __name__ == "__main__":
    main()

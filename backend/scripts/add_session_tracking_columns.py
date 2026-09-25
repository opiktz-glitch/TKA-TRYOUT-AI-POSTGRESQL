"""
Script migrasi SEKALI JALAN untuk database yang SUDAH ADA (SQLite
maupun PostgreSQL/Neon) — menambahkan 2 kolom baru di t_user yang
dipakai untuk single-session enforcement (1 akun cuma boleh login
di satu tempat pada satu waktu). Lihat catatan di models.py pada
class User untuk detail lengkapnya.

Kenapa perlu script terpisah (bukan cukup Base.metadata.create_all()
di main.py)? create_all() HANYA membuat tabel yang belum ada sama
sekali — tidak pernah menambah kolom baru ke tabel yang sudah ada.
Untuk database yang sudah terlanjur jalan (sudah ada data user),
kolom baru ini harus ditambahkan manual lewat ALTER TABLE.

Aman dijalankan berkali-kali dan di kedua jenis database: kalau
kolom sudah ada, script ini cuma memberi tahu dan tidak melakukan
apa-apa lagi.

Cara pakai (dari folder backend/, dengan .env sudah menunjuk ke
database yang mau dimigrasi):
    python scripts/add_session_tracking_columns.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import DATABASE_URL, engine
from sqlalchemy import inspect, text

COLUMNS_TO_ADD = {
    "active_session_id": "VARCHAR",
    "active_session_expires_at": "TIMESTAMP",
}


def main():
    inspector = inspect(engine)

    if "t_user" not in inspector.get_table_names():
        print("Tabel t_user belum ada sama sekali — jalankan dulu "
              "aplikasinya sekali (uvicorn main:app) supaya "
              "Base.metadata.create_all() membuat semua tabel dari "
              "awal (sudah otomatis termasuk kolom baru ini untuk "
              "instalasi baru), baru jalankan script ini kalau "
              "masih diperlukan.")
        sys.exit(1)

    existing_columns = {
        col["name"] for col in inspector.get_columns("t_user")
    }

    with engine.begin() as conn:
        for column_name, column_type in COLUMNS_TO_ADD.items():

            if column_name in existing_columns:
                print(f"[LEWATI] Kolom '{column_name}' sudah ada.")
                continue

            print(f"[TAMBAH] Menambahkan kolom '{column_name}' "
                  f"({column_type}) ke t_user...")

            conn.execute(
                text(
                    f"ALTER TABLE t_user "
                    f"ADD COLUMN {column_name} {column_type}"
                )
            )

    print("\nMigrasi selesai. Target:", DATABASE_URL.split("@")[-1])
    # (.split("@")[-1] sengaja dipakai supaya kalau DATABASE_URL
    # berisi username/password (Postgres), itu tidak ikut tercetak
    # ke console/log — lihat catatan sama di
    # scripts/migrate_sqlite_to_postgres.py)


if __name__ == "__main__":
    main()

"""
Migrasi data dari SQLite lama ke PostgreSQL yang sekarang aktif di
DATABASE_URL (.env).

Kenapa lewat SQLAlchemy ORM, bukan baca file .db mentah / sqlite3
langsung: SQLite menyimpan boolean sebagai integer 0/1 dan datetime
sebagai teks. Kalau dibaca lewat ORM (bukan raw cursor), SQLAlchemy
otomatis mengonversi nilai-nilai itu ke tipe Python asli (bool,
datetime) sesuai definisi kolom di models.py — begitu ditulis lagi
ke sisi Postgres lewat ORM yang SAMA, konversi ke tipe Postgres asli
(true/false, timestamp) otomatis benar tanpa perlu ditangani manual
di sini.

CARA PAKAI
----------
Jalankan dari folder backend/, dengan .env sudah diisi DATABASE_URL
Postgres (target) seperti biasa menjalankan aplikasi:

    python scripts/migrate_sqlite_to_postgres.py
    python scripts/migrate_sqlite_to_postgres.py path/ke/sqlite/lain.db

Kalau path sumber tidak diisi, default ke database/project_tz.db
(lokasi fallback SQLite sebelum DATABASE_URL diisi Postgres).

PERINGATAN
----------
- Jalankan HANYA SEKALI ke database Postgres yang masih KOSONG.
  Skrip ini akan menolak (skip) tabel yang di sisi Postgres SUDAH
  ada isinya, supaya tidak dobel-insert kalau skrip ini tidak
  sengaja dijalankan dua kali.
- Tabel t_user berisi password_hash asli dari SQLite lama — user
  bisa login dengan password yang sama seperti sebelumnya, tidak
  perlu reset password setelah migrasi.
"""

import os
import sys

# Supaya "from database import ..." dkk di bawah bisa jalan sama
# persis seperti kalau dipanggil dari backend/main.py — skrip ini
# ada di backend/scripts/, jadi backend/ (1 folder di atasnya) perlu
# ditambahkan ke sys.path secara manual dulu.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

import models
from config import DATABASE_URL
from database import engine as target_engine
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

# =========================================================
# URUTAN TABEL — WAJIB mengikuti dependency foreign key
# (tabel induk harus diisi duluan sebelum tabel anak yang
# menunjuk ke dia lewat ForeignKey), atau Postgres akan
# menolak insert dengan error "violates foreign key constraint".
# =========================================================
TABLES_IN_ORDER = [
    models.User,
    models.Student,
    models.Teacher,
    models.Subject,
    models.Question,
    models.QuestionOption,
    models.Tryout,
    models.TryoutQuestion,
    models.Attempt,
    models.Answer,
    models.Result,
    models.AppSetting,
]


def main():
    if DATABASE_URL.startswith("sqlite"):
        print(
            "STOP: DATABASE_URL di .env kamu saat ini masih SQLite.\n"
            "Isi dulu DATABASE_URL dengan connection string Postgres "
            "(lihat backend/.env), baru jalankan skrip ini — supaya "
            "target migrasinya benar Postgres, bukan menimpa file "
            "SQLite yang sama."
        )
        sys.exit(1)

    source_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        BACKEND_DIR, "database", "project_tz.db"
    )
    if not os.path.isfile(source_path):
        print(f"STOP: File SQLite sumber tidak ditemukan: {source_path}")
        sys.exit(1)

    print(f"Sumber (SQLite) : {source_path}")
    print(f"Target (Postgres): {DATABASE_URL.split('@')[-1]}")  # tanpa password
    print()

    source_engine = create_engine(
        f"sqlite:///{source_path}", connect_args={"check_same_thread": False}
    )
    SourceSession = sessionmaker(bind=source_engine)
    TargetSession = sessionmaker(bind=target_engine)

    source_db = SourceSession()
    target_db = TargetSession()

    try:
        for model in TABLES_IN_ORDER:
            table_name = model.__tablename__

            existing_count = target_db.execute(
                select(func.count()).select_from(model)
            ).scalar()
            if existing_count and existing_count > 0:
                print(
                    f"[LEWATI] {table_name}: sudah berisi {existing_count} "
                    f"baris di Postgres, tidak diimpor ulang."
                )
                continue

            rows = source_db.query(model).all()
            if not rows:
                print(f"[KOSONG] {table_name}: tidak ada data di SQLite sumber.")
                continue

            columns = [c.name for c in model.__table__.columns]
            mappings = [
                {col: getattr(row, col) for col in columns} for row in rows
            ]
            target_db.bulk_insert_mappings(model, mappings)
            target_db.commit()
            print(f"[OK]     {table_name}: {len(mappings)} baris diimpor.")

            # Reset sequence auto-increment Postgres — kolom "id" barusan
            # diisi manual (bukan lewat nextval()), jadi sequence-nya
            # tidak otomatis maju. Tanpa ini, insert baru berikutnya dari
            # aplikasi (mis. bikin user baru) akan coba pakai id=1 lagi
            # dan gagal "duplicate key value violates unique constraint".
            # t_app_setting dilewati karena primary key-nya "key" (VARCHAR),
            # bukan id auto-increment.
            if "id" in columns:
                target_db.execute(
                    select(
                        func.setval(
                            func.pg_get_serial_sequence(table_name, "id"),
                            func.coalesce(
                                select(func.max(model.id)).scalar_subquery(), 1
                            ),
                        )
                    )
                )
                target_db.commit()

        print("\nMigrasi selesai.")

    except Exception:
        target_db.rollback()
        raise
    finally:
        source_db.close()
        target_db.close()


if __name__ == "__main__":
    main()

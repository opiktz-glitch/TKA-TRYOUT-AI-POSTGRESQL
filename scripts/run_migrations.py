#!/usr/bin/env python3
"""
Database Migration Runner for TKA TryOut AI
Supports PostgreSQL and SQLite.
Manages schema evolution across v01, v02, and v03.
"""

import argparse
import os
import sys
from pathlib import Path

# Add backend directory to path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from database import engine
from sqlalchemy import inspect, text


def get_current_schema_version(conn) -> str:
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    if "t_user" not in tables:
        return "none"

    if "t_app_setting" not in tables:
        return "v01"

    # Check setting
    try:
        res = conn.execute(
            text("SELECT value FROM t_app_setting WHERE key = 'app:schema_version'")
        ).fetchone()
        if res and res[0]:
            return res[0]
    except Exception:
        pass

    # Inspect columns if version tag not yet saved
    q_cols = {col["name"] for col in inspector.get_columns("t_question")}
    u_cols = {col["name"] for col in inspector.get_columns("t_user")}
    if "image_data" in q_cols and "active_session_id" in u_cols:
        # Check if v03 index exists
        indexes = [idx["name"] for idx in inspector.get_indexes("t_attempt")]
        if "uq_attempt_active_per_student_tryout" in indexes:
            return "v03"
        return "v02"

    return "v01"


def apply_sql_file(conn, filepath: Path, dialect: str):
    print(f"--> Membaca script: {filepath.name}")
    content = filepath.read_text(encoding="utf-8")

    # Split statements safely by semicolon while handling comments
    statements = []
    current = []
    for line in content.splitlines():
        trimmed = line.strip()
        if trimmed.startswith("--") or not trimmed:
            continue
        current.append(line)
        if trimmed.endswith(";"):
            statements.append("\n".join(current))
            current = []

    if current and "\n".join(current).strip():
        statements.append("\n".join(current))

    for stmt in statements:
        sql = stmt.strip()
        if not sql:
            continue

        # Adjust syntax if on sqlite
        if dialect == "sqlite":
            sql = sql.replace("BYTEA", "BLOB")
            sql = sql.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
            sql = sql.replace("TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP")
            if "ALTER COLUMN difficulty TYPE VARCHAR(150)" in sql:
                # SQLite is dynamically typed and ignores varchar length limits
                continue

        try:
            conn.execute(text(sql))
        except Exception as e:
            # If column or index already exists, skip gracefully
            msg = str(e).lower()
            if any(term in msg for term in ["already exists", "duplicate column", "syntax error"]):
                print(f"    [Catatan/Lewati] {e}")
            else:
                raise e


def run_migrations(target_version: str = "v03", check_only: bool = False):
    migrations_dir = ROOT_DIR / "migrations"
    dialect = engine.dialect.name
    print(f"==================================================")
    print(f"TKA TryOut AI - Database Migration Manager")
    print(f"Target Database Dialect: {dialect.upper()}")
    print(f"==================================================")

    with engine.begin() as conn:
        current_version = get_current_schema_version(conn)
        print(f"Versi Skema Saat Ini: {current_version.upper()}")

        if check_only:
            print("Pemeriksaan selesai (--check aktif). Tidak ada perubahan.")
            return current_version

        v01_file = migrations_dir / "v01_initial_schema.sql"
        v02_file = migrations_dir / "v02_update_media_session_settings.sql"
        v03_file = migrations_dir / "v03_optimize_concurrency_indexes_pgk.sql"

        if current_version == "none":
            print("\n[MIGRASI] Mengaplikasikan Skema Awal v01...")
            apply_sql_file(conn, v01_file, dialect)
            current_version = "v01"

        if current_version == "v01" and target_version in ["v02", "v03"]:
            print("\n[MIGRASI] Mengaplikasikan Upgrade v01 -> v02...")
            apply_sql_file(conn, v02_file, dialect)
            current_version = "v02"

        if current_version in ["v01", "v02"] and target_version == "v03":
            print("\n[MIGRASI] Mengaplikasikan Upgrade v02 -> v03...")
            apply_sql_file(conn, v03_file, dialect)
            current_version = "v03"

        # Explicitly ensure version tag is updated
        if current_version == "v03":
            conn.execute(
                text(
                    """
                    INSERT INTO t_app_setting (key, value, updated_at)
                    VALUES ('app:schema_version', 'v03', CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET value = 'v03', updated_at = CURRENT_TIMESTAMP;
                    """
                    if dialect == "postgresql"
                    else """
                    INSERT OR REPLACE INTO t_app_setting (key, value, updated_at)
                    VALUES ('app:schema_version', 'v03', CURRENT_TIMESTAMP);
                    """
                )
            )

        print("\n==================================================")
        print(f"SUKSES: Database sekarang berada pada versi {current_version.upper()}")
        print("==================================================")
        return current_version


def main():
    parser = argparse.ArgumentParser(description="TKA TryOut Database Migrator")
    parser.add_argument(
        "--target",
        choices=["v01", "v02", "v03"],
        default="v03",
        help="Target schema version (default: v03)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check current database schema version without applying changes",
    )

    args = parser.parse_args()
    run_migrations(target_version=args.target, check_only=args.check)


if __name__ == "__main__":
    main()

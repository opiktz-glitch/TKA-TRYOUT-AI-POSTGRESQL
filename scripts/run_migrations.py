#!/usr/bin/env python3
"""PostgreSQL migration runner for schema versions v01 through v06."""

import argparse
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

    res = conn.execute(
        text("SELECT value FROM t_app_setting WHERE key = 'app:schema_version'")
    ).fetchone()
    if res and res[0]:
        return res[0]

    # Inspect columns if version tag not yet saved
    q_cols = {col["name"] for col in inspector.get_columns("t_question")}
    u_cols = {col["name"] for col in inspector.get_columns("t_user")}
    if "image_data" in q_cols and "active_session_id" in u_cols:
        attempt_cols = {col["name"] for col in inspector.get_columns("t_attempt")}
        if "tab_switches_count" in attempt_cols:
            return "v04"
        # Check if v03 index exists
        indexes = [idx["name"] for idx in inspector.get_indexes("t_attempt")]
        if "uq_attempt_active_per_student_tryout" in indexes:
            return "v03"
        return "v02"

    return "v01"


def apply_sql_file(conn, filepath: Path):
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

        try:
            conn.execute(text(sql))
        except Exception as e:
            # If column or index already exists, skip gracefully
            msg = str(e).lower()
            if any(term in msg for term in ["already exists", "duplicate column"]):
                print(f"    [Catatan/Lewati] {e}")
            else:
                raise e


def run_migrations(target_version: str = "v06", check_only: bool = False):
    migrations_dir = ROOT_DIR / "migrations"
    dialect = engine.dialect.name
    print(f"==================================================")
    print(f"TKA TryOut AI - Database Migration Manager")
    print(f"Target Database Dialect: {dialect.upper()}")
    print(f"==================================================")

    with engine.begin() as conn:
        current_version = get_current_schema_version(conn)
        if current_version not in {"none", "v01", "v02", "v03", "v04", "v05", "v06"}:
            raise RuntimeError(
                f"Versi skema tidak dikenal: {current_version!r}. "
                "Periksa nilai app:schema_version sebelum melanjutkan."
            )
        print(f"Versi Skema Saat Ini: {current_version.upper()}")

        if check_only:
            print("Pemeriksaan selesai (--check aktif). Tidak ada perubahan.")
            return current_version

        v01_file = migrations_dir / "v01_initial_schema.sql"
        v02_file = migrations_dir / "v02_update_media_session_settings.sql"
        v03_file = migrations_dir / "v03_optimize_concurrency_indexes_pgk.sql"
        v04_file = migrations_dir / "v04_anti_cheat_telemetry.sql"
        v05_file = migrations_dir / "v05_practice_module.sql"
        v06_file = migrations_dir / "v06_practice_draft_answers.sql"
        target_number = int(target_version[1:])

        if current_version == "none":
            print("\n[MIGRASI] Mengaplikasikan Skema Awal v01...")
            apply_sql_file(conn, v01_file)
            current_version = "v01"

        if current_version == "v01" and target_number >= 2:
            print("\n[MIGRASI] Mengaplikasikan Upgrade v01 -> v02...")
            apply_sql_file(conn, v02_file)
            current_version = "v02"

        if current_version == "v02" and target_number >= 3:
            print("\n[MIGRASI] Mengaplikasikan Upgrade v02 -> v03...")
            apply_sql_file(conn, v03_file)
            current_version = "v03"

        if current_version == "v03" and target_number >= 4:
            print("\n[MIGRASI] Mengaplikasikan Upgrade v03 -> v04...")
            apply_sql_file(conn, v04_file)
            current_version = "v04"

        if current_version == "v04" and target_number >= 5:
            print("\n[MIGRASI] Mengaplikasikan Upgrade v04 -> v05...")
            apply_sql_file(conn, v05_file)
            current_version = "v05"

        if current_version == "v05" and target_number >= 6:
            print("\n[MIGRASI] Mengaplikasikan Upgrade v05 -> v06...")
            apply_sql_file(conn, v06_file)
            current_version = "v06"

        if current_version in {"v03", "v04", "v05", "v06"}:
            conn.execute(
                text(
                    """
                    INSERT INTO t_app_setting (key, value, updated_at)
                    VALUES ('app:schema_version', :version, CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET
                        value = EXCLUDED.value,
                        updated_at = CURRENT_TIMESTAMP
                    """
                ),
                {"version": current_version},
            )

        print("\n==================================================")
        print(f"SUKSES: Database sekarang berada pada versi {current_version.upper()}")
        print("==================================================")
        return current_version


def main():
    parser = argparse.ArgumentParser(description="TKA TryOut Database Migrator")
    parser.add_argument(
        "--target",
        choices=["v01", "v02", "v03", "v04", "v05", "v06"],
        default="v06",
        help="Target schema version (default: v06)",
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

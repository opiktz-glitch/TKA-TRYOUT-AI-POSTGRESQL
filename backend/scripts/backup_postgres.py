"""Create and rotate full PostgreSQL custom-format backups."""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_BACKUP_DIR = BACKEND_DIR / "backups" / "postgresql"
BACKUP_PATTERN = re.compile(r"^tka-full-\d{8}T\d{6}(?:\d{6})?Z\.dump$")
PG_ENVIRONMENT_KEYS = {
    "sslmode": "PGSSLMODE",
    "sslrootcert": "PGSSLROOTCERT",
    "sslcert": "PGSSLCERT",
    "sslkey": "PGSSLKEY",
    "connect_timeout": "PGCONNECT_TIMEOUT",
    "application_name": "PGAPPNAME",
    "target_session_attrs": "PGTARGETSESSIONATTRS",
}
POSTGRES_TOOL_ENVIRONMENT_KEYS = {
    "pg_dump": "POSTGRES_PG_DUMP_PATH",
    "pg_restore": "POSTGRES_PG_RESTORE_PATH",
}


def find_postgres_tool(tool_name: str) -> str | None:
    environment_key = POSTGRES_TOOL_ENVIRONMENT_KEYS.get(tool_name)
    if environment_key is None:
        raise ValueError(f"Utilitas PostgreSQL tidak dikenal: {tool_name}")

    configured_path = os.getenv(environment_key, "").strip()
    if configured_path:
        tool_path = Path(configured_path).expanduser()
        if not tool_path.is_file() or (
            os.name != "nt" and not os.access(tool_path, os.X_OK)
        ):
            return None
        return str(tool_path.resolve())

    return shutil.which(tool_name)


def require_postgres_tool(tool_name: str) -> str:
    tool_path = find_postgres_tool(tool_name)
    if tool_path:
        return tool_path

    environment_key = POSTGRES_TOOL_ENVIRONMENT_KEYS[tool_name]
    if os.getenv(environment_key, "").strip():
        raise RuntimeError(
            f"{environment_key} menunjuk ke file yang tidak ditemukan."
        )
    raise RuntimeError(
        f"{tool_name} tidak ditemukan di PATH. Tambahkan direktori PostgreSQL "
        f"ke PATH atau isi {environment_key} di backend/.env."
    )


def _pgpass_escape(value: str) -> str:
    if "\n" in value or "\r" in value:
        raise ValueError("Nilai koneksi mengandung karakter baris baru yang tidak valid.")
    return value.replace("\\", "\\\\").replace(":", "\\:")


def _connection_settings(database_url: str) -> tuple[list[str], dict[str, str], str]:
    url = make_url(database_url)
    if url.drivername not in ("postgresql", "postgresql+psycopg2"):
        raise ValueError("DATABASE_URL harus menunjuk ke PostgreSQL.")
    if not url.host or not url.database or not url.username:
        raise ValueError("DATABASE_URL harus mencantumkan host, database, dan user.")

    pgpass_entry = ":".join(
        _pgpass_escape(value)
        for value in (
            url.host,
            str(url.port or 5432),
            url.database,
            url.username,
            url.password or "",
        )
    )
    arguments = [
        "--host", url.host,
        "--port", str(url.port or 5432),
        "--username", url.username,
        "--dbname", url.database,
    ]
    environment = {
        PG_ENVIRONMENT_KEYS[key]: str(value)
        for key, value in url.query.items()
        if key in PG_ENVIRONMENT_KEYS
    }
    return arguments, environment, pgpass_entry


def _write_private_file(directory: Path, contents: str) -> Path:
    file_descriptor, filename = tempfile.mkstemp(prefix=".tka-pgpass-", dir=directory)
    path = Path(filename)
    try:
        if hasattr(os, "fchmod"):
            os.fchmod(file_descriptor, 0o600)
        else:
            os.chmod(path, 0o600)
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as output:
            output.write(contents)
            output.write("\n")
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return path


def _run(command: list[str], environment: dict[str, str]) -> None:
    result = subprocess.run(
        command,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        detail = result.stderr.strip() or "Tidak ada detail dari utilitas PostgreSQL."
        raise RuntimeError(f"Perintah PostgreSQL gagal: {detail}")


def _process_environment(connection_environment: dict[str, str]) -> dict[str, str]:
    environment = {
        key: os.environ[key]
        for key in (
            "PATH",
            "HOME",
            "TMPDIR",
            "TEMP",
            "TMP",
            "SYSTEMROOT",
            "WINDIR",
            "USERPROFILE",
            "LANG",
            "LC_ALL",
        )
        if key in os.environ
    }
    environment.update(connection_environment)
    return environment


def _run_with_pgpass(
    command: list[str],
    environment: dict[str, str],
    pgpass_entry: str,
    directory: Path,
) -> None:
    pgpass_path = _write_private_file(directory, pgpass_entry)
    environment["PGPASSFILE"] = str(pgpass_path)
    try:
        _run(command, environment)
    finally:
        pgpass_path.unlink(missing_ok=True)


def _remove_old_backups(backup_dir: Path, keep: int) -> int:
    backups = sorted(
        (
            path
            for path in backup_dir.iterdir()
            if path.is_file() and BACKUP_PATTERN.fullmatch(path.name)
        ),
        key=lambda path: path.name,
        reverse=True,
    )
    removed = 0
    for old_backup in backups[keep:]:
        old_backup.unlink()
        removed += 1
    return removed


def resolve_backup_directory(base_directory: Path, subdirectory: str = "") -> Path:
    normalized_subdirectory = subdirectory.strip().replace("\\", "/")
    if not normalized_subdirectory:
        return base_directory.expanduser().resolve()

    parts = normalized_subdirectory.split("/")
    if (
        normalized_subdirectory.startswith("/")
        or re.match(r"^[A-Za-z]:", normalized_subdirectory)
        or any(part in ("", ".", "..") for part in parts)
    ):
        raise ValueError(
            "Subfolder backup harus berupa path relatif di dalam folder dasar."
        )

    resolved_base = base_directory.expanduser().resolve()
    resolved_directory = resolved_base.joinpath(*parts).resolve()
    try:
        resolved_directory.relative_to(resolved_base)
    except ValueError as exc:
        raise ValueError(
            "Subfolder backup tidak boleh keluar dari folder dasar yang diizinkan."
        ) from exc
    return resolved_directory


def verify_backup_directory(backup_directory: Path) -> None:
    backup_directory.mkdir(parents=True, exist_ok=True)
    os.chmod(backup_directory, 0o700)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".tka-write-test-",
        dir=backup_directory,
    )
    os.close(descriptor)
    Path(temporary_name).unlink()


def create_backup(
    backup_dir: Path,
    keep: int,
    database_url: str,
    now: datetime | None = None,
) -> Path:
    if keep < 1:
        raise ValueError("Retensi harus menyimpan minimal satu backup.")

    connection_args, connection_environment, pgpass_entry = _connection_settings(
        database_url
    )
    pg_dump_path = require_postgres_tool("pg_dump")
    pg_restore_path = require_postgres_tool("pg_restore")
    backup_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(backup_dir, 0o700)

    timestamp = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    backup_path = backup_dir / f"tka-full-{timestamp:%Y%m%dT%H%M%S%f}Z.dump"
    if backup_path.exists():
        raise FileExistsError(f"Backup dengan nama yang sama sudah ada: {backup_path.name}")

    temporary_descriptor, temporary_name = tempfile.mkstemp(
        prefix=".tka-full-", suffix=".dump.partial", dir=backup_dir
    )
    os.close(temporary_descriptor)
    temporary_path = Path(temporary_name)
    environment = _process_environment(connection_environment)
    try:
        _run_with_pgpass(
            [
                pg_dump_path,
                "--no-password",
                "--format=custom",
                "--no-owner",
                "--no-acl",
                *connection_args,
                "--file",
                str(temporary_path),
            ],
            environment,
            pgpass_entry,
            backup_dir,
        )
        if temporary_path.stat().st_size == 0:
            raise RuntimeError("pg_dump berhasil tetapi menghasilkan file kosong.")

        _run([pg_restore_path, "--list", str(temporary_path)], environment)
        os.chmod(temporary_path, 0o600)
        with temporary_path.open("rb+") as backup_file:
            backup_file.flush()
            os.fsync(backup_file.fileno())
        os.replace(temporary_path, backup_path)

        removed = _remove_old_backups(backup_dir, keep)
        print(
            f"Backup penuh berhasil: {backup_path.name} "
            f"({backup_path.stat().st_size} bytes); "
            f"{removed} backup lama dihapus."
        )
        return backup_path
    finally:
        temporary_path.unlink(missing_ok=True)


def validate_backup(backup_path: Path, database_url: str) -> None:
    if not backup_path.is_file() or backup_path.stat().st_size == 0:
        raise ValueError("File backup tidak ditemukan atau kosong.")
    _, connection_environment, pgpass_entry = _connection_settings(database_url)
    pg_restore_path = require_postgres_tool("pg_restore")
    environment = _process_environment(connection_environment)
    _run_with_pgpass(
        [pg_restore_path, "--list", str(backup_path)],
        environment,
        pgpass_entry,
        backup_path.parent,
    )


def restore_backup(backup_path: Path, database_url: str) -> None:
    connection_args, connection_environment, pgpass_entry = _connection_settings(
        database_url
    )
    pg_restore_path = require_postgres_tool("pg_restore")
    environment = _process_environment(connection_environment)
    _run_with_pgpass(
        [
            pg_restore_path,
            "--no-password",
            "--clean",
            "--if-exists",
            "--single-transaction",
            "--exit-on-error",
            "--no-owner",
            "--no-acl",
            *connection_args,
            str(backup_path),
        ],
        environment,
        pgpass_entry,
        backup_path.parent,
    )
    restore_engine = create_engine(database_url, pool_pre_ping=True)
    try:
        with restore_engine.begin() as connection:
            connection.execute(
                text(
                    "UPDATE t_user "
                    "SET active_session_id = NULL, active_session_expires_at = NULL"
                )
            )
    finally:
        restore_engine.dispose()


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env", override=False)
    parser = argparse.ArgumentParser(
        description="Buat backup penuh PostgreSQL dalam format custom pg_dump."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(
            os.getenv("POSTGRES_BACKUP_DIR", "").strip()
            or str(DEFAULT_BACKUP_DIR)
        ),
        help="Folder backup (default: backend/backups/postgresql).",
    )
    parser.add_argument(
        "--keep",
        type=int,
        default=int(os.getenv("POSTGRES_BACKUP_RETENTION", "14")),
        help="Jumlah backup terbaru yang disimpan (default: 14).",
    )
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        parser.error("DATABASE_URL wajib tersedia di environment atau backend/.env.")

    try:
        create_backup(args.output_dir, args.keep, database_url)
    except (OSError, RuntimeError, ValueError) as error:
        print(f"Backup PostgreSQL gagal: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

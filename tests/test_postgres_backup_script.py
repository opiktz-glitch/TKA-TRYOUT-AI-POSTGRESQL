import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, Mock
from unittest.mock import patch

from backend.scripts import backup_postgres


DATABASE_URL = (
    "postgresql+psycopg2://tka_user:p%3Assword@db.example:5433/tka"
    "?sslmode=require"
)


class PostgresBackupTests(unittest.TestCase):
    def test_connection_settings_keep_password_out_of_command_arguments(self):
        arguments, environment, pgpass_entry = backup_postgres._connection_settings(
            DATABASE_URL
        )

        self.assertNotIn("p:ssword", " ".join(arguments))
        self.assertEqual(environment["PGSSLMODE"], "require")
        self.assertEqual(
            pgpass_entry,
            "db.example:5433:tka:tka_user:p\\:ssword",
        )

    def test_connection_settings_reject_non_postgresql_urls(self):
        with self.assertRaisesRegex(ValueError, "PostgreSQL"):
            backup_postgres._connection_settings("sqlite:///not-supported.db")

    def test_pgpass_rejects_line_breaks(self):
        with self.assertRaisesRegex(ValueError, "baris baru"):
            backup_postgres._connection_settings(
                "postgresql://tka_user:secret%0Ainjected@db.example/tka"
            )

    def test_backup_is_validated_before_retention_removes_old_files(self):
        now = datetime(2026, 11, 5, 2, 0, tzinfo=timezone.utc)
        with tempfile.TemporaryDirectory() as directory:
            backup_dir = Path(directory)
            (backup_dir / "tka-full-20261103T020000Z.dump").write_bytes(b"old")
            (backup_dir / "keep-this-file.txt").write_text("unrelated")

            def fake_run(command, environment):
                self.assertNotIn("DATABASE_URL", environment)
                self.assertNotIn("SECRET_KEY", environment)
                if Path(command[0]).name.startswith("pg_dump"):
                    dump_path = Path(command[command.index("--file") + 1])
                    dump_path.write_bytes(b"custom-format-dump")
                    self.assertTrue(Path(environment["PGPASSFILE"]).exists())
                    self.assertNotIn("p:ssword", " ".join(command))

            with (
                patch.dict(
                    "os.environ",
                    {"DATABASE_URL": DATABASE_URL, "SECRET_KEY": "must-not-be-passed"},
                ),
                patch.object(backup_postgres, "_run", side_effect=fake_run),
                patch.object(
                    backup_postgres,
                    "require_postgres_tool",
                    side_effect=lambda name: name,
                ),
            ):
                created = backup_postgres.create_backup(
                    backup_dir, keep=1, database_url=DATABASE_URL, now=now
                )

            self.assertRegex(
                created.name,
                r"^tka-full-20261105T020000\d{6}Z\.dump$",
            )
            self.assertEqual(created.read_bytes(), b"custom-format-dump")
            self.assertFalse((backup_dir / "tka-full-20261103T020000Z.dump").exists())
            self.assertTrue((backup_dir / "keep-this-file.txt").exists())
            self.assertEqual(
                sorted(path.name for path in backup_dir.iterdir()),
                ["keep-this-file.txt", created.name],
            )

    def test_failed_validation_preserves_existing_backup_and_cleans_temp_files(self):
        with tempfile.TemporaryDirectory() as directory:
            backup_dir = Path(directory)
            existing = backup_dir / "tka-full-20261103T020000Z.dump"
            existing.write_bytes(b"existing")

            def fake_run(command, _environment):
                if Path(command[0]).name.startswith("pg_dump"):
                    Path(command[command.index("--file") + 1]).write_bytes(b"partial")
                else:
                    raise RuntimeError("archive validation failed")

            with (
                patch.object(backup_postgres, "_run", side_effect=fake_run),
                patch.object(
                    backup_postgres,
                    "require_postgres_tool",
                    side_effect=lambda name: name,
                ),
            ):
                with self.assertRaisesRegex(RuntimeError, "archive validation failed"):
                    backup_postgres.create_backup(
                        backup_dir,
                        keep=14,
                        database_url=DATABASE_URL,
                        now=datetime(2026, 11, 5, tzinfo=timezone.utc),
                    )

            self.assertEqual(existing.read_bytes(), b"existing")
            self.assertEqual([path.name for path in backup_dir.iterdir()], [existing.name])

    def test_retention_must_keep_at_least_one_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "minimal satu"):
                backup_postgres.create_backup(
                    Path(directory), keep=0, database_url=DATABASE_URL
                )

    def test_backup_subdirectory_stays_within_configured_base(self):
        with tempfile.TemporaryDirectory() as directory:
            base_directory = Path(directory)
            resolved = backup_postgres.resolve_backup_directory(
                base_directory,
                "admin/manual",
            )

            self.assertEqual(resolved, (base_directory / "admin" / "manual").resolve())

    def test_backup_subdirectory_rejects_absolute_and_parent_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            base_directory = Path(directory)
            invalid_paths = (
                "../outside",
                "nested/../../outside",
                str(base_directory / "absolute"),
                "C:\\outside",
            )
            for subdirectory in invalid_paths:
                with self.subTest(subdirectory=subdirectory):
                    with self.assertRaisesRegex(ValueError, "relatif"):
                        backup_postgres.resolve_backup_directory(
                            base_directory,
                            subdirectory,
                        )

    def test_postgres_tool_uses_machine_specific_environment_path(self):
        with tempfile.TemporaryDirectory() as directory:
            tool_path = Path(directory) / "pg_dump.exe"
            tool_path.write_bytes(b"")
            with patch.dict(
                "os.environ",
                {"POSTGRES_PG_DUMP_PATH": str(tool_path)},
            ):
                self.assertEqual(
                    backup_postgres.find_postgres_tool("pg_dump"),
                    str(tool_path.resolve()),
                )

    def test_postgres_tool_falls_back_to_path_when_not_configured(self):
        with (
            patch.dict("os.environ", {}, clear=True),
            patch.object(
                backup_postgres.shutil,
                "which",
                return_value="C:\\PostgreSQL\\bin\\pg_restore.exe",
            ) as which,
        ):
            self.assertEqual(
                backup_postgres.find_postgres_tool("pg_restore"),
                "C:\\PostgreSQL\\bin\\pg_restore.exe",
            )
        which.assert_called_once_with("pg_restore")

    def test_directory_verification_creates_folder_and_cleans_probe_file(self):
        with tempfile.TemporaryDirectory() as directory:
            backup_directory = Path(directory) / "new" / "backup"

            backup_postgres.verify_backup_directory(backup_directory)

            self.assertTrue(backup_directory.is_dir())
            self.assertEqual(list(backup_directory.iterdir()), [])

    def test_restore_uses_single_transaction_and_invalidates_sessions(self):
        fake_connection = Mock()
        fake_engine = Mock()
        fake_engine.begin.return_value = MagicMock()
        fake_engine.begin.return_value.__enter__.return_value = fake_connection
        backup_path = Path("uploaded.dump")

        with (
            patch.object(backup_postgres, "_run") as run_command,
            patch.object(backup_postgres, "create_engine", return_value=fake_engine),
            patch.object(
                backup_postgres,
                "require_postgres_tool",
                return_value="pg_restore",
            ),
        ):
            backup_postgres.restore_backup(backup_path, DATABASE_URL)

        command = run_command.call_args.args[0]
        self.assertIn("--single-transaction", command)
        self.assertIn("--clean", command)
        fake_connection.execute.assert_called_once()
        statement = fake_connection.execute.call_args.args[0]
        self.assertIn("active_session_id = NULL", str(statement))
        fake_engine.dispose.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()

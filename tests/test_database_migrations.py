"""
Tests for Database Migrations (v01, v02, v03)
Verifies table schemas, columns, constraints, and indexes.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import database
import models
from sqlalchemy import inspect, text


class TestDatabaseMigrations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = database.engine
        cls.inspector = inspect(cls.engine)

    def test_01_all_v01_core_tables_exist(self):
        """Pastikan seluruh 12 tabel dasar v01 ada di database"""
        expected_tables = {
            "t_user",
            "t_subject",
            "t_question",
            "t_question_option",
            "t_student",
            "t_teacher",
            "t_tryout",
            "t_tryout_question",
            "t_attempt",
            "t_answer",
            "t_result",
            "t_notification",
        }
        existing_tables = set(self.inspector.get_table_names())
        missing = expected_tables - existing_tables
        self.assertEqual(
            len(missing),
            0,
            f"Tabel v01 belum lengkap di database! Hilang: {missing}",
        )

    def test_02_v02_app_setting_table_and_columns_exist(self):
        """Pastikan tabel t_app_setting dan kolom v02 terpasang dengan benar"""
        existing_tables = set(self.inspector.get_table_names())
        self.assertIn(
            "t_app_setting",
            existing_tables,
            "Tabel t_app_setting (v02) harus ada!",
        )

        # Cek kolom media soal di t_question
        q_cols = {col["name"]: col for col in self.inspector.get_columns("t_question")}
        self.assertIn("image_data", q_cols, "Kolom image_data di t_question harus ada!")
        self.assertIn("image_mime_type", q_cols, "Kolom image_mime_type di t_question harus ada!")
        self.assertIn("true_label", q_cols, "Kolom true_label di t_question harus ada!")
        self.assertIn("false_label", q_cols, "Kolom false_label di t_question harus ada!")

        # Cek kolom single-session di t_user
        u_cols = {col["name"]: col for col in self.inspector.get_columns("t_user")}
        self.assertIn("active_session_id", u_cols, "Kolom active_session_id di t_user harus ada!")
        self.assertIn("active_session_expires_at", u_cols, "Kolom active_session_expires_at di t_user harus ada!")

        # Cek kolom bobot soal di t_tryout
        t_cols = {col["name"]: col for col in self.inspector.get_columns("t_tryout")}
        self.assertIn("weight_pg", t_cols, "Kolom weight_pg di t_tryout harus ada!")
        self.assertIn("weight_mcma", t_cols, "Kolom weight_mcma di t_tryout harus ada!")
        self.assertIn("weight_bs", t_cols, "Kolom weight_bs di t_tryout harus ada!")

    def test_03_v03_concurrency_index_and_difficulty_length(self):
        """Pastikan index unik parsial v03 dan ekstensi difficulty terpasang"""
        # Cek index uq_attempt_active_per_student_tryout di t_attempt
        attempt_indexes = [idx["name"] for idx in self.inspector.get_indexes("t_attempt")]
        self.assertIn(
            "uq_attempt_active_per_student_tryout",
            attempt_indexes,
            "Index uq_attempt_active_per_student_tryout (v03) harus terpasang di t_attempt!",
        )

        # Cek panjang kolom difficulty di t_tryout jika di PostgreSQL
        if self.engine.dialect.name == "postgresql":
            with self.engine.connect() as conn:
                res = conn.execute(
                    text(
                        """
                        SELECT character_maximum_length 
                        FROM information_schema.columns 
                        WHERE table_name = 't_tryout' AND column_name = 'difficulty';
                        """
                    )
                ).fetchone()
                if res and res[0] is not None:
                    self.assertGreaterEqual(
                        res[0],
                        150,
                        f"Panjang t_tryout.difficulty harus >= 150 (saat ini: {res[0]})",
                    )

    def test_04_schema_version_is_v03(self):
        """Pastikan app:schema_version bernilai v03 di database"""
        with self.engine.connect() as conn:
            res = conn.execute(
                text("SELECT value FROM t_app_setting WHERE key = 'app:schema_version'")
            ).fetchone()
            self.assertIsNotNone(res, "Key app:schema_version harus ada di t_app_setting!")
            self.assertEqual(res[0], "v03", f"Versi skema harus v03, didapat: {res[0]}")


if __name__ == "__main__":
    unittest.main()

"""
End-to-End API Integration Tests for All Application Pages & Endpoints
Validates normal functionality across ADMIN, GURU, and SISWA roles.
Matches the exact endpoints called by frontend pages via frontend/src/services/api.js.
"""

import sys
import unittest
from datetime import timedelta
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import auth
import database
import models
from main import app
from starlette.testclient import TestClient


class TestBackendApiAndPages(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = database.SessionLocal()

        # Generate tokens for each role
        cls.tokens = {}
        for role in ["ADMIN", "GURU", "SISWA"]:
            user = cls.db.query(models.User).filter_by(role=role).first()
            if user:
                sid = auth.start_session(user, timedelta(hours=2))
                cls.db.commit()
                cls.tokens[role] = auth.create_access_token(
                    {"sub": user.username, "role": user.role, "sid": sid},
                    db=cls.db,
                )

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def get_headers(self, role: str):
        token = self.tokens.get(role)
        if not token:
            self.skipTest(f"Akun untuk role {role} tidak ditemukan di database")
        return {"Authorization": f"Bearer {token}"}

    # ==========================================
    # 1. PUBLIC & AUTHENTICATION ENDPOINTS
    # ==========================================
    def test_01_public_login_endpoint(self):
        """Halaman Login: Endpoint /api/auth/login merespons dengan normal"""
        res = self.client.post(
            "/api/auth/login",
            json={"username": "non_existent_user", "password": "wrong_password"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data.get("success"))

    def test_02_current_user_me(self):
        """Profil Sesi Aktif: Endpoint /api/auth/me merespons profil user valid"""
        res = self.client.get("/api/auth/me", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("role"), "ADMIN")

    def test_03_system_status(self):
        """Status Sistem: Endpoint /api/system/status mengonfirmasi API & DB online"""
        res = self.client.get("/api/system/status", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("api", {}).get("online"))
        self.assertTrue(data.get("database", {}).get("online"))

    def test_04_system_network_info(self):
        """Info Jaringan LAN: Endpoint /api/system/network-info mengembalikan IP aktif"""
        res = self.client.get("/api/system/network-info", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("backend_online"))
        self.assertIsInstance(data.get("addresses"), list)

    # ==========================================
    # 2. HALAMAN-HALAMAN ADMIN
    # ==========================================
    def test_05_admin_dashboard_pages(self):
        """Halaman Dashboard Admin: /api/admin/dashboard & summary merespons 200"""
        res1 = self.client.get("/api/admin/dashboard", headers=self.get_headers("ADMIN"))
        self.assertEqual(res1.status_code, 200)

        res2 = self.client.get("/api/admin/dashboard-summary", headers=self.get_headers("ADMIN"))
        self.assertEqual(res2.status_code, 200)

        res3 = self.client.get("/api/admin/live-summary", headers=self.get_headers("ADMIN"))
        self.assertEqual(res3.status_code, 200)

    def test_06_admin_user_management_page(self):
        """Halaman User Management: Endpoint /api/users merespons 200"""
        res = self.client.get("/api/users", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_07_admin_student_management_page(self):
        """Halaman Manajemen Siswa: Endpoint /api/students merespons 200"""
        res = self.client.get("/api/students", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_08_admin_teacher_management_page(self):
        """Halaman Manajemen Guru: Endpoint /api/teachers merespons 200"""
        res = self.client.get("/api/teachers", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_09_admin_subject_management_page(self):
        """Halaman Mata Pelajaran: Endpoint /api/subjects merespons 200"""
        res = self.client.get("/api/subjects", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_10_admin_question_management_page(self):
        """Halaman Bank Soal: Endpoint /api/questions merespons 200"""
        res = self.client.get("/api/questions", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(isinstance(data, list) or "data" in data or "questions" in data)

    def test_11_admin_duplicate_scanner_endpoint(self):
        """Fitur Scanner Duplikat Soal: Endpoint /api/questions/find-duplicates merespons 200"""
        res = self.client.get("/api/questions/find-duplicates", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)

    def test_12_admin_tryout_management_page(self):
        """Halaman Paket Tryout: Endpoint /api/tryouts merespons 200"""
        res = self.client.get("/api/tryouts", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_13_admin_scores_page(self):
        """Halaman Rekap Nilai Admin: Endpoint /api/teacher/scores & creators merespons 200"""
        res = self.client.get("/api/teacher/scores", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

        res_creators = self.client.get("/api/teacher/creators", headers=self.get_headers("ADMIN"))
        self.assertEqual(res_creators.status_code, 200)
        self.assertIsInstance(res_creators.json(), list)

    def test_14_admin_reports_page(self):
        """Halaman Laporan Admin: Endpoint /api/admin/reports/overview merespons 200"""
        res = self.client.get("/api/admin/reports/overview", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)

    def test_15_admin_settings_page(self):
        """Halaman Pengaturan Admin: Endpoint /api/settings/* merespons 200"""
        res_sec = self.client.get("/api/settings/secret-key", headers=self.get_headers("ADMIN"))
        self.assertEqual(res_sec.status_code, 200)

        res_ai = self.client.get("/api/settings/ai-providers", headers=self.get_headers("ADMIN"))
        self.assertEqual(res_ai.status_code, 200)

        res_status = self.client.get("/api/settings/ai-status", headers=self.get_headers("ADMIN"))
        self.assertEqual(res_status.status_code, 200)

    def test_16_notifications_endpoint(self):
        """Notifikasi Sistem: Endpoint /api/notifications merespons 200"""
        res = self.client.get("/api/notifications", headers=self.get_headers("ADMIN"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    # ==========================================
    # 3. HALAMAN-HALAMAN GURU
    # ==========================================
    def test_17_teacher_dashboard_page(self):
        """Halaman Dashboard Guru: Endpoint /api/teacher/dashboard-summary merespons 200"""
        res = self.client.get("/api/teacher/dashboard-summary", headers=self.get_headers("GURU"))
        self.assertEqual(res.status_code, 200)

    def test_18_teacher_students_page(self):
        """Halaman Peserta Guru: Endpoint /api/students merespons 200 untuk GURU"""
        res = self.client.get("/api/students", headers=self.get_headers("GURU"))
        self.assertEqual(res.status_code, 200)

    def test_19_teacher_scores_page(self):
        """Halaman Rekap Nilai Guru: Endpoint /api/teacher/scores merespons 200"""
        res = self.client.get("/api/teacher/scores", headers=self.get_headers("GURU"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_20_teacher_reports_page(self):
        """Halaman Laporan Guru: Endpoint laporan per tryout merespons 200"""
        tryout = self.db.query(models.Tryout).first()
        if tryout:
            res = self.client.get(f"/api/teacher/reports/{tryout.id}", headers=self.get_headers("ADMIN"))
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get("tryout_id"), tryout.id)

    def test_21_teacher_profile_page(self):
        """Halaman Profil Guru: Endpoint /api/teacher/profile merespons 200"""
        res = self.client.get("/api/teacher/profile", headers=self.get_headers("GURU"))
        self.assertEqual(res.status_code, 200)

    # ==========================================
    # 4. HALAMAN-HALAMAN SISWA
    # ==========================================
    def test_22_student_dashboard_page(self):
        """Halaman Dashboard Siswa: Endpoint /api/student/dashboard-summary merespons 200"""
        res = self.client.get("/api/student/dashboard-summary", headers=self.get_headers("SISWA"))
        self.assertEqual(res.status_code, 200)

    def test_23_student_tryouts_page(self):
        """Halaman Daftar Tryout Siswa: Endpoint /api/student/tryouts merespons 200"""
        res = self.client.get("/api/student/tryouts", headers=self.get_headers("SISWA"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_24_student_history_page(self):
        """Halaman Riwayat Ujian Siswa: Endpoint /api/student/attempts/history merespons 200"""
        res = self.client.get("/api/student/attempts/history", headers=self.get_headers("SISWA"))
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_25_student_profile_page(self):
        """Halaman Profil Siswa: Endpoint /api/student/profile merespons 200"""
        res = self.client.get("/api/student/profile", headers=self.get_headers("SISWA"))
        self.assertEqual(res.status_code, 200)

    def test_26_bulk_delete_protection(self):
        """Proteksi Penghapusan: Endpoint /api/questions/bulk-delete aman dari foreign key violation"""
        res = self.client.post(
            "/api/questions/bulk-delete",
            json={"question_ids": ["999999"]},
            headers=self.get_headers("ADMIN"),
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", res.json())


if __name__ == "__main__":
    unittest.main()

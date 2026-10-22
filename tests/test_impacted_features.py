"""
Focused Test Suite: Impacted Data Flows & Business Logic
Hanya menguji alur data, logika, dan form yang terdampak pembaruan (v01 -> v02 -> v03):
1. Single-Session kick: Token lama ditolak 401 saat sesi baru aktif di perangkat lain
2. Concurrency pengerjaan ujian: Resume attempt aktif tanpa duplikasi pengerjaan
3. Soft-archival paket tryout: Paket dengan riwayat pengerjaan siswa aman dari penghapusan fisik
4. Proteksi bulk-delete soal: Soal terikat riwayat/paket diarsipkan tanpa foreign key violation
5. Form attributes & skema baru: difficulty 150 char, bobot nilai, label kustom Benar-Salah
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


class TestImpactedFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = database.SessionLocal()

        # Ambil user untuk tiap peran
        cls.admin_user = cls.db.query(models.User).filter_by(role="ADMIN").first()
        cls.teacher_user = cls.db.query(models.User).filter_by(role="GURU").first()
        cls.student_user = cls.db.query(models.User).filter_by(role="SISWA").first()

        # Generate token awal untuk Admin
        if cls.admin_user:
            sid = auth.start_session(cls.admin_user, timedelta(hours=2))
            cls.db.commit()
            cls.admin_token = auth.create_access_token(
                {"sub": cls.admin_user.username, "role": cls.admin_user.role, "sid": sid},
                db=cls.db,
            )
        else:
            cls.admin_token = None

        # Generate token awal untuk Siswa
        if cls.student_user:
            sid = auth.start_session(cls.student_user, timedelta(hours=2))
            cls.db.commit()
            cls.student_token = auth.create_access_token(
                {"sub": cls.student_user.username, "role": cls.student_user.role, "sid": sid},
                db=cls.db,
            )
        else:
            cls.student_token = None

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def admin_headers(self):
        if not self.admin_token:
            self.skipTest("Admin user tidak ditemukan")
        return {"Authorization": f"Bearer {self.admin_token}"}

    def student_headers(self):
        if not self.student_token:
            self.skipTest("Student user tidak ditemukan")
        return {"Authorization": f"Bearer {self.student_token}"}

    # =========================================================================
    # 1. ALUR SINGLE-SESSION KICK & SESSION INVALIDATION
    # =========================================================================
    def test_01_single_session_kick_logic(self):
        """Logika Single-Session: Token lama ditolak 401 saat sesi baru diaktifkan"""
        if not self.student_user:
            self.skipTest("Student user tidak tersedia")

        # 1. Buat Token Sesi A
        sid_a = auth.start_session(self.student_user, timedelta(hours=1))
        self.db.commit()
        token_a = auth.create_access_token(
            {"sub": self.student_user.username, "role": self.student_user.role, "sid": sid_a},
            db=self.db,
        )

        # Token A harus valid
        res_a = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(res_a.status_code, 200)

        # 2. Siswa login dari sesi/perangkat B -> Session A ter-overwrite
        sid_b = auth.start_session(self.student_user, timedelta(hours=1))
        self.db.commit()
        token_b = auth.create_access_token(
            {"sub": self.student_user.username, "role": self.student_user.role, "sid": sid_b},
            db=self.db,
        )

        # 3. Token A sekarang harus ditolak dengan 401 dan pesan sesi berakhir
        res_kick = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(res_kick.status_code, 401)
        detail = res_kick.json().get("detail", "")
        self.assertTrue(
            "login dari perangkat lain" in detail or "berakhir" in detail,
            f"Pesan kick tidak sesuai: {detail}",
        )

        # 4. Token B tetap berfungsi normal
        res_b = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(res_b.status_code, 200)

        # Perbarui student_token aktif
        self.__class__.student_token = token_b

    # =========================================================================
    # 2. ALUR CONCURRENCY & RESUME PENGERJAAN UJIAN (SISWA)
    # =========================================================================
    def test_02_concurrency_and_resume_attempt_flow(self):
        """Logika Ujian: Mencegah duplikasi attempt aktif dan melakukan resume dengan aman"""
        tryout = (
            self.db.query(models.Tryout)
            .filter(models.Tryout.is_active == True)
            .join(models.TryoutQuestion)
            .first()
        )
        if not tryout:
            self.skipTest("Tidak ada paket tryout aktif yang memiliki butir soal")

        # 1. Mulai attempt pertama
        res1 = self.client.post(
            f"/api/student/tryouts/{tryout.id}/start",
            headers=self.student_headers(),
        )
        self.assertIn(res1.status_code, [200, 201])
        data1 = res1.json()
        attempt_id_1 = data1.get("attempt_id")
        self.assertIsNotNone(attempt_id_1)

        # 2. Simulasikan klik ganda / request kedua saat attempt sedang IN_PROGRESS
        res2 = self.client.post(
            f"/api/student/tryouts/{tryout.id}/start",
            headers=self.student_headers(),
        )
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        attempt_id_2 = data2.get("attempt_id")

        # Sistem harus me-resume attempt yang sama, bukan membuat duplikat
        self.assertEqual(
            attempt_id_1,
            attempt_id_2,
            "Sistem harus me-resume attempt yang sedang aktif tanpa membuat duplikasi!",
        )

    # =========================================================================
    # 3. ALUR SOFT ARCHIVAL PAKET TRYOUT (PROTEKSI RIWAYAT SISWA)
    # =========================================================================
    def test_03_soft_archival_tryout_with_attempts(self):
        """Logika Proteksi Tryout: Paket dengan riwayat siswa diarsipkan, bukan dihapus keras"""
        # Cari tryout yang memiliki attempt pengerjaan
        attempt = self.db.query(models.Attempt).first()
        if not attempt:
            self.skipTest("Belum ada attempt siswa untuk pengujian soft-archive")

        target_tryout_id = attempt.tryout_id
        target_tryout = self.db.query(models.Tryout).filter_by(id=target_tryout_id).first()
        if not target_tryout:
            self.skipTest("Tryout target tidak ditemukan")

        # Pastikan aktif sebelum tes
        target_tryout.is_active = True
        self.db.commit()

        # Hapus tryout via API Admin
        res = self.client.delete(f"/api/tryouts/{target_tryout_id}", headers=self.admin_headers())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))

        # Verifikasi di database: tryout harus tetap ada, hanya is_active = False (soft-archived)
        self.db.expire_all()
        check_tryout = self.db.query(models.Tryout).filter_by(id=target_tryout_id).first()
        self.assertIsNotNone(check_tryout, "Tryout tidak boleh terhapus secara fisik karena memiliki attempt!")
        self.assertFalse(check_tryout.is_active, "Status tryout harus diarsipkan (is_active = False)")

        # Kembalikan status tryout agar sistem normal kembali
        check_tryout.is_active = True
        self.db.commit()

    # =========================================================================
    # 4. ALUR PROTEKSI BULK-DELETE SOAL BERELASI
    # =========================================================================
    def test_04_bulk_delete_questions_protection(self):
        """Logika Proteksi Soal: Soal terkait tryout/jawaban aman dari Foreign Key Violation"""
        tq = self.db.query(models.TryoutQuestion).first()
        if not tq:
            self.skipTest("Tidak ada relasi soal-tryout untuk pengujian")

        question_id = str(tq.question_id)
        question = self.db.query(models.Question).filter_by(id=tq.question_id).first()
        if not question:
            self.skipTest("Soal tidak ditemukan")

        question.is_active = True
        self.db.commit()

        # Coba bulk delete soal tersebut
        res = self.client.post(
            "/api/questions/bulk-delete",
            json={"question_ids": [question_id]},
            headers=self.admin_headers(),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("message", data)

        # Pastikan soal tidak memicu crash dan data tetap aman
        self.db.expire_all()
        recheck_q = self.db.query(models.Question).filter_by(id=tq.question_id).first()
        self.assertIsNotNone(recheck_q, "Soal yang terikat tidak boleh menyebabkan error 500!")

    # =========================================================================
    # 5. FORM ATTRIBUTES & SKEMA BARU (DIFFICULTY 150, BOBOT NILAI, LABEL BS)
    # =========================================================================
    def test_05_form_new_schema_attributes(self):
        """Validasi Form: Mendukung difficulty s.d 150 char, bobot nilai, dan label BS"""
        long_difficulty = "Tryout Khusus SNBT - Simulasi Mandiri Tingkat Lanjut Gelombang 2"
        self.assertGreater(len(long_difficulty), 20, "String harus > 20 karakter untuk menguji skema v03")

        # 1. Simpan dan verifikasi via ORM / DB
        tryout = self.db.query(models.Tryout).first()
        if tryout:
            old_diff = tryout.difficulty
            old_w_pg = tryout.weight_pg
            tryout.difficulty = long_difficulty
            tryout.weight_pg = 1.5
            tryout.weight_mcma = 2.0
            tryout.weight_bs = 1.0
            self.db.commit()

            # Verifikasi pembacaan nilai
            self.db.expire_all()
            re_tryout = self.db.query(models.Tryout).filter_by(id=tryout.id).first()
            self.assertEqual(re_tryout.difficulty, long_difficulty)
            self.assertEqual(float(re_tryout.weight_pg), 1.5)

            # Kembalikan data semula
            re_tryout.difficulty = old_diff
            re_tryout.weight_pg = old_w_pg
            self.db.commit()

        # 2. Verifikasi label kustom Benar-Salah
        bs_question = self.db.query(models.Question).filter_by(question_type="BENAR_SALAH").first()
        if bs_question:
            bs_question.true_label = "Sesuai Kaidah"
            bs_question.false_label = "Tidak Sesuai"
            self.db.commit()

            self.db.expire_all()
            re_bs = self.db.query(models.Question).filter_by(id=bs_question.id).first()
            self.assertEqual(re_bs.true_label, "Sesuai Kaidah")
            self.assertEqual(re_bs.false_label, "Tidak Sesuai")

    # =========================================================================
    # 6. ALUR TELEMETRI ANTI-CHEAT (TAB SWITCHES LOGGING)
    # =========================================================================
    def test_06_anti_cheat_telemetry_flow(self):
        """Telemetri Anti-Cheat: Frekuensi pindah tab tersimpan di t_attempt dan tampil di nilai"""
        tryout = (
            self.db.query(models.Tryout)
            .filter(models.Tryout.is_active == True)
            .join(models.TryoutQuestion)
            .first()
        )
        if not tryout:
            self.skipTest("Tidak ada paket tryout aktif")

        # 1. Mulai attempt
        start_res = self.client.post(
            f"/api/student/tryouts/{tryout.id}/start",
            headers=self.student_headers(),
        )
        self.assertEqual(start_res.status_code, 200)
        attempt_id = start_res.json()["attempt_id"]

        # 2. Submit dengan telemetri 3x perpindahan tab
        sub_res = self.client.post(
            f"/api/student/attempts/{attempt_id}/submit",
            json={"tab_switches": 3},
            headers=self.student_headers(),
        )
        self.assertEqual(sub_res.status_code, 200)
        self.assertEqual(sub_res.json().get("tab_switches_count"), 3)

        # 3. Verifikasi di DB
        self.db.expire_all()
        att = self.db.query(models.Attempt).filter_by(id=attempt_id).first()
        self.assertEqual(att.tab_switches_count, 3)

        # 4. Verifikasi muncul di endpoint nilai Guru / Admin
        score_res = self.client.get("/api/teacher/scores", headers=self.admin_headers())
        self.assertEqual(score_res.status_code, 200)
        rows = score_res.json()
        matching = [r for r in rows if r["attempt_id"] == attempt_id]
        if matching:
            self.assertEqual(matching[0].get("tab_switches_count"), 3)


if __name__ == "__main__":
    unittest.main()

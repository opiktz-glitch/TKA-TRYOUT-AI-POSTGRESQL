"""
Tests for Frontend Pages Integrity & Route Structure
Validates existence of all JSX page components and route configurations.
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
PAGES_DIR = FRONTEND_DIR / "src" / "pages"


class TestFrontendPagesIntegrity(unittest.TestCase):
    def test_01_all_page_components_exist(self):
        """Pastikan semua komponen halaman di frontend/src/pages ada di disk"""
        expected_pages = [
            "AdminReport.jsx",
            "AdminScores.jsx",
            "AdminSettings.jsx",
            "ChangePassword.jsx",
            "Dashboard.jsx",
            "Login.jsx",
            "QuestionManagement.jsx",
            "StudentHistory.jsx",
            "StudentManagement.jsx",
            "StudentProfile.jsx",
            "StudentTryoutAttempt.jsx",
            "StudentTryoutList.jsx",
            "SubjectManagement.jsx",
            "TeacherManagement.jsx",
            "TeacherProfile.jsx",
            "TeacherReport.jsx",
            "TeacherScores.jsx",
            "TeacherStudents.jsx",
            "TryoutManagement.jsx",
            "UserManagement.jsx",
        ]

        existing_files = {p.name for p in PAGES_DIR.glob("*.jsx")}
        missing = [p for p in expected_pages if p not in existing_files]
        self.assertEqual(
            len(missing),
            0,
            f"Komponen halaman frontend hilang: {missing}",
        )

    def test_02_all_routes_mapped_in_app_jsx(self):
        """Pastikan route path penting terdaftar di frontend/src/App.jsx"""
        app_jsx_path = FRONTEND_DIR / "src" / "App.jsx"
        self.assertTrue(app_jsx_path.exists(), "frontend/src/App.jsx harus ada!")

        content = app_jsx_path.read_text(encoding="utf-8")
        expected_routes = [
            'path="/login"',
            'path="/dashboard"',
            'path="/questions"',
            'path="/tryouts"',
            'path="/student/attempt/:attemptId"',
            'path="/change-password"',
            'path="/teacher/students"',
            'path="/teacher/scores"',
            'path="/teacher/reports"',
            'path="/teacher/profile"',
            'path="/admin/scores"',
            'path="/admin/reports"',
            'path="/admin/settings"',
            'path="/users"',
            'path="/student/history"',
            'path="/students"',
            'path="/teachers"',
            'path="/student/tryouts"',
            'path="/student/profile"',
            'path="/subjects"',
        ]

        for route in expected_routes:
            self.assertIn(
                route,
                content,
                f"Route {route} tidak ditemukan di App.jsx!",
            )

    def test_03_vite_production_build_artifact_exists(self):
        """Pastikan artefak build frontend (dist/index.html) siap digunakan"""
        dist_html = FRONTEND_DIR / "dist" / "index.html"
        self.assertTrue(
            dist_html.exists(),
            "dist/index.html tidak ditemukan. Jalankan 'npm run build' di folder frontend/.",
        )


if __name__ == "__main__":
    unittest.main()

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { UIProvider } from "./context/UIContext";

// App.css HARUS diimpor sebelum halaman/komponen: file CSS milik komponen
// (mis. components/TryoutWizard.css, ScoreTable.css, settings/settings.css)
// dimuat setelahnya, jadi urutan cascade-nya sama seperti saat CSS-nya
// masih berada di paling bawah App.css.
import "./App.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import AdminScores from "./pages/AdminScores";
import AdminReport from "./pages/AdminReport";
import AdminSettings from "./pages/AdminSettings";
import StudentManagement from "./pages/StudentManagement";
import TeacherManagement from "./pages/TeacherManagement";
import ChangePassword from "./pages/ChangePassword";
import SubjectManagement from "./pages/SubjectManagement";
import QuestionManagement from "./pages/QuestionManagement";
import TryoutManagement from "./pages/TryoutManagement";
import TeacherScores from "./pages/TeacherScores";
import TeacherReport from "./pages/TeacherReport";
import TeacherStudents from "./pages/TeacherStudents";
import TeacherProfile from "./pages/TeacherProfile";
import StudentTryoutList from "./pages/StudentTryoutList";
import StudentHistory from "./pages/StudentHistory";
import StudentProfile from "./pages/StudentProfile";
import StudentTryoutAttempt from "./pages/StudentTryoutAttempt";

import Layout from "./components/Layout";



// =====================================================
// PROTECTED ROUTE
// Melindungi halaman yang membutuhkan login
// sekaligus membatasi akses berdasarkan role.
// =====================================================
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  // Masih mengecek token / user
  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }

  // Belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jika role dibatasi dan user tidak termasuk
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


// =====================================================
// ROUTES
// =====================================================
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>

      {/* =================================================
          LOGIN
          Jika sudah login → Dashboard
          ================================================= */}
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />






      {/* =================================================
          BANK SOAL
          ADMIN + GURU
          ================================================= */}
      <Route
        path="/questions"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN", "GURU"]}
          >
            <QuestionManagement />
          </ProtectedRoute>
        }
      />


      {/* =================================================
          PAKET TRYOUT
          ADMIN + GURU
          ================================================= */}
      <Route
        path="/tryouts"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN", "GURU"]}
          >
            <TryoutManagement />
          </ProtectedRoute>
        }
      />

      {/* =================================================
          STUDENT TRYOUT ATTEMPT (pengerjaan soal)
          Hanya SISWA
          ================================================= */}
      <Route
        path="/student/attempt/:attemptId"
        element={
          <ProtectedRoute allowedRoles={["SISWA"]}>
            <StudentTryoutAttempt />
          </ProtectedRoute>
        }
      />


      {/* =================================================
          HALAMAN DENGAN LAYOUT BERSAMA (Sidebar + Header)
          Layout dipasang SEKALI sebagai route induk, jadi Sidebar &
          Header tidak di-mount ulang tiap pindah halaman antar route
          di grup ini. Halaman di dalamnya cukup me-render kontennya
          (jangan bungkus lagi dengan app-layout/Sidebar/Header).
          Pembatasan role tetap di ProtectedRoute masing-masing halaman.
          Halaman lain BELUM dimigrasi -- masih render layout sendiri.
          ================================================= */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >

        {/* =================================================
            CHANGE PASSWORD
            Semua user yang sudah login
            ================================================= */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            PESERTA (data siswa, read-only untuk guru)
            ADMIN + GURU
            ================================================= */}
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "GURU"]}
            >
              <TeacherStudents />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            NILAI (rekap skor tryout milik guru)
            ADMIN + GURU
            ================================================= */}
        <Route
          path="/teacher/scores"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "GURU"]}
            >
              <TeacherScores />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            LAPORAN (analitik per tryout milik guru)
            ADMIN + GURU
            ================================================= */}
        <Route
          path="/teacher/reports"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "GURU"]}
            >
              <TeacherReport />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            PENGATURAN (profil akun guru)
            Hanya GURU
            ================================================= */}
        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute allowedRoles={["GURU"]}>
              <TeacherProfile />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            NILAI (rekap skor seluruh tryout)
            Hanya ADMIN
            ================================================= */}
        <Route
          path="/admin/scores"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminScores />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            LAPORAN (analitik seluruh sistem)
            Hanya ADMIN
            ================================================= */}
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReport />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            PROFIL SISWA
            Hanya SISWA
            ================================================= */}
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={["SISWA"]}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            STUDENT TRYOUT LIST
            Hanya SISWA
            ================================================= */}
        <Route
          path="/student/tryouts"
          element={
            <ProtectedRoute allowedRoles={["SISWA"]}>
              <StudentTryoutList />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            MATA PELAJARAN
            ADMIN + GURU
            ================================================= */}
        <Route
          path="/subjects"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "GURU"]}
            >
              <SubjectManagement />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            PENGATURAN (profil akun admin)
            Hanya ADMIN
            ================================================= */}
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            USER MANAGEMENT
            Hanya ADMIN
            ================================================= */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            RIWAYAT & HASIL TRYOUT
            Hanya SISWA
            ================================================= */}
        <Route
          path="/student/history"
          element={
            <ProtectedRoute allowedRoles={["SISWA"]}>
              <StudentHistory />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            DATA SISWA
            Hanya ADMIN
            ================================================= */}
        <Route
          path="/students"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <StudentManagement />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            DATA GURU
            Hanya ADMIN
            ================================================= */}
        <Route
          path="/teachers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <TeacherManagement />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            DASHBOARD
            Semua role yang sudah login boleh masuk
            ================================================= */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

      </Route>


      {/* =================================================
          ROOT
          ================================================= */}
      <Route
        path="/"
        element={
          <Navigate
            to={user ? "/dashboard" : "/login"}
            replace
          />
        }
      />


      {/* =================================================
          HALAMAN TIDAK DITEMUKAN
          ================================================= */}
      <Route
        path="*"
        element={
          <Navigate
            to={user ? "/dashboard" : "/login"}
            replace
          />
        }
      />

    </Routes>
  );
}


import { Toaster } from "react-hot-toast";

// =====================================================
// APP
// =====================================================
function App() {
  return (
    <BrowserRouter>

      <AuthProvider>

        <UIProvider>

          <Toaster 
            position="top-center" 
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
                fontSize: '14px',
                borderRadius: '8px',
                padding: '12px 16px',
              },
            }}
          />
          <AppRoutes />

        </UIProvider>

      </AuthProvider>

    </BrowserRouter>
  );
}


export default App;
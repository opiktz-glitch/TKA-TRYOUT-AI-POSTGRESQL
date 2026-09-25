
import { useAuth } from "../auth/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import TeacherDashboard from "../components/dashboard/TeacherDashboard";
import StudentDashboard from "../components/dashboard/StudentDashboard";
import "../components/ScoreTable.css";

function Dashboard() {
  const { user } = useAuth();
  const dashboardData = useDashboard();

  if (!user) {
    return (
      <div className="dashboard-card">
        <h2>Sesi tidak ditemukan. Silakan login ulang.</h2>
      </div>
    );
  }

  const roleLabels = {
    ADMIN: "Administrator",
    GURU: "Guru / Pengajar",
    SISWA: "Siswa",
  };

  const commonData = { ...dashboardData, user };

  return (
    <>
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Selamat Datang, {user.name}!</h1>
          <p className="subtitle">
            Anda login sebagai <strong>{roleLabels[user.role] || user.role}</strong>
          </p>
        </div>
      </div>

      {user.role === "ADMIN" && <AdminDashboard data={commonData} />}
      {user.role === "GURU" && <TeacherDashboard data={commonData} />}
      {user.role === "SISWA" && <StudentDashboard data={commonData} />}
    </>
  );
}

export default Dashboard;

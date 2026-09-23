import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useUI } from "../context/UIContext";
import { NavLink } from "react-router-dom";

import {
  IconHome,
  IconUsers,
  IconBook,
  IconNotebook,
  IconClipboard,
  IconGraduationCap,
  IconBarChart,
  IconTrendingUp,
  IconSettings,
  IconLogOut,
  IconTarget,
  IconUser,
  IconChevronDown,
} from "./Icons";


function Sidebar() {

  const {
    user,
    logout
  } = useAuth();

  const {
    mobileMenuOpen,
    closeMobileMenu,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useUI();


  const role = user?.role;


  // =====================================================
  // CLASS MENU
  // NavLink otomatis memberikan status aktif
  // berdasarkan URL yang sedang dibuka.
  // =====================================================
  const menuClass = ({ isActive }) =>
    `menu-item${isActive ? " active" : ""}`;


  // =====================================================
  // TOOLTIP MENGAMBANG (saat sidebar diciutkan)
  //
  // Tidak dibuat lewat CSS ::after murni -- ke-clip oleh
  // .sidebar-menu yang overflow-y:auto (lihat catatan di
  // App.css). Jadi posisinya dihitung di sini lalu dirender
  // sebagai satu elemen terpisah (position:fixed) sebagai anak
  // langsung <aside>, di luar .sidebar-menu yang meng-clip.
  //
  // label dibaca dari atribut data-tooltip yang ditaruh di tiap
  // NavLink/button di bawah -- SAMA persis dengan teks label
  // menu yang biasa tampil.
  // =====================================================

  const [tooltip, setTooltip] = useState(null);


  function handleTooltipEnter(event) {

    if (!sidebarCollapsed) {
      return;
    }

    const label = event.currentTarget.dataset.tooltip;

    if (!label) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      // Menempel pas di sebelah kanan item yang di-hover (bukan
      // angka tetap) -- supaya tetap presisi walau lebar sidebar
      // atau padding-nya suatu saat berubah.
      left: rect.right + 6,
    });
  }


  function handleTooltipLeave() {
    setTooltip(null);
  }


  return (
    <>

      {/* =================================================
          OVERLAY — cuma render saat drawer mobile terbuka.
          Tap di luar area sidebar (di bagian gelap ini) akan
          menutup menu, mirip pola drawer pada umumnya.
          ================================================= */}

      {mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={`sidebar${mobileMenuOpen ? " sidebar-mobile-open" : ""}`}
      >

      {/* =================================================
          TOGGLE COLLAPSE (desktop saja -- disembunyikan di
          mobile lewat CSS, karena di layar sempit sidebar
          sudah pakai mode drawer terpisah, bukan collapse-ke-
          ikon).
          ================================================= */}

      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={toggleSidebarCollapsed}
        title={sidebarCollapsed ? "Perluas menu" : "Ciutkan menu"}
      >
        <IconChevronDown size={14} />
      </button>


      {/* =================================================
          LOGO
          ================================================= */}

      <div className="sidebar-logo">

        <div className="logo-icon">
          T
        </div>

        <div className="logo-text">

          <div className="logo-title">
            TKA TRYOUT
          </div>

          <div className="logo-subtitle">
            Management System
          </div>

        </div>

      </div>


      {/* =================================================
          MENU
          ================================================= */}

      <nav
        className="sidebar-menu"
        onClick={closeMobileMenu}
      >


        {/* =================================================
            UTAMA
            ================================================= */}

        <div className="menu-section">
          UTAMA
        </div>


        {/* Dashboard */}

        <NavLink
          to="/dashboard"
          className={menuClass}
          data-tooltip="Dashboard"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >

          <span className="menu-icon">
            <IconHome />
          </span>

          <span>
            Dashboard
          </span>

        </NavLink>


        {/* =================================================
            ADMIN
            ================================================= */}

        {role === "ADMIN" && (

          <>


            <div className="menu-section">
              ADMINISTRASI
            </div>


            {/* Kelola User */}

            <NavLink
              to="/users"
              className={menuClass}
              data-tooltip="Kelola User"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconUsers />
              </span>

              <span>
                Kelola User
              </span>

            </NavLink>


            {/* Mata Pelajaran */}

            <NavLink
              to="/subjects"
              className={menuClass}
              data-tooltip="Mata Pelajaran"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconBook />
              </span>

              <span>
                Mata Pelajaran
              </span>

            </NavLink>


            {/* Bank Soal */}

            <NavLink
              to="/questions"
              className={menuClass}
              data-tooltip="Bank Soal"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconNotebook />
              </span>

              <span>
                Bank Soal
              </span>

            </NavLink>


            {/* Paket Tryout */}

            <NavLink
              to="/tryouts"
              className={menuClass}
              data-tooltip="Paket Tryout"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconClipboard />
              </span>

              <span>
                Paket Tryout
              </span>

            </NavLink>


            {/* Data Siswa */}

            <NavLink
              to="/students"
              className={menuClass}
              data-tooltip="Data Siswa"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconGraduationCap />
              </span>

              <span>
                Data Siswa
              </span>

            </NavLink>


            {/* Data Guru */}

            <NavLink
              to="/teachers"
              className={menuClass}
              data-tooltip="Data Guru"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconUser />
              </span>

              <span>
                Data Guru
              </span>

            </NavLink>


            {/* Nilai */}

            <NavLink
              to="/admin/scores"
              className={menuClass}
              data-tooltip="Nilai"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconBarChart />
              </span>

              <span>
                Nilai
              </span>

            </NavLink>


            {/* Laporan */}

            <NavLink
              to="/admin/reports"
              className={menuClass}
              data-tooltip="Laporan"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconTrendingUp />
              </span>

              <span>
                Laporan
              </span>

            </NavLink>


            {/* =================================================
                SISTEM
                ================================================= */}

            <div className="menu-section">
              SISTEM
            </div>


            {/* Pengaturan */}

            <NavLink
              to="/admin/settings"
              className={menuClass}
              data-tooltip="Pengaturan"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconSettings />
              </span>

              <span>
                Pengaturan
              </span>

            </NavLink>


          </>

        )}


        {/* =================================================
            GURU
            ================================================= */}

        {role === "GURU" && (

          <>


            <div className="menu-section">
              AKADEMIK
            </div>


            {/* Mata Pelajaran */}

            <NavLink
              to="/subjects"
              className={menuClass}
              data-tooltip="Mata Pelajaran"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconBook />
              </span>

              <span>
                Mata Pelajaran
              </span>

            </NavLink>


            {/* Bank Soal */}

            <NavLink
              to="/questions"
              className={menuClass}
              data-tooltip="Bank Soal"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconNotebook />
              </span>

              <span>
                Bank Soal
              </span>

            </NavLink>


            {/* Paket Tryout */}

            <NavLink
              to="/tryouts"
              className={menuClass}
              data-tooltip="Paket Tryout"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconClipboard />
              </span>

              <span>
                Paket Tryout
              </span>

            </NavLink>


            {/* Peserta */}

            <NavLink
              to="/teacher/students"
              className={menuClass}
              data-tooltip="Peserta"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconGraduationCap />
              </span>

              <span>
                Peserta
              </span>

            </NavLink>


            {/* Nilai */}

            <NavLink
              to="/teacher/scores"
              className={menuClass}
              data-tooltip="Nilai"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconBarChart />
              </span>

              <span>
                Nilai
              </span>

            </NavLink>


            {/* Laporan */}

            <NavLink
              to="/teacher/reports"
              className={menuClass}
              data-tooltip="Laporan"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconTrendingUp />
              </span>

              <span>
                Laporan
              </span>

            </NavLink>


            {/* =================================================
                AKUN
                ================================================= */}

            <div className="menu-section">
              AKUN
            </div>


            {/* Profil */}

            <NavLink
              to="/teacher/profile"
              className={menuClass}
              data-tooltip="Profil"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconUser />
              </span>

              <span>
                Profil
              </span>

            </NavLink>


          </>

        )}


        {/* =================================================
            SISWA
            ================================================= */}

        {role === "SISWA" && (

          <>


            <div className="menu-section">
              PEMBELAJARAN
            </div>


            {/* Daftar Tryout */}

            <NavLink
              to="/student/tryouts"
              className={menuClass}
              data-tooltip="Daftar Tryout"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >
              <span className="menu-icon">
                <IconClipboard size={19} />
              </span>
              <span>
                Daftar Tryout
              </span>
            </NavLink>
            
            
            {/* Tryout Saya */}

            <NavLink
              to="/student/my-tryouts"
              className={menuClass}
              data-tooltip="Tryout Saya"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconTarget />
              </span>

              <span>
                Tryout Saya
              </span>

            </NavLink>


            {/* Riwayat & Hasil Tryout */}

            <NavLink
              to="/student/history"
              className={menuClass}
              data-tooltip="Riwayat & Hasil"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconBarChart />
              </span>

              <span>
                Riwayat &amp; Hasil
              </span>

            </NavLink>


            {/* =================================================
                AKUN
                ================================================= */}

            <div className="menu-section">
              AKUN
            </div>


            {/* Profil */}

            <NavLink
              to="/student/profile"
              className={menuClass}
              data-tooltip="Profil"
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >

              <span className="menu-icon">
                <IconUser />
              </span>

              <span>
                Profil
              </span>

            </NavLink>


          </>

        )}

      </nav>


      {/* =================================================
          USER + LOGOUT
          ================================================= */}

      <div className="sidebar-bottom">


        <div className="sidebar-user">


          <div className="user-avatar">

            {user?.full_name
              ?.charAt(0)
              ?.toUpperCase()}

          </div>


          <div className="sidebar-user-info">

            <div className="sidebar-user-name">

              {user?.full_name}

            </div>


            <div className="sidebar-user-role">

              {user?.role}

            </div>

          </div>


        </div>


        {/* Logout */}

        <button
          className="sidebar-logout"
          data-tooltip="Logout"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          onClick={() => {
            closeMobileMenu();
            logout();
          }}
        >

          <span style={{ display: "flex" }}>
            <IconLogOut size={16} />
          </span>

          <span className="sidebar-logout-text">
            Logout
          </span>

        </button>


      </div>


      {/* Tooltip mengambang -- lihat catatan di handleTooltipEnter
          di atas kenapa ini dirender di sini (bukan lewat CSS
          ::after di tiap item). */}

      {sidebarCollapsed && tooltip && (
        <div
          className="sidebar-floating-tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.label}
        </div>
      )}


    </aside>

    </>
  );
}


export default Sidebar;

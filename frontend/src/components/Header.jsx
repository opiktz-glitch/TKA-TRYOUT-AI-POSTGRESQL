import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useUI } from "../context/UIContext";
import { IconMenu, IconBell, IconSearch } from "./Icons";
import { NAV_ITEMS } from "../navItems";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/api";


// =====================================================
// JUDUL PER HALAMAN (breadcrumb kecil di header)
//
// Diambil dari path URL aktif, cocokkan urutannya dengan rute di
// App.jsx. Sengaja ditampilkan kecil/halus (bukan h2 besar seperti
// versi sebelumnya) supaya tidak terasa dobel dengan judul besar
// yang sudah ada di body tiap halaman -- fungsinya di sini murni
// bantu orientasi, terutama saat sidebar di-collapse.
//
// Rute dengan parameter (mis. /student/attempt/:id) dicek pakai
// startsWith di getPageTitle(), bukan didaftarkan persis di sini.
// =====================================================

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/change-password": "Ubah Password",

  "/users": "Kelola User",
  "/students": "Data Siswa",
  "/teachers": "Data Guru",
  "/admin/scores": "Nilai",
  "/admin/reports": "Laporan",
  "/admin/settings": "Pengaturan",

  "/subjects": "Mata Pelajaran",
  "/questions": "Bank Soal",
  "/tryouts": "Paket Tryout",
  "/teacher/students": "Peserta",
  "/teacher/scores": "Nilai",
  "/teacher/reports": "Laporan",

  "/student/tryouts": "Daftar Tryout",
  "/student/history": "Riwayat & Hasil",
  "/student/profile": "Profil",
};


function getPageTitle(pathname) {

  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  // Rute dinamis (ada :attemptId, dst) -- dicek dari awal path-nya.
  if (pathname.startsWith("/student/attempt/")) {
    return "Mengerjakan Tryout";
  }

  // Rute yang belum terdaftar di atas -- tidak ditampilkan sama
  // sekali daripada menampilkan judul yang salah/asal tebak.
  return null;
}


function Header() {

  const {
    toggleMobileMenu
  } = useUI();

  const {
    user
  } = useAuth();

  const location = useLocation();

  const navigate = useNavigate();

  const pageTitle = getPageTitle(location.pathname);

  // =====================================================
  // QUICK-NAV SEARCH
  //
  // Cuma lompat ke halaman menu yang sudah ada di Sidebar (sesuai
  // role user yang login) -- TIDAK mencari data/isi database sama
  // sekali (bukan cari soal/siswa/dst).
  // =====================================================

  const [navQuery, setNavQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const navBoxRef = useRef(null);

  const navMatches = useMemo(() => {

    const query = navQuery.trim().toLowerCase();

    const itemsForRole = NAV_ITEMS.filter(
      item => !user?.role || item.roles.includes(user.role)
    );

    if (!query) {
      return itemsForRole;
    }

    return itemsForRole.filter(
      item => item.label.toLowerCase().includes(query)
    );

  }, [navQuery, user?.role]);

  function goToNavItem(path) {
    navigate(path);
    setNavQuery("");
    setNavOpen(false);
  }

  function handleNavKeyDown(event) {

    if (event.key === "Enter" && navMatches.length > 0) {
      goToNavItem(navMatches[0].path);
    }

    if (event.key === "Escape") {
      setNavOpen(false);
      event.currentTarget.blur();
    }
  }

  // Tutup dropdown kalau klik di luar kotak pencarian, tanpa perlu
  // ikut membungkus seluruh header dengan listener React terpisah.
  function handleNavBlur(event) {

    if (!navBoxRef.current?.contains(event.relatedTarget)) {
      setNavOpen(false);
    }
  }

  // =====================================================
  // NOTIFIKASI
  //
  // Polling sederhana (bukan websocket) -- cukup untuk kebutuhan
  // "yang gampang dulu": refresh tiap 30 detik + tiap kali dropdown
  // dibuka, supaya badge jumlah belum dibaca ikut update tanpa
  // reload halaman.
  // =====================================================

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifBoxRef = useRef(null);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  async function loadNotifications() {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("GET NOTIFICATIONS ERROR:", err);
    }
  }

  useEffect(() => {

    if (!user) {
      return;
    }

    loadNotifications();

    const intervalId = setInterval(loadNotifications, 30000);

    return () => clearInterval(intervalId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleNotificationClick(notification) {

    if (!notification.is_read) {

      // Optimis: update tampilan dulu supaya terasa instan, baru
      // beri tahu server. Kalau request-nya gagal, notifikasi
      // paling tetap kelihatan "sudah dibaca" sampai polling
      // berikutnya -- bukan masalah besar untuk fitur sesederhana
      // ini.
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );

      markNotificationRead(notification.id).catch(err =>
        console.error("MARK NOTIFICATION READ ERROR:", err)
      );
    }

    setNotifOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  }

  async function handleMarkAllRead() {

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("MARK ALL NOTIFICATIONS READ ERROR:", err);
    }
  }

  function handleNotifBlur(event) {

    if (!notifBoxRef.current?.contains(event.relatedTarget)) {
      setNotifOpen(false);
    }
  }

  function formatNotifTime(isoString) {

    const date = new Date(isoString);

    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }


  return (

    <header className="header">

      <div className="header-left">

        <button
          className="mobile-menu-button"
          onClick={toggleMobileMenu}
          aria-label="Buka menu"
        >
          <IconMenu size={20} />
        </button>

        {pageTitle && (
          <span className="header-breadcrumb">
            {pageTitle}
          </span>
        )}

      </div>


      <div
        className="header-nav-search"
        ref={navBoxRef}
        onBlur={handleNavBlur}
      >

        <IconSearch size={15} className="header-nav-search-icon" />

        <input
          type="text"
          placeholder="Cari menu..."
          value={navQuery}
          onChange={event => setNavQuery(event.target.value)}
          onFocus={() => setNavOpen(true)}
          onKeyDown={handleNavKeyDown}
        />

        {navOpen && (

          <div className="header-nav-dropdown">

            {navMatches.length === 0 && (
              <div className="header-nav-dropdown-empty">
                Menu tidak ditemukan.
              </div>
            )}

            {navMatches.map(item => (
              <button
                type="button"
                key={item.path}
                className="header-nav-dropdown-item"
                onClick={() => goToNavItem(item.path)}
              >
                {item.label}
              </button>
            ))}

          </div>

        )}

      </div>


      <div className="header-right">

        <div
          className="header-notif"
          ref={notifBoxRef}
          onBlur={handleNotifBlur}
        >

          <button
            type="button"
            className="notification-button"
            title="Notifikasi"
            onClick={() => {
              const willOpen = !notifOpen;
              setNotifOpen(willOpen);
              if (willOpen) {
                loadNotifications();
              }
            }}
          >
            <IconBell size={17} />

            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (

            <div className="header-notif-dropdown">

              <div className="header-notif-dropdown-header">
                <span>Notifikasi</span>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="header-notif-mark-all"
                    onClick={handleMarkAllRead}
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              {notifications.length === 0 && (
                <div className="header-notif-empty">
                  Belum ada notifikasi.
                </div>
              )}

              {notifications.map(notification => (
                <button
                  type="button"
                  key={notification.id}
                  className={
                    "header-notif-item" +
                    (notification.is_read ? "" : " header-notif-item-unread")
                  }
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="header-notif-item-title">
                    {notification.title}
                  </div>

                  {notification.message && (
                    <div className="header-notif-item-message">
                      {notification.message}
                    </div>
                  )}

                  <div className="header-notif-item-time">
                    {formatNotifTime(notification.created_at)}
                  </div>
                </button>
              ))}

            </div>

          )}

        </div>

      </div>

    </header>

  );

}


export default Header;

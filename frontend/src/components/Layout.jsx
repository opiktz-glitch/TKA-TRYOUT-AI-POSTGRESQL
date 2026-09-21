import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";


// =====================================================
// LAYOUT
//
// Sebelumnya, setiap halaman (Dashboard, AdminScores, dst) me-
// render <Sidebar/> dan <Header/> sendiri-sendiri di dalam
// komponennya masing-masing. Karena tiap route punya elemen
// halaman yang berbeda, React unmount total elemen lama lalu
// mount elemen baru setiap kali pindah URL -- termasuk Sidebar
// dan Header di dalamnya, walaupun isinya sebenarnya sama saja.
//
// Akibatnya, tiap pindah halaman:
// - Header mount dari nol -> useEffect notifikasi jalan ulang
//   -> 1 request getNotifications() tambahan tiap klik menu.
// - Sidebar ikut re-render total tanpa alasan (tidak ada
//   datanya yang berubah antar halaman).
//
// Fix: pakai NESTED ROUTE React Router. Layout ini didaftarkan
// SEKALI sebagai elemen route induk (lihat App.jsx), dan dia
// tetap ter-mount selama masih di dalam route bercabang ini --
// yang berubah cuma konten di dalam <Outlet/>, dipetakan ke
// komponen halaman sesuai route anak yang sedang aktif.
// Sidebar & Header jadi cuma mount sekali per sesi login.
// =====================================================

function Layout() {
  const { pathname } = useLocation();
  const contentRef = useRef(null);

  // Yang scroll di aplikasi ini adalah .content (overflow-y: auto),
  // bukan halaman. Dulu tiap pindah route .content ikut dibuat ulang
  // (karena Layout dirender per halaman), jadi otomatis mulai dari
  // atas. Sekarang Layout menetap, elemen .content yang SAMA dipakai
  // terus -- tanpa reset, posisi scroll halaman sebelumnya terbawa ke
  // halaman berikutnya. useLayoutEffect (bukan useEffect) supaya reset
  // terjadi sebelum browser menggambar, jadi tidak ada kedipan.
  // Dipicu pathname saja: ganti query string (?tryout=...) di halaman
  // yang sama sengaja TIDAK me-reset scroll.
  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content" ref={contentRef}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;

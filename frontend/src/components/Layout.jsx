import { Outlet } from "react-router-dom";

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
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;

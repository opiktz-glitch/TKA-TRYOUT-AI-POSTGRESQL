import { createContext, useContext, useEffect, useState } from "react";


// =====================================================
// UI CONTEXT
//
// State UI lintas-halaman yang perlu dibagi antara Header
// (tombol hamburger) dan Sidebar (drawer yang muncul/hilang),
// padahal keduanya di-render terpisah di tiap halaman (bukan
// lewat satu layout bersama) -- jadi tidak bisa cuma prop
// drilling biasa dari parent ke child.
//
// Sengaja dibuat context TERPISAH dari AuthContext karena ini
// murni soal tampilan (buka/tutup menu mobile), tidak ada
// hubungannya dengan sesi login sama sekali.
// =====================================================

const UIContext = createContext(null);

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";


export function UIProvider({ children }) {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }


  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }


  // =====================================================
  // SIDEBAR COLLAPSED (desktop) -- ciut jadi ikon saja.
  //
  // Beda konsep dari mobileMenuOpen di atas (itu drawer yang
  // muncul/hilang penuh di layar sempit). Ini murni preferensi
  // tampilan desktop, jadi disimpan ke localStorage supaya
  // pilihan user tetap kepilih walau reload/buka tab baru --
  // TIDAK ada hubungannya dengan data akun sama sekali, cuma
  // preferensi tampilan lokal di browser ini.
  //
  // Class "sidebar-collapsed" ditaruh di <body> (bukan di-props
  // ke tiap halaman satu-satu) karena Sidebar & .main-content
  // dirender terpisah di 20+ file halaman tanpa Layout bersama
  // -- lewat <body> class, App.css bisa nge-style keduanya
  // sekaligus tanpa perlu ubah satu pun file halaman.
  // =====================================================

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });


  useEffect(() => {

    document.body.classList.toggle(
      "sidebar-collapsed",
      sidebarCollapsed
    );

    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        sidebarCollapsed ? "1" : "0"
      );
    } catch {
      // localStorage bisa gagal (mis. mode private/incognito
      // ketat di beberapa browser) -- preferensi ini murni
      // kosmetik, jadi aman diabaikan kalau gagal disimpan.
    }

  }, [sidebarCollapsed]);


  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => !prev);
  }


  return (
    <UIContext.Provider
      value={{
        mobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
        sidebarCollapsed,
        toggleSidebarCollapsed,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}


export function useUI() {
  return useContext(UIContext);
}

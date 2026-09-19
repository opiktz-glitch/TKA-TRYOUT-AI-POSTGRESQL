import { createContext, useContext, useState } from "react";


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


export function UIProvider({ children }) {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }


  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }


  return (
    <UIContext.Provider
      value={{ mobileMenuOpen, toggleMobileMenu, closeMobileMenu }}
    >
      {children}
    </UIContext.Provider>
  );
}


export function useUI() {
  return useContext(UIContext);
}

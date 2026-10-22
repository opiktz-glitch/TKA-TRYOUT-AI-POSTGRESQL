import { useState, useMemo } from "react";
import {
  PANDUAN_SOAL_JUDUL,
  PANDUAN_SOAL_SUMBER,
  PANDUAN_KAIDAH_CBT,
  KURIKULUM_IPAS,
  KURIKULUM_MATEMATIKA,
  KURIKULUM_BAHASA_INDONESIA,
} from "../data/panduanSoal";
import "./PanduanSoalModal.css";

// =====================================================
// MODAL PANDUAN & KISI-KISI PENULISAN SOAL
// =====================================================
// Menggunakan TAB navigasi untuk:
// 1. Format & Kaidah CBT (Pilihan Ganda, PGK, True-False, HOTS)
// 2. IPAS / IPA (Makhluk Hidup, Zat, Energi, Bumi & Antariksa)
// 3. Matematika (Bilangan, Aljabar, Pengukuran, Geometri, Data)
// 4. Bahasa Indonesia (Menyimak, Membaca, Berbicara, Menulis)
// Dilengkapi pencarian topik & filter Fase (A, B, C)

const TABS = [
  { id: "cbt", label: "Format & Kaidah CBT", icon: "📋", badge: "Kaidah" },
  { id: "ipas", label: "IPAS (IPA)", icon: "🔬", badge: "4 Elemen" },
  { id: "matematika", label: "Matematika", icon: "📐", badge: "5 Elemen" },
  { id: "bahasa", label: "Bahasa Indonesia", icon: "📚", badge: "4 Elemen" },
];

const FASE_OPTIONS = [
  { value: "ALL", label: "Semua Fase" },
  { value: "Fase A", label: "Fase A (Kls 1-2)" },
  { value: "Fase B", label: "Fase B (Kls 3-4)" },
  { value: "Fase C", label: "Fase C (Kls 5-6)" },
];

function PanduanSoalModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("cbt");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFase, setSelectedFase] = useState("ALL");

  // Dapatkan dataset kurikulum sesuai tab aktif
  const currentKurikulum = useMemo(() => {
    switch (activeTab) {
      case "ipas":
        return KURIKULUM_IPAS;
      case "matematika":
        return KURIKULUM_MATEMATIKA;
      case "bahasa":
        return KURIKULUM_BAHASA_INDONESIA;
      default:
        return null;
    }
  }, [activeTab]);

  // Filter elemen dan topik berdasarkan kata kunci dan Fase
  const filteredElemenList = useMemo(() => {
    if (!currentKurikulum || !currentKurikulum.elemenList) return [];

    const query = searchQuery.trim().toLowerCase();

    return currentKurikulum.elemenList
      .map((elemen) => {
        const matchingTopics = elemen.topics.filter((topic) => {
          const matchFase =
            selectedFase === "ALL" || topic.fase === selectedFase;

          if (!matchFase) return false;
          if (!query) return true;

          const inSubTopik = topic.subTopik.toLowerCase().includes(query);
          const inIndikator = topic.indikator.toLowerCase().includes(query);
          const inFase = topic.fase.toLowerCase().includes(query);
          const inKelas = topic.kelas.toLowerCase().includes(query);
          const inElemen = elemen.namaElemen.toLowerCase().includes(query);

          return inSubTopik || inIndikator || inFase || inKelas || inElemen;
        });

        return {
          ...elemen,
          topics: matchingTopics,
        };
      })
      .filter((elemen) => elemen.topics.length > 0);
  }, [currentKurikulum, searchQuery, selectedFase]);

  // Total topik yang cocok
  const totalMatchingTopics = useMemo(() => {
    return filteredElemenList.reduce(
      (sum, el) => sum + el.topics.length,
      0
    );
  }, [filteredElemenList]);

  const getFaseBadgeClass = (fase) => {
    if (fase.includes("A")) return "panduan-badge-fase-a";
    if (fase.includes("B")) return "panduan-badge-fase-b";
    if (fase.includes("C")) return "panduan-badge-fase-c";
    return "";
  };

  return (
    <div
      className="modal-overlay panduan-soal-overlay"
      onClick={onClose}
    >
      <div
        className="modal panduan-soal-modal"
        style={{ width: "900px", maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="modal-header panduan-modal-header">
          <div>
            <h2>{PANDUAN_SOAL_JUDUL}</h2>
            <p>{PANDUAN_SOAL_SUMBER}</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Tutup Panduan"
          >
            ×
          </button>
        </div>

        {/* Tab Navigasi Horizontal */}
        <div className="panduan-tabs-bar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`panduan-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                  setSelectedFase("ALL");
                }}
              >
                <span className="panduan-tab-icon">{tab.icon}</span>
                <span className="panduan-tab-text">{tab.label}</span>
                {tab.badge && (
                  <span className="panduan-tab-badge">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="panduan-soal-body">
          {/* TAB 1: KAIDAH & FORMAT SOAL CBT */}
          {activeTab === "cbt" && (
            <div className="panduan-cbt-container">
              <div className="panduan-subject-intro">
                <h3>{PANDUAN_KAIDAH_CBT.title}</h3>
                <p>{PANDUAN_KAIDAH_CBT.subtitle}</p>
              </div>

              {PANDUAN_KAIDAH_CBT.sections.map((sec, sIdx) => (
                <div key={sIdx} className="panduan-cbt-card">
                  <h4 className="panduan-cbt-card-title">{sec.title}</h4>
                  <div className="panduan-cbt-grid">
                    {sec.items.map((item, iIdx) => (
                      <div key={iIdx} className="panduan-cbt-item">
                        <div className="panduan-cbt-item-label">
                          {item.label}
                        </div>
                        <div className="panduan-cbt-item-text">
                          {item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2, 3, 4: MAPEL KURIKULUM MERDEKA */}
          {activeTab !== "cbt" && currentKurikulum && (
            <div className="panduan-kurikulum-container">
              {/* Header Mapel & Penjelasan Fokus */}
              <div className="panduan-subject-intro">
                <div className="panduan-subject-title-row">
                  <h3>{currentKurikulum.subject}</h3>
                  <span className="panduan-topic-count">
                    {totalMatchingTopics} Pokok Bahasan Terdaftar
                  </span>
                </div>
                <p>{currentKurikulum.fokus}</p>
              </div>

              {/* Filter Toolbar: Search & Fase Selector */}
              <div className="panduan-filter-toolbar">
                <div className="panduan-search-box">
                  <span className="panduan-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Cari sub-topik, materi, atau kata kunci indikator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="panduan-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="panduan-clear-search"
                      onClick={() => setSearchQuery("")}
                      title="Hapus pencarian"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="panduan-fase-filters">
                  {FASE_OPTIONS.map((fase) => (
                    <button
                      key={fase.value}
                      type="button"
                      className={`panduan-fase-btn ${
                        selectedFase === fase.value ? "active" : ""
                      }`}
                      onClick={() => setSelectedFase(fase.value)}
                    >
                      {fase.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daftar Elemen & Topik */}
              {filteredElemenList.length === 0 ? (
                <div className="panduan-empty-state">
                  <div className="panduan-empty-icon">🔎</div>
                  <p>Tidak ada materi atau sub-topik yang cocok dengan filter.</p>
                  <button
                    type="button"
                    className="panduan-reset-filter-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedFase("ALL");
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="panduan-elemen-list">
                  {filteredElemenList.map((elemen, eIdx) => (
                    <div key={eIdx} className="panduan-elemen-card">
                      <div className="panduan-elemen-header">
                        <div className="panduan-elemen-title-group">
                          <h4 className="panduan-elemen-title">
                            {elemen.namaElemen}
                          </h4>
                          <span className="panduan-elemen-badge">
                            {elemen.topics.length} Sub-Topik
                          </span>
                        </div>
                        <p className="panduan-elemen-desc">
                          {elemen.deskripsi}
                        </p>
                      </div>

                      {/* Tabel Sub-Topik & Indikator */}
                      <div className="panduan-topics-table-wrapper">
                        <table className="panduan-topics-table">
                          <thead>
                            <tr>
                              <th style={{ width: "120px" }}>Fase / Jenjang</th>
                              <th style={{ width: "230px" }}>Sub-Topik Materi</th>
                              <th>Pokok Bahasan & Indikator Soal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {elemen.topics.map((topic, tIdx) => (
                              <tr key={tIdx}>
                                <td>
                                  <div className="panduan-fase-cell">
                                    <span
                                      className={`panduan-fase-badge ${getFaseBadgeClass(
                                        topic.fase
                                      )}`}
                                    >
                                      {topic.fase}
                                    </span>
                                    <span className="panduan-kelas-text">
                                      {topic.kelas}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div className="panduan-subtopik-title">
                                    {topic.subTopik}
                                  </div>
                                </td>
                                <td>
                                  <div className="panduan-indikator-text">
                                    {topic.indikator}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="modal-footer panduan-modal-footer">
          <div className="panduan-footer-note">
            💡 <em>Gunakan rincian indikator & fase di atas sebagai referensi pembuatan stimulus & level kognitif soal.</em>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}

export default PanduanSoalModal;

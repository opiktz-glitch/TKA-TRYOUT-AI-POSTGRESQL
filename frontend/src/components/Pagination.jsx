import "./Pagination.css";

// =====================================================
// PAGINATION (dipakai ScoreTable, Bank Soal, Paket Tryout)
//
// Menggantikan 3 implementasi copy-paste yang sebelumnya
// tersebar (ScoreTable.jsx, QuestionManagement.jsx,
// TryoutManagement.jsx) -- logic nomor halaman + ellipsis,
// teks "Menampilkan X-Y dari Z", dan tombol Sebelumnya/
// Berikutnya sekarang cuma ada di satu tempat.
//
// Komponen ini TIDAK menyimpan state halaman aktif sendiri
// (biar parent bebas reset ke halaman 1 saat filter berubah,
// dsb) dan TIDAK memotong array data -- itu tetap tanggung
// jawab halaman pemakainya, komponen ini cuma menampilkan.
//
// Props:
//   currentPage   halaman aktif (1-based), sudah di-clamp oleh parent
//   totalPages    total halaman (parent yang hitung, karena parent
//                 juga butuh angka ini untuk slice() datanya)
//   totalItems    total baris/item (untuk teks "Menampilkan X-Y dari Z")
//   pageSize      jumlah item per halaman
//   itemLabel     kata benda untuk teks ringkasan, mis. "soal",
//                 "tryout", "hasil" (default: "data")
//   onPageChange  dipanggil dengan nomor halaman baru
//
// Tidak render apa-apa kalau totalItems 0 (sama seperti perilaku
// asal di ketiga halaman sebelumnya).
// =====================================================

// Halaman pertama, terakhir, dan yang di sekitar halaman aktif;
// sisanya diringkas jadi "…" supaya barisnya tidak melebar.
function buildPageItems(current, total) {
  const pages = [];

  for (let page = 1; page <= total; page += 1) {
    if (total <= 7 || page === 1 || page === total || Math.abs(page - current) <= 1) {
      pages.push(page);
    }
  }

  const items = [];

  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      items.push(`gap-${page}`);
    }

    items.push(page);
  });

  return items;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "data",
  onPageChange,
}) {
  if (!totalItems) {
    return null;
  }

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  return (
    <div className="pg-bar">
      <span className="pg-summary">
        Menampilkan {start + 1}–{end} dari {totalItems} {itemLabel}
      </span>

      <div className="pg-controls">
        <button
          type="button"
          className="pg-btn"
          aria-label="Halaman sebelumnya"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          ‹
        </button>

        {buildPageItems(currentPage, totalPages).map((item) =>
          typeof item === "string" ? (
            <span key={item} className="pg-gap">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`pg-btn${item === currentPage ? " is-active" : ""}`}
              aria-current={item === currentPage ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className="pg-btn"
          aria-label="Halaman berikutnya"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default Pagination;

import { useEffect, useMemo, useRef, useState } from "react";

import QuestionImage from "./QuestionImage";
import { IconSearch, IconChevronDown } from "./Icons";
import "./TryoutWizard.css";
import {
  getAvailableQuestions,
  getRandomAvailableQuestions,
  getQuestion,
} from "../services/api";

// =========================================================
// PEMILIH SOAL UNTUK FORM TAMBAH / EDIT PAKET TRYOUT
//
// Dua panel: bank soal (kiri, dipaginasi & dicari di server) dan
// soal terpilih (kanan, bisa diurutkan dengan drag & drop).
//
// Komponen ini TIDAK memegang daftar soal terpilih sendiri —
// daftarnya milik form induk (TryoutManagement.jsx) dan dikirim
// lewat props `selected`; setiap perubahan dikembalikan lewat
// `onChange(daftarBaru)` dengan nomor soal sudah diurutkan ulang.
//
// Bentuk satu item di `selected`:
//   { question_id, question_number, points,
//     question_text, difficulty, has_image, is_active }
// (question_text dst. adalah snapshot supaya soal terpilih tetap
//  bisa ditampilkan walaupun tidak ada di halaman bank yang
//  sedang dibuka.)
// =========================================================

const DIFFICULTIES = [
  { value: "EASY", label: "Mudah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HARD", label: "Sulit" },
];

const PAGE_SIZES = [25, 50, 100];

const SEARCH_DEBOUNCE_MS = 350;

const RANDOM_MAX_PER_DIFFICULTY = 500;

function getDifficultyLabel(value) {
  const item = DIFFICULTIES.find((difficulty) => difficulty.value === value);

  return item ? item.label : value || "-";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

function renumber(list) {
  return list.map((item, index) => ({
    ...item,
    question_number: index + 1,
  }));
}

function toSelectedItem(question, position) {
  return {
    question_id: Number(question.id),
    question_number: position,
    points: 1,
    question_text: question.question_text || "",
    difficulty: question.difficulty || "",
    has_image: Boolean(question.has_image),
    is_active: true,
  };
}

function toCount(value) {
  const parsed = parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.min(parsed, RANDOM_MAX_PER_DIFFICULTY);
}

// Halaman pertama, terakhir, dan yang di sekitar halaman aktif;
// sisanya diringkas jadi "…" supaya baris nomor halaman tidak
// melebar untuk bank yang punya puluhan halaman.
function buildPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = [1, total, current - 1, current, current + 1]
    .filter((page) => page >= 1 && page <= total)
    .filter((page, index, all) => all.indexOf(page) === index)
    .sort((a, b) => a - b);

  const result = [];

  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      result.push(`gap-${page}`);
    }

    result.push(page);
  });

  return result;
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true">
      <circle cx="3" cy="3" r="1.3" fill="currentColor" />
      <circle cx="9" cy="3" r="1.3" fill="currentColor" />
      <circle cx="3" cy="8" r="1.3" fill="currentColor" />
      <circle cx="9" cy="8" r="1.3" fill="currentColor" />
      <circle cx="3" cy="13" r="1.3" fill="currentColor" />
      <circle cx="9" cy="13" r="1.3" fill="currentColor" />
    </svg>
  );
}

function TryoutQuestionPicker({
  subjectId,
  selected,
  onChange,
  active = true,
  disabled = false,
  defaultScope = "all",
}) {
  // =====================================================
  // FILTER & DATA BANK SOAL
  // =====================================================

  const [searchInput, setSearchInput] = useState("");

  const [query, setQuery] = useState({
    difficulty: "",
    scope: defaultScope,
    search: "",
    page: 1,
    pageSize: 25,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const requestSeq = useRef(0);

  // =====================================================
  // SOAL TERPILIH, DRAG & DROP, EXPAND, PILIH ACAK
  // =====================================================

  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const lastClickedIndex = useRef(null);
  const dragIndex = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});

  const [showRandom, setShowRandom] = useState(false);
  const [randomCounts, setRandomCounts] = useState({
    easy: "",
    medium: "",
    hard: "",
  });
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState("");
  const [randomMessage, setRandomMessage] = useState("");

  const items = data ? data.items : [];

  const selectedIds = useMemo(
    () => new Set(selected.map((item) => Number(item.question_id))),
    [selected]
  );

  // =====================================================
  // AMBIL BANK SOAL (hanya saat langkah "Pilih soal" aktif)
  // =====================================================

  useEffect(() => {
    if (!active || !subjectId) {
      return;
    }

    const seq = ++requestSeq.current;

    setLoading(true);
    setLoadError("");

    getAvailableQuestions(subjectId, {
      difficulty: query.difficulty,
      scope: query.scope,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    })
      .then((response) => {
        if (seq === requestSeq.current) {
          setData(response);
        }
      })
      .catch((err) => {
        console.error("LOAD BANK SOAL ERROR:", err);

        if (seq === requestSeq.current) {
          setLoadError(err.message || "Gagal mengambil bank soal");
        }
      })
      .finally(() => {
        if (seq === requestSeq.current) {
          setLoading(false);
        }
      });
  }, [active, subjectId, query, reloadKey]);

  // Pencarian ditunda sebentar supaya tidak menembak server di
  // setiap ketikan.
  useEffect(() => {
    const timer = setTimeout(() => {
      const keyword = searchInput.trim();

      setQuery((prev) =>
        prev.search === keyword ? prev : { ...prev, search: keyword, page: 1 }
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Halaman/daftar berganti -> titik awal shift-klik tidak berlaku lagi.
  useEffect(() => {
    lastClickedIndex.current = null;
  }, [data]);

  // =====================================================
  // HANDLER FILTER
  // =====================================================

  function changeDifficulty(value) {
    setQuery((prev) => ({
      ...prev,
      difficulty: prev.difficulty === value ? "" : value,
      page: 1,
    }));
  }

  function changeScope(value) {
    setQuery((prev) =>
      prev.scope === value ? prev : { ...prev, scope: value, page: 1 }
    );
  }

  function changePageSize(value) {
    setQuery((prev) => ({ ...prev, pageSize: Number(value), page: 1 }));
  }

  function goToPage(page) {
    setQuery((prev) => ({ ...prev, page }));
  }

  function resetFilters() {
    setSearchInput("");
    setQuery((prev) => ({ ...prev, search: "", difficulty: "", page: 1 }));
  }

  function commitSearchNow() {
    const keyword = searchInput.trim();

    setQuery((prev) =>
      prev.search === keyword ? prev : { ...prev, search: keyword, page: 1 }
    );
  }

  // =====================================================
  // PILIH / BATAL PILIH SOAL
  // =====================================================

  // Menambah soal ke daftar terpilih; yang sudah terpilih dilewati.
  // Membaca selectedRef (bukan `selected`) supaya tetap benar
  // walaupun dipanggil setelah await (pilih acak).
  function addQuestions(questions) {
    const current = selectedRef.current;
    const existing = new Set(current.map((item) => Number(item.question_id)));
    const next = [...current];
    let added = 0;

    for (const question of questions) {
      if (existing.has(Number(question.id))) {
        continue;
      }

      existing.add(Number(question.id));
      next.push(toSelectedItem(question, next.length + 1));
      added += 1;
    }

    if (added > 0) {
      onChange(next);
    }

    return added;
  }

  function removeQuestions(ids) {
    const removing = new Set(ids.map(Number));

    onChange(
      renumber(
        selectedRef.current.filter(
          (item) => !removing.has(Number(item.question_id))
        )
      )
    );
  }

  // Shift + klik pada kotak centang memilih / membatalkan satu rentang
  // di halaman yang sedang dibuka.
  function handleToggle(question, index, shiftKey) {
    const isSelected = selectedIds.has(Number(question.id));

    if (
      shiftKey &&
      lastClickedIndex.current !== null &&
      items[lastClickedIndex.current]
    ) {
      const from = Math.min(lastClickedIndex.current, index);
      const to = Math.max(lastClickedIndex.current, index);
      const range = items.slice(from, to + 1);

      if (isSelected) {
        removeQuestions(range.map((item) => item.id));
      } else {
        addQuestions(range);
      }
    } else if (isSelected) {
      removeQuestions([question.id]);
    } else {
      addQuestions([question]);
    }

    lastClickedIndex.current = index;
  }

  const allOnPageSelected =
    items.length > 0 &&
    items.every((question) => selectedIds.has(Number(question.id)));

  function toggleAllOnPage() {
    if (allOnPageSelected) {
      removeQuestions(items.map((question) => question.id));
    } else {
      addQuestions(items);
    }
  }

  // =====================================================
  // PANEL SOAL TERPILIH: bobot, urutan, hapus
  // =====================================================

  function updatePoints(questionId, value) {
    onChange(
      selectedRef.current.map((item) =>
        Number(item.question_id) === Number(questionId)
          ? { ...item, points: value }
          : item
      )
    );
  }

  function moveItem(from, to) {
    const current = selectedRef.current;

    if (from === to || from < 0 || to < 0 || to >= current.length) {
      return;
    }

    const next = [...current];
    const [moved] = next.splice(from, 1);

    next.splice(to, 0, moved);

    onChange(renumber(next));
  }

  function clearSelected() {
    if (selectedRef.current.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Kosongkan ${selectedRef.current.length} soal yang sudah dipilih?`
    );

    if (confirmed) {
      onChange([]);
    }
  }

  function handleDragStart(event, index) {
    dragIndex.current = index;

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    const row = event.currentTarget.closest(".tqp-sel-row");

    if (row) {
      event.dataTransfer.setDragImage(row, 12, 12);
    }
  }

  function handleDragOver(event, index) {
    if (dragIndex.current === null) {
      return;
    }

    event.preventDefault();

    if (dropIndex !== index) {
      setDropIndex(index);
    }
  }

  function handleDrop(event, index) {
    event.preventDefault();

    const from = dragIndex.current;

    dragIndex.current = null;
    setDropIndex(null);

    if (from !== null) {
      moveItem(from, index);
    }
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDropIndex(null);
  }

  // =====================================================
  // LIHAT ISI LENGKAP + OPSI JAWABAN (expand baris)
  // =====================================================

  async function toggleExpand(questionId) {
    if (expandedId === questionId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(questionId);

    const cached = details[questionId];

    if (cached && (cached.status === "ok" || cached.status === "loading")) {
      return;
    }

    setDetails((prev) => ({ ...prev, [questionId]: { status: "loading" } }));

    try {
      const detail = await getQuestion(questionId);

      setDetails((prev) => ({
        ...prev,
        [questionId]: { status: "ok", data: detail },
      }));
    } catch (err) {
      console.error("LOAD QUESTION DETAIL ERROR:", err);

      setDetails((prev) => ({
        ...prev,
        [questionId]: {
          status: "error",
          error: err.message || "Gagal memuat soal",
        },
      }));
    }
  }

  // =====================================================
  // PILIH ACAK
  // =====================================================

  function handleRandomCountChange(name, value) {
    setRandomCounts((prev) => ({ ...prev, [name]: value }));
    setRandomError("");
  }

  async function handleRandomPick() {
    const easy = toCount(randomCounts.easy);
    const medium = toCount(randomCounts.medium);
    const hard = toCount(randomCounts.hard);

    setRandomError("");
    setRandomMessage("");

    if (easy + medium + hard === 0) {
      setRandomError("Isi jumlah soal untuk minimal satu tingkat kesulitan.");
      return;
    }

    try {
      setRandomLoading(true);

      const response = await getRandomAvailableQuestions({
        subjectId,
        scope: query.scope,
        search: query.search,
        excludeIds: selectedRef.current.map((item) =>
          Number(item.question_id)
        ),
        easy,
        medium,
        hard,
      });

      const added = addQuestions(response.items || []);

      const shortages = DIFFICULTIES.filter((difficulty) => {
        const requested = response.requested?.[difficulty.value] || 0;
        const picked = response.picked?.[difficulty.value] || 0;

        return picked < requested;
      }).map((difficulty) => {
        const requested = response.requested[difficulty.value];
        const picked = response.picked[difficulty.value];

        return `${difficulty.label}: hanya ${picked} dari ${requested}`;
      });

      setRandomMessage(
        `${added} soal ditambahkan.` +
          (shortages.length > 0
            ? ` Soal yang tersedia kurang — ${shortages.join(", ")}.`
            : "")
      );
    } catch (err) {
      console.error("RANDOM PICK ERROR:", err);
      setRandomError(err.message || "Gagal mengambil soal acak");
    } finally {
      setRandomLoading(false);
    }
  }

  // =====================================================
  // TURUNAN UNTUK TAMPILAN
  // =====================================================

  const counts = data?.difficulty_counts || {};

  const totalAllDifficulties = DIFFICULTIES.reduce(
    (sum, difficulty) => sum + (counts[difficulty.value] || 0),
    0
  );

  const totalPoints =
    Math.round(
      selected.reduce((sum, item) => sum + Number(item.points || 0), 0) * 100
    ) / 100;

  const selectedBreakdown = DIFFICULTIES.map((difficulty) => ({
    ...difficulty,
    count: selected.filter((item) => item.difficulty === difficulty.value)
      .length,
  }));

  const hasActiveFilter = Boolean(query.search || query.difficulty);

  const firstShown = data && data.total > 0
    ? (data.page - 1) * data.page_size + 1
    : 0;

  const lastShown = data
    ? Math.min(data.page * data.page_size, data.total)
    : 0;

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="tqp"
      onKeyDown={(event) => {
        // Enter di kolom input mana pun di sini tidak boleh ikut
        // "mengirim" form modal.
        if (event.key === "Enter" && event.target.tagName === "INPUT") {
          event.preventDefault();
        }
      }}
    >
      {/* ---------------- TOOLBAR ---------------- */}

      <div className="tqp-toolbar">
        <div className="tqp-search">
          <IconSearch size={16} />
          <input
            type="text"
            value={searchInput}
            placeholder="Cari isi soal atau ID (contoh: #1048)"
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitSearchNow();
              }
            }}
            disabled={disabled}
          />
        </div>

        <div className="tqp-segmented" role="group" aria-label="Cakupan soal">
          <button
            type="button"
            className={query.scope === "all" ? "is-active" : ""}
            onClick={() => changeScope("all")}
            disabled={disabled}
          >
            Semua soal
          </button>
          <button
            type="button"
            className={query.scope === "mine" ? "is-active" : ""}
            onClick={() => changeScope("mine")}
            disabled={disabled}
          >
            Soal saya
          </button>
        </div>

        <div className="tqp-chips">
          <button
            type="button"
            className={`tqp-chip${query.difficulty === "" ? " is-active" : ""}`}
            onClick={() => changeDifficulty("")}
            disabled={disabled}
          >
            Semua{data ? ` (${formatNumber(totalAllDifficulties)})` : ""}
          </button>

          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty.value}
              type="button"
              className={`tqp-chip${
                query.difficulty === difficulty.value ? " is-active" : ""
              }`}
              onClick={() => changeDifficulty(difficulty.value)}
              disabled={disabled}
            >
              {difficulty.label}
              {data ? ` (${formatNumber(counts[difficulty.value])})` : ""}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`tqp-random-btn${showRandom ? " is-active" : ""}`}
          onClick={() => setShowRandom((prev) => !prev)}
          disabled={disabled}
        >
          Pilih acak
        </button>
      </div>

      {/* ---------------- PILIH ACAK ---------------- */}

      {showRandom && (
        <div className="tqp-random">
          <div className="tqp-random-title">
            <strong>Pilih soal acak</strong>
            <span>
              Memakai cakupan &amp; pencarian yang sedang aktif. Soal yang
              sudah dipilih dilewati.
            </span>
          </div>

          <div className="tqp-random-fields">
            {DIFFICULTIES.map((difficulty) => {
              const name = difficulty.value.toLowerCase();

              return (
                <label key={difficulty.value}>
                  <span>
                    {difficulty.label}
                    {data ? ` · tersedia ${formatNumber(counts[difficulty.value])}` : ""}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={RANDOM_MAX_PER_DIFFICULTY}
                    placeholder="0"
                    value={randomCounts[name]}
                    onChange={(event) =>
                      handleRandomCountChange(name, event.target.value)
                    }
                    disabled={disabled || randomLoading}
                  />
                </label>
              );
            })}

            <button
              type="button"
              className="primary-button tqp-random-submit"
              onClick={handleRandomPick}
              disabled={disabled || randomLoading}
            >
              {randomLoading ? "Mengambil..." : "Ambil soal"}
            </button>
          </div>

          {randomError && (
            <div className="form-error-message tqp-random-note">
              {randomError}
            </div>
          )}

          {randomMessage && !randomError && (
            <div className="success-message tqp-random-note">
              {randomMessage}
            </div>
          )}
        </div>
      )}

      {/* ---------------- DUA PANEL ---------------- */}

      <div className="tqp-panes">
        {/* ===== KIRI: BANK SOAL ===== */}

        <section className="tqp-pane">
          <div className="tqp-pane-head">
            <span>
              Bank soal
              {data ? ` · ${formatNumber(data.total)} soal` : ""}
            </span>

            <button
              type="button"
              className="tqp-link"
              onClick={toggleAllOnPage}
              disabled={disabled || items.length === 0}
            >
              {allOnPageSelected
                ? "Batalkan pilihan di halaman ini"
                : "Pilih semua di halaman ini"}
            </button>
          </div>

          <div className={`tqp-list${loading && data ? " is-loading" : ""}`}>
            {loadError && (
              <div className="tqp-empty">
                <div className="form-error-message" style={{ marginBottom: 10 }}>
                  {loadError}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setReloadKey((prev) => prev + 1)}
                >
                  Coba lagi
                </button>
              </div>
            )}

            {!loadError && !data && (
              <div className="tqp-empty">Memuat bank soal...</div>
            )}

            {!loadError && data && data.total === 0 && (
              <div className="tqp-empty">
                {hasActiveFilter ? (
                  <>
                    <p>Tidak ada soal yang cocok dengan pencarian atau filter.</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetFilters}
                    >
                      Reset pencarian &amp; filter
                    </button>
                  </>
                ) : query.scope === "mine" ? (
                  <>
                    <p>
                      Belum ada soal aktif buatan Anda di mata pelajaran ini.
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => changeScope("all")}
                    >
                      Tampilkan semua soal
                    </button>
                  </>
                ) : (
                  <p>Tidak ada soal aktif untuk mata pelajaran tersebut.</p>
                )}
              </div>
            )}

            {!loadError &&
              items.map((question, index) => {
                const isSelected = selectedIds.has(Number(question.id));
                const isOpen = expandedId === question.id;
                const detail = details[question.id];

                return (
                  <div
                    key={question.id}
                    className={`tqp-row${isSelected ? " is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) =>
                        handleToggle(
                          question,
                          index,
                          Boolean(event.nativeEvent.shiftKey)
                        )
                      }
                      disabled={disabled}
                      aria-label={`Pilih soal #${question.id}`}
                    />

                    <div className="tqp-row-main">
                      <div className="tqp-row-meta">
                        <strong>#{question.id}</strong>

                        <span
                          className={`difficulty-badge tqp-badge ${(
                            question.difficulty || ""
                          ).toLowerCase()}`}
                        >
                          {getDifficultyLabel(question.difficulty)}
                        </span>

                        {question.has_image && (
                          <span className="tqp-tag">Gambar</span>
                        )}

                        {query.scope === "all" &&
                          (question.is_mine ? (
                            <span className="tqp-tag tqp-tag-mine">Saya</span>
                          ) : (
                            question.created_by_name && (
                              <span className="tqp-creator">
                                oleh {question.created_by_name}
                              </span>
                            )
                          ))}
                      </div>

                      <div
                        className={`tqp-text${isOpen ? " is-open" : ""}`}
                        onClick={() => toggleExpand(question.id)}
                        title="Klik untuk melihat isi lengkap"
                      >
                        {question.question_text}
                      </div>

                      {isOpen && (
                        <div className="tqp-detail">
                          {(!detail || detail.status === "loading") && (
                            <span>Memuat soal...</span>
                          )}

                          {detail?.status === "error" && (
                            <span className="tqp-detail-error">
                              {detail.error}
                            </span>
                          )}

                          {detail?.status === "ok" && (
                            <>
                              <div className="tqp-detail-text">
                                {detail.data.question_text}
                              </div>

                              {detail.data.has_image && (
                                <QuestionImage
                                  questionId={detail.data.id}
                                  className="tqp-detail-image"
                                />
                              )}

                              <ul className="tqp-options">
                                {(detail.data.options || []).map((option) => (
                                  <li
                                    key={option.id || option.option_code}
                                    className={
                                      option.is_correct ? "is-correct" : ""
                                    }
                                  >
                                    <span>{option.option_code}.</span>
                                    <span>
                                      {option.option_text}
                                      {option.is_correct ? "  ✓ kunci" : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`tqp-expand${isOpen ? " is-open" : ""}`}
                      onClick={() => toggleExpand(question.id)}
                      aria-label={
                        isOpen ? "Tutup isi soal" : "Lihat isi lengkap soal"
                      }
                    >
                      <IconChevronDown size={16} />
                    </button>
                  </div>
                );
              })}
          </div>

          {data && data.total > 0 && (
            <div className="tqp-pager">
              <span>
                {formatNumber(firstShown)}–{formatNumber(lastShown)} dari{" "}
                {formatNumber(data.total)}
              </span>

              <div className="tqp-pager-controls">
                <button
                  type="button"
                  className="tqp-page"
                  onClick={() => goToPage(data.page - 1)}
                  disabled={data.page <= 1}
                  aria-label="Halaman sebelumnya"
                >
                  ‹
                </button>

                {buildPageList(data.page, data.total_pages).map((item) =>
                  typeof item === "string" ? (
                    <span key={item} className="tqp-gap">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`tqp-page${
                        item === data.page ? " is-active" : ""
                      }`}
                      onClick={() => goToPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="tqp-page"
                  onClick={() => goToPage(data.page + 1)}
                  disabled={data.page >= data.total_pages}
                  aria-label="Halaman berikutnya"
                >
                  ›
                </button>

                <select
                  className="tqp-page-size"
                  value={query.pageSize}
                  onChange={(event) => changePageSize(event.target.value)}
                  aria-label="Jumlah soal per halaman"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} / hal
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* ===== KANAN: SOAL TERPILIH ===== */}

        <section className="tqp-pane">
          <div className="tqp-pane-head">
            <span>Terpilih · {formatNumber(selected.length)} soal</span>

            <button
              type="button"
              className="tqp-link tqp-link-danger"
              onClick={clearSelected}
              disabled={disabled || selected.length === 0}
            >
              Kosongkan
            </button>
          </div>

          {selected.length > 0 && (
            <div className="tqp-breakdown">
              {selectedBreakdown.map((item) => (
                <span key={item.value}>
                  {item.label} {item.count}
                </span>
              ))}
              <span className="tqp-breakdown-total">
                Total bobot {totalPoints}
              </span>
            </div>
          )}

          <div className="tqp-list">
            {selected.length === 0 && (
              <div className="tqp-empty">
                Belum ada soal dipilih. Centang soal di daftar kiri atau pakai
                “Pilih acak”.
              </div>
            )}

            {selected.map((item, index) => (
              <div
                key={item.question_id}
                className={`tqp-sel-row${
                  dropIndex === index ? " is-drop-target" : ""
                }`}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
              >
                <span
                  className="tqp-grip"
                  draggable={!disabled}
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragEnd={handleDragEnd}
                  title="Tarik untuk mengubah urutan"
                >
                  <GripIcon />
                </span>

                <strong className="tqp-sel-number">
                  {item.question_number}
                </strong>

                <div className="tqp-sel-main">
                  <div className="tqp-sel-meta">
                    <span>#{item.question_id}</span>

                    {item.difficulty && (
                      <span
                        className={`difficulty-badge tqp-badge ${item.difficulty.toLowerCase()}`}
                      >
                        {getDifficultyLabel(item.difficulty)}
                      </span>
                    )}

                    {item.is_active === false && (
                      <span
                        className="tqp-tag tqp-tag-warn"
                        title="Soal ini nonaktif dan akan ditolak saat disimpan. Hapus dari daftar."
                      >
                        Nonaktif
                      </span>
                    )}
                  </div>

                  <div className="tqp-sel-text" title={item.question_text}>
                    {item.question_text || `Soal ID ${item.question_id}`}
                  </div>
                </div>

                <input
                  type="number"
                  className="tqp-points"
                  min="0.01"
                  step="0.01"
                  value={item.points}
                  onChange={(event) =>
                    updatePoints(item.question_id, event.target.value)
                  }
                  disabled={disabled}
                  aria-label={`Bobot soal nomor ${item.question_number}`}
                  title="Bobot"
                />

                <div className="tqp-sel-actions">
                  <button
                    type="button"
                    className="tqp-icon-btn"
                    onClick={() => moveItem(index, index - 1)}
                    disabled={disabled || index === 0}
                    title="Naik"
                    aria-label="Naikkan urutan"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="tqp-icon-btn"
                    onClick={() => moveItem(index, index + 1)}
                    disabled={disabled || index === selected.length - 1}
                    title="Turun"
                    aria-label="Turunkan urutan"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="tqp-icon-btn is-danger"
                    onClick={() => removeQuestions([item.question_id])}
                    disabled={disabled}
                    title="Hapus dari daftar"
                    aria-label="Hapus dari daftar terpilih"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TryoutQuestionPicker;

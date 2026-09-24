import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { IconClock } from "./Icons";
import { getOngoingAttempts } from "../services/api";

// =====================================================
// PENGGANTI HALAMAN "TRYOUT SAYA"
//
// Sebelumnya siswa harus buka menu sidebar terpisah untuk lihat
// tryout yang belum selesai dikerjakan (attempt IN_PROGRESS) --
// padahal kejadiannya jarang (cuma kalau tab/browser
// tertutup/koneksi putus di tengah ujian) dan sudah tumpang
// tindih dengan section "Aktivitas Terbaru" di Dashboard.
//
// Sekarang: dipasang sekali di Layout.jsx (di luar <Outlet/>),
// jadi otomatis muncul sebagai banner peringatan di ATAS SEMUA
// HALAMAN (bukan cuma Dashboard) begitu ada attempt yang masih
// berjalan -- tanpa perlu siswa buka menu apa pun. Kalau tidak
// ada attempt yang berjalan, komponen ini tidak me-render apa-apa
// sama sekali.
//
// Halaman pengerjaan sendiri (/student/attempt/:id) tidak pakai
// Layout ini (lihat App.jsx), jadi banner otomatis tidak dobel
// muncul di atas timer soal yang sedang dikerjakan.
// =====================================================

function formatRemaining(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function OngoingAttemptBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);

  const isStudent = user?.role === "SISWA";

  // =====================================================
  // LOAD DATA -- sekali saat login, lalu poll tiap 30 detik
  // (selaras dengan interval notifikasi di Header.jsx) supaya
  // banner otomatis hilang begitu attempt selesai dikumpulkan
  // dari device/tab lain, atau muncul kalau ada attempt baru.
  // =====================================================

  useEffect(() => {
    if (!isStudent) {
      setAttempts([]);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await getOngoingAttempts();
        if (!cancelled) {
          setAttempts(data);
        }
      } catch (err) {
        console.error("LOAD ONGOING ATTEMPTS ERROR:", err);
      }
    }

    load();

    const intervalId = setInterval(load, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isStudent]);

  // =====================================================
  // COUNTDOWN -- tick semua baris tiap detik di sisi client,
  // dasarnya tetap remaining_seconds dari server (bukan dihitung
  // ulang dari started_at di browser, supaya tidak kena masalah
  // zona waktu). Sama seperti punya halaman "Tryout Saya" lama.
  // =====================================================

  useEffect(() => {
    if (attempts.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      setAttempts((prev) =>
        prev.map((item) => ({
          ...item,
          remaining_seconds: Math.max(0, item.remaining_seconds - 1),
          time_expired: item.remaining_seconds - 1 <= 0,
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [attempts.length]);

  // Yang paling mendesak (sisa waktu paling sedikit) ditampilkan
  // sebagai baris utama; kalau ada lebih dari satu, sisanya cukup
  // disebut jumlahnya saja lewat "+N lainnya".
  const mostUrgent = useMemo(() => {
    if (attempts.length === 0) {
      return null;
    }

    return [...attempts].sort(
      (a, b) => a.remaining_seconds - b.remaining_seconds
    )[0];
  }, [attempts]);

  if (!isStudent || !mostUrgent) {
    return null;
  }

  const isCritical =
    mostUrgent.remaining_seconds <= 300 && !mostUrgent.time_expired;
  const othersCount = attempts.length - 1;

  return (
    <div
      className={`ongoing-attempt-banner${
        isCritical || mostUrgent.time_expired ? " is-critical" : ""
      }`}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/student/attempt/${mostUrgent.attempt_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          navigate(`/student/attempt/${mostUrgent.attempt_id}`);
        }
      }}
    >
      <IconClock size={16} />

      <span className="ongoing-attempt-banner-text">
        Tryout <strong>{mostUrgent.title}</strong> belum kamu selesaikan
        {othersCount > 0 ? ` (+${othersCount} lainnya)` : ""} —{" "}
        {mostUrgent.time_expired
          ? "waktu habis"
          : `sisa ${formatRemaining(mostUrgent.remaining_seconds)}`}
      </span>

      <button
        type="button"
        className="ongoing-attempt-banner-cta"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/student/attempt/${mostUrgent.attempt_id}`);
        }}
      >
        {mostUrgent.time_expired ? "Lihat Hasil" : "Lanjutkan"}
      </button>
    </div>
  );
}

export default OngoingAttemptBanner;

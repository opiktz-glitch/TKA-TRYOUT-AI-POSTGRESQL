import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { getAIStatus } from "../services/api";

// ======================================================
// useAiStatusGate
//
// Cek status provider AI yang aktif (Ollama/Gemini) lewat
// GET /api/settings/ai-status SEBELUM sebuah aksi yang butuh AI
// dijalankan (membuka modal Tambah Soal AI, Edit dengan AI, atau
// Impor dari Dokumen).
//
// Kalau tidak ada AI yang online, pesan error langsung ditampilkan
// di tempat tombol diklik dan aksinya TIDAK dijalankan -- supaya
// guru tidak buang waktu mengisi form dulu lalu gagal belakangan
// saat submit ke Ollama/Gemini.
//
// Setiap tombol memakai SATU instance hook sendiri, karena tiap
// tombol punya state loading & letak pesan error yang terpisah
// (dua di header Bank Soal, satu di dalam modal Edit Soal).
//
// Pemakaian:
//   const gate = useAiStatusGate();
//   <button onClick={() => gate.run(openSesuatu)} disabled={gate.checking}>
//   {gate.message && <div className="form-error-message">{gate.message}</div>}
//
// - checking : true selama pengecekan berjalan
// - message  : pesan error terakhir ("" kalau tidak ada)
// - run(fn)  : cek status; panggil fn() HANYA kalau AI online
// - reset()  : kosongkan message (mis. saat modal dibuka/ditutup)
// ======================================================

export default function useAiStatusGate() {
  const [checking, setChecking] = useState(false);

  const reset = useCallback(() => {}, []);

  const run = useCallback(async (onOnline) => {
    try {
      setChecking(true);

      const status = await getAIStatus();

      if (!status.online) {
        toast.error(
          status.reason || "Tidak ada AI yang online saat ini. Coba lagi nanti atau hubungi admin.",
          { id: "ai-status-gate" }
        );

        return;
      }

      onOnline();
    } catch (err) {
      console.error("CHECK AI STATUS ERROR:", err);

      toast.error(
        err.message || "Gagal memeriksa status AI. Coba lagi nanti.",
        { id: "ai-status-gate" }
      );
    } finally {
      setChecking(false);
    }
  }, []);

  return { checking, run, reset };
}

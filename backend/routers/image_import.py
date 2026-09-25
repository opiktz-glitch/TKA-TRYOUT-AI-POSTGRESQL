"""
IMPORT SOAL DARI GAMBAR (PNG / JPG / WebP / screenshot)

Fitur ini BERDIRI SENDIRI, terpisah dari "Impor Soal dari Dokumen"
di routers/questions.py. Prefix-nya sengaja beda (/api/image-import,
bukan /api/questions/...) supaya tidak berebut route dengan
/api/questions/{question_id}.

Cara kerja: guru upload SATU gambar per request -> gambar dirapikan
(image_import_service) -> dikirim ke AI vision (ai_vision, saat ini
Gemini) bersama prompt "salin ulang soal yang terlihat" -> hasilnya
dikembalikan sebagai DRAFT soal. Endpoint ini TIDAK menyimpan apa pun
ke database; guru memeriksa draft di layar review lalu menyimpannya
lewat POST /api/questions biasa (validasinya tetap ketat).

TAHAP 2 -- gambar/diagram di dalam soal: AI juga diminta menandai
KOTAK gambar milik tiap soal (`gambar_box`, skala 0-1000). Backend
hanya memvalidasi lalu mengembalikannya sebagai pecahan 0..1
(`image_box`). PEMOTONGAN gambarnya sendiri dilakukan frontend dari
file asli (resolusi penuh, bisa dikoreksi guru), lalu diunggah lewat
endpoint lampiran soal yang SUDAH ADA (POST /api/questions/{id}/image)
setelah soalnya tersimpan. Jadi backend di sini tidak menyimpan dan
tidak mengirim byte gambar apa pun.

Satu gambar per request (bukan banyak sekaligus) mengikuti pola
process-chunk pada impor dokumen: kalau gambar ke-4 dari 6 gagal,
hasil gambar 1-3 tidak ikut hilang.

Yang DIPINJAM dari routers/questions.py (hanya di-import, file itu
tidak diubah): _get_active_subject_or_404, _normalize_extracted_options,
_clean_ai_math_notation -- supaya hasil dari gambar diperlakukan
PERSIS sama dengan hasil dari dokumen (opsi A-D, pembersihan notasi
matematika, jawaban benar tidak ditebak).

Menghapus fitur: hapus file ini + ai_vision.py + image_import_service.py
dan 2 baris "image_import" di main.py.
"""

import logging

import ai_vision
import image_import_service
from database import get_db
from dependencies import require_role
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from models import User
from pydantic import BaseModel
from schemas import AIExtractedQuestion
from sqlalchemy.orm import Session

from routers.questions import (
    _clean_ai_math_notation,
    _get_active_subject_or_404,
    _normalize_extracted_options,
)

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/image-import",
    tags=["Image Import"],
)


class ImageCapabilityResponse(BaseModel):
    available: bool
    provider: str | None = None
    reason: str | None = None


class ImageBox(BaseModel):
    """Kotak gambar dalam PECAHAN 0..1 dari lebar/tinggi gambar sumber."""

    x: float
    y: float
    w: float
    h: float


class ImageExtractedQuestion(AIExtractedQuestion):
    # None = AI tidak melihat gambar/diagram di soal ini (atau
    # kotaknya tidak valid dan dibuang). Guru tetap bisa melampirkan
    # gambar manual di layar review.
    image_box: ImageBox | None = None


class ImageExtractResponse(BaseModel):
    questions: list[ImageExtractedQuestion]

    # Keterangan untuk gambar ini secara keseluruhan (mis. tidak ada
    # soal yang terbaca). Catatan per soal ada di AIExtractedQuestion.warning.
    note: str | None = None


# Kotak yang lebih kecil dari ini (per sisi, pecahan 0..1) dianggap
# salah deteksi (mis. ikon kecil / noise), bukan gambar soal.
MIN_BOX_SIDE = 0.03

# Kotak dilebarkan sedikit di tiap sisi supaya garis tepi gambar tidak
# terpotong tepat di pinggirnya.
BOX_PADDING = 0.01


def _parse_image_box(raw) -> dict | None:
    """
    Ubah `gambar_box` dari AI -> {x, y, w, h} pecahan 0..1, atau None
    kalau tidak ada / tidak valid. TIDAK PERNAH melempar exception --
    kotak yang aneh cukup dibuang (guru tetap bisa melampirkan manual).

    Format dari AI: [ymin, xmin, ymax, xmax], skala 0-1000 (format
    bounding box bawaan Gemini). Kalau semua angkanya <= 1.0, dianggap
    AI memakai skala 0..1 (kotak sungguhan tidak mungkin sekecil
    0,1% di skala 0-1000, jadi tidak ambigu).
    """

    if not isinstance(raw, (list, tuple)) or len(raw) != 4:
        return None

    values = []

    for item in raw:
        # bool adalah subclass int di Python -- tolak eksplisit.
        if isinstance(item, bool) or not isinstance(item, (int, float)):
            return None

        values.append(float(item))

    scale = 1.0 if max(values) <= 1.0 else 1000.0

    ymin, xmin, ymax, xmax = (value / scale for value in values)

    # Batasi ke 0..1 (AI kadang sedikit melewati tepi).
    ymin, xmin, ymax, xmax = (
        min(1.0, max(0.0, value)) for value in (ymin, xmin, ymax, xmax)
    )

    if ymax <= ymin or xmax <= xmin:
        return None

    if (xmax - xmin) < MIN_BOX_SIDE or (ymax - ymin) < MIN_BOX_SIDE:
        return None

    xmin = max(0.0, xmin - BOX_PADDING)
    ymin = max(0.0, ymin - BOX_PADDING)
    xmax = min(1.0, xmax + BOX_PADDING)
    ymax = min(1.0, ymax + BOX_PADDING)

    return {
        "x": round(xmin, 4),
        "y": round(ymin, 4),
        "w": round(xmax - xmin, 4),
        "h": round(ymax - ymin, 4),
    }


def build_image_extract_prompt(subject_name: str) -> str:

    return f"""Anda sedang membantu seorang guru mata pelajaran {subject_name} memindahkan soal-soal PILIHAN GANDA yang SUDAH ADA di sebuah gambar (screenshot, foto, atau hasil scan) ke sistem baru.

PENTING: Anda TIDAK membuat soal baru. Tugas Anda HANYA membaca gambar yang dilampirkan lalu menyalin ulang setiap soal pilihan ganda yang benar-benar TERLIHAT, apa adanya, ke dalam format JSON. Jangan mengarang, memperbaiki, menyederhanakan, atau menghitung jawaban soal.

Untuk SETIAP soal pilihan ganda yang terlihat di gambar (bisa 0 kalau gambar memang tidak berisi soal):
- "question_text": salin teks soal persis seperti di gambar, TANPA nomor soal di depannya (mis. buang "1." atau "No. 3").
- "options": salin SEMUA pilihan jawaban yang terlihat (boleh kurang dari 4 kalau memang begitu di gambar). Tiap opsi punya "option_code" (huruf A-D sesuai gambar, atau A/B/C/D berurutan kalau gambar tidak memberi huruf) dan "option_text" (isi opsi TANPA huruf/label di depannya).
- Kunci jawaban: tandai "is_correct": true HANYA kalau gambar menunjukkannya dengan jelas (mis. tertulis "Jawaban: C", atau satu opsi diberi tanda centang/warna/cetak tebal sebagai kunci). Kalau tidak ada penanda yang jelas, biarkan SEMUA opsi "is_correct": false. JANGAN menebak dan JANGAN menghitung sendiri jawabannya.
- "explanation": salin pembahasan kalau ada di gambar. Kalau tidak ada, isi string kosong.
- "gambar_box": kalau soal ini punya gambar/diagram/grafik/ilustrasi/tabel-gambar yang menjadi bagian soal, isi dengan kotak yang membungkus HANYA gambar itu (BUKAN teks soal dan BUKAN teks pilihan jawaban), berformat [ymin, xmin, ymax, xmax] dengan skala 0-1000 relatif terhadap SELURUH gambar (0,0 = pojok kiri-atas; 1000,1000 = pojok kanan-bawah). Kalau soal tidak punya gambar, isi null. Jangan isi untuk logo, hiasan, atau watermark.
- "catatan": isi HANYA kalau ada hal yang perlu diperiksa guru, misalnya: soal/opsi terpotong di tepi gambar, tulisan kabur atau Anda tidak yakin membacanya, atau ada gambar yang TIDAK bisa dipotong sebagai satu kotak (mis. pilihan jawaban berupa gambar). Kalau semuanya terbaca jelas, isi string kosong.

Aturan penulisan:
- Rumus dan simbol matematika ditulis sebagai teks biasa: pecahan a/b, pangkat dengan ^ atau angka kecil (x²), akar dengan akar(...), perkalian dengan x. JANGAN pakai LaTeX dan JANGAN pakai tanda dolar.
- Kalau soal punya gambar/diagram yang bisa dipotong sebagai satu kotak, cukup isi "gambar_box" -- JANGAN mendeskripsikan gambarnya di "question_text" (gambar akan dilampirkan otomatis). Hanya kalau gambarnya TIDAK bisa dipotong sebagai satu kotak (mis. pilihan jawaban berupa gambar), tulis deskripsi singkat dalam kurung siku di "question_text", mis. [Gambar: grafik batang penjualan 4 bulan], lalu jelaskan di "catatan".
- Soal yang terpotong di batas atas/bawah gambar: tetap salin bagian yang terbaca, jangan dilengkapi sendiri, dan jelaskan di "catatan".
- Abaikan teks yang bukan bagian soal (header, footer, nomor halaman, watermark, iklan, tombol aplikasi).

Jawab HANYA dengan JSON valid, tanpa teks lain, tanpa markdown, format persis seperti ini:
{{
  "questions": [
    {{
      "question_text": "...",
      "options": [
        {{"option_code": "A", "option_text": "...", "is_correct": false}}
      ],
      "explanation": "",
      "gambar_box": null,
      "catatan": ""
    }}
  ]
}}"""


# =========================================================
# CEK KEMAMPUAN (dipanggil tombol sebelum modal dibuka)
# =========================================================

@router.get(
    "/capability",
    response_model=ImageCapabilityResponse,
)
async def get_image_import_capability(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    ),
):
    """
    Cek apakah provider AI yang aktif bisa membaca gambar. Sengaja
    TIDAK memakai GET /api/settings/ai-status karena itu hanya
    menjawab "AI online atau tidak", bukan "AI ini bisa baca gambar
    atau tidak" -- Ollama text-only bisa online tapi tetap tidak bisa
    dipakai di sini (dan untuk Ollama vision, di sini SEKALIAN dicek
    apakah model vision-nya sudah ter-pull -- lihat get_vision_
    capability di ai_vision.py).
    """

    capability = await ai_vision.get_vision_capability(db)

    return ImageCapabilityResponse(
        available=capability["available"],
        provider=capability["provider"],
        reason=capability["reason"],
    )


# =========================================================
# EKSTRAKSI SATU GAMBAR
# =========================================================

@router.post(
    "/extract",
    response_model=ImageExtractResponse,
)
async def extract_questions_from_image(
    subject_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    ),
):
    """
    Membaca SATU gambar dan mengembalikan draft soal yang terlihat di
    dalamnya. Tidak menyimpan apa pun ke database.

    Kode error yang penting bagi frontend:
      413 / 415 / 422 -> masalah pada gambar INI saja (frontend lanjut
                         ke gambar berikutnya)
      400 / 502 / 503 / 504 -> masalah provider AI / konfigurasi
                         (frontend berhenti, karena gambar lain
                         hampir pasti gagal dengan alasan yang sama)
    """

    subject = _get_active_subject_or_404(db, subject_id)

    # Cek kemampuan provider LEBIH DULU, sebelum repot memproses
    # gambar -- kalau AI aktif tidak bisa baca gambar, langsung
    # gagal dengan pesan jelas.
    capability = await ai_vision.get_vision_capability(db)

    if not capability["available"]:
        raise HTTPException(
            status_code=capability["http_status"],
            detail=capability["reason"],
        )

    # Baca maksimal batas + 1 byte: cukup untuk mendeteksi "kelebihan"
    # tanpa memuat file raksasa utuh ke memori.
    raw_bytes = await file.read(image_import_service.MAX_UPLOAD_BYTES + 1)

    # Pillow itu sinkron & CPU-bound -- di threadpool supaya event
    # loop server tidak macet selama gambar diproses.
    image_bytes, mime_type = await run_in_threadpool(
        image_import_service.prepare_image_for_ai, raw_bytes
    )

    prompt = build_image_extract_prompt(subject_name=subject.name)

    # HTTPException dari provider (Gemini mati, API key salah, kuota,
    # dst.) sengaja diteruskan apa adanya -- ini masalah konfigurasi,
    # bukan salah gambar.
    ai_result = await ai_vision.call_active_vision_provider(
        prompt, image_bytes, mime_type, db
    )

    raw_questions = ai_result.get("questions") if isinstance(ai_result, dict) else None

    if not isinstance(raw_questions, list):
        logger.warning("Hasil AI vision tidak punya list 'questions'.")

        return ImageExtractResponse(
            questions=[],
            note=(
                "AI tidak mengembalikan format yang bisa dibaca untuk gambar "
                "ini. Coba ulangi, atau gunakan gambar yang lebih jelas."
            ),
        )

    extracted: list[ImageExtractedQuestion] = []

    for raw_question in raw_questions:

        if not isinstance(raw_question, dict):
            continue

        question_text = _clean_ai_math_notation(
            str(raw_question.get("question_text", "")).strip()
        )

        if not question_text:
            continue

        options, options_warning = _normalize_extracted_options(
            raw_question.get("options", [])
        )

        explanation = _clean_ai_math_notation(
            str(raw_question.get("explanation", "")).strip()
        ) or None

        warnings: list[str] = []

        ai_note = str(raw_question.get("catatan", "") or "").strip()

        if ai_note:
            warnings.append(ai_note)

        if options_warning:
            # Teks peringatan bawaan menyebut "dokumen"; di sini
            # sumbernya gambar.
            warnings.append(options_warning.replace("dokumen", "gambar"))

        extracted.append(
            ImageExtractedQuestion(
                question_text=question_text,
                difficulty="MEDIUM",
                explanation=explanation,
                points=1,
                options=options,
                warning=" ".join(warnings) if warnings else None,
                image_box=_parse_image_box(raw_question.get("gambar_box")),
            )
        )

    note = None

    if not extracted:
        note = "Tidak ada soal pilihan ganda yang terbaca di gambar ini."

    return ImageExtractResponse(questions=extracted, note=note)

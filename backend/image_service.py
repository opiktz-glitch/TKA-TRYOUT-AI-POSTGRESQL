"""
Pemrosesan gambar soal sebelum disimpan ke database.

ATURAN TETAP (lihat diskusi fitur ini untuk alasan lengkapnya):
- Upload asli diterima maksimal 5 MB, format apa saja yang bisa
  dibuka Pillow (JPG/PNG/WebP/GIF/dll).
- SEMUA gambar dikonversi paksa ke WebP kualitas 82 -- guru upload
  format apa saja, yang tersimpan di database selalu WebP. Ini
  menjaga ukuran database tetap kecil & konsisten, tidak tergantung
  disiplin guru pilih format yang efisien atau tidak.
- Lebar gambar dibatasi maksimal 1280px -- soal ujian SD tidak butuh
  resolusi lebih dari itu, cuma buang-buang storage tanpa menambah
  kejelasan di layar. Tinggi ikut proporsional (rasio aspek dijaga).
"""

import io

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB, dicek SEBELUM dibuka Pillow
MAX_WIDTH_PX = 1280
WEBP_QUALITY = 82
OUTPUT_MIME_TYPE = "image/webp"


def process_question_image(raw_bytes: bytes) -> bytes:
    """
    Validasi + proses bytes gambar mentah hasil upload guru, kembalikan
    bytes WebP yang siap disimpan ke kolom image_data.

    Melempar HTTPException (pesan Bahasa Indonesia, aman ditampilkan
    langsung ke pengguna) kalau upload tidak valid -- dipanggil
    langsung dari endpoint router, biar router-nya sendiri tetap
    ringkas.
    """

    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Ukuran gambar maksimal "
                f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB. "
                "Kompres dulu gambarnya sebelum upload."
            ),
        )

    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image.load()  # paksa baca penuh sekarang, bukan lazy -- supaya
        # file yang rusak/terpotong ketahuan di sini, bukan nanti pas
        # dipakai di tempat lain.
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400,
            detail="File yang diupload bukan gambar yang bisa dibaca.",
        ) from exc

    # Gambar dengan transparansi (PNG RGBA, dll) atau mode palet (GIF)
    # perlu dikonversi ke RGB dulu -- WebP tetap mendukung transparansi
    # sebenarnya, tapi RGB polos lebih konsisten & lebih kecil untuk
    # kasus soal ujian (foto/scan/screenshot, jarang butuh transparansi).
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    if image.width > MAX_WIDTH_PX:
        new_height = round(image.height * (MAX_WIDTH_PX / image.width))
        image = image.resize((MAX_WIDTH_PX, new_height), Image.LANCZOS)

    output = io.BytesIO()
    image.save(output, format="WEBP", quality=WEBP_QUALITY)
    return output.getvalue()

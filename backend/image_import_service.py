"""
Persiapan gambar untuk fitur "Import Soal dari Gambar".

BERDIRI SENDIRI -- sengaja terpisah dari image_service.py (yang
mengurus gambar LAMPIRAN soal dan memaksa semua ke WebP 1280px).
Tujuannya beda: gambar di sini bukan untuk disimpan, tapi untuk
DIBACA AI, jadi aturannya berbeda:

- Ketajaman teks lebih penting daripada ukuran file. Screenshot soal
  berisi huruf kecil, pecahan, dan pangkat -- kalau dikompres agresif
  (WebP q82 / lebar 1280px) simbol-simbol itu bisa jadi salah baca.
- Gambar TINGGI (mis. screenshot satu halaman penuh) tidak boleh
  dikecilkan berdasarkan sisi terpanjang, karena teksnya jadi terlalu
  kecil. Yang dibatasi LEBAR dan TOTAL PIKSEL saja.
- Hasil TIDAK disimpan ke database; hanya dikirim ke AI lalu dibuang.

Hapus fitur ini = hapus file ini bersama routers/image_import.py dan
ai_vision.py (lihat juga 2 baris di main.py).
"""

import io
import warnings

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

# Screenshot layar besar (PNG) bisa 3-6 MB, jadi batasnya lebih
# longgar dari upload gambar lampiran soal (5 MB).
MAX_UPLOAD_BYTES = 8 * 1024 * 1024

# Lebar maksimum setelah diproses. Di atas ini tidak menambah
# akurasi baca AI, cuma memperbesar payload & biaya token.
MAX_WIDTH_PX = 1600

# Batas total piksel (lebar x tinggi) -- pengaman untuk gambar yang
# sangat tinggi. 10 MP ~= 1600 x 6250.
MAX_PIXELS = 10_000_000

# Di bawah ukuran ini teks hampir pasti tidak terbaca.
MIN_SIDE_PX = 40

# PNG (lossless) dipakai selama ukurannya wajar; kalau membengkak
# (mis. foto/scan berwarna) pindah ke JPEG kualitas tinggi.
PNG_MAX_BYTES = 1_500_000
JPEG_QUALITY = 88

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


def _flatten_to_rgb(image: Image.Image) -> Image.Image:
    """
    Gambar transparan (PNG hasil screenshot kadang punya alpha)
    ditumpuk ke latar PUTIH. Kalau langsung di-convert("RGB"),
    area transparan jadi HITAM dan teks hitam di atasnya hilang.
    """

    has_alpha = image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    )

    if has_alpha:
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        return background

    return image.convert("RGB")


def prepare_image_for_ai(raw_bytes: bytes) -> tuple[bytes, str]:
    """
    Validasi + rapikan bytes gambar mentah hasil upload guru.
    Mengembalikan (bytes_siap_kirim, mime_type).

    Kode status yang dipakai (dibedakan dengan sengaja supaya frontend
    tahu error ini khusus SATU gambar -- proses gambar lain jalan
    terus -- bukan masalah konfigurasi yang akan menimpa semuanya):
      413 -> file terlalu besar
      415 -> bukan gambar yang bisa dibaca / format tidak didukung
      422 -> gambar terlalu kecil
    """

    if not raw_bytes:
        raise HTTPException(status_code=415, detail="File gambar kosong.")

    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                "Ukuran gambar terlalu besar (maksimal "
                f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB)."
            ),
        )

    try:
        # DecompressionBombWarning (gambar > ~89 MP) dijadikan error,
        # bukan sekadar warning yang diam-diam lolos.
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)

            image = Image.open(io.BytesIO(raw_bytes))

            if image.format not in ALLOWED_FORMATS:
                raise HTTPException(
                    status_code=415,
                    detail="Format gambar tidak didukung. Gunakan PNG, JPG, atau WebP.",
                )

            image.load()

    except HTTPException:
        raise

    except (
        UnidentifiedImageError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        OSError,
        ValueError,
    ):
        raise HTTPException(
            status_code=415,
            detail="File ini bukan gambar yang valid atau rusak / terlalu besar dimensinya.",
        )

    # Foto dari HP sering menyimpan rotasi di EXIF -- tanpa ini gambar
    # bisa terkirim ke AI dalam posisi miring/terbalik.
    image = ImageOps.exif_transpose(image)

    width, height = image.size

    if min(width, height) < MIN_SIDE_PX:
        raise HTTPException(
            status_code=422,
            detail="Gambar terlalu kecil untuk dibaca. Gunakan screenshot/foto yang lebih besar.",
        )

    image = _flatten_to_rgb(image)

    # 1) batasi lebar (tinggi ikut proporsional)
    if width > MAX_WIDTH_PX:
        scale = MAX_WIDTH_PX / width
        width, height = MAX_WIDTH_PX, max(1, round(height * scale))
        image = image.resize((width, height), Image.LANCZOS)

    # 2) pengaman total piksel untuk gambar yang sangat tinggi
    if width * height > MAX_PIXELS:
        scale = (MAX_PIXELS / (width * height)) ** 0.5
        # int() (dibulatkan ke BAWAH) supaya hasilnya pasti <= MAX_PIXELS.
        width, height = max(1, int(width * scale)), max(1, int(height * scale))
        image = image.resize((width, height), Image.LANCZOS)

    png_buffer = io.BytesIO()
    image.save(png_buffer, format="PNG", optimize=True)

    if png_buffer.tell() <= PNG_MAX_BYTES:
        return png_buffer.getvalue(), "image/png"

    jpeg_buffer = io.BytesIO()
    image.save(jpeg_buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)

    return jpeg_buffer.getvalue(), "image/jpeg"

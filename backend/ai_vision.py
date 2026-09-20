"""
Adapter AI "melihat gambar" untuk fitur Import Soal dari Gambar.

BERDIRI SENDIRI di samping ai_providers.py -- file itu SENGAJA tidak
diubah. Modul ini hanya MEMBACA dari ai_providers (provider aktif,
API key & model yang tersimpan di t_app_setting), jadi admin tetap
mengatur semuanya lewat Pengaturan > AI seperti biasa.

Saat ini hanya Gemini yang didukung (Gemini menerima gambar langsung
lewat `inline_data`). Provider lain (mis. Ollama dengan model
text-only seperti llama3.2:3b) TIDAK bisa membaca gambar, dan akan
ditolak dengan pesan yang jelas -- bukan gagal samar di tengah jalan.

Menambah provider baru yang bisa baca gambar: tulis fungsi
async (prompt, image_bytes, mime_type, db) -> dict lalu daftarkan di
VISION_CALLERS di bawah.
"""

import base64
import json
import logging

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

import ai_providers
from config import GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_MODEL

logger = logging.getLogger(__name__)

# Jatah token keluaran. Satu screenshot bisa berisi belasan soal
# sekaligus, jadi lebih longgar dari generate 1 soal (800) maupun
# impor dokumen per chunk (4000).
MAX_OUTPUT_TOKENS = 6000

REQUEST_TIMEOUT_SECONDS = 120.0


def _gemini_settings(db: Session) -> tuple[str, str]:
    api_key = ai_providers.get_provider_config(
        db, "GEMINI", "api_key", default=GEMINI_API_KEY, encrypted=True
    )

    model = (
        ai_providers.get_provider_config(db, "GEMINI", "model", default=GEMINI_MODEL)
        or "gemini-3.5-flash-lite"
    )

    return api_key, model


async def _call_gemini_vision(
    prompt: str, image_bytes: bytes, mime_type: str, db: Session
) -> dict:

    api_key, model = _gemini_settings(db)

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "API key Gemini belum diatur. Hubungi admin untuk "
                "mengisinya di halaman Pengaturan > AI."
            ),
        )

    payload = {
        "contents": [
            {
                "parts": [
                    # Gambar DULU baru teks -- urutan yang disarankan
                    # Google untuk satu gambar + instruksi.
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{GEMINI_BASE_URL}/models/{model}:generateContent",
                headers={"x-goog-api-key": api_key},
                json=payload,
            )

        response.raise_for_status()

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Tidak dapat terhubung ke Gemini. Periksa koneksi internet "
                "server, atau hubungi admin untuk memeriksa Pengaturan AI."
            ),
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Gemini terlalu lama membaca gambar. Coba lagi beberapa saat lagi.",
        )

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini menolak permintaan (API key tidak valid/expired). "
                    "Hubungi admin untuk memeriksa API key Gemini di halaman Pengaturan."
                ),
            )

        if exc.response.status_code == 429:
            raise HTTPException(
                status_code=502,
                detail="Kuota Gemini sedang habis / terlalu banyak permintaan. Coba lagi nanti.",
            )

        if exc.response.status_code == 400:
            # 400 bisa berarti API key salah ATAU model yang dipilih
            # admin tidak menerima input gambar -- tampilkan potongan
            # pesan aslinya supaya bisa dibedakan.
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini menolak permintaan (API key/model tidak cocok untuk "
                    "membaca gambar): " + exc.response.text[:200]
                ),
            )

        raise HTTPException(
            status_code=502,
            detail="Gemini mengembalikan error: " + exc.response.text[:200],
        )

    data = response.json()

    candidates = data.get("candidates") or []

    if not candidates:
        raise HTTPException(
            status_code=502,
            detail=(
                "Gemini tidak menghasilkan jawaban (kemungkinan gambar ditolak "
                "filter keamanan). Coba gambar lain."
            ),
        )

    candidate = candidates[0]

    parts = candidate.get("content", {}).get("parts", [])

    content = "".join(
        part.get("text", "") for part in parts if isinstance(part, dict)
    )

    try:
        return json.loads(content)

    except (json.JSONDecodeError, TypeError):
        if candidate.get("finishReason") == "MAX_TOKENS":
            raise HTTPException(
                status_code=502,
                detail=(
                    "Terlalu banyak soal di satu gambar sehingga jawaban AI "
                    "terpotong. Potong gambar jadi beberapa bagian lalu coba lagi."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail="Hasil AI (Gemini) tidak berupa JSON yang valid. Coba ulangi gambar ini.",
        )


# key provider -> fungsi pemanggil. Provider yang TIDAK ada di sini
# dianggap tidak mendukung gambar.
VISION_CALLERS = {
    "GEMINI": _call_gemini_vision,
}


def get_vision_capability(db: Session) -> dict:
    """
    Cek CEPAT (tanpa panggilan jaringan) apakah provider AI yang
    aktif sekarang bisa membaca gambar. Dipakai tombol di frontend
    sebelum modal dibuka, dan diulang di call_active_vision_provider
    sebagai pengaman.

    -> { available: bool, provider: str | None, reason: str | None,
         http_status: int }   (http_status hanya dipakai internal)
    """

    active_key = ai_providers.get_active_provider(db)

    definition = ai_providers.PROVIDERS.get(active_key)

    if not definition:
        return {
            "available": False,
            "provider": None,
            "reason": "Tidak ada provider AI yang terdaftar/aktif.",
            "http_status": 503,
        }

    if active_key not in VISION_CALLERS:
        return {
            "available": False,
            "provider": active_key,
            "reason": (
                f"Provider AI yang aktif saat ini ({definition.label}) belum bisa "
                "membaca gambar. Minta admin mengganti provider ke Google Gemini "
                "di Pengaturan > AI."
            ),
            "http_status": 400,
        }

    if active_key == "GEMINI":
        api_key, _model = _gemini_settings(db)

        if not api_key:
            return {
                "available": False,
                "provider": active_key,
                "reason": (
                    "API key Gemini belum diatur. Hubungi admin untuk mengisinya "
                    "di halaman Pengaturan > AI."
                ),
                "http_status": 503,
            }

    return {
        "available": True,
        "provider": active_key,
        "reason": None,
        "http_status": 200,
    }


async def call_active_vision_provider(
    prompt: str, image_bytes: bytes, mime_type: str, db: Session
) -> dict:

    capability = get_vision_capability(db)

    if not capability["available"]:
        raise HTTPException(
            status_code=capability["http_status"],
            detail=capability["reason"],
        )

    caller = VISION_CALLERS[capability["provider"]]

    return await caller(prompt, image_bytes, mime_type, db)

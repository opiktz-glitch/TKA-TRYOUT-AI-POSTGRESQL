"""
Adapter AI "melihat gambar" untuk fitur Import Soal dari Gambar.

BERDIRI SENDIRI di samping ai_providers.py -- file itu SENGAJA tidak
diubah. Modul ini hanya MEMBACA dari ai_providers (provider aktif,
API key & model yang tersimpan di t_app_setting), jadi admin tetap
mengatur semuanya lewat Pengaturan > AI seperti biasa.

Dua provider didukung: Gemini (menerima gambar langsung lewat
`inline_data`) dan Ollama LOKAL dengan model vision (mis.
qwen3vl:8b, qwen2.5vl:7b -- lihat OLLAMA_VISION_MODEL di config.py).
Model Ollama yang TEXT-ONLY (mis. qwen2.5:7b, llama3.2:3b) TIDAK bisa
membaca gambar, dan akan ditolak dengan pesan yang jelas -- bukan
gagal samar di tengah jalan.

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
from config import (
    GEMINI_API_KEY,
    GEMINI_BASE_URL,
    GEMINI_FALLBACK_MODEL,
    GEMINI_MODEL,
    OLLAMA_BASE_URL,
    OLLAMA_VISION_MODEL,
)

logger = logging.getLogger(__name__)

# Jatah token keluaran. Satu screenshot bisa berisi belasan soal
# sekaligus, jadi lebih longgar dari generate 1 soal (800) maupun
# impor dokumen per chunk (4000).
MAX_OUTPUT_TOKENS = 6000

REQUEST_TIMEOUT_SECONDS = 120.0

# Ollama LOKAL biasanya jauh lebih lambat dari Gemini (cloud) untuk
# tugas vision, apalagi tanpa GPU khusus -- timeout dilonggarkan
# mengikuti pola larger_output di ai_providers.call_ollama_provider.
OLLAMA_VISION_TIMEOUT_SECONDS = 240.0

# Satu gambar (terutama resolusi tinggi) makan jatah context TOKEN
# jauh lebih banyak daripada teks biasa -- num_ctx dilonggarkan supaya
# gambar + prompt + jatah keluaran tidak melebihi context window model.
OLLAMA_VISION_NUM_CTX = 8192


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

    fallback_model = ai_providers.get_provider_config(
        db, "GEMINI", "fallback_model", default=GEMINI_FALLBACK_MODEL
    )

    try:
        # Retry otomatis untuk 500/502/503/504 (+ model cadangan kalau
        # diisi) -- lihat ai_providers.gemini_post_with_retry().
        response = await ai_providers.gemini_post_with_retry(
            model=model,
            api_key=api_key,
            payload=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
            fallback_model=fallback_model,
        )

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

        friendly = ai_providers.gemini_error_detail(exc.response.status_code)

        if friendly:
            raise HTTPException(status_code=502, detail=friendly)

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


def _ollama_vision_settings(db: Session) -> tuple[str, str]:
    base_url = ai_providers.get_provider_base_url(
        db, "OLLAMA", default=OLLAMA_BASE_URL
    )

    # Field config TERPISAH dari model teks biasa ("model") -- lihat
    # penjelasan OLLAMA_VISION_MODEL di config.py.
    model = (
        ai_providers.get_provider_config(
            db, "OLLAMA", "vision_model", default=OLLAMA_VISION_MODEL
        )
        or OLLAMA_VISION_MODEL
    )

    return base_url, model


async def call_ollama_vision(
    prompt: str, image_bytes: bytes, mime_type: str, db: Session
) -> dict:

    base_url, model = _ollama_vision_settings(db)

    if not model:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model vision Ollama belum diatur. Isi 'Model Vision' "
                "(mis. qwen3vl:8b) di Pengaturan > AI, lalu pastikan "
                "modelnya sudah di-pull di server ('ollama pull <model>')."
            ),
        )

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                # "/no_think" DITAMBAHKAN di akhir prompt selain
                # "think": False di bawah. Sebagian TAG model
                # Qwen3-VL (mis. "qwen3-vl:8b" polos, BEDA dengan
                # "qwen3-vl:8b-instruct") dikirim Ollama dengan
                # template chat yang cacat -- tidak menghormati
                # parameter "think" sama sekali, sehingga SELURUH
                # jatah token habis untuk bernalar diam-diam dan
                # tidak ada JSON yang tersisa (bug resmi Ollama,
                # issue #14798). Instruksi inline ini adalah
                # workaround yang didokumentasikan tim Ollama sendiri
                # untuk kasus itu. Aman dikirim ke model vision lain
                # (Gemma, LLaVA, dll) -- kalau modelnya tidak mengenal
                # instruksi ini, diperlakukan sebagai teks biasa dan
                # tidak berpengaruh.
                "content": prompt + "\n\n/no_think",
                # Format yang diharapkan Ollama untuk model vision:
                # array base64 (tanpa prefix data:...;base64,) di
                # field "images" pada pesan yang sama dengan teksnya.
                "images": [base64.b64encode(image_bytes).decode("ascii")],
            }
        ],
        "format": "json",
        "stream": True,
        "keep_alive": "30m",
        "think": False,
        "options": {
            "num_predict": MAX_OUTPUT_TOKENS,
            "num_ctx": OLLAMA_VISION_NUM_CTX,
            # temperature 0: membaca/menyalin soal dari gambar harus
            # setia pada isinya, bukan bervariasi antar percobaan.
            "temperature": 0,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_VISION_TIMEOUT_SECONDS) as client:
            # Streaming: lihat ai_providers._collect_ollama_stream.
            content = await ai_providers._collect_ollama_stream(
                client, f"{base_url}/api/chat", payload
            )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Tidak dapat terhubung ke Ollama di {base_url}. "
                "Pastikan Ollama sudah berjalan, dan model vision "
                f"'{model}' sudah di-pull ('ollama pull {model}')."
            ),
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=(
                "AI (Ollama) terlalu lama membaca gambar (lebih dari "
                f"{int(OLLAMA_VISION_TIMEOUT_SECONDS // 60)} menit). Coba lagi, "
                "atau gunakan model vision Ollama yang lebih ringan."
            ),
        )

    # Sama seperti di ai_providers.call_ollama_provider() -- koneksi
    # terputus paksa di tengah jalan (mis. tunnel Cloudflare Quick
    # Tunnel/ngrok menutup koneksi lama secara sepihak), bukan gagal
    # connect di awal maupun timeout habis dari sisi kita.
    except (httpx.RemoteProtocolError, httpx.ReadError):
        raise HTTPException(
            status_code=502,
            detail=(
                f"Koneksi ke Ollama di {base_url} terputus di tengah "
                "proses membaca gambar, sebelum jawabannya selesai "
                "diterima. Sering terjadi kalau memakai tunnel gratis "
                "(mis. Cloudflare Quick Tunnel/ngrok) untuk permintaan "
                "yang makan waktu lama. Coba lagi, gunakan model "
                "vision yang lebih ringan, atau pakai tunnel yang "
                "lebih stabil."
            ),
        )

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Gagal berkomunikasi dengan Ollama di {base_url}: "
                f"{exc.__class__.__name__}. Periksa koneksi/alamat "
                "Ollama-nya, lalu coba lagi."
            ),
        )

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail="Ollama mengembalikan error: " + exc.response.text[:200],
        )

    # Pengaman TAMBAHAN di luar "/no_think" + "think": False di atas
    # -- kalau TETAP ada blok <think> yang lolos (mis. tag model lain
    # yang templatenya juga cacat), buang dulu supaya sisanya yang
    # murni tetap dicoba diparse sebagai JSON, bukan langsung gagal.
    content = _strip_think_block(content)

    # Dipinjam dari ai_providers -- penyelamatan JSON terpotong yang
    # sama persis dipakai fitur teks, supaya perilakunya konsisten.
    return ai_providers._parse_ai_json(content, "Ollama")


def _strip_think_block(content: str) -> str:
    """
    Buang blok <think>...</think> dari keluaran Ollama, kalau ada.

    TIDAK PERNAH melempar exception -- ini pengaman tambahan, bukan
    validasi. Kalau tidak ada tag <think>, dikembalikan apa adanya.
    Kalau tag-nya TIDAK tertutup (jatah token kemungkinan besar habis
    termakan penalaran -- lihat komentar "/no_think" di atas), bagian
    sejak <think> dibuang; sisa SEBELUM tag itu tetap dicoba diparse
    (biasanya kosong, sehingga pesan error yang tampil ke guru tetap
    jelas seperti biasa, bukan berubah jadi gagal diam-diam).
    """

    lower = content.lower()
    start = lower.find("<think>")

    if start == -1:
        return content

    end = lower.find("</think>", start)

    if end == -1:
        return content[:start]

    return content[:start] + content[end + len("</think>") :]


# key provider -> fungsi pemanggil. Provider yang TIDAK ada di sini
# dianggap tidak mendukung gambar.
VISION_CALLERS = {
    "GEMINI": _call_gemini_vision,
    "OLLAMA": call_ollama_vision,
}


async def get_vision_capability(db: Session) -> dict:
    """
    Cek apakah provider AI yang aktif sekarang bisa membaca gambar.
    Dipakai tombol di frontend sebelum modal dibuka, dan diulang di
    call_active_vision_provider sebagai pengaman.

    Untuk Ollama, ini MEMANGGIL jaringan (cek daftar model yang sudah
    ter-pull di server -- pola yang sama dengan
    ai_providers.status_ollama_provider), supaya tombol "Impor Soal
    dari Gambar" tidak tampil aktif padahal model vision-nya belum
    ada di server -- konsisten dengan filosofi kode ini: gagal dengan
    pesan jelas SEBELUM guru sempat mencoba, bukan gagal samar di
    tengah proses.

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

    if active_key == "OLLAMA":
        base_url, model = _ollama_vision_settings(db)

        if not model:
            return {
                "available": False,
                "provider": active_key,
                "reason": (
                    "Model vision Ollama belum diatur. Minta admin mengisi "
                    "'Model Vision' (mis. qwen3vl:8b) di Pengaturan > AI."
                ),
                "http_status": 503,
            }

        installed_models, reachable = await ai_providers._fetch_ollama_models(base_url)

        if not reachable:
            return {
                "available": False,
                "provider": active_key,
                "reason": f"Tidak dapat terhubung ke Ollama di {base_url}.",
                "http_status": 503,
            }

        if not any(model in installed for installed in installed_models):
            return {
                "available": False,
                "provider": active_key,
                "reason": (
                    f"Model vision '{model}' belum di-pull di Ollama. Minta "
                    f"admin menjalankan 'ollama pull {model}' di server, atau "
                    "gunakan provider Google Gemini untuk fitur ini sementara."
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

    capability = await get_vision_capability(db)

    if not capability["available"]:
        raise HTTPException(
            status_code=capability["http_status"],
            detail=capability["reason"],
        )

    caller = VISION_CALLERS[capability["provider"]]

    return await caller(prompt, image_bytes, mime_type, db)

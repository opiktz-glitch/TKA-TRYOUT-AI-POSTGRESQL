import asyncio
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import ai_providers
import auth
from scripts import backup_postgres
from config import DATABASE_URL, POSTGRES_BACKUP_ENABLED
from database import get_db
from dependencies import require_role
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from models import AppSetting, User
from schemas import (
    AIProvidersResponse,
    AIProviderUpdate,
    AIStatusResponse,
    PostgresBackupAvailabilityResponse,
    PostgresBackupFileResponse,
    PostgresBackupListResponse,
    PostgresBackupSettingsRequest,
    PostgresBackupSettingsResponse,
    PostgresRestoreResponse,
    ProviderConfigUpdate,
    SecretKeyActionResponse,
    SecretKeyStatusResponse,
    SecretKeyUpdateRequest,
)
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

BACKUP_FILENAME_PATTERN = re.compile(
    r"^tka-full-\d{8}T\d{6}(?:\d{6})?Z\.dump$"
)
BACKUP_OPERATION_LOCK = asyncio.Lock()

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"]
)


BACKUP_SUBDIRECTORY_SETTING_KEY = "postgres_backup_subdirectory"
BACKUP_RETENTION_SETTING_KEY = "postgres_backup_retention"


def _backup_base_directory() -> Path:
    configured_directory = os.getenv("POSTGRES_BACKUP_DIR", "").strip()
    if not configured_directory:
        configured_directory = str(backup_postgres.DEFAULT_BACKUP_DIR)
    return Path(configured_directory).expanduser().resolve()


def _backup_subdirectory(db: Session) -> str:
    setting = (
        db.query(AppSetting)
        .filter(AppSetting.key == BACKUP_SUBDIRECTORY_SETTING_KEY)
        .first()
    )
    return setting.value if setting else ""


def _backup_directory(db: Session) -> Path:
    try:
        return backup_postgres.resolve_backup_directory(
            _backup_base_directory(),
            _backup_subdirectory(db),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Konfigurasi folder backup tidak valid: {exc}",
        ) from exc


def _backup_retention_count(db: Session) -> int:
    setting = (
        db.query(AppSetting)
        .filter(AppSetting.key == BACKUP_RETENTION_SETTING_KEY)
        .first()
    )
    configured_count = (
        setting.value
        if setting
        else os.getenv("POSTGRES_BACKUP_RETENTION", "14")
    )
    try:
        retention_count = int(configured_count)
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail="Jumlah retensi backup harus berupa bilangan bulat.",
        ) from exc
    if retention_count < 1:
        raise HTTPException(
            status_code=500,
            detail="Jumlah retensi backup harus minimal 1.",
        )
    return retention_count


def _require_postgres_backup() -> None:
    if not POSTGRES_BACKUP_ENABLED:
        raise HTTPException(
            status_code=404,
            detail="Fitur backup file hanya diaktifkan pada server yang mendukungnya.",
        )


def _release_backup_operation_lock() -> None:
    if BACKUP_OPERATION_LOCK.locked():
        BACKUP_OPERATION_LOCK.release()


@router.get(
    "/postgres-backups/status",
    response_model=PostgresBackupAvailabilityResponse,
)
def get_postgres_backup_status(
    current_user: User = Depends(require_role("ADMIN")),
):
    if not POSTGRES_BACKUP_ENABLED:
        return PostgresBackupAvailabilityResponse(enabled=False)

    missing_tools = [
        tool
        for tool in ("pg_dump", "pg_restore")
        if backup_postgres.find_postgres_tool(tool) is None
    ]
    if missing_tools:
        return PostgresBackupAvailabilityResponse(
            enabled=False,
            message=(
                "Fitur backup diaktifkan, tetapi utilitas PostgreSQL belum "
                f"terdeteksi oleh backend: {', '.join(missing_tools)}. "
                "Periksa PATH backend atau variabel POSTGRES_PG_DUMP_PATH/"
                "POSTGRES_PG_RESTORE_PATH."
            ),
        )
    return PostgresBackupAvailabilityResponse(enabled=True)


@router.get(
    "/postgres-backups/config",
    response_model=PostgresBackupSettingsResponse,
)
def get_postgres_backup_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    _require_postgres_backup()
    backup_directory = _backup_directory(db)
    return PostgresBackupSettingsResponse(
        base_directory=str(_backup_base_directory()),
        backup_directory=str(backup_directory),
        subdirectory=_backup_subdirectory(db),
        retention_count=_backup_retention_count(db),
        verified=backup_directory.is_dir() and os.access(backup_directory, os.W_OK),
    )


@router.put(
    "/postgres-backups/config",
    response_model=PostgresBackupSettingsResponse,
)
def update_postgres_backup_settings(
    data: PostgresBackupSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    _require_postgres_backup()
    subdirectory = data.subdirectory.strip().replace("\\", "/")
    try:
        backup_directory = backup_postgres.resolve_backup_directory(
            _backup_base_directory(),
            subdirectory,
        )
        backup_postgres.verify_backup_directory(backup_directory)
    except (OSError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Folder backup tidak dapat digunakan: {exc}",
        ) from exc

    setting_values = (
        (BACKUP_SUBDIRECTORY_SETTING_KEY, subdirectory),
        (BACKUP_RETENTION_SETTING_KEY, str(data.retention_count)),
    )
    for key, value in setting_values:
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(AppSetting(key=key, value=value))
    db.commit()

    return PostgresBackupSettingsResponse(
        base_directory=str(_backup_base_directory()),
        backup_directory=str(backup_directory),
        subdirectory=subdirectory,
        retention_count=data.retention_count,
        verified=True,
    )


@router.get(
    "/postgres-backups",
    response_model=PostgresBackupListResponse,
)
def list_postgres_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    _require_postgres_backup()
    backup_dir = _backup_directory(db)
    files = []
    if backup_dir.is_dir():
        for path in sorted(backup_dir.iterdir(), key=lambda item: item.name, reverse=True):
            if path.is_file() and BACKUP_FILENAME_PATTERN.fullmatch(path.name):
                files.append(
                    PostgresBackupFileResponse(
                        filename=path.name,
                        size_bytes=path.stat().st_size,
                        created_at=datetime.fromtimestamp(
                            path.stat().st_mtime,
                            tz=timezone.utc,
                        ),
                    )
                )
    return PostgresBackupListResponse(
        backups=files,
        retention_count=_backup_retention_count(db),
    )


@router.post(
    "/postgres-backups",
    response_model=PostgresBackupFileResponse,
)
async def create_postgres_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    _require_postgres_backup()
    if BACKUP_OPERATION_LOCK.locked():
        raise HTTPException(
            status_code=409,
            detail="Operasi backup atau restore sedang berjalan.",
        )
    await BACKUP_OPERATION_LOCK.acquire()

    try:
        backup_path = await run_in_threadpool(
            backup_postgres.create_backup,
            _backup_directory(db),
            _backup_retention_count(db),
            DATABASE_URL,
        )
        return PostgresBackupFileResponse(
            filename=backup_path.name,
            size_bytes=backup_path.stat().st_size,
            created_at=datetime.fromtimestamp(
                backup_path.stat().st_mtime,
                tz=timezone.utc,
            ),
        )
    except (OSError, RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal membuat backup PostgreSQL: {exc}",
        ) from exc
    finally:
        _release_backup_operation_lock()


@router.get("/postgres-backups/{filename}")
def download_postgres_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    _require_postgres_backup()
    if not BACKUP_FILENAME_PATTERN.fullmatch(filename):
        raise HTTPException(status_code=404, detail="File backup tidak ditemukan.")
    backup_path = _backup_directory(db) / filename
    if not backup_path.is_file():
        raise HTTPException(status_code=404, detail="File backup tidak ditemukan.")
    return FileResponse(
        path=backup_path,
        filename=backup_path.name,
        media_type="application/octet-stream",
        headers={"Cache-Control": "no-store"},
    )


@router.post(
    "/postgres-backups/restore",
    response_model=PostgresRestoreResponse,
)
async def restore_postgres_backup(
    file: UploadFile = File(...),
    confirm: bool = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    _require_postgres_backup()
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Konfirmasi restore wajib diberikan.",
        )
    if BACKUP_OPERATION_LOCK.locked():
        raise HTTPException(
            status_code=409,
            detail="Operasi backup atau restore sedang berjalan.",
        )
    await BACKUP_OPERATION_LOCK.acquire()

    temporary_path = None
    try:
        backup_dir = _backup_directory(db)
        backup_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(backup_dir, 0o700)
        temporary_descriptor, temporary_name = tempfile.mkstemp(
            prefix=".tka-upload-",
            suffix=".dump",
            dir=backup_dir,
        )
        temporary_path = Path(temporary_name)
        total_bytes = 0
        with os.fdopen(temporary_descriptor, "wb") as temporary_file:
            while chunk := await file.read(1024 * 1024):
                temporary_file.write(chunk)
                total_bytes += len(chunk)
        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="File backup kosong.")

        try:
            await run_in_threadpool(
                backup_postgres.validate_backup,
                temporary_path,
                DATABASE_URL,
            )
        except RuntimeError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"File bukan arsip PostgreSQL yang valid: {exc}",
            ) from exc

        safety_backup = await run_in_threadpool(
            backup_postgres.create_backup,
            backup_dir,
            _backup_retention_count(db),
            DATABASE_URL,
        )
        await run_in_threadpool(
            backup_postgres.restore_backup,
            temporary_path,
            DATABASE_URL,
        )
        return PostgresRestoreResponse(
            success=True,
            message=(
                "Restore selesai. Backup kondisi sebelum restore tersimpan "
                "di server dan dapat diunduh dari daftar backup."
            ),
            safety_backup_filename=safety_backup.name,
        )
    except HTTPException:
        raise
    except (OSError, RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Restore PostgreSQL gagal. Jika proses restore sudah dimulai, "
                "pg_restore menjalankannya dalam transaksi tunggal sehingga "
                "restore yang gagal dibatalkan. Jika error terjadi setelah "
                f"restore selesai, periksa database dan minta pengguna login ulang. Detail: {exc}"
            ),
        ) from exc
    finally:
        try:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            await file.close()
        finally:
            _release_backup_operation_lock()


# =========================================================
# MULTI-PROVIDER AI — GENERIK
#
# Router ini SENGAJA tidak tahu apa-apa soal "Ollama" atau
# "Gemini" secara spesifik — semua logika per-provider ada di
# backend/ai_providers.py (registry). Router di sini cuma
# membungkusnya jadi endpoint HTTP. Efeknya: kalau ada provider
# baru didaftarkan di ai_providers.py, endpoint-endpoint di bawah
# ini OTOMATIS ikut melayani provider tsb tanpa perlu diubah.
# =========================================================

async def _providers_response(db: Session) -> AIProvidersResponse:

    return AIProvidersResponse(
        active_provider=ai_providers.get_active_provider(db),
        providers=await ai_providers.list_provider_statuses(db),
    )


@router.get(
    "/ai-providers",
    response_model=AIProvidersResponse
)
async def get_ai_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    """
    Ringkasan untuk halaman Pengaturan: provider AI mana yang
    sedang aktif, plus status SEMUA provider yang terdaftar di
    ai_providers.py (bukan cuma 2 yang ada sekarang) — supaya kalau
    admin nambah provider baru, kartu status & pilihannya otomatis
    ikut muncul di UI tanpa perlu ubah endpoint ini.
    """

    return await _providers_response(db)


@router.put(
    "/ai-provider",
    response_model=AIProvidersResponse
)
async def update_active_provider(
    setting_data: AIProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    """
    Ganti provider AI yang aktif dipakai fitur "Generate Soal AI"
    di seluruh aplikasi. Tidak diblokir walau provider tujuan
    sedang offline — admin boleh menyiapkan konfigurasi dulu
    (mis. isi API key) sebelum benar-benar dipakai; status
    online/offline tetap ditampilkan di response supaya admin
    sadar kondisinya.
    """

    provider_key = setting_data.provider.strip().upper()

    if provider_key not in ai_providers.PROVIDERS:

        valid_keys = ", ".join(ai_providers.PROVIDERS.keys())

        raise HTTPException(
            status_code=400,
            detail=f"Provider tidak dikenal. Pilih salah satu: {valid_keys}."
        )

    ai_providers.set_active_provider(db, provider_key)

    db.commit()

    return await _providers_response(db)


@router.put(
    "/providers/{provider_key}/config",
    response_model=AIProvidersResponse
)
async def update_provider_config(
    provider_key: str,
    setting_data: ProviderConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    """
    Simpan/ganti API key & model milik SATU provider — endpoint ini
    generik, dipakai untuk provider mana pun yang sudah terdaftar
    di ai_providers.py (bukan cuma Gemini). Key TIDAK pernah
    hardcode di .env — disimpan di t_app_setting supaya admin bisa
    menggantinya kapan saja lewat halaman ini (mis. key lama
    expired/dicabut, atau pindah akun).

    - api_key diisi non-kosong, dan providernya butuh API key
      (requires_api_key) -> divalidasi dulu ke provider tsb kalau
      provider menyediakan fungsi validasi (saat ini: Gemini).
      Kalau provider secara eksplisit menolak key (401/403), TOLAK
      simpan supaya admin tidak baru sadar saat guru generate soal.
      Kalau cuma gagal terhubung (timeout/offline), tetap diizinkan
      tersimpan — internet mungkin sedang bermasalah, bukan berarti
      key-nya salah.
    - api_key dikirim string kosong "" -> sengaja menghapus key.
    - api_key None (tidak dikirim) -> key lama tidak diubah.
    - model: sama polanya (None = tidak diubah, "" = hapus override).
    """

    provider_key = provider_key.strip().upper()

    definition = ai_providers.PROVIDERS.get(provider_key)

    if not definition:

        valid_keys = ", ".join(ai_providers.PROVIDERS.keys())

        raise HTTPException(
            status_code=400,
            detail=f"Provider tidak dikenal. Pilih salah satu: {valid_keys}."
        )

    if setting_data.api_key is not None:

        new_key = setting_data.api_key.strip()

        if new_key:

            if not definition.requires_api_key:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Provider '{definition.label}' tidak memerlukan "
                        "API key."
                    )
                )

            # Validasi khusus Gemini (satu-satunya provider dengan
            # fungsi cek key saat ini). Provider baru yang juga
            # butuh API key bisa menambahkan validasi serupa di
            # ai_providers.py kalau perlu.
            if provider_key == "GEMINI":

                online, detail = await ai_providers.check_gemini_key(new_key)

                if not online and detail == "API key Gemini tidak valid atau ditolak Google":

                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "API key ditolak oleh provider. Periksa kembali "
                            "key yang dimasukkan."
                        )
                    )

            ai_providers.set_provider_config(
                db, provider_key, "api_key", new_key, encrypted=True
            )

        else:

            ai_providers.delete_provider_config(db, provider_key, "api_key")

    if setting_data.model is not None:

        new_model = setting_data.model.strip()

        if new_model:
            ai_providers.set_provider_config(db, provider_key, "model", new_model)
        else:
            ai_providers.delete_provider_config(db, provider_key, "model")

    if setting_data.vision_model is not None:

        new_vision_model = setting_data.vision_model.strip()

        if new_vision_model:
            ai_providers.set_provider_config(
                db, provider_key, "vision_model", new_vision_model
            )
        else:
            ai_providers.delete_provider_config(db, provider_key, "vision_model")

    if setting_data.base_url is not None:

        new_base_url = setting_data.base_url.strip()

        if new_base_url:

            if not definition.configurable_base_url:

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Provider '{definition.label}' tidak mendukung "
                        "pengaturan alamat server (base URL)."
                    )
                )

            # Validasi format URL saja (http/https + host). Sengaja
            # TIDAK dites konektivitasnya di sini (beda dari validasi
            # API key Gemini) — server tujuan (mis. Ollama di mesin
            # lain) mungkin sedang offline sementara padahal alamatnya
            # sudah benar, dan admin boleh menyimpan konfigurasi dulu
            # sebelum server itu benar-benar dinyalakan.
            new_base_url = ai_providers.validate_base_url(new_base_url)

            ai_providers.set_provider_config(
                db, provider_key, "base_url", new_base_url
            )

        else:

            # Dikosongkan -> kembali ke default_base_url (biasanya
            # alamat mesin sendiri, http://localhost:11434).
            ai_providers.delete_provider_config(db, provider_key, "base_url")

    db.commit()

    return await _providers_response(db)


@router.delete(
    "/providers/{provider_key}/config",
    response_model=AIProvidersResponse
)
async def clear_provider_config(
    provider_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    """
    Hapus semua setting (API key & override model) milik satu
    provider. Kalau provider tsb sedang aktif, otomatis dipindah ke
    provider lain yang tidak butuh API key (kalau ada) supaya
    aplikasi tidak "menggantung" mengacu ke provider yang baru saja
    dikosongkan kredensialnya.
    """

    provider_key = provider_key.strip().upper()

    if provider_key not in ai_providers.PROVIDERS:

        valid_keys = ", ".join(ai_providers.PROVIDERS.keys())

        raise HTTPException(
            status_code=400,
            detail=f"Provider tidak dikenal. Pilih salah satu: {valid_keys}."
        )

    ai_providers.delete_all_provider_config(db, provider_key)

    if ai_providers.get_active_provider(db) == provider_key:

        fallback_key = next(
            (
                key for key, definition in ai_providers.PROVIDERS.items()
                if not definition.requires_api_key
            ),
            next(iter(ai_providers.PROVIDERS)),
        )

        ai_providers.set_active_provider(db, fallback_key)

    db.commit()

    return await _providers_response(db)


@router.get(
    "/ai-status",
    response_model=AIStatusResponse
)
async def get_ai_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN", "GURU")
    )
):
    """
    Endpoint RINGAN khusus untuk di-cek frontend SEBELUM membuka
    modal "Tambah Soal AI" (dipanggil oleh ADMIN & GURU, bukan
    cuma ADMIN, karena keduanya bisa generate soal AI). Kalau
    provider yang sedang aktif tidak online, frontend langsung
    menampilkan error saat tombol diklik, tanpa perlu membuka
    modal & mengisi form dulu baru gagal di akhir.
    """

    active_provider = ai_providers.get_active_provider(db)

    status = await ai_providers.get_provider_status(db, active_provider)

    if status.online:
        return AIStatusResponse(
            active_provider=active_provider,
            online=True,
        )

    reason = status.detail or f"{status.label} sedang tidak dapat dihubungi"

    return AIStatusResponse(
        active_provider=active_provider,
        online=False,
        reason=(
            f"Tidak ada AI yang online. Provider aktif saat ini "
            f"({status.label}): {reason}. Hubungi admin untuk memeriksa "
            "Pengaturan AI, atau coba lagi nanti."
        ),
    )


# =========================================================
# SECRET_KEY (Pengaturan > Keamanan)
#
# SECRET_KEY dipakai untuk menandatangani JWT (semua sesi login)
# DAN menurunkan kunci enkripsi API key provider AI di atas.
# Endpoint-endpoint ini SENGAJA dibatasi ADMIN saja (bukan GURU),
# beda dengan konfigurasi AI di atas — ini kredensial keamanan
# inti aplikasi, bukan sekadar setting fitur.
# =========================================================

@router.get(
    "/secret-key",
    response_model=SecretKeyStatusResponse,
)
def get_secret_key_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    """
    Status SECRET_KEY untuk kartu "Keamanan" di halaman Pengaturan.
    Nilai aslinya TIDAK PERNAH dikirim — cukup versi masking-nya
    (sama pola dengan masked_key API key provider AI) supaya admin
    tahu ada key tersimpan tanpa mengekspos isinya lewat network
    tab / log frontend.
    """

    setting = (
        db.query(AppSetting)
        .filter(AppSetting.key == auth.SECRET_KEY_SETTING_KEY)
        .first()
    )

    if not setting or not setting.value.strip():
        return SecretKeyStatusResponse(is_configured=False)

    changed_by_setting = (
        db.query(AppSetting)
        .filter(AppSetting.key == auth.SECRET_KEY_CHANGED_BY_SETTING_KEY)
        .first()
    )

    return SecretKeyStatusResponse(
        is_configured=True,
        masked_key=ai_providers.mask_api_key(setting.value),
        updated_at=setting.updated_at,
        changed_by=(
            changed_by_setting.value
            if changed_by_setting and changed_by_setting.value != "-"
            else None
        ),
    )


@router.put(
    "/secret-key",
    response_model=SecretKeyActionResponse,
)
def update_secret_key(
    data: SecretKeyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    """
    Admin menempelkan SECRET_KEY sendiri (mis. hasil generate manual,
    atau untuk menyamakan dengan environment lain). Panjang minimal
    sudah divalidasi di schema (32 karakter).

    PENTING: begitu berhasil, SEMUA token JWT yang sudah terbit
    (termasuk milik admin yang melakukan aksi ini) langsung tidak
    valid. Ini disengaja — response tetap 200 karena request ini
    sendiri sudah diautentikasi dengan key LAMA sebelum diganti,
    tapi frontend wajib langsung logout begitu menerima
    force_logout=True di response.
    """

    new_key = data.new_secret_key.strip()

    if len(new_key) < auth.MIN_SECRET_KEY_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"SECRET_KEY minimal {auth.MIN_SECRET_KEY_LENGTH} "
                "karakter demi keamanan."
            ),
        )

    auth.set_secret_key(db, new_key, changed_by=current_user.username)

    db.commit()

    return SecretKeyActionResponse(
        success=True,
        message=(
            "SECRET_KEY berhasil disimpan. Semua sesi login "
            "(termasuk sesi Anda saat ini) akan diminta login ulang."
        ),
    )


@router.post(
    "/secret-key/rotate",
    response_model=SecretKeyActionResponse,
)
def rotate_secret_key(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    """
    Generate SECRET_KEY acak baru secara otomatis (tanpa admin perlu
    mengetik apa pun) — cara yang direkomendasikan untuk rotasi rutin
    dibanding menempelkan key manual. Konsekuensi sama seperti
    update_secret_key(): semua sesi login langsung tidak valid.
    """

    new_key = auth.generate_secret_key()

    auth.set_secret_key(db, new_key, changed_by=current_user.username)

    db.commit()

    return SecretKeyActionResponse(
        success=True,
        message=(
            "SECRET_KEY berhasil dirotasi otomatis. Semua sesi login "
            "(termasuk sesi Anda saat ini) akan diminta login ulang."
        ),
    )

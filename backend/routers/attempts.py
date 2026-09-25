from database import get_db
from dependencies import require_role
from fastapi import APIRouter, Depends, HTTPException
from models import Answer, Attempt, Result, User
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/attempts",
    tags=["Attempts"]
)


# =========================================================
# HAPUS SATU ATTEMPT (NILAI PESERTA)
#
# Dipakai dari tabel Nilai (khusus Admin) untuk membersihkan
# satu attempt/nilai yang salah -- mis. data uji coba, atau
# siswa yang salah pilih tryout -- tanpa harus menghapus
# seluruh paket tryout.
#
# Sengaja HANYA untuk ADMIN (bukan "ADMIN", "GURU" seperti
# GET /api/teacher/scores): ini data nilai siswa, risikonya
# lebih tinggi daripada sekadar hapus paket tryout, jadi
# dibatasi sama seperti delete_tryout di routers/tryouts.py.
#
# Hard delete (bukan soft-delete) -- konsisten dengan pola
# hapus lain di aplikasi ini (delete_tryout, deleteUser, dkk),
# karena memang tidak ada kolom deleted_at di skema manapun.
#
# Urutan hapus mengikuti pola delete_tryout: hapus dulu baris
# anak yang mereferensikan attempt_id (t_answer, t_result --
# tidak ada ON DELETE CASCADE di level DB untuk keduanya, jadi
# harus dihapus eksplisit di sini), baru hapus baris t_attempt
# itu sendiri.
# =========================================================

@router.delete("/{attempt_id}")
def delete_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    attempt = (
        db.query(Attempt)
        .filter(Attempt.id == attempt_id)
        .first()
    )

    if not attempt:
        raise HTTPException(
            status_code=404,
            detail="Data nilai (attempt) tidak ditemukan"
        )

    # -----------------------------------------------------
    # Hapus jawaban siswa untuk attempt ini
    # -----------------------------------------------------

    db.query(Answer).filter(
        Answer.attempt_id == attempt.id
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # Hapus hasil (rekap skor) attempt ini
    # -----------------------------------------------------

    db.query(Result).filter(
        Result.attempt_id == attempt.id
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # Hapus attempt
    # -----------------------------------------------------

    db.delete(attempt)
    db.commit()

    return {
        "success": True,
        "message": "Nilai/attempt berhasil dihapus"
    }

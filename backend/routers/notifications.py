"""
NOTIFIKASI

Endpoint READ-ONLY dari sisi user (list, tandai dibaca) untuk
notifikasi milik user yang sedang login. Notifikasi ITU SENDIRI
dibuat dari sisi lain (lihat finalize_attempt() di
routers/student.py, dipanggil setiap seorang siswa menyelesaikan
tryout) -- tidak ada endpoint "buat notifikasi" yang dipanggil
manual dari frontend.
"""

from database import get_db
from dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from models import Notification, User
from schemas import NotificationResponse
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """20 notifikasi TERBARU milik user yang login, terbaru dulu.
    Sengaja dibatasi (bukan semua histori) -- ini dropdown cepat di
    header, bukan halaman riwayat notifikasi tersendiri."""

    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(min(limit, 50))
        .all()
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            # Sengaja ikut memfilter user_id di query (bukan cuma
            # cek id lalu bandingkan setelahnya) -- supaya user A
            # tidak bisa menandai/mengintip notifikasi milik user
            # B walau tahu id-nya.
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notifikasi tidak ditemukan")

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update({"is_read": True})
    )

    db.commit()

    return {"success": True}

from fastapi import Depends, HTTPException, status

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from jose import JWTError, jwt

from database import get_db

from models import User

from config import ALGORITHM

import auth


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Token tidak valid",

        headers={
            "WWW-Authenticate": "Bearer"
        }
    )


    try:

        payload = jwt.decode(
            token,
            auth.get_active_secret_key(db),
            algorithms=[ALGORITHM]
        )


        username = payload.get("sub")

        sid = payload.get("sid")


        if username is None:

            raise credentials_exception


    except (JWTError, RuntimeError):

        # RuntimeError di sini berarti get_active_secret_key() tidak
        # menemukan SECRET_KEY sama sekali (harusnya tidak pernah
        # terjadi setelah bootstrap saat startup) — tetap dibalas
        # sebagai 401 biasa, bukan 500, supaya tidak membocorkan
        # detail internal ke client.
        raise credentials_exception


    user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )


    if user is None:

        raise credentials_exception


    if not user.is_active:

        raise HTTPException(
            status_code=400,
            detail="User tidak aktif"
        )


    # -----------------------------------------------------
    # SINGLE-SESSION ENFORCEMENT
    #
    # Token bisa saja masih valid secara kriptografis (belum
    # "exp") tapi sesinya sudah dicabut di database — lewat
    # Logout manual, atau 'Paksa Logout' oleh ADMIN, atau
    # ter-overwrite karena hal lain. Tanpa cek ini, token lama
    # tetap bisa dipakai sampai kedaluwarsa alami walau sudah
    # di-logout secara eksplisit.
    # -----------------------------------------------------

    if sid is None or user.active_session_id != sid:

        raise HTTPException(
            status_code=401,
            detail=(
                "Sesi Anda sudah berakhir (mungkin sudah logout, "
                "atau login dari perangkat lain). Silakan login "
                "kembali."
            ),
            headers={"WWW-Authenticate": "Bearer"}
        )


    return user

# ==========================================
# ROLE CHECKER
# ==========================================

def require_role(*allowed_roles):

    def role_checker(
        current_user: User = Depends(
            get_current_user
        )
    ):

        if current_user.role not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail="Tidak memiliki hak akses"
            )


        return current_user


    return role_checker
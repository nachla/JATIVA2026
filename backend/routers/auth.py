from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.extensions import connection as PgConnection
from datetime import datetime

from core.database import get_db
from core.security import verify_password, create_access_token
from core.middleware import get_current_user
from schemas.auth import LoginRequest, TokenResponse, UserInfo
from services.log_service import save_log

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: PgConnection = Depends(get_db)):
    cur = db.cursor()

    print("USERNAME:", body.username)
    print("PASSWORD:", body.password)

    cur.execute(
        "SELECT username, password_hash, role FROM users WHERE username = %s",
        (body.username,)
    )

    user = cur.fetchone()

    print("USER DB:", user)

    if user:
        print("HASH:", user["password_hash"])
        print("VERIFY:", verify_password(body.password, user["password_hash"]))

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah"
        )

    token = create_access_token({
    "sub": user["username"],
    "role": user["role"]
    })

    save_log(
        db,
        user["username"],
        "Login ke sistem"
    )

    return TokenResponse(
        access_token=token,
        username=user["username"],
        role=user["role"]
    )
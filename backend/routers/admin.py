from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from psycopg2.extensions import connection as PgConnection
from core.database import get_db
from core.middleware import require_admin
from core.security import hash_password
from schemas.auth import UserInfo
from fastapi import UploadFile, File
import shutil
from services.data_service import reload_data, load_data, get_col_map
from services.log_service import save_log

router = APIRouter(prefix="/admin", tags=["admin"])

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"

# ── GET /admin/stats ──
@router.get("/stats")
def get_stats(
    current_user: UserInfo = Depends(require_admin),
    db: PgConnection = Depends(get_db)
):
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) as count FROM users")
    total_users = cur.fetchone()["count"]

    cur.execute("SELECT COUNT(*) as count FROM activity_log")
    total_logs = cur.fetchone()["count"]

    try:
        df = load_data()
        total_inovasi = len(df)
    except Exception:
        total_inovasi = 0

    return {
        "total_users": total_users,
        "total_logs": total_logs,
        "total_inovasi": total_inovasi,
    }

# ── GET /admin/users ──
@router.get("/users")
def get_users(
    current_user: UserInfo = Depends(require_admin),
    db: PgConnection = Depends(get_db)
):
    cur = db.cursor()
    cur.execute("SELECT username, role FROM users ORDER BY username")
    return cur.fetchall()

# ── POST /admin/users ──
@router.post("/users")
def create_user(
    body: UserCreate,
    current_user: UserInfo = Depends(require_admin),
    db: PgConnection = Depends(get_db)
):
    cur = db.cursor()
    cur.execute("SELECT username FROM users WHERE username = %s", (body.username,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Username sudah ada")

    hashed = hash_password(body.password)
    cur.execute(
        "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
        (body.username, hashed, body.role)
    )
    db.commit()

    save_log(
        db,
        current_user.username,
        f"Menambahkan user {body.username}"
    )

    return {"message": f"User {body.username} berhasil ditambahkan"}

# ── DELETE /admin/users/{username} ──
@router.delete("/users/{username}")
def delete_user(
    username: str,
    current_user: UserInfo = Depends(require_admin),
    db: PgConnection = Depends(get_db)
):
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Tidak bisa hapus akun sendiri")

    cur = db.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db.commit()

    save_log(
        db,
        current_user.username,
        f"Menghapus user {username}"
    )

    return {"message": f"User {username} berhasil dihapus"}

# ── GET /admin/logs ──
@router.get("/logs")
def get_logs(
    current_user: UserInfo = Depends(require_admin),
    db: PgConnection = Depends(get_db)
):
    cur = db.cursor()
    cur.execute("SELECT username, aksi, waktu FROM activity_log ORDER BY waktu DESC LIMIT 100")
    return cur.fetchall()

# ── POST /admin/reload-data ──
@router.post("/reload-data")
def reload_excel(current_user: UserInfo = Depends(require_admin)):
    try:
        df = reload_data()
        from services.nlp_service import clear_nlp_cache
        from services.pml_service import clear_pml_cache
        clear_nlp_cache()
        clear_pml_cache()
        return {"message": f"Data berhasil di-reload: {len(df)} baris"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-data")
async def upload_data(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(require_admin)
):
    try:
        with open("data_inovasi.xlsx", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        df = reload_data()
        from services.nlp_service import clear_nlp_cache
        from services.pml_service import clear_pml_cache
        clear_nlp_cache()
        clear_pml_cache()

        return {
            "message": f"File berhasil diupload. Total data: {len(df)}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
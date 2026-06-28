"""
Script setup database sekali jalan — dipakai pas pindah ke database baru
(misal Supabase yang masih kosong).

Yang dilakukan:
1. Bikin tabel data_inovasi, users, activity_log (kalau belum ada)
2. Import data dari data_inovasi.xlsx ke tabel data_inovasi (kalau tabel masih kosong)
3. Bikin akun admin pertama (interaktif, password tidak ditulis ke file mana pun)

Cara jalanin (dari folder backend/):
    python db/setup_database.py
"""

import sys
import getpass
from pathlib import Path

# Supaya bisa import dari folder backend/ meskipun script dijalankan dari db/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import psycopg2

from core.config import settings
from core.security import hash_password


def get_connection():
    return psycopg2.connect(settings.DATABASE_URL)


def jalankan_schema(conn):
    schema_path = Path(__file__).parent / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("[1/3] Tabel data_inovasi, users, activity_log siap.")


def import_excel(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM data_inovasi")
        jumlah = cur.fetchone()[0]

    if jumlah > 0:
        print(f"[2/3] Tabel data_inovasi sudah ada isinya ({jumlah} baris) — skip import.")
        return

    excel_path = Path(__file__).parent.parent / "data" / "data_inovasi.xlsx"
    if not excel_path.exists():
        excel_path = Path(__file__).parent.parent / "data_inovasi.xlsx"
    if not excel_path.exists():
        print(f"[2/3] PERINGATAN: file Excel tidak ditemukan di {excel_path}, skip import.")
        return

    df = pd.read_excel(excel_path)
    df.columns = df.columns.str.strip()

    def cari_kolom(keyword):
        for c in df.columns:
            if keyword.lower() in c.lower():
                return c
        return None

    col_judul    = cari_kolom("judul inovasi") or cari_kolom("nama inovasi")
    col_opd      = cari_kolom("admin opd")
    col_jenis    = cari_kolom("jenis")
    col_urusan   = cari_kolom("urusan utama")
    col_kematangan = cari_kolom("kematangan")
    col_tanggal  = cari_kolom("tanggal input")

    rows = []
    for _, row in df.iterrows():
        tanggal_iso = None
        if col_tanggal and pd.notna(row[col_tanggal]):
            parsed = pd.to_datetime(str(row[col_tanggal]), dayfirst=True, errors="coerce")
            if pd.notna(parsed):
                tanggal_iso = parsed.strftime("%Y-%m-%d")

        rows.append((
            str(row[col_judul]) if col_judul and pd.notna(row[col_judul]) else None,
            str(row[col_opd]) if col_opd and pd.notna(row[col_opd]) else None,
            str(row[col_jenis]) if col_jenis and pd.notna(row[col_jenis]) else None,
            str(row[col_urusan]) if col_urusan and pd.notna(row[col_urusan]) else None,
            float(row[col_kematangan]) if col_kematangan and pd.notna(row[col_kematangan]) else None,
            tanggal_iso,
        ))

    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO data_inovasi (judul_inovasi, admin_opd, jenis, urusan_utama, kematangan, tanggal_input)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
    conn.commit()
    print(f"[2/3] Import selesai: {len(rows)} baris dimasukkan ke data_inovasi.")


def buat_admin(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM users")
        jumlah = cur.fetchone()[0]

    if jumlah > 0:
        print(f"[3/3] Tabel users sudah ada isinya ({jumlah} akun) — skip pembuatan admin.")
        return

    print("[3/3] Belum ada user sama sekali. Buat akun admin pertama:")
    username = input("  Username admin: ").strip()
    password = getpass.getpass("  Password admin (tidak akan terlihat saat diketik): ").strip()

    if not username or not password:
        print("  Username/password kosong, dibatalkan. Jalankan ulang script ini kalau mau coba lagi.")
        return

    hashed = hash_password(password)
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, 'admin')",
            (username, hashed),
        )
    conn.commit()
    print(f"  Akun admin '{username}' berhasil dibuat.")


def main():
    print(f"Menghubungkan ke database...")
    conn = get_connection()
    try:
        jalankan_schema(conn)
        import_excel(conn)
        buat_admin(conn)
        print("\nSetup database selesai.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

"""
Migrasi sekali jalan: normalisasi kolom tanggal_input di tabel data_inovasi
dari format teks DD-MM-YYYY (mis. "22-07-2022") ke format ISO YYYY-MM-DD,
supaya aman di-cast ::date oleh Postgres berapa pun "datestyle" servernya.

Jalanin SEKALI SAJA setelah setup_database.py (kalau data_inovasi sudah
ke-import dengan format tanggal yang masih DD-MM-YYYY / bikin error
"date/time field value out of range" pas buka halaman Timeline).

Cara jalanin (dari folder backend/):
    python db/fix_tanggal_format.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg2
import pandas as pd
from core.config import settings


def main():
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    cur.execute("SELECT id, tanggal_input FROM data_inovasi WHERE tanggal_input IS NOT NULL")
    rows = cur.fetchall()
    print(f"Memeriksa {len(rows)} baris dengan tanggal_input terisi...")

    diperbaiki = 0
    gagal_parse = 0

    for id_, tgl in rows:
        tgl = str(tgl).strip()

        # Sudah format ISO (YYYY-MM-DD)? skip.
        if len(tgl) == 10 and tgl[4] == "-" and tgl[7] == "-":
            continue

        # Coba parse dayfirst=True (DD-MM-YYYY), fallback ke parser umum.
        parsed = pd.to_datetime(tgl, dayfirst=True, errors="coerce")
        if pd.isna(parsed):
            gagal_parse += 1
            print(f"  [!] Gagal parse id={id_}: '{tgl}' — dikosongkan jadi NULL.")
            cur.execute("UPDATE data_inovasi SET tanggal_input = NULL WHERE id = %s", (id_,))
            continue

        iso = parsed.strftime("%Y-%m-%d")
        cur.execute("UPDATE data_inovasi SET tanggal_input = %s WHERE id = %s", (iso, id_))
        diperbaiki += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nSelesai. {diperbaiki} tanggal diperbaiki ke format ISO, {gagal_parse} gagal di-parse (dikosongkan).")


if __name__ == "__main__":
    main()

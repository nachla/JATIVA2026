import pandas as pd
import numpy as np
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "data_inovasi.xlsx"

@lru_cache(maxsize=1)
def load_data() -> pd.DataFrame:
    """Baca Excel sekali, cache di memory, filter otomatis 2021-2025."""
    df = pd.read_excel(DATA_PATH)
    df.columns = df.columns.str.strip()

    # Cari kolom Tanggal Penerapan (prioritas) atau Tanggal Pengembangan
    col_tgl = None
    for c in df.columns:
        if "penerapan" in c.lower():
            col_tgl = c
            break
    if not col_tgl:
        for c in df.columns:
            if "pengembangan" in c.lower():
                col_tgl = c
                break

    # Filter 2021-2025
    if col_tgl:
        try:
            tahun = pd.to_datetime(df[col_tgl], errors="coerce").dt.year
            if tahun.isna().all():
                tahun = pd.to_numeric(df[col_tgl], errors="coerce")
            # df = df[tahun.between(2021, 2025)]
        except Exception:
            pass

    return df

def reload_data():
    """Paksa reload data (untuk admin upload baru)."""
    load_data.cache_clear()
    return load_data()

def find_col(df: pd.DataFrame, keyword: str) -> str | None:
    """Cari nama kolom yang mengandung keyword (case-insensitive)."""
    for col in df.columns:
        if keyword.lower() in col.lower():
            return col
    return None

def get_col_map(df: pd.DataFrame) -> dict:
    """Deteksi semua kolom penting secara otomatis."""
    return {
        "judul":       find_col(df, "nama inovasi") or find_col(df, "judul") or find_col(df, "inovasi"),
        "opd":         find_col(df, "opd") or find_col(df, "perangkat daerah"),
        "jenis":       find_col(df, "jenis"),
        "urusan":      find_col(df, "urusan"),
        "kematangan":  find_col(df, "kematangan") or find_col(df, "tingkat"),
        "tahapan":     find_col(df, "tahapan"),
        "bentuk":      find_col(df, "bentuk"),
        "asta":        find_col(df, "asta"),
        "inisiator":   find_col(df, "inisiator"),
        "urusan_lain": find_col(df, "urusan lain") or find_col(df, "berisiran") or find_col(df, "irisan"),
        "rancang":     find_col(df, "rancang bangun") or find_col(df, "pokok perubahan") or find_col(df, "deskripsi"),
        "kabupaten":   find_col(df, "admin opd") or find_col(df, "admin") or find_col(df, "kabupaten") or find_col(df, "kota") or find_col(df, "wilayah") or find_col(df, "pemda"),
        "tahun":       find_col(df, "tanggal penerapan") or find_col(df, "tanggal pengembangan") or find_col(df, "tahun"),
        "video":       find_col(df, "video"),
    }

def apply_filters(df: pd.DataFrame, cols: dict, filters: dict) -> pd.DataFrame:
    """Terapkan filter dari query params."""
    if filters.get("opd") and cols["opd"]:
        df = df[df[cols["opd"]] == filters["opd"]]
    if filters.get("jenis") and cols["jenis"]:
        df = df[df[cols["jenis"]] == filters["jenis"]]
    if filters.get("urusan") and cols["urusan"]:
        df = df[df[cols["urusan"]] == filters["urusan"]]
    if filters.get("kematangan") and cols["kematangan"]:
        df = df[df[cols["kematangan"]] == filters["kematangan"]]
    if filters.get("tahun") and cols["tahun"]:
        # Filter berdasarkan tahun dari kolom tanggal
        try:
            tahun_series = pd.to_datetime(df[cols["tahun"]], errors="coerce").dt.year
            if tahun_series.isna().all():
                tahun_series = pd.to_numeric(df[cols["tahun"]], errors="coerce")
            df = df[tahun_series == int(filters["tahun"])]
        except Exception:
            df = df[df[cols["tahun"]] == filters["tahun"]]
    return df

def safe_val(val):
    """Convert nilai pandas ke Python native (hindari NaN/Timestamp)."""
    if pd.isna(val):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    return val

# Daftar 38 kabupaten/kota Jawa Timur
KOTA_JATIM = [
    "Surabaya", "Malang", "Kediri", "Blitar", "Madiun", "Mojokerto",
    "Pasuruan", "Probolinggo", "Batu", "Sidoarjo", "Gresik", "Lamongan",
    "Tuban", "Bojonegoro", "Ngawi", "Magetan", "Ponorogo", "Pacitan",
    "Trenggalek", "Tulungagung", "Jombang", "Nganjuk", "Sampang",
    "Pamekasan", "Sumenep", "Bangkalan", "Jember", "Banyuwangi",
    "Bondowoso", "Situbondo", "Lumajang", "Kediri", "Blitar",
]

def ekstrak_kota(admin_opd: str) -> str | None:
    """Ekstrak nama kota/kabupaten dari teks Admin OPD."""
    if not admin_opd or pd.isna(admin_opd):
        return None
    teks = str(admin_opd).upper()
    for kota in KOTA_JATIM:
        if kota.upper() in teks:
            return kota
    return None

def tambah_kolom_kota(df: pd.DataFrame) -> pd.DataFrame:
    """Tambahkan kolom 'kota_ekstrak' berdasarkan Admin OPD."""
    cols = get_col_map(df)
    if cols["kabupaten"]:
        df = df.copy()
        df["kota_ekstrak"] = df[cols["kabupaten"]].apply(ekstrak_kota)
    return df
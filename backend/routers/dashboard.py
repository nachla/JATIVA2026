from fastapi import APIRouter
import pandas as pd

router = APIRouter()

EXCEL_PATH = "data/data_inovasi.xlsx"


@router.get("/dashboard/summary")
def get_dashboard_summary():

    df = pd.read_excel(EXCEL_PATH)

    # =========================
    # SUMMARY
    # =========================

    total_inovasi = len(df)

    inovasi_aktif = len(
        df[
            df["Tahapan Inovasi"]
            .astype(str)
            .str.contains("Penerapan", case=False, na=False)
        ]
    )

    perangkat_daerah = df["Admin OPD"].nunique()

    inovasi_digital = len(
        df[
            df["Jenis"]
            .astype(str)
            .str.contains("Digital", case=False, na=False)
        ]
    )

    # =========================
    # TREND TAHUN
    # =========================

    df["Tanggal Input"] = pd.to_datetime(
        df["Tanggal Input"],
        errors="coerce",
        dayfirst=True
    )

    trend = (
        df.groupby(df["Tanggal Input"].dt.year)
        .size()
        .reset_index(name="total")
    )

    trend_data = [
        {
            "year": str(int(row["Tanggal Input"])),
            "total": int(row["total"])
        }
        for _, row in trend.iterrows()
        if pd.notnull(row["Tanggal Input"])
    ]

    # =========================
    # KATEGORI
    # =========================

    kategori = (
        df["Jenis"]
        .value_counts()
        .reset_index()
    )

    kategori.columns = ["name", "value"]

    kategori_data = kategori.to_dict(orient="records")

    # =========================
    # WILAYAH
    # =========================

    wilayah = (
        df["Pemda"]
        .value_counts()
        .head(15)
        .reset_index()
    )

    wilayah.columns = ["nama", "total"]

    wilayah_data = wilayah.to_dict(orient="records")

    # =========================
    # RETURN
    # =========================

    return {
        "total_inovasi": int(total_inovasi),
        "inovasi_aktif": int(inovasi_aktif),
        "perangkat_daerah": int(perangkat_daerah),
        "inovasi_digital": int(inovasi_digital),
        "trend_data": trend_data,
        "kategori_data": kategori_data,
        "wilayah_data": wilayah_data,
    }
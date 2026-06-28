from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from core.config import settings
from core.middleware import get_current_user
from schemas.auth import UserInfo
from services.data_service import load_data, get_col_map, safe_val
from services import pml_service, nlp_service
import io
import pandas as pd

router = APIRouter(prefix="/ai", tags=["ai"])
client = Groq(api_key=settings.GROQ_API_KEY)

# ==============================
# SCHEMAS
# ==============================
class KolaborasiRequest(BaseModel):
    inovasi_list: list[str]

class PrediksiRequest(BaseModel):
    judul: str

class PolicyRequest(BaseModel):
    urusan: str

class RancangRequest(BaseModel):
    judul: str

class RekomendasiRequest(BaseModel):
    urusan: str
    rata_kematangan: float
    jumlah_inovasi: int
    contoh_inovasi: list[str]

class KolaborasiWilayahRequest(BaseModel):
    kota1: str
    inovasi_kota1: list[str]
    kota2: str
    inovasi_kota2: list[str]
    jarak: str

# ==============================
# HELPER
# ==============================
def get_rancang_text(judul, df, cols):
    if not cols["rancang"] or not cols["judul"]:
        return "Tidak tersedia"
    baris = df[df[cols["judul"]] == judul]
    if baris.empty:
        return "Tidak tersedia"
    val = baris.iloc[0].get(cols["rancang"], "Tidak tersedia")
    val = str(val) if pd.notna(val) else "Tidak tersedia"
    return val[:400] + "..." if len(val) > 400 else val

def get_row_val(row, col):
    if not col:
        return "Tidak diketahui"
    val = row.get(col)
    return str(val) if val is not None and pd.notna(val) else "Tidak diketahui"

def trl_label(kematangan):
    """Konversi kematangan 1-5 ke Technology Readiness Level (TRL) 1-9."""
    try:
        k = float(kematangan)
        if k <= 1: return "TRL 1-2 (Konsep dasar)"
        if k <= 2: return "TRL 3-4 (Proof of concept)"
        if k <= 3: return "TRL 5-6 (Prototipe/Validasi)"
        if k <= 4: return "TRL 7-8 (Demonstrasi/Implementasi)"
        return "TRL 9 (Operasional penuh)"
    except:
        return "TRL tidak diketahui"


def get_konteks_analitik_judul(judul: str) -> str:
    """
    Gabungan konteks PML (klasifikasi + clustering) dan NLP (topic modeling)
    untuk satu judul inovasi tertentu. Disisipkan ke prompt Groq supaya
    jawaban AI didasarkan pada hasil analisis data, bukan cuma metadata mentah.
    Aman dipanggil meski model belum siap (mengembalikan string kosong).
    """
    try:
        bagian_pml = pml_service.get_pml_context_for_judul(judul)
    except Exception:
        bagian_pml = ""
    try:
        bagian_topik = nlp_service.get_topic_context_for_judul(judul)
    except Exception:
        bagian_topik = ""

    gabungan = "\n".join(b for b in [bagian_pml, bagian_topik] if b)
    return gabungan


def get_konteks_analitik_urusan(judul_list: list[str]) -> str:
    """Gabungan konteks PML + NLP untuk kumpulan judul dalam satu urusan pemerintahan."""
    try:
        bagian_pml = pml_service.get_pml_context_for_urusan(judul_list)
    except Exception:
        bagian_pml = ""
    try:
        bagian_topik = nlp_service.get_topic_context_for_urusan(judul_list)
    except Exception:
        bagian_topik = ""

    gabungan = "\n".join(b for b in [bagian_pml, bagian_topik] if b)
    return gabungan

def build_pdf(judul_doc, sub, konten, profil=None):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=2.5*cm, leftMargin=2.5*cm,
        topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    def s(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    style_kop    = s("kop",    fontName="Helvetica",      fontSize=13, leading=18, alignment=TA_CENTER, spaceAfter=2)
    style_kopsub = s("kopsub", fontName="Helvetica",      fontSize=10, alignment=TA_CENTER, spaceAfter=8)
    style_bab    = s("bab",    fontName="Helvetica-Bold", fontSize=12, spaceBefore=14, spaceAfter=6)
    style_subbab = s("subbab", fontName="Helvetica-Bold", fontSize=11, spaceBefore=10, spaceAfter=4)
    style_isi    = s("isi",    fontName="Helvetica",      fontSize=10, leading=15, alignment=TA_JUSTIFY, spaceAfter=6)
    style_profil = s("profil", fontName="Helvetica",      fontSize=10, leading=14, spaceAfter=3)

    def clean(text):
        text = str(text)
        for emoji in ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","📌","🏛️","📂","📋","🔗","🏗️","🎯","📈","👤","⭐"]:
            text = text.replace(emoji, "")
        return text.encode('latin-1', errors='replace').decode('latin-1').strip()

    elements = []
    elements.append(Paragraph(clean(judul_doc), style_kop))
    elements.append(Paragraph("Pemerintah Daerah: Provinsi Jawa Timur", style_kopsub))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1F4E79")))
    elements.append(Spacer(1, 0.4*cm))

    if sub:
        elements.append(Paragraph(clean(sub), style_kopsub))
        elements.append(Spacer(1, 0.2*cm))

    if profil:
        elements.append(Paragraph("1. PROFIL INOVASI", style_bab))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
        elements.append(Spacer(1, 0.2*cm))
        for label, val in profil.items():
            if val and val != "Tidak diketahui":
                elements.append(Paragraph(f'<font name="Helvetica-Bold">{clean(label)}</font>', style_profil))
                elements.append(Paragraph(clean(val), style_profil))
                elements.append(Spacer(1, 0.1*cm))
        elements.append(Spacer(1, 0.3*cm))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
        elements.append(Spacer(1, 0.2*cm))
        elements.append(Paragraph("1.10. Rancang Bangun dan Pokok Perubahan Yang Dilakukan", style_bab))
        elements.append(Spacer(1, 0.2*cm))

    for line in konten.split('\n'):
        line_clean = clean(line).strip()
        if not line_clean:
            elements.append(Spacer(1, 0.2*cm))
            continue
        upper = line_clean.upper()
        if any(upper.startswith(x) for x in ["A.", "B.", "C.", "D."]):
            elements.append(Paragraph(line_clean, style_subbab))
        elif line_clean.startswith("1.") or line_clean.startswith("2."):
            elements.append(Paragraph(f"<b>{line_clean}</b>", style_isi))
        else:
            elements.append(Paragraph(line_clean, style_isi))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()

# ==============================
# ENDPOINTS
# ==============================

# 1. Kolaborasi — berbasis Kerangka Sinergi Inovasi Kemendagri
@router.post("/kolaborasi")
def kolaborasi(body: KolaborasiRequest, current_user: UserInfo = Depends(get_current_user)):
    if len(body.inovasi_list) < 2:
        raise HTTPException(status_code=400, detail="Minimal 2 inovasi")

    df = load_data()
    cols = get_col_map(df)

    from itertools import combinations
    results = []
    for inv1, inv2 in list(combinations(body.inovasi_list, 2))[:5]:
        rb1 = get_rancang_text(inv1, df, cols)
        rb2 = get_rancang_text(inv2, df, cols)
        konteks1 = get_konteks_analitik_judul(inv1)
        konteks2 = get_konteks_analitik_judul(inv2)
        blok_konteks = ""
        if konteks1 or konteks2:
            blok_konteks = f"""
{f"[Inovasi 1] {konteks1}" if konteks1 else ""}
{f"[Inovasi 2] {konteks2}" if konteks2 else ""}
"""

        prompt = f"""
Kamu adalah analis inovasi pemerintahan daerah Indonesia yang berpengalaman.

Analisis potensi kolaborasi dua inovasi berikut menggunakan KERANGKA SINERGI INOVASI DAERAH
berdasarkan Permendagri No. 104 Tahun 2018 tentang Penilaian Inovasi Daerah:

INOVASI 1: {inv1}
Rancang Bangun: {rb1}

INOVASI 2: {inv2}
Rancang Bangun: {rb2}
{blok_konteks}
Analisis menggunakan 4 dimensi kerangka sinergi inovasi daerah:

1. JUDUL KOLABORASI
   Rumuskan nama program kolaborasi yang mencerminkan sinergi kedua inovasi.

2. MANFAAT KOLABORASI
   Uraikan manfaat konkret bagi: (a) pelayanan publik, (b) efisiensi OPD, (c) masyarakat.
   Kaitkan dengan indikator Indeks Inovasi Daerah (IID) Kemendagri.

3. ALASAN SINERGI
   Jelaskan keterkaitan fungsional kedua inovasi berdasarkan:
   - Kesamaan urusan pemerintahan
   - Potensi integrasi sistem/proses
   - Relevansi dengan Asta Cita pembangunan daerah

4. DAMPAK DAN REKOMENDASI TINDAK LANJUT
   Proyeksikan dampak kolaborasi terhadap peningkatan skor kematangan inovasi
   dan langkah konkret yang perlu dilakukan OPD terkait.

Jika ada bagian "KONTEKS ANALISIS DATA" di atas, manfaatkan temuan klasifikasi/clustering/topic
modeling tersebut untuk memperkuat argumen, terutama pada bagian ALASAN SINERGI dan DAMPAK.

Gunakan bahasa formal pemerintahan Indonesia. Jawab terstruktur sesuai 4 dimensi di atas.
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=900, temperature=0.7,
        )
        results.append({
            "judul": f"{inv1} + {inv2}",
            "hasil": response.choices[0].message.content
        })
    return results


# 2. Prediksi Keberhasilan — berbasis Technology Readiness Level (TRL)
@router.post("/prediksi")
def prediksi(body: PrediksiRequest, current_user: UserInfo = Depends(get_current_user)):
    df = load_data()
    cols = get_col_map(df)

    if not cols["judul"]:
        raise HTTPException(status_code=400, detail="Kolom judul tidak ditemukan")

    baris = df[df[cols["judul"]] == body.judul]
    if baris.empty:
        raise HTTPException(status_code=404, detail="Inovasi tidak ditemukan")

    row = baris.iloc[0]
    opd_val     = get_row_val(row, cols["opd"])
    jenis_val   = get_row_val(row, cols["jenis"])
    urusan_val  = get_row_val(row, cols["urusan"])
    kem_val     = get_row_val(row, cols["kematangan"])
    rancang_val = get_row_val(row, cols["rancang"])
    rancang_val = rancang_val[:600] + "..." if len(rancang_val) > 600 else rancang_val
    trl         = trl_label(kem_val)
    konteks_analitik = get_konteks_analitik_judul(body.judul)

    prompt = f"""
Kamu adalah analis inovasi pemerintahan daerah Indonesia yang berpengalaman.

Lakukan penilaian keberhasilan inovasi berikut menggunakan KERANGKA TECHNOLOGY READINESS LEVEL (TRL)
yang diadaptasi untuk konteks inovasi pemerintahan daerah Indonesia (Permendagri No. 104/2018):

DATA INOVASI:
- Nama Inovasi    : {body.judul}
- OPD             : {opd_val}
- Jenis Inovasi   : {jenis_val}
- Urusan          : {urusan_val}
- Tingkat Kematangan: {kem_val}/5 → setara {trl}
- Rancang Bangun  : {rancang_val}
{f"{chr(10)}{konteks_analitik}{chr(10)}" if konteks_analitik else ""}
Berikan penilaian berdasarkan 5 komponen TRL yang diadaptasi:

1. SKOR KEBERHASILAN (0–100)
   Hitung berdasarkan bobot: Kematangan (40%) + Kelengkapan Rancang Bangun (30%) +
   Relevansi Urusan (20%) + Potensi Replikasi (10%).
   Tampilkan skor akhir dan rincian per komponen.
   Jika ada KONTEKS ANALISIS DATA (PML/NLP) di atas, pertimbangkan juga keyakinan model
   klasifikasi dan posisi kluster inovasi ini sebagai sinyal pendukung skor.

2. ANALISIS TRL SAAT INI
   Jelaskan posisi inovasi pada skala TRL dan apa yang perlu dilakukan untuk naik ke level berikutnya.

3. FAKTOR PENDUKUNG
   Identifikasi minimal 3 faktor internal dan eksternal yang mendukung keberhasilan.

4. RISIKO DAN MITIGASI
   Identifikasi minimal 2 risiko utama beserta strategi mitigasinya.

5. REKOMENDASI PENGEMBANGAN
   Berikan rekomendasi konkret untuk meningkatkan tingkat kematangan inovasi ini,
   dikaitkan dengan indikator Indeks Inovasi Daerah (IID) Kemendagri.

Gunakan bahasa formal pemerintahan Indonesia.
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1100, temperature=0.7,
    )
    return {
        "judul": body.judul,
        "data": {"OPD": opd_val, "Jenis": jenis_val, "Urusan": urusan_val,
                 "Kematangan": f"{kem_val}/5 ({trl})"},
        "hasil": response.choices[0].message.content
    }


# 3. Policy Brief — berbasis format Kemendagri
@router.post("/policy")
def policy_brief(body: PolicyRequest, current_user: UserInfo = Depends(get_current_user)):
    df = load_data()
    cols = get_col_map(df)

    df_urusan = df[df[cols["urusan"]] == body.urusan] if cols["urusan"] else df
    total = len(df_urusan)
    opd_list   = df_urusan[cols["opd"]].dropna().unique().tolist()[:10] if cols["opd"] else []
    judul_list = df_urusan[cols["judul"]].dropna().tolist()[:10] if cols["judul"] else []

    try:
        rata = round(float(df_urusan[cols["kematangan"]].mean()), 1) if cols["kematangan"] else None
        kem_str = f"{rata}/5 ({trl_label(rata)})" if rata else "N/A"
    except:
        kem_str = "N/A"

    semua_judul_urusan = df_urusan[cols["judul"]].dropna().tolist() if cols["judul"] else []
    konteks_analitik = get_konteks_analitik_urusan(semua_judul_urusan)

    prompt = f"""
Kamu adalah analis kebijakan pemerintahan daerah Indonesia yang berpengalaman.

Susun Policy Brief untuk BRIDA Provinsi Jawa Timur menggunakan FORMAT RESMI POLICY BRIEF
KEMENDAGRI berdasarkan Pedoman Penyusunan Policy Brief Badan Riset dan Inovasi Nasional (BRIN):

DATA DASAR:
- Urusan Pemerintahan : {body.urusan}
- Total Inovasi       : {total} inovasi
- OPD Terlibat        : {', '.join(opd_list)}
- Rata-rata Kematangan: {kem_str}
- Contoh Inovasi      : {', '.join(judul_list[:8])}
{f"{chr(10)}{konteks_analitik}{chr(10)}" if konteks_analitik else ""}
Susun Policy Brief dengan struktur RESMI berikut:

JUDUL POLICY BRIEF
[Rumuskan judul yang spesifik dan actionable]

1. RINGKASAN EKSEKUTIF (maks. 150 kata)
   Gambaran singkat kondisi, masalah, dan rekomendasi utama.

2. LATAR BELAKANG DAN KONTEKS KEBIJAKAN
   Jelaskan urgensi urusan ini dalam konteks RPJMD Jawa Timur dan agenda Asta Cita.

3. ANALISIS SITUASI INOVASI
   Analisis data inovasi: distribusi kematangan, gap, dan peluang berdasarkan data di atas.
   Sertakan analisis menggunakan kerangka IID (Indeks Inovasi Daerah) Kemendagri.
   Jika ada KONTEKS ANALISIS DATA (PML/NLP) di atas, jadikan temuan klasifikasi, clustering,
   dan tema dominan topic modeling sebagai bukti pendukung analisis (bukan cuma data agregat biasa).

4. REKOMENDASI KEBIJAKAN
   Minimal 3 rekomendasi konkret, terukur, dan dapat diimplementasikan dalam 1 tahun anggaran.
   Setiap rekomendasi harus mencantumkan: target, indikator keberhasilan, dan OPD penanggung jawab.

5. LANGKAH TINDAK LANJUT
   Prioritas aksi jangka pendek (3 bulan), menengah (6 bulan), dan panjang (1 tahun).

Gunakan bahasa formal pemerintahan Indonesia. Maksimal 800 kata.
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500, temperature=0.6,
    )
    hasil = response.choices[0].message.content
    return {
        "urusan": body.urusan,
        "data": {"total": total, "opd": opd_list, "kematangan": kem_str},
        "hasil": hasil
    }


# 4. Rancang Bangun — format resmi Laporan Inovasi Daerah Kemendagri
@router.post("/rancang")
def rancang_bangun(body: RancangRequest, current_user: UserInfo = Depends(get_current_user)):
    df = load_data()
    cols = get_col_map(df)

    if not cols["judul"]:
        raise HTTPException(status_code=400, detail="Kolom judul tidak ditemukan")

    baris = df[df[cols["judul"]] == body.judul]
    if baris.empty:
        raise HTTPException(status_code=404, detail="Inovasi tidak ditemukan")

    row = baris.iloc[0]
    data = {k: get_row_val(row, cols[k]) for k in
            ["opd","jenis","urusan","kematangan","urusan_lain","bentuk","asta","tahapan","inisiator"]}
    trl = trl_label(data["kematangan"])
    konteks_analitik = get_konteks_analitik_judul(body.judul)

    prompt = f"""
Kamu adalah analis inovasi pemerintahan daerah Indonesia yang berpengalaman.

Susun dokumen Rancang Bangun dan Pokok Perubahan menggunakan FORMAT RESMI
LAPORAN INOVASI DAERAH sesuai Permendagri No. 104 Tahun 2018 dan
Pedoman Teknis Penginputan Data Inovasi Daerah Kemendagri:

DATA INOVASI:
- Nama Inovasi     : {body.judul}
- OPD              : {data['opd']}
- Jenis Inovasi    : {data['jenis']}
- Urusan Utama     : {data['urusan']}
- Urusan Berisiran : {data['urusan_lain']}
- Bentuk Inovasi   : {data['bentuk']}
- Asta Cita        : {data['asta']}
- Tahapan          : {data['tahapan']} → {trl}
- Inisiator        : {data['inisiator']}
- Kematangan       : {data['kematangan']}/5
{f"{chr(10)}{konteks_analitik}{chr(10)}" if konteks_analitik else ""}
Susun dokumen dengan TEPAT mengikuti struktur resmi Kemendagri:

A. DASAR HUKUM
   Sebutkan minimal 3 regulasi yang relevan (UU, PP, Permendagri, Perda).
   Jelaskan relevansi tiap regulasi terhadap inovasi ini.

B. PERMASALAHAN
   Uraikan permasalahan yang melatarbelakangi inovasi berdasarkan:
   - Kondisi riil di lapangan sebelum inovasi
   - Kesenjangan layanan yang terjadi
   - Data/fakta pendukung (estimasi boleh)

C. ISU STRATEGIS
   Identifikasi 3-5 isu strategis mengacu pada:
   - RPJMD Jawa Timur
   - Agenda Asta Cita yang relevan
   - Standar pelayanan minimal (SPM) urusan terkait

D. METODE PEMBAHARUAN
   1. Kondisi Sebelum Adanya Inovasi
      Deskripsikan kondisi layanan/program sebelum inovasi — apa yang kurang efisien.

   2. Kondisi Setelah Adanya Inovasi
      Deskripsikan perubahan nyata setelah inovasi — perbaikan proses dan dampak terhadap
      peningkatan Indeks Inovasi Daerah (IID) Kemendagri.

Gunakan bahasa formal sesuai standar dokumen pemerintahan Indonesia.
Jangan tambahkan bagian di luar struktur A-D di atas.
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2500, temperature=0.6,
    )
    return {
        "judul": body.judul, **data,
        "hasil": response.choices[0].message.content
    }


# 5. Rekomendasi Tindak Lanjut — berbasis IID Kemendagri
@router.post("/rekomendasi")
def rekomendasi_tindak_lanjut(body: RekomendasiRequest, current_user: UserInfo = Depends(get_current_user)):
    trl = trl_label(body.rata_kematangan)
    status = (
        "sangat rendah — perlu intervensi segera" if body.rata_kematangan < 2.5
        else "sedang — perlu akselerasi" if body.rata_kematangan < 3.5
        else "baik — perlu dipertahankan dan direplikasi"
    )
    konteks_analitik = get_konteks_analitik_urusan(body.contoh_inovasi)

    prompt = f"""
Kamu adalah konsultan inovasi pemerintahan daerah Indonesia yang berpengalaman.

Berikan rekomendasi tindak lanjut untuk BRIDA Provinsi Jawa Timur menggunakan
KERANGKA INDEKS INOVASI DAERAH (IID) Kemendagri dan prinsip-prinsip
Manajemen Inovasi Sektor Publik (OECD Public Innovation Framework):

DATA URUSAN:
- Urusan Pemerintahan  : {body.urusan}
- Rata-rata Kematangan : {body.rata_kematangan:.2f}/5 → {trl}
- Status               : {status}
- Jumlah Inovasi       : {body.jumlah_inovasi}
{f"{chr(10)}{konteks_analitik}{chr(10)}" if konteks_analitik else ""}
Susun rekomendasi dengan 5 komponen IID:

1. DIAGNOSIS KONDISI
   Analisis posisi urusan ini dalam skala IID Kemendagri.
   Bandingkan dengan rata-rata nasional jika memungkinkan.

2. IDENTIFIKASI AKAR MASALAH
   Gunakan pendekatan fishbone/ishikawa untuk mengidentifikasi penyebab
   rendahnya kematangan atau sedikitnya inovasi di urusan ini.

3. REKOMENDASI INTERVENSI
   Minimal 3 rekomendasi berbasis bukti (evidence-based) mengacu pada:
   - Best practice inovasi daerah di Indonesia
   - Standar OECD untuk inovasi sektor publik
   Setiap rekomendasi harus: konkret, terukur, dan realistis dalam anggaran daerah.

4. PRIORITAS AKSI (3 BULAN KE DEPAN)
   2 aksi paling mendesak dengan target yang jelas dan OPD penanggung jawab.

5. INDIKATOR KEBERHASILAN
   KPI yang terukur untuk memantau kemajuan dalam 6 dan 12 bulan ke depan,
   mengacu pada dimensi penilaian IID Kemendagri.

Gunakan bahasa formal pemerintahan Indonesia.
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200, temperature=0.6,
    )
    return {"urusan": body.urusan, "hasil": response.choices[0].message.content}


# 6. Kolaborasi Wilayah — berbasis Haversine + Sinergi Inovasi
@router.post("/kolaborasi-wilayah")
def kolaborasi_wilayah(body: KolaborasiWilayahRequest, current_user: UserInfo = Depends(get_current_user)):
    konteks1 = get_konteks_analitik_urusan(body.inovasi_kota1)
    konteks2 = get_konteks_analitik_urusan(body.inovasi_kota2)
    blok_konteks = ""
    if konteks1 or konteks2:
        blok_konteks = f"""
{f"[{body.kota1}] {konteks1}" if konteks1 else ""}
{f"[{body.kota2}] {konteks2}" if konteks2 else ""}
"""

    prompt = f"""
Kamu adalah analis inovasi pemerintahan daerah Indonesia yang berpengalaman.

Analisis potensi kolaborasi inovasi antar dua daerah menggunakan
KERANGKA KERJASAMA ANTAR DAERAH (KAD) sesuai PP No. 28 Tahun 2018
tentang Kerja Sama Daerah:

DATA WILAYAH:
- Daerah 1: {body.kota1} | Inovasi unggulan: {', '.join(body.inovasi_kota1)}
- Daerah 2: {body.kota2} | Inovasi unggulan: {', '.join(body.inovasi_kota2)}
- Jarak geografis: {body.jarak} km
{blok_konteks}
Analisis dengan 4 dimensi KAD:

1. POTENSI SINERGI INOVASI
   Identifikasi titik temu inovasi kedua daerah berdasarkan:
   - Kesamaan atau komplementaritas urusan pemerintahan
   - Potensi berbagi sumber daya dan infrastruktur

2. REKOMENDASI PROGRAM KOLABORASI
   2-3 program kolaborasi konkret yang sesuai mekanisme KAD (PP 28/2018),
   mencakup: nama program, skema kerja sama, dan OPD koordinator.

3. MANFAAT KOLABORASI
   Proyeksi manfaat bagi kedua daerah dalam konteks:
   - Peningkatan Indeks Inovasi Daerah (IID)
   - Efisiensi anggaran daerah
   - Peningkatan kualitas pelayanan publik

4. LANGKAH TINDAK LANJUT
   Tahapan inisiasi KAD sesuai PP 28/2018, mulai dari pra-kerja sama
   hingga penandatanganan MOU antar kepala daerah.

Gunakan bahasa formal pemerintahan Indonesia. Jawab ringkas dan actionable.
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000, temperature=0.7,
    )
    return {"hasil": response.choices[0].message.content}


# ── PDF Downloads ──
@router.post("/policy/pdf")
def policy_pdf(body: dict, current_user: UserInfo = Depends(get_current_user)):
    urusan = body.get("urusan", "")
    konten = body.get("konten", "")
    pdf = build_pdf("POLICY BRIEF", f"Urusan Pemerintahan: {urusan}", konten)
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=policy_brief_{urusan[:30]}.pdf"})

@router.post("/rancang/pdf")
def rancang_pdf(body: dict, current_user: UserInfo = Depends(get_current_user)):
    judul  = body.get("judul", "")
    konten = body.get("konten", "")
    profil = body.get("profil", {})
    pdf = build_pdf("LAPORAN INOVASI DAERAH", judul, konten, profil)
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=laporan_{judul[:30]}.pdf"})

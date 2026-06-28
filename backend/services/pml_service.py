"""
Service untuk analisis Predictive Machine Learning (PML):
- Klasifikasi jenis inovasi (Random Forest)
- Clustering inovasi (K-Means)

Sebelumnya analisis ini hanya ada di notebook eksperimen (offline).
Modul ini memindahkan logikanya ke backend agar hasilnya bisa dipakai
sebagai KONTEKS TAMBAHAN saat membangun prompt untuk fitur AI generatif
(Kolaborasi, Prediksi Keberhasilan, Policy Brief, Rancang Bangun,
Rekomendasi Tindak Lanjut) di routers/ai.py — sesuai konsep "JATIVA AI"
yang menggabungkan PML + NLP + LLM (Groq).
"""

import time
import numpy as np
import pandas as pd
from collections import Counter
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report

from services.data_service import load_data, get_col_map, safe_val
from services.nlp_service import _get_processed_data


def _label_encode_safe(series: pd.Series) -> tuple[np.ndarray, dict]:
    """Label-encode sebuah kolom kategorikal, isi NaN dengan 'Tidak diketahui'."""
    s = series.fillna("Tidak diketahui").astype(str)
    le = LabelEncoder()
    encoded = le.fit_transform(s)
    return encoded, {cls: i for i, cls in enumerate(le.classes_)}


@lru_cache(maxsize=1)
def _build_feature_table():
    """
    Susun tabel fitur gabungan: TF-IDF (200 kata teratas dari judul yang sudah
    di-preprocess NLP) + fitur kategorikal/numerik (Kematangan, Video,
    Bentuk Inovasi, Urusan Utama, Asta Cipta, panjang judul).
    Di-cache supaya tidak diulang setiap kali ada request AI.
    """
    t0 = time.time()
    df = load_data()
    cols = get_col_map(df)
    records, judul_col, _ = _get_processed_data()

    if not records or not judul_col:
        return None

    tokens_map = {r["judul"]: r["tokens"] for r in records}
    df = df.copy()
    df["_tokens"] = df[judul_col].astype(str).map(lambda j: " ".join(tokens_map.get(j, [])))

    # Target: Jenis inovasi
    jenis_col = cols.get("jenis")
    if not jenis_col:
        return None
    df = df[df[jenis_col].notna()].reset_index(drop=True)

    # TF-IDF 200 kata teratas dari judul yang sudah diproses NLP
    tfidf = TfidfVectorizer(max_features=200)
    X_tfidf = tfidf.fit_transform(df["_tokens"]).toarray()

    # Fitur kategorikal/numerik
    kematangan = pd.to_numeric(df[cols["kematangan"]], errors="coerce").fillna(0).values if cols.get("kematangan") else np.zeros(len(df))
    video_bin = df[cols["video"]].astype(str).str.lower().str.contains("ada").astype(int).values if cols.get("video") else np.zeros(len(df))
    panjang_judul = df["_tokens"].str.split().apply(len).values

    bentuk_enc, _ = _label_encode_safe(df[cols["bentuk"]]) if cols.get("bentuk") else (np.zeros(len(df)), {})
    urusan_enc, _ = _label_encode_safe(df[cols["urusan"]]) if cols.get("urusan") else (np.zeros(len(df)), {})
    asta_enc, _ = _label_encode_safe(df[cols["asta"]]) if cols.get("asta") else (np.zeros(len(df)), {})

    extra_features = np.column_stack([
        kematangan, video_bin, panjang_judul, bentuk_enc, urusan_enc, asta_enc,
    ])

    X = np.hstack([X_tfidf, extra_features])

    le_target = LabelEncoder()
    y = le_target.fit_transform(df[jenis_col].astype(str))

    print(f"[PML-TIMING] _build_feature_table(): {time.time() - t0:.2f}s, shape={X.shape}")

    return {
        "df": df,
        "judul_col": judul_col,
        "jenis_col": jenis_col,
        "X": X,
        "y": y,
        "le_target": le_target,
        "kematangan": kematangan,
        "video_bin": video_bin,
        "urusan_enc": urusan_enc,
    }


@lru_cache(maxsize=1)
def get_classification_model():
    """
    Latih Random Forest untuk klasifikasi jenis inovasi (Digital/Non Digital/Teknologi).
    Di-cache (di-training sekali saja per siklus hidup server).
    """
    t0 = time.time()
    data = _build_feature_table()
    if data is None:
        return None

    X, y = data["X"], data["y"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, random_state=42, max_depth=20)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    test_acc = round(float(accuracy_score(y_test, y_pred)) * 100, 2)
    cv_scores = cross_val_score(model, X, y, cv=5)
    cv_mean = round(float(cv_scores.mean()) * 100, 2)

    le_target = data["le_target"]
    report = classification_report(
        y_test, y_pred, target_names=le_target.classes_, output_dict=True, zero_division=0
    )

    # Prediksi untuk seluruh data (dipakai untuk lookup konteks per-judul)
    all_pred_proba = model.predict_proba(X)
    judul_pred_map = {}
    df = data["df"]
    for i, judul in enumerate(df[data["judul_col"]].astype(str)):
        proba = all_pred_proba[i]
        pred_idx = int(np.argmax(proba))
        judul_pred_map[judul] = {
            "prediksi": le_target.classes_[pred_idx],
            "confidence": round(float(proba[pred_idx]) * 100, 1),
            "aktual": le_target.inverse_transform([y[i]])[0],
        }

    print(f"[PML-TIMING] get_classification_model() training: {time.time() - t0:.2f}s | test_acc={test_acc}% cv_mean={cv_mean}%")

    return {
        "model": model,
        "test_acc": test_acc,
        "cv_mean": cv_mean,
        "classification_report": report,
        "judul_pred_map": judul_pred_map,
        "kelas": list(le_target.classes_),
    }


@lru_cache(maxsize=1)
def get_clustering_model(n_clusters: int = 2):
    """
    K-Means clustering inovasi berdasarkan Kematangan, kelengkapan Video,
    dan domain Urusan — dipakai untuk profil "tingkat kematangan & dokumentasi"
    tiap inovasi/urusan sebagai konteks tambahan ke prompt AI.
    """
    t0 = time.time()
    data = _build_feature_table()
    if data is None:
        return None

    fitur = np.column_stack([data["kematangan"], data["video_bin"], data["urusan_enc"]])
    scaler = StandardScaler()
    fitur_scaled = scaler.fit_transform(fitur)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(fitur_scaled)

    df = data["df"]
    judul_cluster_map = {}
    profiles_raw = {}
    for k in range(n_clusters):
        mask = labels == k
        profiles_raw[k] = {
            "jumlah": int(mask.sum()),
            "rata_kematangan": round(float(data["kematangan"][mask].mean()), 1) if mask.sum() else 0,
            "persen_video": round(float(data["video_bin"][mask].mean()) * 100, 1) if mask.sum() else 0,
        }

    for i, judul in enumerate(df[data["judul_col"]].astype(str)):
        judul_cluster_map[judul] = int(labels[i])

    # Label naratif tiap kluster, urut dari rata-rata kematangan tertinggi
    urutan = sorted(profiles_raw.items(), key=lambda kv: kv[1]["rata_kematangan"], reverse=True)
    label_map = {}
    for rank, (k, prof) in enumerate(urutan):
        if rank == 0:
            label_map[k] = "kematangan tinggi & terdokumentasi baik"
        elif rank == len(urutan) - 1:
            label_map[k] = "kematangan rendah & minim dokumentasi"
        else:
            label_map[k] = "kematangan menengah"

    profiles = [
        {
            "cluster_id": k,
            "label": label_map[k],
            **profiles_raw[k],
        }
        for k in range(n_clusters)
    ]

    print(f"[PML-TIMING] get_clustering_model(): {time.time() - t0:.2f}s")

    return {"profiles": profiles, "judul_cluster_map": judul_cluster_map}


# ──────────────────────────────────────────────────────────────────────
# Helper konteks untuk prompt AI (dipanggil dari routers/ai.py)
# ──────────────────────────────────────────────────────────────────────

def get_pml_context_for_judul(judul: str) -> str:
    """
    Ringkasan hasil PML (prediksi klasifikasi + kluster) untuk satu judul
    inovasi tertentu. Dipakai sebagai konteks tambahan di prompt AI
    (Prediksi Keberhasilan, Rancang Bangun, Kolaborasi).
    """
    baris = []

    clf = get_classification_model()
    if clf and judul in clf["judul_pred_map"]:
        p = clf["judul_pred_map"][judul]
        cocok = "sesuai" if p["prediksi"] == p["aktual"] else f"berbeda dari jenis aktual ({p['aktual']})"
        baris.append(
            f"Model klasifikasi (Random Forest, akurasi uji {clf['test_acc']}%) memprediksi jenis "
            f"inovasi ini sebagai '{p['prediksi']}' dengan keyakinan {p['confidence']}% — {cocok}."
        )

    clus = get_clustering_model()
    if clus and judul in clus["judul_cluster_map"]:
        cid = clus["judul_cluster_map"][judul]
        prof = next((pr for pr in clus["profiles"] if pr["cluster_id"] == cid), None)
        if prof:
            baris.append(
                f"Hasil clustering K-Means menempatkan inovasi ini pada kelompok dengan {prof['label']} "
                f"(rata-rata skor kematangan kelompok {prof['rata_kematangan']}, "
                f"{prof['persen_video']}% kelompok ini sudah dilengkapi video dokumentasi)."
            )

    if not baris:
        return ""
    return "KONTEKS ANALISIS DATA (PML — Machine Learning):\n" + "\n".join(f"- {b}" for b in baris)


def get_pml_context_for_urusan(judul_list: list[str]) -> str:
    """
    Ringkasan agregat hasil PML untuk kumpulan judul inovasi dalam satu
    urusan pemerintahan — dipakai di Policy Brief dan Rekomendasi Tindak Lanjut.
    """
    if not judul_list:
        return ""

    baris = []
    clf = get_classification_model()
    if clf:
        prediksi_list = [clf["judul_pred_map"][j]["prediksi"] for j in judul_list if j in clf["judul_pred_map"]]
        if prediksi_list:
            top = Counter(prediksi_list).most_common(1)[0]
            baris.append(
                f"Mayoritas inovasi pada urusan ini diklasifikasikan model PML sebagai jenis "
                f"'{top[0]}' ({top[1]} dari {len(prediksi_list)} inovasi yang dianalisis)."
            )

    clus = get_clustering_model()
    if clus:
        cluster_ids = [clus["judul_cluster_map"][j] for j in judul_list if j in clus["judul_cluster_map"]]
        if cluster_ids:
            counts = Counter(cluster_ids)
            bagian = []
            for cid, jumlah in counts.most_common():
                prof = next((pr for pr in clus["profiles"] if pr["cluster_id"] == cid), None)
                if prof:
                    bagian.append(f"{jumlah} inovasi berada di kelompok '{prof['label']}'")
            if bagian:
                baris.append("Hasil clustering K-Means: " + "; ".join(bagian) + ".")

    if not baris:
        return ""
    return "KONTEKS ANALISIS DATA (PML — Machine Learning):\n" + "\n".join(f"- {b}" for b in baris)


def clear_pml_cache():
    """Reset cache PML saat data diupload ulang (dipanggil dari admin upload)."""
    _build_feature_table.cache_clear()
    get_classification_model.cache_clear()
    get_clustering_model.cache_clear()

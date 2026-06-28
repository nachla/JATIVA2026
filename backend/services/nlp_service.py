import re
import math
import numpy as np
from collections import Counter
from functools import lru_cache
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation, TruncatedSVD
from services.data_service import load_data, get_col_map

# ── Sastrawi (graceful fallback jika tidak terinstall) ─────────────────
try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
    _stem_factory = StemmerFactory()
    _stemmer = _stem_factory.create_stemmer()
    _stop_factory = StopWordRemoverFactory()
    _stop_remover = _stop_factory.create_stop_word_remover()
    SASTRAWI_AVAILABLE = True
except ImportError:
    SASTRAWI_AVAILABLE = False

# ── Custom stopword domain inovasi ─────────────────────────────────────
CUSTOM_STOP = {
    "inovasi", "daerah", "berbasis", "dalam", "untuk", "dengan",
    "pada", "dari", "yang", "dan", "di", "ke", "upaya", "melalui",
    "sebagai", "peningkatan", "pelayanan", "kabupaten", "kota",
    "provinsi", "jawa", "timur", "dalam", "serta", "atas",
}

def _extract_combined(text: str) -> str:
    """
    Gabungkan akronim + kepanjangan dalam kurung.
    'POP SURGA (Penghantaran Obat Pasien)' → 'POP SURGA Penghantaran Obat Pasien'
    """
    text = str(text)
    inside = re.findall(r'[\(\[](.*?)[\)\]]', text)
    outside = re.sub(r'[\(\[][^\)\]]*[\)\]]', ' ', text)
    return (outside + ' ' + ' '.join(inside)).strip()

@lru_cache(maxsize=4096)
def _stem_word_cached(word: str) -> str:
    """Stem satu kata, di-cache supaya kata yang sering berulang (misal
    'digital', 'layanan', 'informasi') tidak di-stem ulang setiap kali muncul."""
    return _stemmer.stem(word)


def _preprocess(text: str) -> list[str]:
    """Preprocessing lengkap: combine → lowercase → clean → stopword → stem (per kata, di-cache) → filter."""
    text = _extract_combined(text).lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    if SASTRAWI_AVAILABLE:
        text = _stop_remover.remove(text)
        tokens = text.split()
        tokens = [_stem_word_cached(t) for t in tokens]
    else:
        tokens = text.split()

    tokens = [t for t in tokens if t not in CUSTOM_STOP and len(t) >= 3]
    return tokens


@lru_cache(maxsize=1)
def _get_processed_data():
    """Cache preprocessing hasil — dipanggil sekali, disimpan di memory."""
    import time
    t0 = time.time()

    df = load_data()
    print(f"[NLP-TIMING] load_data(): {time.time() - t0:.2f}s")

    t1 = time.time()
    cols = get_col_map(df)
    judul_col = cols["judul"]
    jenis_col  = cols["jenis"]

    if not judul_col:
        return None, None, None

    records = []
    for _, row in df.iterrows():
        judul = str(row.get(judul_col, "") or "")
        jenis = str(row.get(jenis_col, "Lainnya") or "Lainnya") if jenis_col else "Semua"
        tokens = _preprocess(judul)
        records.append({"judul": judul, "jenis": jenis, "tokens": tokens})

    print(f"[NLP-TIMING] preprocessing {len(records)} judul (stemming dkk): {time.time() - t1:.2f}s")
    print(f"[NLP-TIMING] TOTAL _get_processed_data(): {time.time() - t0:.2f}s")

    return records, judul_col, jenis_col


def get_wordcloud_data(jenis: str = "Semua", top_n: int = 60) -> list[dict]:
    """
    Kembalikan frekuensi kata untuk wordcloud.
    Format: [{"text": "kata", "value": 42}, ...]
    """
    records, _, _ = _get_processed_data()
    if not records:
        return []

    all_tokens = []
    for r in records:
        if jenis == "Semua" or r["jenis"] == jenis:
            all_tokens.extend(r["tokens"])

    freq = Counter(all_tokens)
    return [{"text": w, "value": c} for w, c in freq.most_common(top_n)]


def get_top_words(jenis: str = "Semua", top_n: int = 20) -> list[dict]:
    """
    Top kata berdasarkan frekuensi untuk bar chart.
    Format: [{"kata": "digital", "frekuensi": 88}, ...]
    """
    records, _, _ = _get_processed_data()
    if not records:
        return []

    all_tokens = []
    for r in records:
        if jenis == "Semua" or r["jenis"] == jenis:
            all_tokens.extend(r["tokens"])

    freq = Counter(all_tokens)
    return [{"kata": w, "frekuensi": c} for w, c in freq.most_common(top_n)]


def get_tfidf_per_jenis(top_n: int = 10) -> dict[str, list[dict]]:
    """
    TF-IDF sederhana per jenis inovasi.
    Menunjukkan kata yang paling 'khas' untuk setiap jenis.
    Format: {"Digital": [{"kata": "aplikasi", "skor": 0.42}, ...], ...}
    """
    records, _, _ = _get_processed_data()
    if not records:
        return {}

    # Kelompokkan token per jenis
    jenis_docs: dict[str, list[str]] = {}
    for r in records:
        j = r["jenis"]
        if j not in jenis_docs:
            jenis_docs[j] = []
        jenis_docs[j].extend(r["tokens"])

    all_jenis = list(jenis_docs.keys())
    N = len(all_jenis)

    result = {}
    for jenis, tokens in jenis_docs.items():
        tf = Counter(tokens)
        total = sum(tf.values()) or 1

        tfidf_scores = {}
        for word, count in tf.items():
            tf_val = count / total
            # Berapa jenis lain yang mengandung kata ini
            df = sum(1 for j, t in jenis_docs.items() if word in t)
            idf = math.log((N + 1) / (df + 1)) + 1
            tfidf_scores[word] = tf_val * idf

        top = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        result[jenis] = [{"kata": w, "skor": round(s, 4)} for w, s in top]

    return result


def get_nlp_stats() -> dict:
    """Statistik umum NLP dataset."""
    records, judul_col, _ = _get_processed_data()
    if not records:
        return {}

    all_tokens = [t for r in records for t in r["tokens"]]
    vocab = set(all_tokens)
    lengths = [len(r["tokens"]) for r in records]

    jenis_counts = Counter(r["jenis"] for r in records)

    return {
        "total_dokumen": len(records),
        "total_token": len(all_tokens),
        "ukuran_vocab": len(vocab),
        "rata_token_per_judul": round(sum(lengths) / len(lengths), 1) if lengths else 0,
        "sastrawi_aktif": SASTRAWI_AVAILABLE,
        "distribusi_jenis": dict(jenis_counts),
    }


def get_panjang_judul_distribusi() -> list[dict]:
    """
    Distribusi panjang judul inovasi (jumlah token per judul, setelah preprocessing).
    Format: [{"rentang": "0-1", "jumlah": 12}, ...]
    """
    records, _, _ = _get_processed_data()
    if not records:
        return []

    lengths = [len(r["tokens"]) for r in records]
    if not lengths:
        return []

    max_len = max(lengths)
    lebar_bin = 2
    batas = list(range(0, max_len + lebar_bin + 1, lebar_bin))
    hist = [0] * (len(batas) - 1)

    for l in lengths:
        for i in range(len(batas) - 1):
            if batas[i] <= l < batas[i + 1]:
                hist[i] += 1
                break

    return [
        {"rentang": f"{batas[i]}-{batas[i + 1] - 1}", "jumlah": hist[i]}
        for i in range(len(hist))
        if hist[i] > 0
    ]


@lru_cache(maxsize=1)
def get_topic_modeling(n_topics: int = 10, top_n_kata: int = 10) -> dict:
    """
    Topic modeling menggunakan Latent Dirichlet Allocation (LDA).
    Mengembalikan kata kunci tiap topik, jumlah judul yang paling dominan
    terhadap topik tersebut, dan peta judul -> topic_id (untuk lookup
    konteks per-inovasi saat membangun prompt AI).
    """
    records, _, _ = _get_processed_data()
    if not records:
        return {"topics": [], "distribusi": [], "n_topics": 0, "judul_topic_map": {}}

    valid_records = [r for r in records if r["tokens"]]
    docs = [" ".join(r["tokens"]) for r in valid_records]
    if len(docs) < 10:
        return {"topics": [], "distribusi": [], "n_topics": 0, "judul_topic_map": {}}

    n_topics = max(2, min(n_topics, len(docs) // 5 or 2))

    vectorizer = CountVectorizer(min_df=2)
    X = vectorizer.fit_transform(docs)
    if X.shape[1] < n_topics:
        return {"topics": [], "distribusi": [], "n_topics": 0, "judul_topic_map": {}}

    lda = LatentDirichletAllocation(
        n_components=n_topics, random_state=42, max_iter=20, learning_method="batch"
    )
    doc_topic = lda.fit_transform(X)
    feature_names = vectorizer.get_feature_names_out()

    topics = []
    for k in range(n_topics):
        comp = lda.components_[k]
        total = comp.sum() or 1
        top_idx = comp.argsort()[::-1][:top_n_kata]
        kata_kunci = [
            {"kata": feature_names[i], "bobot": round(float(comp[i] / total), 4)}
            for i in top_idx
        ]
        topics.append({"topic_id": k + 1, "kata_kunci": kata_kunci})

    dominan = doc_topic.argmax(axis=1)
    counts = Counter(dominan.tolist())
    distribusi = [
        {
            "topic_id": k + 1,
            "jumlah": counts.get(k, 0),
            "label": ", ".join(w["kata"] for w in topics[k]["kata_kunci"][:3]),
        }
        for k in range(n_topics)
    ]
    judul_topic_map = {
        valid_records[i]["judul"]: int(dominan[i]) + 1 for i in range(len(valid_records))
    }
    distribusi.sort(key=lambda x: x["jumlah"], reverse=True)

    return {
        "topics": topics,
        "distribusi": distribusi,
        "n_topics": n_topics,
        "judul_topic_map": judul_topic_map,
    }


@lru_cache(maxsize=1)
def _build_word_vectors(window: int = 5, dim: int = 50, min_freq: int = 3, max_vocab: int = 500):
    """
    Bangun word vector sederhana berbasis co-occurrence + PPMI + SVD.
    Pendekatan ini setara secara konsep dengan Word2Vec (merepresentasikan
    kata berdasarkan konteks kemunculannya), tapi hanya memakai
    numpy + scikit-learn sehingga tidak perlu instalasi library tambahan.

    Vocabulary dibatasi ke `max_vocab` kata tersering supaya komputasi
    matrix co-occurrence (O(V^2)) dan SVD tetap cepat.
    """
    import time
    t0 = time.time()

    records, _, _ = _get_processed_data()
    if not records:
        return None, None

    docs = [r["tokens"] for r in records if r["tokens"]]
    freq = Counter(t for d in docs for t in d)
    vocab = sorted([w for w, _ in freq.most_common(max_vocab) if freq[w] >= min_freq])
    if len(vocab) < 4:
        return None, None

    idx = {w: i for i, w in enumerate(vocab)}
    V = len(vocab)
    cooc = np.zeros((V, V), dtype=np.float64)

    t1 = time.time()
    for d in docs:
        ids = [idx[t] for t in d if t in idx]
        for i, wi in enumerate(ids):
            lo, hi = max(0, i - window), min(len(ids), i + window + 1)
            for j in range(lo, hi):
                if j != i:
                    cooc[wi, ids[j]] += 1.0
    print(f"[NLP-TIMING] bangun co-occurrence matrix ({V}x{V}): {time.time() - t1:.2f}s")

    total = cooc.sum() or 1.0
    row_sum = cooc.sum(axis=1, keepdims=True) + 1e-9
    col_sum = cooc.sum(axis=0, keepdims=True) + 1e-9
    with np.errstate(divide="ignore", invalid="ignore"):
        pmi = np.log((cooc * total) / (row_sum @ col_sum) + 1e-9)
    ppmi = np.maximum(pmi, 0)

    t2 = time.time()
    n_components = max(2, min(dim, V - 1))
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    vectors = svd.fit_transform(ppmi)
    print(f"[NLP-TIMING] SVD ({V}x{V} -> {n_components} dim): {time.time() - t2:.2f}s")

    norm = np.linalg.norm(vectors, axis=1, keepdims=True)
    norm[norm == 0] = 1e-9
    vectors = vectors / norm

    print(f"[NLP-TIMING] TOTAL _build_word_vectors(): {time.time() - t0:.2f}s")
    return vocab, vectors


def get_vocab_list(limit: int = 40) -> list[str]:
    """Daftar kata paling sering muncul, untuk ditampilkan sebagai pilihan di dropdown."""
    records, _, _ = _get_processed_data()
    if not records:
        return []
    all_tokens = [t for r in records for t in r["tokens"]]
    freq = Counter(all_tokens)
    vocab, _ = _build_word_vectors()
    valid = set(vocab) if vocab else set()
    return [w for w, _ in freq.most_common(200) if w in valid][:limit]


def get_similar_words(word: str, top_n: int = 10) -> dict:
    """
    Cari kata-kata dengan konteks pemakaian paling mirip dengan `word`,
    berdasarkan cosine similarity antar word vector.
    Format: {"kata": "digital", "ditemukan": True, "mirip": [{"kata": "transformasi", "similarity": 0.98}, ...]}
    """
    vocab, vectors = _build_word_vectors()
    word = word.strip().lower()

    if not vocab or word not in vocab:
        return {"kata": word, "ditemukan": False, "mirip": []}

    idx = vocab.index(word)
    sims = vectors @ vectors[idx]
    order = sims.argsort()[::-1]

    hasil = []
    for i in order:
        if vocab[i] == word:
            continue
        hasil.append({"kata": vocab[i], "similarity": round(float(sims[i]), 4)})
        if len(hasil) >= top_n:
            break

    return {"kata": word, "ditemukan": True, "mirip": hasil}


def get_topic_context_for_judul(judul: str) -> str:
    """
    Ringkasan topik LDA untuk satu judul inovasi tertentu — dipakai sebagai
    konteks tambahan saat membangun prompt AI (prediksi, rancang bangun, kolaborasi).
    Mengembalikan string kosong kalau topik tidak ditemukan, supaya aman disisipkan ke prompt.
    """
    hasil = get_topic_modeling()
    topic_id = hasil.get("judul_topic_map", {}).get(judul)
    if not topic_id:
        return ""
    topic = next((t for t in hasil["topics"] if t["topic_id"] == topic_id), None)
    if not topic:
        return ""
    kata = ", ".join(w["kata"] for w in topic["kata_kunci"][:5])
    return f"Topik tematik (hasil topic modeling/LDA): Topik {topic_id} — ciri khas kata: {kata}."


def get_topic_context_for_urusan(judul_list: list[str]) -> str:
    """
    Ringkasan distribusi topik LDA untuk kumpulan judul inovasi dalam satu urusan
    pemerintahan tertentu — dipakai sebagai konteks tambahan untuk Policy Brief
    dan Rekomendasi Tindak Lanjut.
    """
    hasil = get_topic_modeling()
    jmap = hasil.get("judul_topic_map", {})
    if not jmap or not judul_list:
        return ""

    topic_ids = [jmap[j] for j in judul_list if j in jmap]
    if not topic_ids:
        return ""

    counts = Counter(topic_ids)
    baris = []
    for topic_id, jumlah in counts.most_common(3):
        topic = next((t for t in hasil["topics"] if t["topic_id"] == topic_id), None)
        if topic:
            kata = ", ".join(w["kata"] for w in topic["kata_kunci"][:4])
            baris.append(f"Topik {topic_id} ({kata}) — {jumlah} inovasi")

    if not baris:
        return ""
    return "Tema dominan hasil topic modeling/LDA pada urusan ini: " + "; ".join(baris) + "."


def clear_nlp_cache():
    """Reset cache saat data diupload ulang."""
    _get_processed_data.cache_clear()
    _build_word_vectors.cache_clear()
    _stem_word_cached.cache_clear()
    get_topic_modeling.cache_clear()

from fastapi import APIRouter, Query, Depends
from core.middleware import get_current_user
from services import nlp_service

router = APIRouter(prefix="/nlp", tags=["NLP"])


@router.get("/stats")
def nlp_stats(current_user=Depends(get_current_user)):
    """Statistik umum NLP: total token, vocab, rata-rata panjang judul."""
    return nlp_service.get_nlp_stats()


@router.get("/wordcloud")
def wordcloud(
    jenis: str = Query("Semua", description="Filter jenis inovasi"),
    top_n: int = Query(60, ge=10, le=150),
    current_user=Depends(get_current_user),
):
    """Data wordcloud: frekuensi kata per jenis inovasi."""
    return nlp_service.get_wordcloud_data(jenis=jenis, top_n=top_n)


@router.get("/top-words")
def top_words(
    jenis: str = Query("Semua", description="Filter jenis inovasi"),
    top_n: int = Query(20, ge=5, le=50),
    current_user=Depends(get_current_user),
):
    """Top kata berdasarkan frekuensi untuk bar chart."""
    return nlp_service.get_top_words(jenis=jenis, top_n=top_n)


@router.get("/tfidf")
def tfidf_per_jenis(
    top_n: int = Query(10, ge=5, le=20),
    current_user=Depends(get_current_user),
):
    """TF-IDF per jenis inovasi — kata paling khas per kategori."""
    return nlp_service.get_tfidf_per_jenis(top_n=top_n)


@router.get("/panjang-judul")
def panjang_judul(current_user=Depends(get_current_user)):
    """Distribusi panjang judul inovasi (jumlah token per judul)."""
    return nlp_service.get_panjang_judul_distribusi()


@router.get("/topics")
def topic_modeling(
    n_topics: int = Query(10, ge=3, le=15),
    current_user=Depends(get_current_user),
):
    """Topic modeling LDA: kata kunci tiap topik dan distribusi judul per topik."""
    return nlp_service.get_topic_modeling(n_topics=n_topics)


@router.get("/similar-words/vocab")
def similar_words_vocab(
    limit: int = Query(40, ge=10, le=100),
    current_user=Depends(get_current_user),
):
    """Daftar kata yang tersedia untuk dicari kemiripannya (untuk dropdown)."""
    return nlp_service.get_vocab_list(limit=limit)


@router.get("/similar-words")
def similar_words(
    word: str = Query(..., description="Kata kunci yang ingin dicari kemiripannya"),
    top_n: int = Query(10, ge=5, le=20),
    current_user=Depends(get_current_user),
):
    """Kata-kata dengan konteks pemakaian paling mirip (word vector similarity)."""
    return nlp_service.get_similar_words(word=word, top_n=top_n)

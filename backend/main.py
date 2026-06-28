from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import auth, data, ai, admin
from routers.dashboard import router as dashboard_router

app = FastAPI(
    title="BRIDA Jawa Timur API",
    description="Backend API untuk Dashboard Inovasi Daerah BRIDA Provinsi Jawa Timur",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(dashboard_router)


@app.on_event("startup")
def warm_up_nlp_pml_cache():
    """
    Pra-proses data NLP & PML (stemming, topic modeling, klasifikasi, clustering)
    sekali saat server baru nyala, di background thread, supaya saat fitur AI
    (kolaborasi/policy brief/rancang bangun/rekomendasi) pertama kali dipanggil,
    konteks NLP+PML sudah siap dan tidak menunggu proses berat secara langsung.
    """
    import threading
    from services import nlp_service, pml_service

    def _warm():
        try:
            nlp_service._get_processed_data()
            nlp_service._build_word_vectors()
            nlp_service.get_topic_modeling()
            pml_service.get_classification_model()
            pml_service.get_clustering_model()
            print("[NLP+PML] Cache & model siap dipakai sebagai konteks AI.")
        except Exception as e:
            print(f"[NLP+PML] Gagal warm-up cache: {e}")

    threading.Thread(target=_warm, daemon=True).start()


@app.get("/")
def root():
    return {
        "message": "BRIDA API berjalan",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

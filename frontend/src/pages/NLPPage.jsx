import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../services/auth";

const WARNA = {
  navy: "#113d64",
  teal: "#1a7a6e",
  bg: "#f0f4f8",
  card: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  light: "#f8fafc",
};

const JENIS_LIST = ["Semua", "Digital", "Non Digital", "Teknologi"];

const WARNA_JENIS = {
  Digital: "#3b82f6",
  "Non Digital": "#f59e0b",
  Teknologi: "#10b981",
  Semua: "#113d64",
};

// ── Komponen kartu statistik ──────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: WARNA.card, border: `1px solid ${WARNA.border}` }}
    >
      <span className="text-xs font-medium" style={{ color: WARNA.muted }}>
        {label}
      </span>
      <span className="text-2xl font-bold" style={{ color: WARNA.navy }}>
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: WARNA.muted }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Wordcloud SVG sederhana ───────────────────────────────────────────
function WordCloudViz({ data }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Tidak ada data
      </div>
    );

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));

  const fontSize = (val) => {
    const ratio = (val - minVal) / (maxVal - minVal + 1);
    return Math.round(11 + ratio * 26);
  };

  const opacity = (val) => {
    const ratio = (val - minVal) / (maxVal - minVal + 1);
    return 0.5 + ratio * 0.5;
  };

  const colors = [WARNA.navy, WARNA.teal, "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];

  return (
    <div
      className="flex flex-wrap gap-2 p-4 rounded-xl justify-center items-center"
      style={{ background: WARNA.light, minHeight: 200 }}
    >
      {data.map((item, i) => (
        <span
          key={item.text}
          title={`${item.text}: ${item.value}x`}
          style={{
            fontSize: fontSize(item.value),
            color: colors[i % colors.length],
            opacity: opacity(item.value),
            fontWeight: fontSize(item.value) > 22 ? 700 : 500,
            cursor: "default",
            lineHeight: 1.4,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = opacity(item.value))}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}

// ── Bar chart horizontal ──────────────────────────────────────────────
function BarChartHoriz({ data, color }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Tidak ada data
      </div>
    );

  const maxVal = Math.max(...data.map((d) => d.frekuensi));

  return (
    <div className="flex flex-col gap-1.5">
      {data.map((item) => (
        <div key={item.kata} className="flex items-center gap-2">
          <span
            className="text-xs text-right shrink-0"
            style={{ width: 96, color: WARNA.muted }}
          >
            {item.kata}
          </span>
          <div
            className="rounded-full"
            style={{
              height: 18,
              width: `${(item.frekuensi / maxVal) * 100}%`,
              background: color || WARNA.navy,
              minWidth: 4,
              transition: "width 0.5s ease",
            }}
          />
          <span className="text-xs font-semibold" style={{ color: WARNA.navy }}>
            {item.frekuensi}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── TF-IDF card per jenis ─────────────────────────────────────────────
function TfidfCard({ jenis, items }) {
  const maxSkor = Math.max(...items.map((i) => i.skor));
  const color = WARNA_JENIS[jenis] || WARNA.navy;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: WARNA.card, border: `1px solid ${WARNA.border}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ background: color }}
        />
        <span className="font-semibold text-sm" style={{ color: WARNA.navy }}>
          {jenis}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.kata} className="flex items-center gap-2">
            <span
              className="text-xs text-right shrink-0"
              style={{ width: 80, color: WARNA.muted }}
            >
              {item.kata}
            </span>
            <div
              className="rounded-full"
              style={{
                height: 14,
                width: `${(item.skor / maxSkor) * 100}%`,
                background: color,
                opacity: 0.75,
                minWidth: 4,
              }}
            />
            <span className="text-xs" style={{ color: WARNA.muted }}>
              {item.skor.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Kartu topik LDA ────────────────────────────────────────────────────
const WARNA_TOPIK = ["#113d64", "#1a7a6e", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#0ea5e9", "#d946ef", "#84cc16"];

function TopicCard({ topic, jumlah, urutan }) {
  const color = WARNA_TOPIK[urutan % WARNA_TOPIK.length];
  const maxBobot = Math.max(...topic.kata_kunci.map((k) => k.bobot));

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: WARNA.card, border: `1px solid ${WARNA.border}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="font-semibold text-sm" style={{ color: WARNA.navy }}>
            Topik {topic.topic_id}
          </span>
        </div>
        {jumlah !== undefined && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: color + "20", color }}
          >
            {jumlah} judul
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {topic.kata_kunci.slice(0, 8).map((k) => (
          <div key={k.kata} className="flex items-center gap-2">
            <span
              className="text-xs text-right shrink-0"
              style={{ width: 80, color: WARNA.muted }}
            >
              {k.kata}
            </span>
            <div
              className="rounded-full"
              style={{
                height: 12,
                width: `${(k.bobot / maxBobot) * 100}%`,
                background: color,
                opacity: 0.8,
                minWidth: 4,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bar chart kata mirip (similar words) ───────────────────────────────
function SimilarWordsBar({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.similarity));

  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => (
        <div key={item.kata} className="flex items-center gap-2">
          <span
            className="text-xs text-right shrink-0 font-medium"
            style={{ width: 110, color: WARNA.navy }}
          >
            {item.kata}
          </span>
          <div
            className="rounded-full"
            style={{
              height: 18,
              width: `${(item.similarity / maxVal) * 100}%`,
              background: `linear-gradient(90deg, ${WARNA.teal}, ${WARNA.navy})`,
              minWidth: 4,
              transition: "width 0.5s ease",
            }}
          />
          <span className="text-xs font-semibold" style={{ color: WARNA.muted }}>
            {item.similarity.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Histogram distribusi panjang judul ─────────────────────────────────
function HistogramPanjangJudul({ data }) {
  if (!data || data.length === 0)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Tidak ada data
      </div>
    );

  const maxVal = Math.max(...data.map((d) => d.jumlah));

  return (
    <div className="flex items-end gap-2 h-56 px-2">
      {data.map((item) => (
        <div key={item.rentang} className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-xs font-semibold" style={{ color: WARNA.navy }}>
            {item.jumlah}
          </span>
          <div
            className="rounded-t-md w-full"
            style={{
              height: `${(item.jumlah / maxVal) * 170}px`,
              background: `linear-gradient(180deg, ${WARNA.teal}, ${WARNA.navy})`,
              minHeight: 4,
              transition: "height 0.5s ease",
            }}
          />
          <span className="text-xs" style={{ color: WARNA.muted }}>
            {item.rentang}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Halaman utama NLP ─────────────────────────────────────────────────
export default function NLPPage() {
  const [stats, setStats] = useState(null);
  const [wcData, setWcData] = useState([]);
  const [topWords, setTopWords] = useState([]);
  const [tfidfData, setTfidfData] = useState({});
  const [jenis, setJenis] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [loadingWc, setLoadingWc] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("wordcloud");

  // Topic modeling (LDA)
  const [topicData, setTopicData] = useState(null);
  const [loadingTopic, setLoadingTopic] = useState(false);

  // Similar words (word vector)
  const [vocabList, setVocabList] = useState([]);
  const [kataDipilih, setKataDipilih] = useState("");
  const [similarResult, setSimilarResult] = useState(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Distribusi panjang judul
  const [panjangJudulData, setPanjangJudulData] = useState([]);
  const [loadingPanjang, setLoadingPanjang] = useState(false);

  // Timer untuk loading awal (biar user tahu masih proses, bukan eror)
  const [detikBerlalu, setDetikBerlalu] = useState(0);
  useEffect(() => {
    if (!loading) return;
    setDetikBerlalu(0);
    const interval = setInterval(() => setDetikBerlalu((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Ambil stats & TF-IDF sekali
  useEffect(() => {
    Promise.all([
      apiFetch("/nlp/stats"),
      apiFetch("/nlp/tfidf?top_n=10"),
    ])
      .then(([s, t]) => {
        setStats(s);
        setTfidfData(t);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Ambil wordcloud & top words saat jenis berubah
  useEffect(() => {
    setLoadingWc(true);
    Promise.all([
      apiFetch(`/nlp/wordcloud?jenis=${encodeURIComponent(jenis)}&top_n=60`),
      apiFetch(`/nlp/top-words?jenis=${encodeURIComponent(jenis)}&top_n=20`),
    ])
      .then(([wc, tw]) => {
        setWcData(wc);
        setTopWords(tw);
        setLoadingWc(false);
      })
      .catch(() => setLoadingWc(false));
  }, [jenis]);

  // Ambil data topic modeling (sekali saja, lazy saat tab dibuka)
  useEffect(() => {
    if (activeTab === "topics" && !topicData && !loadingTopic) {
      setLoadingTopic(true);
      apiFetch("/nlp/topics?n_topics=10")
        .then((res) => {
          setTopicData(res);
          setLoadingTopic(false);
        })
        .catch(() => setLoadingTopic(false));
    }
  }, [activeTab, topicData, loadingTopic]);

  // Ambil daftar kata untuk dropdown similar words (sekali saja)
  useEffect(() => {
    if (activeTab === "similar" && vocabList.length === 0) {
      apiFetch("/nlp/similar-words/vocab?limit=40").then((res) => {
        setVocabList(res || []);
        if (res && res.length > 0) setKataDipilih(res[0]);
      });
    }
  }, [activeTab, vocabList]);

  // Cari kata mirip setiap kataDipilih berubah
  useEffect(() => {
    if (activeTab === "similar" && kataDipilih) {
      setLoadingSimilar(true);
      apiFetch(`/nlp/similar-words?word=${encodeURIComponent(kataDipilih)}&top_n=10`)
        .then((res) => {
          setSimilarResult(res);
          setLoadingSimilar(false);
        })
        .catch(() => setLoadingSimilar(false));
    }
  }, [activeTab, kataDipilih]);

  // Ambil distribusi panjang judul (sekali saja, lazy saat tab dibuka)
  useEffect(() => {
    if (activeTab === "panjang" && panjangJudulData.length === 0 && !loadingPanjang) {
      setLoadingPanjang(true);
      apiFetch("/nlp/panjang-judul")
        .then((res) => {
          setPanjangJudulData(res || []);
          setLoadingPanjang(false);
        })
        .catch(() => setLoadingPanjang(false));
    }
  }, [activeTab, panjangJudulData, loadingPanjang]);

  if (loading) {
    const pesan =
      detikBerlalu < 5
        ? "Memuat data inovasi..."
        : detikBerlalu < 15
        ? "Memproses teks judul inovasi (stemming & tokenisasi)..."
        : detikBerlalu < 25
        ? "Masih memproses, mohon tunggu sebentar lagi..."
        : "Lebih lama dari biasanya. Kalau lebih dari 1 menit, coba refresh halaman.";

    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <div
            className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${WARNA.teal} transparent ${WARNA.teal} ${WARNA.teal}` }}
          />
          <span className="text-sm font-medium" style={{ color: WARNA.navy }}>
            {pesan}
          </span>
          <span className="text-xs" style={{ color: WARNA.muted }}>
            Sudah {detikBerlalu} detik — proses ini hanya berat di pertama kali
            (sekitar 10–20 detik), setelah itu akan jauh lebih cepat.
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
        Gagal memuat data NLP: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: `linear-gradient(135deg, ${WARNA.navy}, ${WARNA.teal})`,
          color: "white",
        }}
      >
        <h1 className="text-xl font-bold mb-1">Analisis Teks Inovasi</h1>
        <p className="text-sm opacity-80">
          pada judul inovasi daerah Jawa Timur
        </p>
      </div>

      {/* Statistik */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Dokumen"
            value={stats.total_dokumen}
            sub="judul inovasi"
          />
          <StatCard
            label="Total Token"
            value={stats.total_token}
            sub="setelah preprocessing"
          />
          <StatCard
            label="Ukuran Vocab"
            value={stats.ukuran_vocab}
            sub="kata unik"
          />
          <StatCard
            label="Rata-rata Token"
            value={stats.rata_token_per_judul}
            sub="per judul inovasi"
          />
        </div>
      )}

      {/* Filter jenis */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={{ color: WARNA.muted }}>
          Filter Jenis:
        </span>
        {JENIS_LIST.map((j) => (
          <button
            key={j}
            onClick={() => setJenis(j)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: jenis === j ? WARNA_JENIS[j] || WARNA.navy : WARNA.light,
              color: jenis === j ? "white" : WARNA.muted,
              border: `1px solid ${jenis === j ? "transparent" : WARNA.border}`,
            }}
          >
            {j}
          </button>
        ))}
      </div>

      {/* Tab navigasi */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: WARNA.border }}>
        {[
          { id: "wordcloud", label: "Word Cloud" },
          { id: "frekuensi", label: "Top 20 Kata" },
          { id: "topics", label: "Topic Modeling (LDA)" },
          { id: "similar", label: "Similar Words (Word2Vec)" },
          { id: "panjang", label: "Distribusi Panjang Judul" },
          { id: "tfidf", label: "TF-IDF per Jenis" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium transition-all border-b-2 whitespace-nowrap"
            style={{
              color: activeTab === tab.id ? WARNA.navy : WARNA.muted,
              borderColor: activeTab === tab.id ? WARNA.navy : "transparent",
              background: "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Konten tab */}
      <div
        className="rounded-2xl p-5"
        style={{ background: WARNA.card, border: `1px solid ${WARNA.border}` }}
      >
        {loadingWc && activeTab !== "tfidf" && (
          <div className="flex justify-center py-8">
            <div
              className="w-6 h-6 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: `${WARNA.teal} transparent ${WARNA.teal} ${WARNA.teal}` }}
            />
          </div>
        )}

        {!loadingWc && activeTab === "wordcloud" && (
          <>
            <h2
              className="font-semibold text-sm mb-4"
              style={{ color: WARNA.navy }}
            >
              WordCloud — Kata Paling Sering pada Judul Inovasi
              {jenis !== "Semua" && (
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs"
                  style={{ background: WARNA_JENIS[jenis] + "20", color: WARNA_JENIS[jenis] }}
                >
                  {jenis}
                </span>
              )}
            </h2>
            <WordCloudViz data={wcData} />
            <p className="text-xs mt-3" style={{ color: WARNA.muted }}>
              * Ukuran kata mencerminkan frekuensi kemunculan. Hover untuk melihat jumlah kemunculan.
            </p>
          </>
        )}

        {!loadingWc && activeTab === "frekuensi" && (
          <>
            <h2
              className="font-semibold text-sm mb-4"
              style={{ color: WARNA.navy }}
            >
              Top 20 Kata Terbanyak
              {jenis !== "Semua" && (
                <span
                  className="ml-2 px-2 py-0.5 rounded-full text-xs"
                  style={{ background: WARNA_JENIS[jenis] + "20", color: WARNA_JENIS[jenis] }}
                >
                  {jenis}
                </span>
              )}
            </h2>
            <BarChartHoriz data={topWords} color={WARNA_JENIS[jenis] || WARNA.navy} />
          </>
        )}

        {activeTab === "topics" && (
          <>
            <h2 className="font-semibold text-sm mb-1" style={{ color: WARNA.navy }}>
              Topic Modeling — Latent Dirichlet Allocation (LDA)
            </h2>
            <p className="text-xs mb-4" style={{ color: WARNA.muted }}>
              Mengelompokkan judul inovasi ke dalam topik-topik tersembunyi berdasarkan
              kata-kata yang sering muncul bersamaan.
            </p>
            {loadingTopic && (
              <div className="flex justify-center py-8">
                <div
                  className="w-6 h-6 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${WARNA.teal} transparent ${WARNA.teal} ${WARNA.teal}` }}
                />
              </div>
            )}
            {!loadingTopic && topicData && topicData.topics?.length > 0 && (
              <>
                <div className="mb-5">
                  <h3 className="text-xs font-semibold mb-2" style={{ color: WARNA.muted }}>
                    DISTRIBUSI JUDUL PER TOPIK
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {topicData.distribusi.map((d, i) => {
                      const maxJumlah = Math.max(...topicData.distribusi.map((x) => x.jumlah));
                      const color = WARNA_TOPIK[(d.topic_id - 1) % WARNA_TOPIK.length];
                      return (
                        <div key={d.topic_id} className="flex items-center gap-2">
                          <span className="text-xs text-right shrink-0" style={{ width: 64, color: WARNA.muted }}>
                            Topik {d.topic_id}
                          </span>
                          <div
                            className="rounded-full flex items-center px-2"
                            style={{
                              height: 20,
                              width: `${(d.jumlah / maxJumlah) * 70}%`,
                              background: color,
                              opacity: 0.85,
                              minWidth: 28,
                            }}
                          >
                            <span className="text-[10px] text-white font-semibold">{d.jumlah}</span>
                          </div>
                          <span className="text-xs truncate" style={{ color: WARNA.muted }}>
                            {d.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <h3 className="text-xs font-semibold mb-2" style={{ color: WARNA.muted }}>
                  KATA KUNCI TIAP TOPIK
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topicData.topics.map((t) => (
                    <TopicCard
                      key={t.topic_id}
                      topic={t}
                      urutan={t.topic_id - 1}
                      jumlah={topicData.distribusi.find((d) => d.topic_id === t.topic_id)?.jumlah}
                    />
                  ))}
                </div>
              </>
            )}
            {!loadingTopic && topicData && topicData.topics?.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Data belum cukup untuk membentuk topik.
              </div>
            )}
          </>
        )}

        {activeTab === "similar" && (
          <>
            <h2 className="font-semibold text-sm mb-1" style={{ color: WARNA.navy }}>
              Similar Words — Kata dengan Konteks Paling Mirip
            </h2>
            <p className="text-xs mb-4" style={{ color: WARNA.muted }}>
              Berdasarkan representasi vektor kata (word embedding) dari seluruh judul inovasi.
            </p>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs font-medium" style={{ color: WARNA.muted }}>
                Pilih kata:
              </span>
              <select
                value={kataDipilih}
                onChange={(e) => setKataDipilih(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm border"
                style={{ borderColor: WARNA.border, color: WARNA.navy }}
              >
                {vocabList.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            {loadingSimilar && (
              <div className="flex justify-center py-8">
                <div
                  className="w-6 h-6 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${WARNA.teal} transparent ${WARNA.teal} ${WARNA.teal}` }}
                />
              </div>
            )}
            {!loadingSimilar && similarResult && similarResult.ditemukan && (
              <SimilarWordsBar data={similarResult.mirip} />
            )}
            {!loadingSimilar && similarResult && !similarResult.ditemukan && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Kata tidak ditemukan dalam vocabulary.
              </div>
            )}
          </>
        )}

        {activeTab === "panjang" && (
          <>
            <h2 className="font-semibold text-sm mb-1" style={{ color: WARNA.navy }}>
              Distribusi Panjang Judul Inovasi
            </h2>
            <p className="text-xs mb-4" style={{ color: WARNA.muted }}>
              Jumlah token (kata) per judul inovasi setelah melalui proses preprocessing.
            </p>
            {loadingPanjang && (
              <div className="flex justify-center py-8">
                <div
                  className="w-6 h-6 rounded-full border-4 border-t-transparent animate-spin"
                  style={{ borderColor: `${WARNA.teal} transparent ${WARNA.teal} ${WARNA.teal}` }}
                />
              </div>
            )}
            {!loadingPanjang && <HistogramPanjangJudul data={panjangJudulData} />}
          </>
        )}

        {activeTab === "tfidf" && (
          <>
            <h2
              className="font-semibold text-sm mb-1"
              style={{ color: WARNA.navy }}
            >
              Kata Paling Khas per Jenis Inovasi (TF-IDF)
            </h2>
            <p className="text-xs mb-4" style={{ color: WARNA.muted }}>
              Skor TF-IDF tinggi berarti kata tersebut sangat khas untuk satu jenis
              inovasi dan jarang muncul di jenis lain.
            </p>
            {Object.keys(tfidfData).length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Memuat data TF-IDF...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(tfidfData).map(([j, items]) => (
                  <TfidfCard key={j} jenis={j} items={items} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Penjelasan pipeline */}
      <div
        className="rounded-2xl p-5"
        style={{ background: WARNA.light, border: `1px solid ${WARNA.border}` }}
      >
        <h3 className="font-semibold text-sm mb-3" style={{ color: WARNA.navy }}>
          Pipeline Preprocessing NLP
        </h3>
        <div className="flex flex-wrap gap-2 items-center text-xs" style={{ color: WARNA.muted }}>
          {[
            "Gabung akronim + kepanjangan",
            "→",
            "Lowercase",
            "→",
            "Hapus karakter non-alfabet",
            "→",
            "Stopword removal (Sastrawi)",
            "→",
            "Stemming (Sastrawi)",
            "→",
            "Filter kata < 3 huruf",
          ].map((step, i) => (
            <span
              key={i}
              style={{
                color: step === "→" ? WARNA.teal : undefined,
                fontWeight: step === "→" ? 700 : undefined,
              }}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

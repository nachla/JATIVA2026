import { useState, useEffect } from "react";
import { getFilters, getList } from "../services/data";
import {
  aiKolaborasi,
  aiPrediksi,
  aiPolicy,
  aiRancang,
  downloadPolicyPdf,
  downloadRancangPdf,
} from "../services/ai";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

function SectionCard({
  number,
  title,
  caption,
  children,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100">
      <div
        className="px-4 py-2"
        style={{
          borderBottom: "1px solid #eef2f7",
          background:
            "linear-gradient(to right,#f8fbff,#ffffff)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow"
            style={{
              background:
                "linear-gradient(135deg,#113d64,#1a7a6e)",
            }}
          >
            {number}
          </div>

          <div>
            <h2
              className="font-bold text-sm"
              style={{ color: "#113d64" }}
            >
              {title}
            </h2>

            {caption && (
              <p className="text-sm text-slate-400 mt-1">
                {caption}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-3">{children}</div>
    </div>
  );
}

function HasilAI({ teks }) {
  const bersih = teks
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`(.*?)`/g, "$1");

  return (
    <div
      className="rounded-lg p-3 mt-3 text-sm leading-relaxed whitespace-pre-wrap"
      style={{
        background: "#f8fafc",
        color: "#334155",
        border: "1px solid #e2e8f0",
      }}
    >
      {bersih}
    </div>
  );
}

function BtnGenerate({
  onClick,
  loading,
  label,
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: loading
          ? "#94a3b8"
          : "linear-gradient(135deg,#113d64,#1a7a6e)",
        color: "white",
        border: "none",
        cursor: loading
          ? "not-allowed"
          : "pointer",
      }}
    >
      {loading
        ? "AI sedang memproses..."
        : label}
    </button>
  );
}

function LoadingHint({ loading, pesanAwal = "Memanggil AI...", pesanLama = "Masih diproses, mohon tunggu...", batasDetik = 8 }) {
  const [detik, setDetik] = useState(0);

  useEffect(() => {
    if (!loading) {
      setDetik(0);
      return;
    }
    const interval = setInterval(() => setDetik((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  return (
    <div className="flex items-center gap-2 text-xs mt-2" style={{ color: "#64748b" }}>
      <div
        className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#1a7a6e transparent #1a7a6e #1a7a6e" }}
      />
      <span>
        {detik < batasDetik ? pesanAwal : pesanLama} ({detik}s) — wajar sampai puluhan detik karena
        AI memproses analisis data + bahasa sekaligus.
      </span>
    </div>
  );
}

function BtnHapus({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        px-3 py-2.5 rounded-lg text-sm font-semibold
        transition-all duration-300
        hover:bg-red-50 active:scale-95
      "
      style={{
        background: "transparent",
        color: "#dc2626",
        border: "1px solid #fecaca",
        cursor: "pointer",
        position: "relative",
        zIndex: 20,
      }}
    >
      Hapus Riwayat
    </button>
  );
}

function BtnDownload({
  onClick,
  label = "⬇️ Unduh PDF",
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2.5 rounded-lg text-sm font-semibold mt-3 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background:
          "linear-gradient(135deg,#1a7a6e,#2e86ab)",
        color: "white",
        border: "none",
      }}
    >
      {label}
    </button>
  );
}

function getKematanganColor(value) {
  if (value >= 4.5) return "#1a7a6e";
  if (value >= 3.5) return "#2e86ab";
  if (value >= 2.5) return "#f18f01";
  return "#c73e1d";
}

export default function AIPage() {
  const [judulList, setJudulList] = useState([]);
  const [urusanList, setUrusanList] = useState([]);
  const [kemUrusan, setKemUrusan] = useState([]);
  const [selected, setSelected] = useState([]);
  const [hasilKol, setHasilKol] = useState([]);
  const [loadKol, setLoadKol] = useState(false);
  const [inovasiPred, setInovasiPred] = useState("");
  const [hasilPred, setHasilPred] = useState([]);
  const [loadPred, setLoadPred] = useState(false);
  const [urusan, setUrusan] = useState("");
  const [hasilPolicy, setHasilPolicy] = useState(null);
  const [loadPolicy, setLoadPolicy] = useState(false);
  const [inovasiRb, setInovasiRb] = useState("");
  const [hasilRb, setHasilRb] = useState(null);
  const [loadRb, setLoadRb] = useState(false);
  const [selectedRek, setSelectedRek] = useState("");
  const [hasilRek, setHasilRek] = useState(null);
  const [loadRek, setLoadRek] = useState(false);

  useEffect(() => {
    getFilters()
      .then((f) => {
        setUrusanList(f.urusan || []);
        if (f.urusan?.[0]) setUrusan(f.urusan[0]);
      })
      .catch(console.error);

    getList({}, 500)
      .then((res) => {
        const list = res.data.map((d) => d.judul).filter(Boolean).sort();
        setJudulList(list);
        if (list[0]) { setInovasiPred(list[0]); setInovasiRb(list[0]); }
      })
      .catch(console.error);

    const token = localStorage.getItem("token");
    fetch(`${API_URL}/data/chart/kematangan-urusan`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setKemUrusan(data);
        if (data[0]) setSelectedRek(data[0].urusan);
      })
      .catch(console.error);
  }, []);

  function toggleSelect(judul) {
    setSelected((prev) =>
      prev.includes(judul)
        ? prev.filter((j) => j !== judul)
        : prev.length < 5 ? [...prev, judul] : prev
    );
  }

  async function handleKolaborasi() {
    if (selected.length < 2) return;
    setLoadKol(true);
    try {
      const res = await aiKolaborasi(selected);
      setHasilKol((prev) => [...prev, ...res]);
      setInovasiPred(selected[0]);
      setInovasiRb(selected[0]);
    } catch (e) { alert(e.message); }
    finally { setLoadKol(false); }
  }

  async function handlePrediksi() {
    if (!inovasiPred) return;
    setLoadPred(true);
    try {
      const res = await aiPrediksi(inovasiPred);
      setHasilPred((prev) => [...prev, res]);
    } catch (e) { alert(e.message); }
    finally { setLoadPred(false); }
  }

  async function handlePolicy() {
    if (!urusan) {
      alert("Urusan pemerintahan belum terpilih. Coba refresh halaman — kalau daftar urusan tetap kosong, ada masalah saat mengambil data dari server.");
      return;
    }
    setLoadPolicy(true);
    try { const res = await aiPolicy(urusan); setHasilPolicy(res); }
    catch (e) { alert(e.message); }
    finally { setLoadPolicy(false); }
  }

  async function handleRancang() {
    if (!inovasiRb) return;
    setLoadRb(true);
    try { const res = await aiRancang(inovasiRb); setHasilRb(res); }
    catch (e) { alert(e.message); }
    finally { setLoadRb(false); }
  }

  async function handleRekomendasi() {
    const item = kemUrusan.find((u) => u.urusan === selectedRek);
    if (!item) return;
    setLoadRek(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/ai/rekomendasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          urusan: item.urusan,
          rata_kematangan: item.rata_rata,
          jumlah_inovasi: item.jumlah,
          contoh_inovasi: [],
        }),
      });
      const data = await res.json();
      setHasilRek(data);
    } catch (e) { alert(e.message); }
    finally { setLoadRek(false); }
  }

  return (
    <div className="flex flex-col gap-3">

      <div>
        <h1 className="text-sm font-bold" style={{ color: "#113d64" }}>
          Analisis Cerdas Inovasi
        </h1>
        <p className="text-gray-500 mt-2">
          AI Assistant untuk analisis, rekomendasi, dan pengembangan inovasi daerah Jawa Timur
        </p>
      </div>

      <SectionCard number="1" title="Perbandingan Inovasi & Kolaborasi AI" caption="Pilih 2–5 inovasi untuk dianalisis sinerginya">
        <div className="mb-3">
          <p className="text-sm text-slate-400 mb-3">
            Inovasi dipilih: <span className="font-semibold ml-1" style={{ color: "#113d64" }}>{selected.length}/5</span>
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((j) => (
              <button key={j} onClick={() => toggleSelect(j)}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "linear-gradient(135deg,#113d64,#1a7a6e)", color: "white" }}>
                {j} ✕
              </button>
            ))}
          </div>
          <select value="" onChange={(e) => toggleSelect(e.target.value)}
            className="w-full md:w-[450px] border rounded-lg px-4 py-2 text-sm outline-none">
            <option value="">+ Tambah inovasi...</option>
            {judulList.filter((j) => !selected.includes(j)).map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <BtnGenerate onClick={handleKolaborasi} loading={loadKol} label="Analisis Kolaborasi" />
          <BtnHapus onClick={() => setHasilKol([])} />
        </div>
        <LoadingHint
          loading={loadKol}
          pesanAwal="AI menganalisis kombinasi inovasi yang dipilih..."
          pesanLama="Masih diproses — semakin banyak inovasi dipilih, semakin banyak pasangan yang dianalisis satu per satu, bisa sampai 1 menit lebih."
          batasDetik={10}
        />
        {hasilKol.map((item, i) => (
          <div key={i}>
            <div className="font-semibold mt-3 mb-2" style={{ color: "#113d64" }}>🔷 {item.judul}</div>
            <HasilAI teks={item.hasil} />
            <hr className="mt-3 border-slate-100" />
          </div>
        ))}
      </SectionCard>

      <SectionCard number="2" title="Prediksi Keberhasilan" caption="AI memprediksi potensi keberhasilan inovasi">
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Pilih Inovasi</label>
          <select value={inovasiPred} onChange={(e) => setInovasiPred(e.target.value)}
            className="w-full md:w-[500px] border rounded-lg px-4 py-2 text-sm outline-none">
            {judulList.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <BtnGenerate onClick={handlePrediksi} loading={loadPred} label="Prediksi AI" />
          <BtnHapus onClick={() => setHasilPred([])} />
        </div>
        <LoadingHint loading={loadPred} pesanAwal="AI menghitung skor & menganalisis TRL inovasi ini..." />
        {hasilPred.map((item, i) => (
          <div key={i}>
            <div className="font-semibold mt-3 mb-3" style={{ color: "#113d64" }}>🔮 {item.judul}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(item.data).map(([k, v]) => (
                <div key={k} className="rounded-lg p-3 text-center" style={{ background: "#f8fafc" }}>
                  <div className="text-xs text-slate-400">{k}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: "#113d64" }}>{v}</div>
                </div>
              ))}
            </div>
            <HasilAI teks={item.hasil} />
            <hr className="mt-3 border-slate-100" />
          </div>
        ))}
      </SectionCard>

      <SectionCard number="3" title="Generate Policy Brief" caption="AI membuat rekomendasi kebijakan otomatis">
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Pilih Urusan Pemerintahan</label>
          <select value={urusan} onChange={(e) => setUrusan(e.target.value)}
            className="w-full md:w-[500px] border rounded-lg px-4 py-2 text-sm outline-none">
            {urusanList.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <BtnGenerate onClick={handlePolicy} loading={loadPolicy} label="Generate Policy Brief" />
          <BtnHapus onClick={() => setHasilPolicy(null)} />
        </div>
        <LoadingHint loading={loadPolicy} pesanAwal="AI menyusun policy brief lengkap (ringkasan, latar belakang, rekomendasi)..." batasDetik={12} />
        {!urusan && urusanList.length === 0 && (
          <p className="text-xs mt-2" style={{ color: "#dc2626" }}>
            Daftar urusan pemerintahan belum termuat. Coba refresh halaman ini — kalau masih kosong,
            kemungkinan ada masalah saat mengambil data dari server (cek halaman Analisis/Timeline juga).
          </p>
        )}
        {hasilPolicy && (
          <div>
            <div className="font-semibold mt-3" style={{ color: "#113d64" }}>📄 Policy Brief — {hasilPolicy.urusan}</div>
            <HasilAI teks={hasilPolicy.hasil} />
            <BtnDownload onClick={() => downloadPolicyPdf(hasilPolicy.urusan, hasilPolicy.hasil)} />
          </div>
        )}
      </SectionCard>

      <SectionCard number="4" title="Generate Rancang Bangun" caption="AI membuat dokumen rancang bangun inovasi">
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Pilih Inovasi</label>
          <select value={inovasiRb} onChange={(e) => setInovasiRb(e.target.value)}
            className="w-full md:w-[500px] border rounded-lg px-4 py-2 text-sm outline-none">
            {judulList.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <BtnGenerate onClick={handleRancang} loading={loadRb} label="Generate Rancang Bangun" />
          <BtnHapus onClick={() => setHasilRb(null)} />
        </div>
        <LoadingHint loading={loadRb} pesanAwal="AI menyusun dokumen rancang bangun inovasi..." batasDetik={12} />
        {hasilRb && (
          <div>
            <div className="font-semibold mt-3" style={{ color: "#113d64" }}>📋 Rancang Bangun — {hasilRb.judul}</div>
            <HasilAI teks={hasilRb.hasil} />
            <BtnDownload onClick={() => downloadRancangPdf(hasilRb.judul, hasilRb.hasil, {
              "1.1 Nama Inovasi": hasilRb.judul, OPD: hasilRb.opd,
              Tahapan: hasilRb.tahapan, Jenis: hasilRb.jenis,
              Bentuk: hasilRb.bentuk, Urusan: hasilRb.urusan, Kematangan: hasilRb.kematangan,
            })} />
          </div>
        )}
      </SectionCard>

      <SectionCard number="5" title="Rekomendasi Tindak Lanjut" caption="AI memberikan rekomendasi pengawasan BRIDA">
        <div className="mb-3">
          <label className="text-sm text-slate-400 block mb-2">Pilih Urusan Pemerintahan</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {[...kemUrusan].sort((a, b) => a.rata_rata - b.rata_rata).slice(0, 5).map((u) => (
              <button key={u.urusan} onClick={() => setSelectedRek(u.urusan)}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: selectedRek === u.urusan ? getKematanganColor(u.rata_rata) : "#f1f5f9",
                  color: selectedRek === u.urusan ? "white" : "#113d64",
                }}>
                {u.urusan} ({u.rata_rata.toFixed(1)})
              </button>
            ))}
          </div>
          <select value={selectedRek} onChange={(e) => setSelectedRek(e.target.value)}
            className="w-full md:w-[500px] border rounded-lg px-4 py-2 text-sm outline-none">
            {kemUrusan.map((u) => (
              <option key={u.urusan} value={u.urusan}>{u.urusan} — {u.rata_rata.toFixed(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <BtnGenerate onClick={handleRekomendasi} loading={loadRek} label="Generate Rekomendasi" />
          <BtnHapus onClick={() => setHasilRek(null)} />
        </div>
        <LoadingHint loading={loadRek} pesanAwal="AI menyusun rekomendasi tindak lanjut..." />
        {hasilRek && (
          <div>
            <div className="font-semibold mt-3" style={{ color: "#113d64" }}>📋 Rekomendasi — {hasilRek.urusan}</div>
            <HasilAI teks={hasilRek.hasil} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
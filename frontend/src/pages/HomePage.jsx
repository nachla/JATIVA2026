import { useState, useEffect } from "react";
import { getStats, getFilters, getChartTimeline } from "../services/data";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchKematanganUrusan(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/data/chart/kematangan-urusan${params.toString() ? "?" + params.toString() : ""}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Gagal fetch kematangan urusan");
  return res.json();
}

function StatCard({ label, value, icon, sub, color, bg }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(15,23,42,0.06)] p-4 transition-all hover:-translate-y-0.5">
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: color }} />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner" style={{ background: bg }}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-extrabold tracking-tight" style={{ color: "#17324d" }}>{value ?? "—"}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function FilterBar({ filters, active, onChange, onReset }) {
  const activeKeys = Object.entries(active).filter(([, v]) => v);
  return (
    <div className="rounded-2xl border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_4px_20px_rgba(15,23,42,0.06)] p-4 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <h3 className="font-bold text-sm text-[#17324d]">Filter Data Inovasi</h3>
          </div>
          <p className="text-xs text-gray-500">Sesuaikan tampilan data berdasarkan kategori tertentu</p>
        </div>
        <button onClick={onReset} className="px-3 py-1.5 rounded-xl border border-cyan-400 text-cyan-700 text-xs font-semibold hover:bg-cyan-500 hover:text-white transition">
          Reset Filter
        </button>
      </div>
      {activeKeys.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {activeKeys.map(([k, v]) => (
            <span key={k} className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold">{k}: {v}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[{ key:"opd",label:"OPD",opts:filters.opd },{ key:"jenis",label:"Jenis",opts:filters.jenis },
          { key:"urusan",label:"Urusan",opts:filters.urusan },{ key:"kematangan",label:"Kematangan",opts:filters.kematangan },
          { key:"tahun",label:"Tahun",opts:filters.tahun }].map(({ key, label, opts }) => (
          <div key={key}>
            <label className="text-[10px] text-gray-400 mb-1 block">{label}</label>
            <select value={active[key] || ""} onChange={(e) => onChange(key, e.target.value)}
              className="w-full rounded-xl px-3 py-2 bg-white/80 border border-gray-200 text-xs text-[#17324d] font-medium outline-none focus:ring-2 focus:ring-cyan-300">
              <option value="">Semua</option>
              {(opts || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function hitungPrioritas(data) {
  if (!data || data.length === 0) return [];
  const maxJumlah = Math.max(...data.map((d) => d.jumlah || 0));
  return data.map((item) => {
    const rata = Number(item.rata_rata) || 0;
    const jumlah = Number(item.jumlah) || 0;
    const skor = (Math.min(rata, 5) / 5) * 70 + (jumlah / maxJumlah) * 30;
    let status, warna, bg, deskripsi;
    if (rata < 2.5 || jumlah < 3) {
      status = "Perlu Perhatian"; warna = "#ef4444"; bg = "#fff1f2";
      deskripsi = jumlah < 3 ? `Jumlah inovasi sangat sedikit (${jumlah})` : `Kematangan rendah (${rata.toFixed(1)}/5)`;
    } else if (rata < 3.5 || jumlah < 8) {
      status = "Monitoring"; warna = "#f59e0b"; bg = "#fff7ed"; deskripsi = "Perlu monitoring berkala";
    } else {
      status = "Sudah Baik"; warna = "#10b981"; bg = "#ecfdf5"; deskripsi = "Berkembang dengan baik";
    }
    return { ...item, skor, status, warna, bg, deskripsi };
  }).sort((a, b) => a.skor - b.skor);
}

function generateInsight(prioritas, stats) {
  if (!prioritas.length || !stats) return null;
  const perluPerhatian = prioritas.filter((p) => p.status === "Perlu Perhatian");
  const terbaik = prioritas.filter((p) => p.status === "Sudah Baik");
  let insight = `Berdasarkan analisis ${stats.total_inovasi} data inovasi daerah, ditemukan ${perluPerhatian.length} urusan yang memerlukan perhatian khusus. `;
  if (perluPerhatian.length > 0) insight += `Fokus utama terdapat pada sektor ${perluPerhatian[0]?.urusan}. `;
  if (terbaik.length > 0) insight += `${terbaik.length} urusan lainnya menunjukkan performa inovasi yang baik dan dapat dijadikan benchmark pengembangan lintas OPD.`;
  return insight;
}

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ opd:[], jenis:[], urusan:[], kematangan:[], tahun:[] });
  const [active, setActive] = useState({});
  const [kemUrusan, setKemUrusan] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSemua, setShowSemua] = useState(false);

  useEffect(() => { getFilters().then((res) => setFilters(res || {})).catch(console.error); }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([getStats(active), fetchKematanganUrusan(active), getChartTimeline(active)])
      .then(([s, ku, tl]) => {
        const fixedStats = {
          total_inovasi: s?.total_inovasi ?? s?.jumlah_inovasi ?? s?.total ?? 0,
          total_opd: s?.total_opd ?? s?.jumlah_opd ?? s?.opd ?? 0,
          total_urusan: s?.total_urusan ?? s?.jumlah_urusan ?? s?.urusan ?? 0,
          rata_kematangan: Number(s?.rata_kematangan ?? s?.avg_kematangan ?? s?.kematangan ?? 0),
        };
        const fixedTimeline = Array.isArray(tl) ? tl.map((item) => ({
          name: item.name ?? item.tahun ?? item.year ?? "-",
          value: Number(item.value ?? item.jumlah ?? item.total ?? 0),
        })) : [];
        const fixedKemUrusan = Array.isArray(ku) ? ku.map((item) => ({
          urusan: item.urusan ?? item.name ?? "Tidak diketahui",
          rata_rata: Number(item.rata_rata ?? item.avg ?? item.kematangan ?? 0),
          jumlah: Number(item.jumlah ?? item.total ?? item.value ?? 0),
        })) : [];
        setStats(fixedStats); setTimeline(fixedTimeline); setKemUrusan(fixedKemUrusan);
      })
      .catch((err) => { console.error(err); setStats({ total_inovasi:0, total_opd:0, total_urusan:0, rata_kematangan:0 }); setTimeline([]); setKemUrusan([]); })
      .finally(() => setLoading(false));
  }, [active]);

  function handleFilter(key, val) { setActive((prev) => ({ ...prev, [key]: val || undefined })); }

  const prioritas = hitungPrioritas(kemUrusan);
  const tampilPrioritas = showSemua ? prioritas : prioritas.slice(0, 6);
  const insight = generateInsight(prioritas, stats);
  const kematanganDisplay = stats?.rata_kematangan
    ? stats.rata_kematangan > 5 ? (stats.rata_kematangan / 20).toFixed(1) : stats.rata_kematangan.toFixed(1)
    : null;

  return (
    <div className="relative">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-200 opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-200 opacity-20 blur-3xl" />
      </div>

      {/* HEADER */}
      <div className="mb-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-700 font-semibold text-xs mb-4">✨ SIJAVA Analytics</div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#17324d] leading-tight">Dashboard Inovasi Daerah</h1>
        <p className="text-gray-500 text-xs mt-1.5 max-w-2xl">Monitoring, analisis, dan visualisasi data inovasi perangkat daerah Provinsi Jawa Timur secara real-time.</p>
      </div>

      <FilterBar filters={filters} active={active} onChange={handleFilter} onReset={() => setActive({})} />

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard icon="🏆" label="Total Inovasi" value={loading ? "..." : stats?.total_inovasi} color="#06b6d4" bg="#ecfeff" />
        <StatCard icon="🏛️" label="Jumlah OPD" value={loading ? "..." : stats?.total_opd} color="#8b5cf6" bg="#f3e8ff" />
        <StatCard icon="📋" label="Urusan Pemerintahan" value={loading ? "..." : stats?.total_urusan} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon="⭐" label="Rata-rata Kematangan" value={loading ? "..." : kematanganDisplay ? `${kematanganDisplay} / 5` : "—"} sub="Skala 1–5" color="#10b981" bg="#ecfdf5" />
      </div>

      {/* INSIGHT */}
      {!loading && insight && (
        <div className="relative overflow-hidden rounded-2xl p-6 mb-6 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #08233d 0%, #0f766e 100%)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-lg">✨</div>
              <div>
                <div className="text-base font-bold">AI Insight</div>
                <div className="text-cyan-100 text-xs">Generated from innovation analytics</div>
              </div>
            </div>
            <p className="text-white/85 leading-relaxed text-sm max-w-4xl">{insight}</p>
          </div>
        </div>
      )}

      {/* CHART */}
      {!loading && Array.isArray(timeline) && timeline.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] mb-6">
          <div className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold mb-2">📈 Analytics</div>
            <h2 className="text-lg font-extrabold text-[#17324d]">Tren Pertumbuhan Inovasi</h2>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorTren" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} fill="url(#colorTren)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* PRIORITAS */}
      {!loading && Array.isArray(prioritas) && prioritas.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold mb-1.5">⚠️ Monitoring</div>
            <h2 className="text-lg font-extrabold text-[#17324d]">Prioritas Pengawasan Inovasi</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tampilPrioritas.map((item, index) => (
              <div key={index} className="rounded-2xl border p-3.5 min-h-[160px]"
                style={{ background: item.bg, borderColor: item.warna + "30" }}>
                <div className="flex justify-between mb-2">
                  <div className="w-7 h-7 text-xs rounded-xl flex items-center justify-center font-bold"
                    style={{ background: item.warna + "20", color: item.warna }}>#{index + 1}</div>
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: item.warna + "20", color: item.warna }}>{item.status}</span>
                </div>
                <h3 className="font-bold text-[#17324d] text-sm leading-snug">{item.urusan}</h3>
                <p className="text-[10px] text-gray-500 mt-1.5">{item.deskripsi}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Skor Prioritas</span><span>{Math.round(item.skor)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.skor}%`, background: item.warna }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {prioritas.length > 6 && (
            <button onClick={() => setShowSemua(!showSemua)}
              className="mt-4 w-full py-2 rounded-xl bg-[#17324d] hover:bg-[#0f2740] text-white font-bold text-sm">
              {showSemua ? "Tampilkan Lebih Sedikit" : `Eksplorasi Semua ${prioritas.length} Urusan`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as MapTooltip,
} from "react-leaflet";

import { getList } from "../services/data";

import gubernurImg from "../assets/gubernur.png";
import jativaLogo  from "../assets/jativa.png";

import berita1 from "../assets/Youth.jpg";
import berita2 from "../assets/EJIES.jpeg";
import berita3 from "../assets/bu.jpg";
import berita4 from "../assets/istts.jpg";

// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const COLORS   = ["#06b6d4","#3b82f6","#10b981","#8b5cf6","#f59e0b"];

const KOORDINAT = {
  Surabaya:    [-7.2575, 112.7521],
  Malang:      [-7.9666, 112.6326],
  Kediri:      [-7.848,  112.0172],
  Blitar:      [-8.0953, 112.1608],
  Madiun:      [-7.6298, 111.5239],
  Mojokerto:   [-7.4721, 111.4351],
  Pasuruan:    [-7.6456, 112.9075],
  Probolinggo: [-7.7543, 113.2159],
  Batu:        [-7.8662, 112.5267],
  Sidoarjo:    [-7.4478, 112.7183],
  Gresik:      [-7.156,  112.6522],
  Lamongan:    [-7.1173, 112.4156],
  Tuban:       [-6.8993, 112.0508],
  Bojonegoro:  [-7.1507, 111.8817],
  Ngawi:       [-7.4064, 111.4462],
  Magetan:     [-7.6536, 111.3287],
  Ponorogo:    [-7.8653, 111.4636],
  Pacitan:     [-8.1946, 111.1052],
  Trenggalek:  [-8.049,  111.7079],
  Tulungagung: [-8.0652, 111.9029],
  Jombang:     [-7.5504, 112.2384],
  Nganjuk:     [-7.6046, 111.8958],
  Sampang:     [-7.1857, 113.2483],
  Pamekasan:   [-7.1578, 113.4757],
  Sumenep:     [-6.9941, 113.8615],
  Bangkalan:   [-7.0435, 112.7306],
  Jember:      [-8.1724, 113.6884],
  Banyuwangi:  [-8.2191, 114.3691],
  Bondowoso:   [-7.912,  113.8228],
  Situbondo:   [-7.706,  114.0083],
  Lumajang:    [-8.1343, 113.2233],
};

function findKoordinat(kabupaten) {
  if (!kabupaten) return null;
  const clean = kabupaten
    .replace(/^(pemerintah\s+)?(kabupaten|kota|kab\.?|pemkab|pemkot)\s*/gi,"")
    .trim();
  const key = Object.keys(KOORDINAT).find(
    (k) =>
      clean.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(clean.toLowerCase()) ||
      kabupaten.toLowerCase().includes(k.toLowerCase())
  );
  return key ? { nama: key, coords: KOORDINAT[key] } : null;
}

const BERITA = [
  { title:"Youth Innovation Initiative 2026 Dibuka", date:"2026", image:berita1,
    link:"https://ukmindonesia.id/baca-deskripsi-program/youth-innovation-initiative-2026-dibuka-lomba-inovasi-pemuda-jawa-timur-berhadiah-rp90-juta#google_vignette" },
  { title:"EJIES 2026 Catat 19.720 Inovasi Pendidikan", date:"2026", image:berita2,
    link:"https://www.msn.com/id-id/berita/nasional/ejies-2026-diluncurkan-dindik-jatim-catat-19720-inovasi-pendidikan/ar-AA1Wh8F8" },
  { title:"Jawa Timur Raih National Governance Awards 2026", date:"25 April 2026", image:berita3,
    link:"https://www.msn.com/id-id/berita/other/jawa-timur-raih-penghargaan-national-governance-awards-2026/ar-AA21JzT4" },
  { title:"iSTTS Gandeng Pemprov Jatim untuk Transformasi Digital", date:"9 Mei 2026", image:berita4,
    link:"https://timesindonesia.co.id/pendidikan/589133/istts-perkuat-posisi-sebagai-kampus-inovasi-gandeng-pemprov-jatim-ubah-data-jadi-solusi-nyata" },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = "h-8", w = "w-full", rounded = "rounded-2xl" }) {
  return <div className={`${h} ${w} ${rounded} bg-gray-200 animate-pulse`} />;
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ tag, title, sub }) {
  return (
    <div className="mb-10">
      <span className="inline-block px-4 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold mb-3">
        {tag}
      </span>
      <h2 className="text-3xl font-extrabold text-[#17324d]">{title}</h2>
      {sub && <p className="text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  const [summary,     setSummary]     = useState(null);
  const [inovasiData, setInovasiData] = useState([]);
  const [topInovasi,  setTopInovasi]  = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isMenuOpen,  setIsMenuOpen]  = useState(false);
  const [inovasiPage, setInovasiPage] = useState(1);
  const INOVASI_PER_PAGE = 9;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/dashboard/summary`).then((r) => r.json()),
      fetch(`${API_BASE}/data/top-inovasi`).then((r) => r.json()),
      getList({}, 2000),
    ])
      .then(([summaryData, topData, listRes]) => {
        setSummary(summaryData);
        setTopInovasi(topData);
        setInovasiData(listRes.data || []);
      })
      .catch((err) => console.error("Gagal memuat data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Wilayah map ───────────────────────────────────────────────────────────
  const wilayahMap = useMemo(() => {
    return inovasiData.reduce((acc, item) => {
      const wilayah = item.kabupaten || item.pemda || item.admin_opd || item.opd;
      const found   = wilayah ? findKoordinat(wilayah) : null;
      if (!found) return acc;
      const { nama, coords } = found;
      if (!acc[nama]) acc[nama] = { total: 0, coords };
      acc[nama].total += 1;
      return acc;
    }, {});
  }, [inovasiData]);

  const maxTotal = useMemo(() => {
    const vals = Object.values(wilayahMap).map((v) => v.total);
    return vals.length ? Math.max(...vals) : 1;
  }, [wilayahMap]);

  const getBubbleRadius = (total) => 8 + (total / maxTotal) * 22;

  // ── Data derivasi ─────────────────────────────────────────────────────────
  const trendData    = summary?.trend_data    || [];
  const kategoriData = summary?.kategori_data || [];

  // Inovasi grid — paginasi sederhana
  const inovasiSliced = inovasiData.slice(0, inovasiPage * INOVASI_PER_PAGE);
  const hasMore       = inovasiSliced.length < inovasiData.length;

  // Wilayah ranking untuk section statistik
  const wilayahRanking = useMemo(() =>
    Object.entries(wilayahMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8),
  [wilayahMap]);

  const wilayahBarData = wilayahRanking.map(([nama, v]) => ({ nama, total: v.total }));

  const stats = [
    { title:"Total Inovasi",        value: summary?.total_inovasi    ?? "–", icon:"💡", color:"bg-cyan-100"   },
    { title:"Kab/Kota Aktif",       value: summary?.inovasi_aktif    ?? "–", icon:"🏙️", color:"bg-blue-100"   },
    { title:"OPD Berpartisipasi",   value: summary?.perangkat_daerah ?? "–", icon:"👥", color:"bg-emerald-100" },
    { title:"Inovasi Terverifikasi",value: summary?.inovasi_digital  ?? "–", icon:"🛡️", color:"bg-violet-100"  },
  ];

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

  const NAV_ITEMS = [
    { label:"Beranda",      id:"hero"       },
    { label:"Inovasi",      id:"inovasi"    },
    { label:"Peta Inovasi", id:"peta"       },
    { label:"Statistik",    id:"statistik"  },
    { label:"Publikasi",    id:"publikasi"  },
  ];

  // ── JENIS badge color ─────────────────────────────────────────────────────
  const jenisBadge = (jenis = "") => {
    if (!jenis) return "bg-gray-100 text-gray-600";
    const j = jenis.toLowerCase();
    if (j.includes("digital"))  return "bg-cyan-100 text-cyan-700";
    if (j.includes("pelayanan"))return "bg-blue-100 text-blue-700";
    if (j.includes("sosial"))   return "bg-emerald-100 text-emerald-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 w-full z-[9999] bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-[1500px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <img src={jativaLogo} alt="JATIVA" className="h-18 object-contain cursor-pointer"
            onClick={() => scrollTo("hero")} />

          <div className="hidden lg:flex items-center gap-8 text-[#17324d] text-sm font-semibold">
            {NAV_ITEMS.map(({ label, id }) => (
              <button key={label} onClick={() => scrollTo(id)}
                className="relative group hover:text-cyan-600 transition duration-200">
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-500 group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")}
              className="px-5 py-2 rounded-xl border-2 border-[#27496d] text-[#27496d] hover:bg-[#27496d] hover:text-white transition text-sm font-semibold">
              Masuk
            </button>
            <button className="lg:hidden p-2 rounded-lg border border-gray-200"
              onClick={() => setIsMenuOpen((v) => !v)} aria-label="Toggle menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-6 pb-4">
            {NAV_ITEMS.map(({ label, id }) => (
              <button key={label}
                onClick={() => { scrollTo(id); setIsMenuOpen(false); }}
                className="block w-full text-left py-3 text-[#17324d] text-sm font-semibold border-b border-gray-50 hover:text-cyan-600 transition">
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section id="hero" className="relative pt-24 overflow-hidden bg-[#edf5ff]">
        <div className="absolute inset-0">
          <img src={gubernurImg} alt="Gubernur Jawa Timur"
            className="w-full h-full object-cover object-right" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#edf5ff] via-[#edf5ff]/80 via-35% to-transparent to-65%" />
        </div>

        <div className="relative z-10 max-w-[1500px] mx-auto px-6 md:px-12 min-h-[680px] flex items-start pt-24">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-600/10 text-cyan-700 text-sm font-semibold mb-5">
              Portal Inovasi Jawa Timur
            </span>
            <h1 className="text-[40px] leading-[1.08] font-extrabold text-[#17324d] mb-6">
              Mendorong Inovasi,<br />
              Mewujudkan Jawa Timur<br />
              yang Maju dan<br />
              Berdaya Saing
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
              Jativa adalah wadah informasi, kolaborasi,
              dan inspirasi untuk menghadirkan pelayanan publik yang lebih
              baik melalui inovasi.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button onClick={() => scrollTo("inovasi")}
                className="px-8 py-4 rounded-2xl bg-[#0b2c53] text-white text-base font-semibold hover:bg-[#123b6b] transition shadow-lg">
                Jelajahi Inovasi
              </button>
              <button onClick={() => scrollTo("statistik")}
                className="px-8 py-4 rounded-2xl border-2 border-[#0b2c53] text-[#0b2c53] text-base font-semibold hover:bg-[#0b2c53] hover:text-white transition">
                Statistik IID
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pb-24">

        {/* ── SECTION: INOVASI ──────────────────────────────────────────── */}
        <section id="inovasi" className="pt-20">
          <SectionHeader
            tag="Direktori Inovasi"
            title="Inovasi Daerah Jawa Timur"
            sub="Temukan inovasi terbaik dari seluruh kabupaten dan kota"
          />

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-pulse space-y-3">
                  <Skeleton h="h-4" w="w-20" />
                  <Skeleton h="h-5" />
                  <Skeleton h="h-4" w="w-3/4" />
                  <Skeleton h="h-3" w="w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inovasiSliced.map((item, i) => (
                  <div key={i}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${jenisBadge(item.jenis)}`}>
                        {item.jenis || "Inovasi"}
                      </span>
                      {item.tahun && (
                        <span className="text-xs text-gray-400 font-medium">{item.tahun}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-[#17324d] leading-snug line-clamp-3 text-sm">
                      {item.judul || item.nama || "—"}
                    </h3>
                    <div className="mt-auto space-y-1">
                      <p className="text-xs text-gray-400 line-clamp-1">
                        📍 {item.kabupaten || item.pemda || "—"}
                      </p>
                      {item.urusan && (
                        <p className="text-xs text-cyan-600 font-medium line-clamp-1">
                          {item.urusan}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-10">
                  <button onClick={() => setInovasiPage((p) => p + 1)}
                    className="px-8 py-3 rounded-2xl border-2 border-cyan-500 text-cyan-600 font-semibold hover:bg-cyan-500 hover:text-white transition">
                    Muat Lebih Banyak ({inovasiData.length - inovasiSliced.length} tersisa)
                  </button>
                </div>
              )}

              {inovasiData.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <div className="text-5xl mb-4">💡</div>
                  <p>Data inovasi belum tersedia</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── SECTION: PETA ─────────────────────────────────────────────── */}
        <section id="peta" className="pt-20">
          <SectionHeader
            tag="Peta Inovasi"
            title="Sebaran Inovasi Jawa Timur"
            sub="Visualisasi jumlah inovasi per kabupaten dan kota"
          />

          {isLoading ? (
            <div className="h-[520px] bg-gray-100 animate-pulse rounded-3xl" />
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-[520px]">
                <MapContainer center={[-7.5,112.5]} zoom={8}
                  style={{ height:"100%", width:"100%" }} scrollWheelZoom={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {Object.entries(wilayahMap).map(([nama, item]) => (
                    <CircleMarker key={nama} center={item.coords}
                      radius={getBubbleRadius(item.total)}
                      pathOptions={{ fillColor:"#06b6d4", fillOpacity:0.85, color:"#fff", weight:2.5 }}>
                      <MapTooltip permanent direction="center">
                        <span style={{ fontWeight:"bold", fontSize:10, color:"#fff" }}>
                          {item.total}
                        </span>
                      </MapTooltip>
                      <MapTooltip direction="top" offset={[0,-10]}>
                        <strong>{nama}</strong><br />{item.total} inovasi
                      </MapTooltip>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              {/* Legenda + ringkasan */}
              <div className="p-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="text-xs text-gray-400">Ukuran bubble = jumlah inovasi</span>
                  {[{ label:"Sedikit",r:8},{ label:"Sedang",r:14},{ label:"Banyak",r:20}].map(({ label,r }) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width={r*2+4} height={r*2+4}>
                        <circle cx={r+2} cy={r+2} r={r} fill="#06b6d4" opacity="0.85"/>
                      </svg>
                      {label}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-gray-400">
                  {Object.keys(wilayahMap).length} wilayah terpetakan
                </span>
              </div>
            </div>
          )}

          {/* Top 5 wilayah */}
          {!isLoading && wilayahRanking.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
              {wilayahRanking.map(([nama, v], i) => (
                <div key={nama}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center hover:shadow-md transition">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-sm text-white
                    ${i===0?"bg-yellow-400":i===1?"bg-gray-400":i===2?"bg-orange-400":"bg-[#17324d]"}`}>
                    {i+1}
                  </div>
                  <div className="font-bold text-[#17324d] text-xs leading-tight">{nama}</div>
                  <div className="text-cyan-600 font-extrabold text-lg mt-1">{v.total}</div>
                  <div className="text-gray-400 text-[10px]">inovasi</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION: STATISTIK ────────────────────────────────────────── */}
        <section id="statistik" className="pt-20">
          <SectionHeader
            tag="Statistik IID"
            title="Statistik Inovasi Daerah"
            sub="Data dan tren inovasi Jawa Timur secara menyeluruh"
          />

          {/* Stat Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {isLoading
              ? Array.from({length:4}).map((_,i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-200"/>
                      <div className="flex-1 space-y-2">
                        <Skeleton h="h-3" w="w-24"/>
                        <Skeleton h="h-8" w="w-16"/>
                      </div>
                    </div>
                  </div>
                ))
              : stats.map((item, i) => (
                  <div key={i}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center text-2xl flex-shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">{item.title}</p>
                        <h3 className="text-4xl font-extrabold text-[#17324d]">{item.value}</h3>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {/* Charts baris 1 */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Tren Inovasi */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-[#17324d] mb-1">Tren Inovasi per Tahun</h3>
              <p className="text-xs text-gray-400 mb-4">Pertumbuhan jumlah inovasi dari tahun ke tahun</p>
              <div className="h-[280px]">
                {isLoading ? <Skeleton h="h-full"/> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="year" tick={{ fontSize:12 }}/>
                      <YAxis tick={{ fontSize:12 }}/>
                      <Tooltip contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}/>
                      <Bar dataKey="total" fill="#06b6d4" radius={[8,8,0,0]}>
                        <LabelList dataKey="total" position="top"
                          style={{ fill:"#17324d", fontWeight:"bold", fontSize:11 }}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Jenis Inovasi */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-[#17324d] mb-1">Distribusi Jenis Inovasi</h3>
              <p className="text-xs text-gray-400 mb-4">Komposisi inovasi berdasarkan jenisnya</p>
              <div className="h-[280px]">
                {isLoading ? <Skeleton h="h-full"/> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={kategoriData} dataKey="value" nameKey="name"
                        innerRadius={65} outerRadius={100} paddingAngle={4} label={({ name, percent }) =>
                          `${name} ${(percent*100).toFixed(0)}%`}>
                        {kategoriData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Top Wilayah Bar Chart */}
          {!isLoading && wilayahBarData.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
              <h3 className="font-bold text-lg text-[#17324d] mb-1">Top 8 Wilayah Inovasi</h3>
              <p className="text-xs text-gray-400 mb-4">Kabupaten/kota dengan jumlah inovasi terbanyak</p>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wilayahBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize:11 }}/>
                    <YAxis type="category" dataKey="nama" width={90} tick={{ fontSize:11 }}/>
                    <Tooltip contentStyle={{ borderRadius:12, border:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}/>
                    <Bar dataKey="total" fill="#3b82f6" radius={[0,8,8,0]}>
                      <LabelList dataKey="total" position="right"
                        style={{ fill:"#17324d", fontWeight:"bold", fontSize:11 }}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Inovasi cards */}
          <div>
            <h3 className="font-bold text-xl text-[#17324d] mb-2">Top Inovasi Jawa Timur</h3>
            <p className="text-gray-500 text-sm mb-6">Inovasi dengan dampak dan replikasi terbaik</p>
            <div className="grid lg:grid-cols-5 gap-5">
              {isLoading
                ? Array.from({length:5}).map((_,i) => (
                    <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200"/>
                      <Skeleton h="h-4"/><Skeleton h="h-4" w="w-3/4"/>
                      <Skeleton h="h-3" w="w-1/2"/>
                    </div>
                  ))
                : topInovasi.map((item, idx) => (
                    <div key={idx}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-lg transition flex flex-col gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0
                        ${idx===0?"bg-yellow-400":idx===1?"bg-gray-400":idx===2?"bg-orange-400":"bg-[#17324d]"}`}>
                        {idx+1}
                      </div>
                      <h4 className="font-bold text-[#17324d] leading-snug line-clamp-4 text-sm min-h-[80px]">
                        {item.nama}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 break-words">{item.instansi}</p>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        {/* ── SECTION: PUBLIKASI ────────────────────────────────────────── */}
        <section id="publikasi" className="pt-20">
          <SectionHeader
            tag="Publikasi"
            title="Berita & Informasi"
            sub="Update terbaru seputar inovasi daerah Jawa Timur"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BERITA.map((item, idx) => (
              <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer"
                className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-xl transition block">
                <div className="relative overflow-hidden">
                  <img src={item.image} alt={item.title}
                    className="h-48 w-full object-cover group-hover:scale-105 transition duration-500" loading="lazy"/>
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-white/90 text-cyan-700 text-xs font-bold shadow">
                      {item.date}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#17324d] leading-snug mb-3 line-clamp-3 text-sm group-hover:text-cyan-600 transition">
                    {item.title}
                  </h3>
                  <span className="text-cyan-600 font-semibold text-sm group-hover:underline">
                    Baca Selengkapnya →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 grid lg:grid-cols-4 gap-10">
          <div>
            <img src={jativaLogo} alt="JATIVA" className="h-20 mb-4"/>
            <p className="text-white/60 leading-relaxed text-sm">
              Bersama Inovasi, Mewujudkan Jawa Timur yang Maju dan Berdaya Saing.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white/90">Link Cepat</h4>
            <div className="space-y-2">
              {NAV_ITEMS.map(({ label, id }) => (
                <p key={label} onClick={() => scrollTo(id)}
                  className="text-white/60 hover:text-white transition text-sm cursor-pointer">
                  {label}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white/90">Informasi</h4>
            <div className="space-y-2 text-white/60 text-sm">
              <p className="hover:text-white transition cursor-pointer">Regulasi</p>
              <p className="hover:text-white transition cursor-pointer">Panduan</p>
              <p className="hover:text-white transition cursor-pointer">FAQ</p>
              <p className="hover:text-white transition cursor-pointer">Kontak</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white/90">Newsletter</h4>
            <p className="text-white/60 text-sm mb-3">Dapatkan update inovasi terbaru langsung di inbox kamu.</p>
            <div className="flex">
              <input type="email" placeholder="Masukkan Email"
                className="flex-1 px-4 py-3 rounded-l-xl text-white outline-none text-sm"/>
              <button className="bg-cyan-500 px-5 rounded-r-xl hover:bg-cyan-400 transition font-bold"
                aria-label="Daftar newsletter">→</button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 text-center py-4 text-white/30 text-xs">
          © {new Date().getFullYear()} Badan Riset dan Inovasi Daerah Provinsi Jawa Timur 
        </div>
      </footer>

    </div>
  );
}

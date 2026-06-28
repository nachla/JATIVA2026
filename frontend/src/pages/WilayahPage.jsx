import { useState, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as MapTooltip,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { motion, AnimatePresence } from "framer-motion";

import {
  Search,
  MapPinned,
  Sparkles,
  Building2,
  Map,
  Brain,
  ChevronRight,
} from "lucide-react";

import { getList, getFilters } from "../services/data";
import { apiFetch } from "../services/auth";

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

function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findKoordinat(kabupaten) {
  if (!kabupaten) return null;
  const clean = kabupaten
    .replace(/^(pemerintah\s+)?(kabupaten|kota|kab\.?|pemkab|pemkot)\s*/gi, "")
    .trim();
  const key = Object.keys(KOORDINAT).find(
    (k) =>
      clean.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(clean.toLowerCase()) ||
      kabupaten.toLowerCase().includes(k.toLowerCase())
  );
  return key ? { nama: key, coords: KOORDINAT[key] } : null;
}

function FlyTo({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 11, { duration: 1.2 });
  }, [coords]);
  return null;
}

function FilterBar({ filters, active, onChange, onReset }) {
  return (
    <div className="rounded-[20px] border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(15,23,42,0.06)] p-3">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <h3 className="font-bold text-[#17324d]">Filter Wilayah</h3>
          </div>
          <p className="text-sm text-gray-500">Eksplorasi data inovasi berdasarkan kategori</p>
        </div>
        <button onClick={onReset}
          className="px-4 py-2 rounded-lg border border-cyan-400 text-cyan-700 font-semibold hover:bg-cyan-500 hover:text-white transition">
          Reset Filter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { key:"jenis",  label:"Jenis",  opts:filters.jenis  },
          { key:"urusan", label:"Urusan", opts:filters.urusan },
          { key:"tahun",  label:"Tahun",  opts:filters.tahun  },
        ].map(({ key, label, opts }) => (
          <div key={key}>
            <label className="text-xs text-gray-400 mb-1 block">{label}</label>
            <select value={active[key] || ""} onChange={(e) => onChange(key, e.target.value)}
              className="w-full rounded-lg px-4 py-2 bg-white/80 border border-gray-200 text-sm text-[#17324d] font-medium outline-none focus:ring-2 focus:ring-cyan-300">
              <option value="">Semua</option>
              {(opts || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WilayahPage() {
  const [data,       setData]       = useState([]);
  const [filters,    setFilters]    = useState({ jenis:[], urusan:[], tahun:[] });
  const [active,     setActive]     = useState({});
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [flyCoords,  setFlyCoords]  = useState(null);
  const [hasilAIMap, setHasilAIMap] = useState({});
  const [loadingAI,  setLoadingAI]  = useState(null);
  const detailRef = useRef(null);

  useEffect(() => {
    getFilters().then(setFilters).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    getList(active, 1000)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [active]);

  function handleFilter(key, val) {
    setActive((prev) => ({ ...prev, [key]: val || undefined }));
  }

  const grouped = useMemo(() => {
    return data.reduce((acc, item) => {
      const wilayah = item.kabupaten || item.pemda || item.admin_opd || item.opd;
      const found   = wilayah ? findKoordinat(wilayah) : null;
      const kota    = found?.nama;
      if (!kota) return acc;
      if (!acc[kota]) acc[kota] = { items:[], coords:found.coords };
      acc[kota].items.push(item);
      return acc;
    }, {});
  }, [data]);

  const kotaList = Object.entries(grouped);

  const topWilayah = kotaList.length > 0
    ? kotaList.reduce((max, cur) => cur[1].items.length > max[1].items.length ? cur : max)
    : null;

  const maxCount = Math.max(...kotaList.map(([, v]) => v.items.length), 1);

  const kotaTerdekat = selected && KOORDINAT[selected]
    ? kotaList
        .filter(([nama]) => nama !== selected)
        .map(([nama, val]) => ({
          nama,
          jarak:  haversine(KOORDINAT[selected], val.coords),
          jumlah: val.items.length,
          items:  val.items,
        }))
        .sort((a, b) => a.jarak - b.jarak)
        .slice(0, 5)
    : [];

  function handleSelectKota(nama) {
    if (nama === selected) {
      setSelected(null); setFlyCoords(null); setHasilAIMap({});
    } else {
      setSelected(nama); setFlyCoords(KOORDINAT[nama]); setHasilAIMap({});
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
      }, 100);
    }
  }

  async function handleAnalisisKolaborasi(kota2) {
    if (!selected || !kota2) return;
    setLoadingAI(kota2);
    try {
      const inovasi1 = (grouped[selected]?.items || [])
        .sort((a, b) => (parseFloat(b.kematangan)||0) - (parseFloat(a.kematangan)||0))
        .slice(0, 3).map((i) => i.judul).filter(Boolean);
      const inovasi2 = (grouped[kota2]?.items || [])
        .sort((a, b) => (parseFloat(b.kematangan)||0) - (parseFloat(a.kematangan)||0))
        .slice(0, 3).map((i) => i.judul).filter(Boolean);
      const res = await apiFetch("/ai/kolaborasi-wilayah", {
        method: "POST",
        body: JSON.stringify({
          kota1: selected, inovasi_kota1: inovasi1,
          kota2, inovasi_kota2: inovasi2,
          jarak: haversine(KOORDINAT[selected], KOORDINAT[kota2]).toFixed(1),
        }),
      });
      setHasilAIMap((prev) => ({ ...prev, [kota2]: res.hasil }));
    } catch (e) {
      setHasilAIMap((prev) => ({ ...prev, [kota2]: "Gagal menganalisis: " + e.message }));
    } finally { setLoadingAI(null); }
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-200 opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-200 opacity-20 blur-3xl" />
      </div>

      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-100 text-cyan-700 font-semibold text-sm mb-3">
          🗺️ Spatial Analytics
        </div>
        <h1 className="text-sm font-extrabold tracking-tight text-[#17324d] leading-tight">
          Sebaran Wilayah Inovasi
        </h1>
        <p className="text-gray-500 text-sm mt-3 max-w-3xl">
          Visualisasi persebaran inovasi daerah Jawa Timur berbasis peta interaktif dan analisis kolaborasi wilayah.
        </p>
      </div>

      <div className="mb-3">
        <FilterBar filters={filters} active={active} onChange={handleFilter}
          onReset={() => { setActive({}); setSelected(null); setHasilAIMap({}); }} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {[
          { label:"Total Inovasi",    value:data.length,              icon:<Sparkles size={18}/>,  bg:"#ecfeff", color:"#06b6d4" },
          { label:"Kota Terpetakan",  value:kotaList.length,          icon:<MapPinned size={18}/>, bg:"#f3e8ff", color:"#8b5cf6" },
          { label:"Inovasi Terbanyak",value:topWilayah?topWilayah[0]:"—",
            subValue:topWilayah?`${topWilayah[1].items.length} inovasi`:"",
            icon:<Building2 size={18}/>, bg:"#fffbeb", color:"#f59e0b" },
          { label:"AI Collaboration", value:selected?"Aktif":"—", icon:<Brain size={18}/>, bg:"#ecfdf5", color:"#10b981" },
        ].map((item) => (
          <div key={item.label}
            className="rounded-[18px] bg-white/80 border border-white/50 backdrop-blur-xl p-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background:item.bg, color:item.color }}>
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#17324d]">{item.value}</div>
                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                {item.subValue && <div className="text-xs text-gray-400 mt-1">{item.subValue}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">

        <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl border border-white/50 rounded-[20px] overflow-hidden shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700">
                <Map size={18}/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#17324d]">Peta Persebaran</h2>
                <p className="text-xs text-gray-500">Klik bubble untuk melihat detail wilayah</p>
              </div>
            </div>
          </div>

          <div style={{ height:460 }}>
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Memuat peta...</div>
            ) : (
              <MapContainer center={[-7.5,112.5]} zoom={8} scrollWheelZoom
                style={{ height:"100%", width:"100%" }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {flyCoords && <FlyTo coords={flyCoords}/>}
                {kotaList.map(([nama, val]) => {
                  const radius     = 8 + (val.items.length / maxCount) * 24;
                  const isSelected = selected === nama;
                  return (
                    <CircleMarker key={nama} center={val.coords} radius={radius}
                      pathOptions={{
                        fillColor: isSelected ? "#f59e0b" : "#06b6d4",
                        fillOpacity: 0.85,
                        color: "white",
                        weight: isSelected ? 3 : 2,
                      }}
                      eventHandlers={{ click: () => handleSelectKota(nama) }}>
                      <MapTooltip permanent direction="center">
                        <span style={{ fontWeight:"bold", fontSize:10, color:"#fff" }}>{val.items.length}</span>
                      </MapTooltip>
                      <MapTooltip direction="top" offset={[0,-10]}>
                        <strong>{nama}</strong><br/>{val.items.length} inovasi<br/>
                        <span style={{ color:"#06b6d4", fontSize:11 }}>Klik untuk detail →</span>
                      </MapTooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[20px] p-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700">
              <Search size={18}/>
            </div>
            <div>
              <h2 className="font-bold text-[#17324d] text-sm">Ranking Wilayah</h2>
              <p className="text-xs text-gray-500">Berdasarkan jumlah inovasi</p>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {kotaList
              .sort((a, b) => b[1].items.length - a[1].items.length)
              .map(([nama, val], i) => (
                <motion.div whileHover={{ y:-2 }} key={nama}
                  onClick={() => handleSelectKota(nama)}
                  className={`rounded-lg p-3 cursor-pointer transition-all border
                    ${selected === nama
                      ? "bg-cyan-50 border-cyan-300"
                      : "bg-white border-slate-100 hover:border-cyan-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#17324d] text-white flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-[#17324d] text-sm">{nama}</div>
                        <div className="text-xs text-gray-400">Kabupaten / Kota</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-700 text-sm">{val.items.length}</div>
                      <div className="text-xs text-gray-400">inovasi</div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && grouped[selected] && (
          <motion.div
            ref={detailRef}
            initial={{ opacity:0, y:30 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:20 }}
            transition={{ duration:0.35 }}
            className="mt-3"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"/>
              <h2 className="text-sm font-extrabold text-[#17324d]">Detail: {selected}</h2>
              <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold">
                {grouped[selected].items.length} inovasi
              </span>
              <button onClick={() => { setSelected(null); setHasilAIMap({}); }}
                className="ml-auto px-3 py-1 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition">
                Tutup ✕
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

              <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[20px] p-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold mb-3">
                  📍 {selected}
                </div>
                <h3 className="text-sm font-extrabold text-[#17324d] mb-4">Detail Inovasi Wilayah</h3>

                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {grouped[selected].items.slice(0, 15).map((item, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 p-3 bg-slate-50/70">
                      <div className="font-semibold text-[#17324d] text-sm leading-snug">{item.judul || "—"}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-semibold">{item.jenis || "—"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{item.urusan || "—"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">⭐ {item.kematangan || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[20px] p-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-3">
                  🤖 AI Collaboration
                </div>
                <h3 className="text-sm font-extrabold text-[#17324d] mb-1">Potensi Kolaborasi Wilayah</h3>
                <p className="text-gray-500 text-xs mb-4">Analisis AI berdasarkan kedekatan geografis dan inovasi unggulan.</p>

                <div className="space-y-3">
                  {kotaTerdekat.map((kota, i) => {
                    const isLoadingThis = loadingAI === kota.nama;
                    const hasilIni      = hasilAIMap[kota.nama];

                    return (
                      <div key={kota.nama}
                        className={`rounded-lg border p-3 transition-all
                          ${hasilIni ? "border-violet-200 bg-violet-50/50" : "bg-slate-50 border-slate-100"}`}>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#17324d] text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                              <div className="font-bold text-[#17324d] text-sm">{kota.nama}</div>
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                              <span>📍 {kota.jarak.toFixed(0)} km</span>
                              <span>💡 {kota.jumlah} inovasi</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-400"/>
                        </div>

                        <button
                          onClick={() => handleAnalisisKolaborasi(kota.nama)}
                          disabled={isLoadingThis}
                          className={`mt-3 w-full py-2 rounded-lg font-semibold transition text-white text-sm
                            ${isLoadingThis ? "bg-[#17324d]/60 cursor-wait" : hasilIni ? "bg-violet-600 hover:bg-violet-700" : "bg-[#17324d] hover:bg-[#0f2740]"}`}>
                          {isLoadingThis
                            ? "⏳ AI sedang menganalisis..."
                            : hasilIni
                            ? `🔄 Analisis Ulang ${selected} + ${kota.nama}`
                            : `Analisis ${selected} + ${kota.nama}`}
                        </button>

                        <AnimatePresence>
                          {isLoadingThis && (
                            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                              className="mt-2 rounded-lg bg-[#17324d]/5 p-3">
                              <div className="flex items-center gap-2 text-xs text-[#17324d]/70">
                                <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"/>
                                AI sedang menganalisis potensi kolaborasi...
                              </div>
                            </motion.div>
                          )}

                          {hasilIni && !isLoadingThis && (
                            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
                              className="mt-2 rounded-lg p-3 bg-gradient-to-br from-[#08233d] to-[#0f766e] text-white">
                              <div className="font-bold mb-1 text-xs flex items-center gap-2">
                                ✨ Insight AI — {selected} + {kota.nama}
                              </div>
                              <div className="text-xs leading-relaxed whitespace-pre-wrap text-white/90">{hasilIni}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
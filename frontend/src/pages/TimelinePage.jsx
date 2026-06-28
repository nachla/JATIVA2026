import { useState, useEffect, useMemo } from "react";
import {
  getChartTimeline,
  getFilters,
  getList,
} from "../services/data";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  LabelList,
} from "recharts";

const COLORS = [
  "#0d2b45",
  "#1a7a6e",
  "#2e86ab",
  "#a23b72",
  "#f18f01",
  "#c73e1d",
];

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-3">
      <h2
        className="font-semibold mb-3 text-sm"
        style={{
          color: "#0d2b45",
          borderLeft: "4px solid #1a7a6e",
          paddingLeft: 12,
        }}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="bg-white rounded-lg px-4 py-2 shadow-xl border"
      style={{ borderColor: "#e2e8f0" }}
    >
      <div
        className="text-sm font-semibold mb-1"
        style={{ color: "#0d2b45" }}
      >
        Tahun {label}
      </div>

      <div
        className="text-sm"
        style={{ color: "#1a7a6e" }}
      >
        {payload[0].value} inovasi
      </div>
    </div>
  );
};

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
          style={{ background: "#f1f5f9" }}
        >
          {icon}
        </div>

        <div>
          <div
            className="text-sm font-bold"
            style={{ color: "#0d2b45" }}
          >
            {value}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState([]);

  const [filters, setFilters] = useState({
    opd: [],
    urusan: [],
  });

  const [active, setActive] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [tabelData, setTabelData] =
    useState([]);

  useEffect(() => {
    getFilters()
      .then(setFilters)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      getChartTimeline(active),
      getList(active, 1000),
    ])
      .then(([timelineRes, listRes]) => {

        const sortedTimeline = [...timelineRes].sort(
          (a, b) => Number(a.name) - Number(b.name)
        );

        setTimeline(sortedTimeline);

        const cleanedData = listRes.data.map((item) => ({
          ...item,

          opd:
            item.kabupaten || "—",

          tahun:
            item.tanggal_input
              ? item.tanggal_input.split("-")[2]
              : "—",
        }));

        const sortedTable = [...cleanedData].sort((a, b) => {
          const ka = parseFloat(a.kematangan) || 0;
          const kb = parseFloat(b.kematangan) || 0;
          return kb - ka;
        });

        setTabelData(sortedTable);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [active]);

  function handleFilter(key, val) {
    setActive((prev) => ({
      ...prev,
      [key]: val || undefined,
    }));
  }

  const timelineWithGrowth = useMemo(() => {
    return timeline.map((item, i) => {
      if (i === 0) {
        return {
          ...item,
          growth: null,
        };
      }

      const prev =
        timeline[i - 1]?.value || 0;

      const growth =
        prev > 0
          ? (
            ((item.value - prev) / prev) *
            100
          ).toFixed(1)
          : null;

      return {
        ...item,
        growth,
      };
    });
  }, [timeline]);

  const totalInovasi = useMemo(() => {
    return timeline.reduce(
      (sum, t) => sum + (t.value || 0),
      0
    );
  }, [timeline]);

  const avgPerTahun = useMemo(() => {
    if (!timeline.length) return 0;

    return Math.round(
      totalInovasi / timeline.length
    );
  }, [timeline, totalInovasi]);

  const tahunTerbaik = useMemo(() => {
    if (!timeline.length) return null;

    return [...timeline].sort(
      (a, b) => b.value - a.value
    )[0];
  }, [timeline]);

  const growthTerbaik = useMemo(() => {
    const growthData = timelineWithGrowth.filter(
      (item) => item.growth !== null
    );

    if (!growthData.length) return null;

    return [...growthData].sort(
      (a, b) =>
        Number(b.growth) - Number(a.growth)
    )[0];
  }, [timelineWithGrowth]);

  return (
    <div className="pb-6">

      <div className="mb-4">
        <h1
          className="text-sm font-bold"
          style={{ color: "#0d2b45" }}
        >
          Timeline Inovasi
        </h1>

        <p className="text-sm text-slate-500 mt-2">
          Perkembangan inovasi daerah Jawa
          Timur dari waktu ke waktu
        </p>
      </div>

      <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-semibold text-sm"
            style={{ color: "#0d2b45" }}
          >
            Filter Data
          </h3>

          <button
            onClick={() => setActive({})}
            className="text-xs px-3 py-1.5 rounded-lg border transition"
            style={{
              color: "#1a7a6e",
              borderColor: "#1a7a6e",
            }}
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          {[
            {
              key: "opd",
              label: "OPD",
              opts: filters.opd,
            },
            {
              key: "urusan",
              label: "Urusan",
              opts: filters.urusan,
            },
          ].map(({ key, label, opts }) => (
            <div
              key={key}
              className="flex flex-col gap-1.5"
            >
              <label className="text-xs text-slate-400">
                {label}
              </label>

              <select
                value={active[key] || ""}
                onChange={(e) =>
                  handleFilter(
                    key,
                    e.target.value
                  )
                }
                className="rounded-lg px-3 py-2.5 border outline-none text-sm"
                style={{
                  borderColor: "#e2e8f0",
                  color: "#0d2b45",
                }}
              >
                <option value="">
                  Semua
                </option>

                {(opts || []).map((o) => (
                  <option
                    key={o}
                    value={o}
                  >
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          icon="📅"
          label="Total Tahun"
          value={timeline.length}
        />

        <StatCard
          icon="🏆"
          label="Total Inovasi"
          value={totalInovasi}
        />

        <StatCard
          icon="🚀"
          label="Rata-rata/Tahun"
          value={avgPerTahun}
        />

        <StatCard
          icon="📈"
          label="Growth Tertinggi"
          value={
            growthTerbaik
              ? `${growthTerbaik.growth}%`
              : "-"
          }
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-80 rounded-lg bg-white animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">

          <ChartCard title="Grafik Kenaikan Inovasi">
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <LineChart data={timeline}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  tick={{ fontSize: 11 }}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d2b45"
                  strokeWidth={4}
                  dot={{
                    r: 5,
                    fill: "#1a7a6e",
                  }}
                  activeDot={{
                    r: 7,
                  }}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    style={{
                      fill: "#0d2b45",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                </Line>

              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            <ChartCard title="Jumlah Inovasi per Tahun">
              <ResponsiveContainer
                width="100%"
                height={220}
              >
                <BarChart data={timeline}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />

                  <Bar
                    dataKey="value"
                    radius={[10, 10, 0, 0]}
                  >

                    <LabelList
                      dataKey="value"
                      position="top"
                      style={{
                        fill: "#0d2b45",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />

                    {timeline.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          COLORS[
                          i % COLORS.length
                          ]
                        }
                      />
                    ))}

                  </Bar>

                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Insight Timeline">
              <div className="space-y-3">

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">
                    Tahun Terbaik
                  </div>

                  <div className="text-sm font-bold text-[#0d2b45]">
                    {tahunTerbaik?.name || "-"}
                  </div>

                  <div className="text-sm text-[#1a7a6e] mt-1">
                    {tahunTerbaik?.value || 0} inovasi
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">
                    Pertumbuhan Tertinggi
                  </div>

                  <div className="text-sm font-bold text-[#0d2b45]">
                    {growthTerbaik?.name || "-"}
                  </div>

                  <div className="text-sm text-emerald-600 mt-1">
                    ▲ {growthTerbaik?.growth || 0}%
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">
                    Total Seluruh Inovasi
                  </div>

                  <div className="text-sm font-bold text-[#0d2b45]">
                    {totalInovasi}
                  </div>
                </div>

              </div>
            </ChartCard>

          </div>

          <ChartCard title="Perjalanan Inovasi Jawa Timur">
            <div className="relative pl-4">

              <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-slate-200" />

              {timeline.map((item, i) => {
                const prev = timeline[i - 1]?.value || 0;

                const growth =
                  prev > 0
                    ? (((item.value - prev) / prev) * 100).toFixed(1)
                    : null;

                const isBest =
                  tahunTerbaik?.name === item.name;

                return (
                  <div
                    key={i}
                    className="relative mb-4 flex gap-3"
                  >

                    <div
                      className={`w-6 h-6 rounded-full border-4 z-10 flex-shrink-0 ${isBest
                        ? "bg-emerald-500 border-emerald-200"
                        : "bg-cyan-500 border-cyan-100"
                        }`}
                    />

                    <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-100">

                      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">

                        <div>
                          <h3
                            className="text-sm font-bold"
                            style={{ color: "#0d2b45" }}
                          >
                            Tahun {item.name}
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            Total {item.value} inovasi
                          </p>
                        </div>

                        {growth !== null && (
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold ${Number(growth) >= 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {Number(growth) >= 0 ? "▲" : "▼"}{" "}
                            {Math.abs(growth)}%
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">

                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="text-xs text-slate-400 mb-1">
                            Status Pertumbuhan
                          </div>

                          <div
                            className="font-semibold"
                            style={{ color: "#1a7a6e" }}
                          >
                            {growth === null
                              ? "Awal Pendataan"
                              : Number(growth) > 100
                                ? "Lonjakan Sangat Tinggi"
                                : Number(growth) > 20
                                  ? "Pertumbuhan Positif"
                                  : Number(growth) > 0
                                    ? "Pertumbuhan Stabil"
                                    : "Penurunan"}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="text-xs text-slate-400 mb-1">
                            Insight
                          </div>

                          <div
                            className="font-semibold"
                            style={{ color: "#0d2b45" }}
                          >
                            {isBest
                              ? "Tahun terbaik inovasi 🚀"
                              : item.value > avgPerTahun
                                ? "Di atas rata-rata tahunan"
                                : "Masih di bawah rata-rata"}
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Prediksi Tren Inovasi">

            {timeline.length >= 2 ? (() => {

              const last =
                timeline[timeline.length - 1];

              const prev =
                timeline[timeline.length - 2];

              const growth =
                prev?.value > 0
                  ? ((last.value - prev.value) / prev.value)
                  : 0;

              const prediksi = Math.round(
                last.value * (1 + growth * 0.6)
              );

              const persen = (growth * 100).toFixed(1);

              return (
                <div className="grid lg:grid-cols-2 gap-3 items-center">

                  <div>

                    <div
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
                      style={{
                        background: "#ecfeff",
                        color: "#0891b2",
                      }}
                    >
                      AI Prediction
                    </div>

                    <h3
                      className="text-sm font-bold leading-snug mb-4"
                      style={{ color: "#0d2b45" }}
                    >
                      Prediksi inovasi tahun{" "}
                      {Number(last.name) + 1}
                    </h3>

                    <p className="text-slate-500 leading-relaxed mb-3">
                      Berdasarkan tren pertumbuhan sebelumnya,
                      jumlah inovasi Jawa Timur diperkirakan
                      mencapai sekitar{" "}
                      <span className="font-bold text-cyan-700">
                        {prediksi} inovasi
                      </span>{" "}
                      pada tahun{" "}
                      {Number(last.name) + 1}.
                    </p>

                    <div className="flex flex-wrap gap-3">

                      <div className="bg-slate-50 rounded-lg px-4 py-2 border border-slate-100">
                        <div className="text-xs text-slate-400 mb-1">
                          Growth Sebelumnya
                        </div>

                        <div className="font-bold text-emerald-600">
                          ▲ {persen}%
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg px-4 py-2 border border-slate-100">
                        <div className="text-xs text-slate-400 mb-1">
                          Prediksi Tahun Depan
                        </div>

                        <div
                          className="font-bold"
                          style={{ color: "#0d2b45" }}
                        >
                          {prediksi}
                        </div>
                      </div>

                    </div>

                  </div>

                  <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg p-3 text-white relative overflow-hidden">

                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10">

                      <div className="text-sm opacity-80 mb-2">
                        Forecast Innovation
                      </div>

                      <div className="text-6xl font-extrabold mb-3">
                        {prediksi}
                      </div>

                      <div className="text-cyan-50 text-sm leading-relaxed">
                        Prediksi jumlah inovasi
                        berdasarkan tren data terbaru.
                      </div>

                    </div>
                  </div>

                </div>
              );

            })() : (
              <div className="text-sm text-slate-400">
                Data belum cukup untuk prediksi
              </div>
            )}

          </ChartCard>
        </div>
      )}
    </div>
  );
}
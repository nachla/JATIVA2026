import { useState, useEffect, useMemo } from "react";

import {
  getFilters,
  getChartJenis,
  getChartUrusan,
  getChartOpd,
} from "../services/data";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,

  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  ReferenceLine,

  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,

  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "#113d64",
  "#1a7a6e",
  "#2e86ab",
  "#a23b72",
  "#f18f01",
  "#44bba4",
];

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

async function fetchKematanganUrusan(filters = {}) {

  try {

    const params = new URLSearchParams();

    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, v);
    });

    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_URL}/data/chart/kematangan-urusan?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return await res.json();

  } catch (err) {

    console.error(err);
    return [];

  }
}

function FilterBar({
  filters,
  active,
  onChange,
  onReset,
}) {

  return (

    <div className="rounded-[22px] border border-white/50 bg-white/70 backdrop-blur-xl shadow-sm p-4">

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">

        <div>

          <div className="flex items-center gap-2 mb-1">

            <div className="w-2 h-2 rounded-full bg-cyan-500" />

            <h3 className="font-bold text-[#17324d] text-sm">
              Filter Analisis
            </h3>

          </div>

          <p className="text-xs text-gray-500">
            Sesuaikan visualisasi berdasarkan kategori tertentu
          </p>

        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 rounded-xl border border-cyan-400 text-cyan-700 text-sm font-semibold hover:bg-cyan-500 hover:text-white transition"
        >
          Reset Filter
        </button>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {[
          {
            key: "opd",
            label: "OPD",
            opts: filters.opd,
          },
          {
            key: "jenis",
            label: "Jenis",
            opts: filters.jenis,
          },
          {
            key: "urusan",
            label: "Urusan",
            opts: filters.urusan,
          },
          {
            key: "tahun",
            label: "Tahun",
            opts: filters.tahun,
          },
        ].map(({ key, label, opts }) => (

          <div key={key}>

            <label className="text-[11px] text-gray-400 mb-1 block">
              {label}
            </label>

            <select
              value={active[key] || ""}
              onChange={(e) =>
                onChange(key, e.target.value)
              }
              className="w-full rounded-xl px-3 py-2.5 bg-white border border-gray-200 text-sm text-[#17324d] font-medium outline-none focus:ring-2 focus:ring-cyan-300"
            >

              <option value="">
                Semua
              </option>

              {(opts || []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}

            </select>

          </div>

        ))}

      </div>

    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}) {

  return (

    <div className="bg-white rounded-[22px] p-5 border border-slate-100 shadow-sm">

      <div className="mb-4">

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold mb-3">
          📊 Insight
        </div>

        <h2 className="text-xl font-black text-[#17324d]">
          {title}
        </h2>

        {subtitle && (
          <p className="text-gray-500 mt-1 text-sm">
            {subtitle}
          </p>
        )}

      </div>

      {children}

    </div>
  );
}

export default function AnalisisPage() {

  const [filters, setFilters] = useState({
    opd: [],
    jenis: [],
    urusan: [],
    tahun: [],
  });

  const [active, setActive] = useState({});

  const [chartJenis, setChartJenis] =
    useState([]);

  const [chartOpd, setChartOpd] =
    useState([]);

  const [chartUrusan, setChartUrusan] =
    useState([]);

  const [chartKemUrusan, setChartKemUrusan] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    getFilters()
      .then((res) =>
        setFilters(res || {})
      )
      .catch(console.error);

  }, []);

  useEffect(() => {

    async function loadData() {

      try {

        setLoading(true);

        const [
          jenis,
          opd,
          urusan,
          kemUrusan,
        ] = await Promise.all([
          getChartJenis(active),
          getChartOpd(active),
          getChartUrusan(active),
          fetchKematanganUrusan(active),
        ]);

        setChartJenis(jenis || []);
        setChartOpd(opd || []);
        setChartUrusan(urusan || []);
        setChartKemUrusan(
          kemUrusan || []
        );

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }
    }

    loadData();

  }, [active]);

  function handleFilter(key, val) {

    setActive((prev) => ({
      ...prev,
      [key]: val || undefined,
    }));
  }

  const totalInovasi =
    chartJenis.reduce(
      (a, b) => a + b.value,
      0
    ) || 0;

  const avgKematangan =
    chartKemUrusan.length > 0
      ? (
          chartKemUrusan.reduce(
            (a, b) =>
              a + b.rata_rata,
            0
          ) /
          chartKemUrusan.length
        ).toFixed(2)
      : 0;

  const medianKematangan =
    useMemo(() => {

      if (!chartKemUrusan.length)
        return 0;

      const arr =
        chartKemUrusan
          .map((d) =>
            Number(d.rata_rata)
          )
          .sort((a, b) => a - b);

      const mid = Math.floor(
        arr.length / 2
      );

      return arr.length % 2 !== 0
        ? arr[mid]
        : (arr[mid - 1] +
            arr[mid]) /
            2;

    }, [chartKemUrusan]);

  const noData = (
    <div className="text-center py-14 text-sm text-gray-400">
      Tidak ada data
    </div>
  );

  return (

    <div className="relative flex flex-col gap-4 pb-10">

      {/* HEADER */}

      <div className="rounded-[24px] bg-gradient-to-r from-[#17324d] to-[#1a7a6e] p-6 text-white shadow-xl">

        <div className="flex flex-col lg:flex-row lg:justify-between gap-5">

          <div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs mb-4">
              📈 SIJAVA Analytics
            </div>

            <h1 className="text-3xl font-black leading-tight">
              Analisis Inovasi
              <br />
              Daerah Jawa Timur
            </h1>

            <p className="text-white/80 mt-4 max-w-2xl leading-relaxed text-sm">
              Dashboard analitik untuk mengevaluasi distribusi,
              kualitas, dan tingkat kematangan inovasi daerah.
            </p>

          </div>

          <div className="grid grid-cols-2 gap-3 min-w-[280px]">

            {[
              {
                label: "Total Inovasi",
                val: totalInovasi,
              },
              {
                label: "Total OPD",
                val: chartOpd.length,
              },
              {
                label: "Avg Kematangan",
                val: avgKematangan,
              },
              {
                label: "Median",
                val: Number(
                  medianKematangan
                ).toFixed(2),
              },
            ].map(({ label, val }) => (

              <div
                key={label}
                className="bg-white/10 rounded-2xl p-3 border border-white/10"
              >

                <div className="text-xs text-white/70">
                  {label}
                </div>

                <div className="text-2xl font-black mt-2">
                  {val}
                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* FILTER */}

      <FilterBar
        filters={filters}
        active={active}
        onChange={handleFilter}
        onReset={() => setActive({})}
      />

      {loading ? (

        <div className="flex items-center justify-center py-24">

          <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />

        </div>

      ) : (

        <>

          {/* TOP CHART */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* PIE */}

            <ChartCard
              title="Distribusi Jenis Inovasi"
              subtitle="Komposisi kategori inovasi daerah"
            >

              {chartJenis.length === 0 ? (
                noData
              ) : (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <PieChart>

                    <Pie
                      data={chartJenis}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={4}
                      label={({ percent }) =>
                        `${(
                          percent * 100
                        ).toFixed(0)}%`
                      }
                    >

                      {chartJenis.map(
                        (_, i) => (

                          <Cell
                            key={i}
                            fill={
                              COLORS[
                                i %
                                  COLORS.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              )}

            </ChartCard>

            {/* BAR */}

            <ChartCard
              title="Top OPD Terinovatif"
              subtitle="Perangkat daerah dengan jumlah inovasi tertinggi"
            >

              {chartOpd.length === 0 ? (
                noData
              ) : (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <BarChart
                    data={chartOpd}
                    margin={{
                      top: 20,
                      right: 20,
                      left: 10,
                      bottom: 90,
                    }}
                  >

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      interval={0}
                      height={110}
                      tick={({ x, y, payload }) => {

                        const text =
                          payload.value.length >
                          16
                            ? payload.value.slice(
                                0,
                                16
                              ) + "..."
                            : payload.value;

                        return (
                          <g
                            transform={`translate(${x},${y})`}
                          >
                            <text
                              x={0}
                              y={0}
                              dy={16}
                              textAnchor="end"
                              fill="#64748b"
                              fontSize={10}
                              transform="rotate(-25)"
                            >
                              {text}
                            </text>
                          </g>
                        );
                      }}
                    />

                    <YAxis />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="#1a7a6e"
                      radius={[8, 8, 0, 0]}
                    >

                      <LabelList
                        dataKey="value"
                        position="top"
                        fontSize={10}
                      />

                    </Bar>

                  </BarChart>

                </ResponsiveContainer>

              )}

            </ChartCard>

          </div>

          {/* RADAR */}

          <ChartCard
            title="Radar Profil Kematangan Inovasi"
            subtitle="Perbandingan rata-rata tingkat kematangan antar urusan pemerintahan"
          >

            {chartKemUrusan.length === 0 ? (
              noData
            ) : (

              <div className="w-full overflow-x-auto">

                <div className="min-w-[850px] h-[620px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="58%"
                      data={chartKemUrusan}
                    >

                      <PolarGrid stroke="#dbeafe" />

                      <PolarAngleAxis
                        dataKey="urusan"
                        tickFormatter={(value) =>
                          value.length > 16
                            ? value.substring(
                                0,
                                16
                              ) + "..."
                            : value
                        }
                        tick={{
                          fill: "#64748b",
                          fontSize: 9,
                        }}
                      />

                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 5]}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 9,
                        }}
                      />

                      <Radar
                        name="Kematangan"
                        dataKey="rata_rata"
                        stroke="#0f766e"
                        fill="#14b8a6"
                        fillOpacity={0.45}
                        strokeWidth={2}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius:
                            "12px",
                          border: "none",
                          boxShadow:
                            "0 10px 30px rgba(0,0,0,0.1)",
                        }}
                      />

                    </RadarChart>

                  </ResponsiveContainer>

                </div>

              </div>

            )}

          </ChartCard>

          {/* LINE */}

          <ChartCard
            title="Rata-rata Kematangan per Urusan"
            subtitle="Visualisasi tingkat kematangan inovasi tiap urusan pemerintahan"
          >

            {chartKemUrusan.length === 0 ? (
              noData
            ) : (

              <div className="w-full overflow-x-auto">

                <div className="min-w-[850px] h-[380px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <LineChart
                      data={chartKemUrusan}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 10,
                        bottom: 90,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="urusan"
                        interval={0}
                        height={90}
                        tick={({ x, y, payload }) => {

                          const text =
                            payload.value.length > 16
                              ? payload.value.slice(0, 16) + "..."
                              : payload.value;

                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={16}
                                textAnchor="end"
                                fill="#64748b"
                                fontSize={9}
                                transform="rotate(-25)"
                              >
                                {text}
                              </text>
                            </g>
                          );
                        }}
                      />

                      <YAxis domain={[0, 5]} />

                      <Tooltip />

                      <ReferenceLine
                        y={Number(avgKematangan)}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                      />

                      <Line
                        type="monotone"
                        dataKey="rata_rata"
                        stroke="#0f766e"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

              </div>

            )}

          </ChartCard>

        </>

      )}

    </div>
  );
}
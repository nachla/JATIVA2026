import { apiFetch } from "./auth";

/* =========================
   BUILD QUERY
========================= */
function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (
      val !== null &&
      val !== undefined &&
      val !== ""
    ) {
      params.append(key, val);
    }
  });

  const qs = params.toString();

  return qs ? `?${qs}` : "";
}

/* =========================
   NORMALIZER
========================= */
function normalizeChart(data = []) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => ({
    name:
      item.name ||
      item.tahun ||
      item.jenis ||
      item.urusan ||
      item.opd ||
      item.nama ||
      "-",

    value: Number(
      item.value ||
        item.jumlah ||
        item.total ||
        item.count ||
        0
    ),
  }));
}

/* =========================
   FILTER
========================= */
export async function getFilters() {
  return await apiFetch("/data/filters");
}

/* =========================
   STATS
========================= */
export async function getStats(filters = {}) {
  const data = await apiFetch(
    `/data/stats${buildQuery(filters)}`
  );

  return {
    total_inovasi:
      data?.total_inovasi ||
      data?.total ||
      0,

    total_opd:
      data?.total_opd ||
      data?.opd ||
      0,

    total_urusan:
      data?.total_urusan ||
      data?.urusan ||
      0,

    rata_kematangan: Number(
      data?.rata_kematangan ||
        data?.kematangan ||
        0
    ),
  };
}

/* =========================
   LIST
========================= */
export async function getList(
  filters = {},
  limit = 100,
  offset = 0
) {
  const data = await apiFetch(
    `/data/list${buildQuery({
      ...filters,
      limit,
      offset,
    })}`
  );

  return {
    data:
      data?.data ||
      data?.results ||
      data ||
      [],
  };
}

/* =========================
   JENIS
========================= */
export async function getChartJenis(
  filters = {}
) {
  const data = await apiFetch(
    `/data/chart/jenis${buildQuery(filters)}`
  );

  return normalizeChart(data);
}

/* =========================
   URUSAN
========================= */
export async function getChartUrusan(
  filters = {}
) {
  const data = await apiFetch(
    `/data/chart/urusan${buildQuery(filters)}`
  );

  return normalizeChart(data);
}

/* =========================
   KEMATANGAN
========================= */
export async function getChartKematangan(
  filters = {}
) {
  const data = await apiFetch(
    `/data/chart/kematangan${buildQuery(filters)}`
  );

  return normalizeChart(data);
}

/* =========================
   OPD
========================= */
export async function getChartOpd(
  filters = {}
) {
  const data = await apiFetch(
    `/data/chart/opd${buildQuery(filters)}`
  );

  return normalizeChart(data);
}

/* =========================
   TIMELINE
========================= */
export async function getChartTimeline(
  filters = {}
) {
  const data = await apiFetch(
    `/data/chart/timeline${buildQuery(filters)}`
  );

  return normalizeChart(data);
}

/* =========================
   SANKEY
========================= */
export async function getChartSankey(
  filters = {}
) {
  return await apiFetch(
    `/data/chart/sankey${buildQuery(filters)}`
  );
}

/* =========================
   RADAR
========================= */
export async function getChartRadar(
  filters = {}
) {
  return await apiFetch(
    `/data/chart/radar${buildQuery(filters)}`
  );
}

/* =========================
   DETAIL
========================= */
export async function getInovasiDetail(
  judul
) {
  return await apiFetch(
    `/data/inovasi/${encodeURIComponent(judul)}`
  );
}
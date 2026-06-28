import { apiFetch } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function aiKolaborasi(inovasi_list) {
  return apiFetch("/ai/kolaborasi", {
    method: "POST",
    body: JSON.stringify({ inovasi_list }),
  });
}

export async function aiPrediksi(judul) {
  return apiFetch("/ai/prediksi", {
    method: "POST",
    body: JSON.stringify({ judul }),
  });
}

export async function aiPolicy(urusan) {
  return apiFetch("/ai/policy", {
    method: "POST",
    body: JSON.stringify({ urusan }),
  });
}

export async function aiRancang(judul) {
  return apiFetch("/ai/rancang", {
    method: "POST",
    body: JSON.stringify({ judul }),
  });
}

export async function downloadPolicyPdf(urusan, konten) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/ai/policy/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ urusan, konten }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `policy_brief_${urusan.slice(0, 30)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadRancangPdf(judul, konten, profil) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/ai/rancang/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ judul, konten, profil }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan_${judul.slice(0, 30)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
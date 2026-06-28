const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── helper fetch ──
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Terjadi kesalahan");
  }
  return res.json();
}

// ── auth ──
export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("username", data.username);
  localStorage.setItem("role", data.role);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}

export function getUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return {
    token,
    username: localStorage.getItem("username"),
    role: localStorage.getItem("role"),
  };
}

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

export { apiFetch };

import { useState, useEffect } from "react";
import { apiFetch } from "../services/auth";
import { useAuth } from "../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: "#f0f4f8" }}>{icon}</div>
      <div>
        <div className="text-xl font-bold" style={{ color: "#0d2b45" }}>{value ?? "—"}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers]     = useState([]);
  const [logs, setLogs]       = useState([]);
  const [stats, setStats]     = useState(null);
  const [tab, setTab]         = useState("users");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ username:"", password:"", role:"user" });
  const [formMsg, setFormMsg] = useState("");
  const [formErr, setFormErr] = useState("");
  const [formLoad, setFormLoad] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [u, l, s] = await Promise.all([apiFetch("/admin/users"), apiFetch("/admin/logs"), apiFetch("/admin/stats")]);
      setUsers(u); setLogs(l); setStats(s);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleTambahUser(e) {
    e.preventDefault(); setFormMsg(""); setFormErr("");
    if (!form.username || !form.password) { setFormErr("Username dan password wajib diisi."); return; }
    setFormLoad(true);
    try {
      await apiFetch("/admin/users", { method:"POST", body:JSON.stringify(form) });
      setFormMsg("User berhasil ditambahkan!");
      setForm({ username:"", password:"", role:"user" });
      fetchAll();
    } catch (e) { setFormErr(e.message); } finally { setFormLoad(false); }
  }

  async function handleHapusUser(username) {
    if (!confirm(`Hapus user "${username}"?`)) return;
    try { await apiFetch(`/admin/users/${username}`, { method:"DELETE" }); fetchAll(); } catch (e) { alert(e.message); }
  }

  async function handleReloadData() {
    try { await apiFetch("/admin/reload-data", { method:"POST" }); alert("Data berhasil di-reload!"); } catch (e) { alert(e.message); }
  }

  async function handleUploadExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name !== "data_inovasi.xlsx") { alert('Nama file harus "data_inovasi.xlsx"'); return; }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/upload-data`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload gagal");
      alert("File berhasil diupload & data direload!");
      fetchAll();
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  }

  const tabs = [{ key:"users", label:"👥 Kelola User" }, { key:"logs", label:"📋 Log Aktivitas" }, { key:"data", label:"📁 Kelola Data" }];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color:"#0d2b45" }}>Panel Admin</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manajemen sistem dashboard BRIDA Jawa Timur</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon="👥" label="Total User" value={stats?.total_users} />
        <StatCard icon="🏆" label="Total Inovasi" value={stats?.total_inovasi} />
        <StatCard icon="📋" label="Log Aktivitas" value={stats?.total_logs} />
        <StatCard icon="👤" label="Login sebagai" value={user?.username} />
      </div>

      <div className="flex gap-2 mb-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            style={{ background: tab===t.key ? "#0d2b45" : "white", color: tab===t.key ? "white" : "#0d2b45", border:"1px solid #e2e8f0" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="bg-white rounded-xl p-5 h-48 animate-pulse" /> : (
        <>
          {tab === "users" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold mb-3 text-sm" style={{ color:"#0d2b45" }}>Tambah User Baru</h3>
                <form onSubmit={handleTambahUser} className="flex flex-col gap-2.5">
                  {[{ key:"username", label:"Username", type:"text", ph:"Masukkan username" },
                    { key:"password", label:"Password",  type:"password", ph:"Masukkan password" }].map(({ key, label, type, ph }) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{label}</label>
                      <input type={type} value={form[key]} placeholder={ph}
                        onChange={(e) => setForm({ ...form, [key]:e.target.value })}
                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                        style={{ borderColor:"#e2e8f0", color:"#0d2b45" }} />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Role</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role:e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm border outline-none" style={{ borderColor:"#e2e8f0", color:"#0d2b45" }}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  {formErr && <p className="text-[10px] text-red-500">{formErr}</p>}
                  {formMsg && <p className="text-[10px] text-green-600">{formMsg}</p>}
                  <button type="submit" disabled={formLoad}
                    className="w-full py-2 rounded-lg text-sm font-semibold"
                    style={{ background:"#0d2b45", color:"white", cursor: formLoad?"not-allowed":"pointer" }}>
                    {formLoad ? "Menyimpan..." : "Tambah User"}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold mb-3 text-sm" style={{ color:"#0d2b45" }}>Daftar User</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background:"#f0f4f8" }}>
                      {["No","Username","Role","Aksi"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color:"#0d2b45" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.username} style={{ borderBottom:"1px solid #f0f4f8" }}>
                        <td className="px-3 py-2 text-gray-400">{i+1}</td>
                        <td className="px-3 py-2 font-medium" style={{ color:"#0d2b45" }}>{u.username}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: u.role==="admin"?"#fff3e0":"#f0f9f6", color: u.role==="admin"?"#f18f01":"#1a7a6e" }}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {u.username !== user?.username && (
                            <button onClick={() => handleHapusUser(u.username)}
                              className="text-[10px] px-2 py-1 rounded-md"
                              style={{ color:"#e74c3c", border:"1px solid #e74c3c", background:"transparent", cursor:"pointer" }}>
                              Hapus
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "logs" && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold mb-3 text-sm" style={{ color:"#0d2b45" }}>Log Aktivitas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background:"#f0f4f8" }}>
                      {["No","Username","Aksi","Waktu"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color:"#0d2b45" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i} style={{ borderBottom:"1px solid #f0f4f8" }}>
                        <td className="px-3 py-2 text-gray-400">{i+1}</td>
                        <td className="px-3 py-2 font-medium" style={{ color:"#0d2b45" }}>{log.username}</td>
                        <td className="px-3 py-2 text-gray-500">{log.aksi}</td>
                        <td className="px-3 py-2 text-gray-400">{new Date(log.waktu).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm max-w-xl">
              <div className="mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-bold mb-2">📁 Data Management</div>
                <h3 className="text-lg font-extrabold" style={{ color:"#0d2b45" }}>Kelola Data Inovasi</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Upload file excel terbaru untuk memperbarui data dashboard.<br />
                  Gunakan nama file: <code className="ml-1 text-cyan-700 font-semibold">data_inovasi.xlsx</code>
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <label className="border-2 border-dashed border-cyan-300 rounded-2xl p-8 bg-cyan-50/40 hover:bg-cyan-50 transition cursor-pointer text-center">
                  <input type="file" accept=".xlsx" onChange={handleUploadExcel} className="hidden" />
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">📄</div>
                    <div className="font-bold text-[#0d2b45] text-sm">Klik untuk memilih file Excel</div>
                    <div className="text-xs text-gray-500 mt-1">Format: .xlsx</div>
                  </div>
                </label>
                <button onClick={handleReloadData} disabled={uploading}
                  className="w-full py-3 rounded-xl text-sm font-bold transition bg-[#17324d] hover:bg-[#0f2740] text-white">
                  {uploading ? "Uploading..." : "🔄 Reload Data Excel"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

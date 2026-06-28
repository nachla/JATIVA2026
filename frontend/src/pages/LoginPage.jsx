import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import gubernurImg from "../assets/gubernur.png";
import jativaLogo from "../assets/jativa.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setLoggedIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Silakan isi semua field."); return; }
    setLoading(true);
    try {
      const data = await login(username, password);
      setLoggedIn(data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Nama pengguna atau kata sandi salah!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${gubernurImg})` }} />
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to right, rgba(13,43,69,0.92) 0%, rgba(13,43,69,0.70) 45%, rgba(0,0,0,0.15) 100%)" }} />

      {/* Card — lebih kecil dari sebelumnya */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-8 flex flex-col items-center ml-12 md:ml-20 lg:ml-28"
        style={{
          background: "rgba(255,255,255,0.13)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.32)",
        }}
      >
        <img src={jativaLogo} alt="JATIVA" className="h-18 object-contain mb-4 drop-shadow-lg" />
        <h1 className="text-xl font-extrabold text-white mb-1">Admin Login</h1>
        <p className="text-white/60 text-xs mb-6">Masuk untuk mengakses dashboard JATIVA</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Nama Pengguna</label>
            <input type="text" placeholder="Masukkan nama pengguna"
              value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-white/30"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", color: "white" }} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/60">Kata Sandi</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Masukkan kata sandi"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none placeholder:text-white/30"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", color: "white" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-sm">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(231,76,60,0.25)", border: "1px solid rgba(231,76,60,0.5)", color: "white" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg py-2.5 font-bold text-sm transition mt-1"
            style={{ background: loading ? "rgba(255,255,255,0.7)" : "white", color: "#0d2b45", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <button onClick={() => navigate("/")}
          className="mt-5 text-xs text-cyan-200 hover:text-white transition">
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}

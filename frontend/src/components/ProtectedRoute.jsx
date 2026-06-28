import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({
  children,
  adminOnly = false,
}) {
  const { user, loading } = useAuth();

  // LOADING SCREEN
  if (loading) {
    return (
      <div
        className="
          min-h-screen
          flex items-center justify-center
          bg-[#081b2d]
          relative
          overflow-hidden
        "
      >
        {/* BACKGROUND GLOW */}
        <div
          className="
            absolute top-[-120px] right-[-120px]
            w-[280px] h-[280px]
            rounded-full
            bg-[#1a7a6e]/20
            blur-3xl
          "
        />

        <div
          className="
            absolute bottom-[-120px] left-[-120px]
            w-[260px] h-[260px]
            rounded-full
            bg-[#2e86ab]/20
            blur-3xl
          "
        />

        {/* CARD */}
        <div
          className="
            relative z-10
            bg-white/5
            border border-white/10
            backdrop-blur-md
            rounded-3xl
            px-10 py-8
            flex flex-col items-center
            shadow-2xl
          "
        >
          {/* SPINNER */}
          <div className="relative mb-5">
            <div
              className="
                w-16 h-16
                rounded-full
                border-[5px]
                border-white/10
              "
            />

            <div
              className="
                absolute inset-0
                w-16 h-16
                rounded-full
                border-[5px]
                border-transparent
                border-t-[#1a7a6e]
                border-r-[#2e86ab]
                animate-spin
              "
            />
          </div>

          {/* TEXT */}
          <h2 className="text-white text-lg font-semibold mb-1">
            Memuat Sistem
          </h2>

          <p className="text-slate-400 text-sm text-center">
            Menyiapkan dashboard inovasi daerah...
          </p>
        </div>
      </div>
    );
  }

  // BELUM LOGIN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // KHUSUS ADMIN
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
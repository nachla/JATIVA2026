import Sidebar from "./Sidebar";
import { useAuth } from "../hooks/useAuth";

export default function Layout({ children }) {
  const { user } = useAuth();

  const currentDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="
        min-h-screen
        overflow-x-hidden
        relative
      "
      style={{
        background:
          "linear-gradient(to bottom, #f7fbff 0%, #eef4fa 50%, #e9f1f8 100%)",
      }}
    >
      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="
            absolute top-[-120px] right-[-120px]
            w-[320px] h-[320px]
            rounded-full
            bg-[#1a7a6e]/10
            blur-3xl
          "
        />

        <div
          className="
            absolute bottom-[-120px] left-[-120px]
            w-[300px] h-[300px]
            rounded-full
            bg-[#2e86ab]/10
            blur-3xl
          "
        />
      </div>

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <main className="ml-[240px] min-h-screen relative z-10">

        {/* TOPBAR */}
        <header
          className="
            sticky top-0 z-30
            h-[78px]
            px-8
            flex items-center justify-between

            bg-white/75
            backdrop-blur-xl

            border-b border-white/40
            shadow-sm
          "
        >
          {/* LEFT */}
          <div className="flex flex-col">
            <h1 className="text-[18px] font-bold text-slate-800 tracking-wide">
              JATIVA Dashboard
            </h1>

            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#1a7a6e]" />

              <p className="text-xs text-slate-500">
                Sistem Inovasi Daerah Jawa Timur
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-5">

            {/* DATE */}
            <div className="hidden lg:flex flex-col items-end leading-tight">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">
                Today
              </span>

              <span className="text-sm font-medium text-slate-700">
                {currentDate}
              </span>
            </div>

            {/* USER CARD */}
            <div
              className="
                flex items-center gap-3
                bg-white/70
                border border-slate-200
                rounded-2xl
                px-3 py-2
                shadow-sm
              "
            >
              {/* AVATAR */}
              <div
                className="
                  relative
                  w-11 h-11 rounded-2xl
                  bg-gradient-to-br
                  from-[#113d64]
                  via-[#1a7a6e]
                  to-[#2e86ab]

                  text-white
                  flex items-center justify-center
                  font-bold text-sm

                  shadow-lg
                "
              >
                {user?.username?.[0]?.toUpperCase() || "U"}

                {/* STATUS */}
                <div
                  className="
                    absolute bottom-0 right-0
                    w-3 h-3 rounded-full
                    bg-emerald-500
                    border-2 border-white
                  "
                />
              </div>

              {/* USER INFO */}
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-800">
                  {user?.username || "User"}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="
                      px-2 py-[2px]
                      rounded-full
                      text-[10px]
                      font-semibold
                      uppercase
                    "
                    style={{
                      background:
                        user?.role === "admin"
                          ? "#fff3e0"
                          : "#f0f9f6",
                      color:
                        user?.role === "admin"
                          ? "#f18f01"
                          : "#1a7a6e",
                    }}
                  >
                    {user?.role || "user"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-8">
          <div className="max-w-[1450px] mx-auto">

            {/* CONTENT CARD */}
            <div
              className="
                relative
                rounded-[30px]
              "
            >
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
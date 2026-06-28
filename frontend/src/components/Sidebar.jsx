import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import jativaLogo from "../assets/jativa.png";

import {
  Home,
  BarChart3,
  MapPinned,
  Sparkles,
  Clock3,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    path: "/",
    label: "Dashboard",
    icon: Home,
  },
  {
    path: "/analisis",
    label: "Analisis",
    icon: BarChart3,
  },
  {
    path: "/wilayah",
    label: "Wilayah",
    icon: MapPinned,
  },
  {
    path: "/ai",
    label: "AI Insight",
    icon: Sparkles,
  },
  {
    path: "/timeline",
    label: "Timeline",
    icon: Clock3,
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className="
        fixed left-0 top-0 z-40
        w-[220px] h-screen
        overflow-hidden
        flex flex-col
        bg-[#071d36]
        text-white
      "
    >
      {/* BACKGROUND EFFECT */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* LOGO */}
      <div className="relative px-4 pt-5">
        <div
          className="
            flex items-center gap-3
            rounded-[24px]
            border border-white/10
            bg-white/5
            backdrop-blur-xl
            px-4 py-4
          "
        >
          <div
            className="
              w-[58px] h-[58px]
              rounded-2xl
              bg-white
              flex items-center justify-center
              shadow-lg
              shrink-0
            "
          >
            <img
              src={jativaLogo}
              alt="JATIVA"
              className="w-14 object-contain"
            />
          </div>

          <div>

            <p className="text-[12px] text-slate-300 leading-snug mt-1">
              Sistem Inovasi
              <br />
              Daerah Jawa Timur
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="relative flex-1 px-3 pt-6 overflow-y-auto sidebar-scroll">
        <p className="text-slate-500 text-xs tracking-[2px] mb-4 px-2 font-medium">
          NAVIGATION
        </p>

        <div className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `
                  group
                  relative
                  flex items-center gap-3
                  rounded-2xl
                  px-3 py-3
                  transition-all duration-300

                  ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border border-cyan-400/20"
                      : "hover:bg-white/5"
                  }
                `
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div
                        className="
                          absolute left-0 top-2 bottom-2
                          w-[3px]
                          rounded-full
                          bg-cyan-400
                        "
                      />
                    )}

                    <div
                      className={`
                        w-10 h-10
                        rounded-xl
                        flex items-center justify-center
                        transition-all

                        ${
                          isActive
                            ? "bg-cyan-400/15 text-cyan-300"
                            : "bg-white/5 text-slate-300 group-hover:text-white"
                        }
                      `}
                    >
                      <Icon size={20} />
                    </div>

                    <div>
                      <div
                        className={`
                          text-[14px] font-semibold
                          ${
                            isActive
                              ? "text-cyan-300"
                              : "text-slate-200"
                          }
                        `}
                      >
                        {item.label}
                      </div>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* ADMIN */}
        {user?.role === "admin" && (
          <>
            <div className="border-t border-white/10 my-6" />

            <p className="text-slate-500 text-xs tracking-[2px] mb-4 px-2 font-medium">
              ADMIN
            </p>

            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `
                group
                relative
                flex items-center gap-3
                rounded-2xl
                px-3 py-3
                transition-all duration-300

                ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 border border-cyan-400/20"
                    : "hover:bg-white/5"
                }
              `
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`
                      w-10 h-10
                      rounded-xl
                      flex items-center justify-center
                      transition-all

                      ${
                        isActive
                          ? "bg-cyan-400/15 text-cyan-300"
                          : "bg-white/5 text-slate-300"
                      }
                    `}
                  >
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <div
                      className={`
                        text-[14px] font-semibold
                        ${
                          isActive
                            ? "text-cyan-300"
                            : "text-slate-200"
                        }
                      `}
                    >
                      Admin Panel
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Manage System
                    </div>
                  </div>
                </>
              )}
            </NavLink>
          </>
        )}
      </div>

      {/* LOGOUT */}
      <div className="relative px-3 pb-5">
        <button
          onClick={handleLogout}
          className="
            w-full
            rounded-2xl
            py-3
            border border-red-500/40
            bg-gradient-to-r
            from-red-500/10
            to-pink-500/10
            text-red-300
            font-semibold
            text-[15px]
            flex items-center justify-center gap-2
            transition-all duration-300
            hover:bg-red-500 hover:text-white
          "
        >
          <LogOut size={18} />
          Logout
        </button>

        <div className="text-center text-slate-500 text-xs mt-4">
          Badan Riset dan Inovasi Daerah Jawa Timur • 2026
        </div>
      </div>
    </aside>
  );
}
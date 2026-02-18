import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import UserMenu from "./user-menu";
import { Shield, ChevronRight, LogOut } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { getLiveStatus } from "@/functions/get-live-status";
import { authClient } from "@/lib/auth-client";
import { useHeader } from "./HeaderContext";

export function GlobalHeader() {
  const router = useRouterState();
  const { config } = useHeader();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: session } = authClient.useSession();

  const { data: liveStatus } = useQuery({
    queryKey: ["liveStatus"],
    queryFn: () => getLiveStatus(),
    refetchInterval: 30000,
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.location.pathname]);

  // Dynamic navigation based on authentication
  const isAuthenticated = !!session;

  const navItems = [
    { label: "Home", to: isAuthenticated ? "/dashboard" : "/landing" },
    { label: "Matches", to: "/" },
    { label: "Torneios", to: "/tournaments" },
    { label: "Leaderboard", to: "/leaderboard" },
  ];

  const isAdmin = session?.user?.role === "admin";
  const isInsideAdmin = router.location.pathname.startsWith("/admin");
  const variant = config?.variant || (isInsideAdmin ? "light" : "light");

  if (config?.hideHeader) return null;

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 shadow-sm select-none transition-colors duration-300 flex flex-col",
        variant === "dark" ? "bg-black text-white" : "bg-white text-black",
      )}
    >
      {/* MAIN ROW (Logo, Title, UserMenu) */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 w-full flex items-center justify-between h-16 md:h-20 relative gap-4 md:gap-6 shrink-0">
        <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
          {/* LOGO AREA - Dynamic link based on auth */}
          <Link
            to={isAuthenticated ? "/dashboard" : "/landing"}
            className="relative group flex items-center shrink-0"
          >
            <div
              className={clsx(
                "border-[2px] md:border-[3px] px-2 py-1 md:px-4 md:py-2 transform -skew-x-12 shadow-comic transition-transform group-hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                variant === "dark"
                  ? "bg-black border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] md:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
                  : "bg-white border-black shadow-comic",
              )}
            >
              <div className="transform skew-x-12 flex items-center gap-2">
                <img
                  src="/logo-new.png"
                  alt="BSEBET"
                  className={clsx(
                    "h-6 md:h-8 object-contain",
                    variant === "dark" ? "brightness-200 grayscale-0" : "",
                  )}
                />
              </div>
            </div>
          </Link>

          {/* BREADCRUMBS & TITLE */}
          {isInsideAdmin && (
            <div className="hidden md:flex items-center gap-2 min-w-0 overflow-hidden">
              <div
                className={clsx(
                  "h-8 w-[2px] transform -skew-x-12 mx-2 shrink-0",
                  variant === "dark" ? "bg-gray-800" : "bg-gray-200",
                )}
              />
              <span
                className={clsx(
                  "text-2xl font-black italic uppercase tracking-tighter shrink-0",
                  variant === "dark" ? "text-gray-700" : "text-gray-300",
                )}
              >
                ADMIN
              </span>
              <ChevronRight
                className={clsx(
                  "w-5 h-5 shrink-0",
                  variant === "dark" ? "text-gray-700" : "text-gray-300",
                )}
              />
              <h1
                className={clsx(
                  "text-2xl font-black italic uppercase tracking-tighter truncate pr-2",
                  variant === "dark" ? "text-white" : "text-black",
                )}
              >
                {config?.title || "DASHBOARD"}
              </h1>
            </div>
          )}
        </div>

        {/* RIGHT SIDE (Nav, UserMenu) - Desktop */}
        <div className="hidden xl:flex items-center gap-6 shrink-0">
          <nav className="flex items-center gap-10">
            {!isInsideAdmin && (
              <div className="flex items-center gap-8">
                {navItems.map((item) => {
                  // For "Home", consider both /landing and /dashboard as active
                  const isActive =
                    item.label === "Home"
                      ? router.location.pathname === "/landing" ||
                        router.location.pathname === "/dashboard"
                      : router.location.pathname === item.to;

                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={clsx(
                        "text-xl font-black italic uppercase tracking-tighter transition-all relative group",
                        isActive
                          ? variant === "dark"
                            ? "text-white"
                            : "text-black"
                          : variant === "dark"
                            ? "text-gray-600 hover:text-white"
                            : "text-gray-300 hover:text-black",
                      )}
                    >
                      {item.label}
                      {isActive && (
                        <div className="absolute -bottom-2 left-0 right-0 h-[4px] bg-[#ff2e2e] transform -skew-x-12" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {liveStatus?.isLive && !isInsideAdmin && (
            <div className="bg-black text-white px-3 py-1.5 rounded-full flex items-center gap-2 border-[2px] border-black transform -skew-x-6">
              <span className="w-2 h-2 rounded-full bg-[#00ff55] animate-pulse shadow-[0_0_8px_rgba(0,255,85,0.6)]" />
              <span className="text-[10px] font-black tracking-widest uppercase transform skew-x-6 mt-0.5">
                LIVE
              </span>
            </div>
          )}

          {isAdmin && !isInsideAdmin && (
            <Link
              to="/admin/tournaments"
              className="flex items-center gap-2 px-5 py-2 font-black italic uppercase text-xs tracking-wider border-[3px] border-black transition-all shadow-comic transform -skew-x-12 group hover:shadow-comic-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px] bg-black text-white"
            >
              <Shield
                size={16}
                strokeWidth={3}
                className="transform skew-x-12"
              />
              <span className="transform skew-x-12 whitespace-nowrap">
                Admin Panel
              </span>
            </Link>
          )}

          <UserMenu variant={variant} />
        </div>

        {/* MOBILE MENU TOGGLE & USER MENU - Mobile */}
        <div className="flex xl:hidden items-center gap-4">
          {liveStatus?.isLive && !isInsideAdmin && (
            <div className="bg-black text-white px-2 py-1 rounded-full flex items-center gap-1.5 border-[2px] border-black transform -skew-x-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff55] animate-pulse shadow-[0_0_8px_rgba(0,255,85,0.6)]" />
              <span className="text-[9px] font-black tracking-widest uppercase transform skew-x-6 mt-0.5">
                LIVE
              </span>
            </div>
          )}

          <UserMenu variant={variant} />

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={clsx(
              "p-2 border-[2px] border-black transform -skew-x-6 active:scale-95 transition-transform",
              variant === "dark"
                ? "bg-gray-800 text-white border-gray-600"
                : "bg-white text-black",
            )}
          >
            <div className="transform skew-x-6">
              {isMobileMenuOpen ? (
                <span className="material-symbols-outlined">close</span>
              ) : (
                <span className="material-symbols-outlined">menu</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-white border-b-[4px] border-black z-50 flex flex-col p-4 shadow-[0px_10px_20px_rgba(0,0,0,0.2)] animate-in slide-in-from-top-2">
          {!isInsideAdmin && (
            <nav className="flex flex-col gap-4 mb-6">
              {navItems.map((item) => {
                // For "Home", consider both /landing and /dashboard as active
                const isActive =
                  item.label === "Home"
                    ? router.location.pathname === "/landing" ||
                      router.location.pathname === "/dashboard"
                    : router.location.pathname === item.to;

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={clsx(
                      "text-3xl font-black italic uppercase tracking-tighter transition-all px-4 py-2 border-l-[6px]",
                      isActive
                        ? "border-[#ff2e2e] text-black bg-gray-50"
                        : "border-transparent text-gray-400 hover:text-black hover:border-gray-200",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {isAdmin && !isInsideAdmin && (
            <Link
              to="/admin/tournaments"
              className="flex items-center gap-2 px-6 py-4 font-black italic uppercase text-sm tracking-wider border-[3px] border-black transition-all shadow-comic bg-black text-white justify-center active:translate-y-1 active:shadow-none mb-4"
            >
              <Shield size={20} strokeWidth={3} />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>
      )}

      {/* SUB-HEADER ROW (Admin Actions) */}
      {isInsideAdmin && (
        <div
          className={clsx(
            "w-full border-t relative",
            variant === "dark"
              ? "border-white/10 bg-black/50"
              : "border-black/5 bg-gray-50",
          )}
        >
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 min-h-[50px] md:h-[68px] flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-2 md:py-0">
            {/* Admin Navigation Tabs */}
            <div className="flex items-center gap-2 md:gap-3">
              {[
                { label: "Torneios", to: "/admin/tournaments" },
                { label: "Times", to: "/admin/teams" },
                { label: "Usuários", to: "/admin/users" },
              ].map((tab) => {
                const isActive = router.location.pathname.startsWith(tab.to);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={clsx(
                      "px-3 py-1.5 md:px-4 md:py-2 font-black italic uppercase text-xs md:text-sm tracking-tight border-[2px] md:border-[3px] border-black transition-all transform -skew-x-6 relative",
                      isActive
                        ? "bg-[#ccff00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-gray-500 hover:bg-gray-100 hover:text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] md:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]",
                    )}
                  >
                    <span className="transform skew-x-6">{tab.label}</span>
                    {isActive && (
                      <div className="absolute -bottom-[2px] md:-bottom-[3px] left-0 right-0 h-[2px] md:h-[3px] bg-[#ff2e2e]" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              {config?.actions}
            </div>

            {isAdmin && (
              <Link
                to="/"
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2 font-black italic uppercase text-[10px] md:text-xs tracking-wider border-[2px] md:border-[3px] border-black transition-all shadow-comic transform -skew-x-12 group hover:shadow-comic-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px] shrink-0",
                  variant === "dark"
                    ? "bg-white text-black border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]"
                    : "bg-[#ccff00] text-black border-black",
                )}
              >
                <LogOut
                  size={14}
                  strokeWidth={3}
                  className="transform skew-x-12"
                />
                <span className="transform skew-x-12 whitespace-nowrap hidden md:inline">
                  Sair Admin
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* SPLIT BORDER RAILS (Screen-wide) */}
      <div className="absolute bottom-0 left-0 right-0 h-[4px] flex w-full z-40 font-bold">
        <div className="flex-1 bg-[#2e5cff]" />
        <div className="flex-1 bg-[#ff2e2e]" />
      </div>
    </header>
  );
}

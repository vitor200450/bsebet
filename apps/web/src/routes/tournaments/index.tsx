import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { getTournaments } from "@/server/tournaments";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  Trophy,
  MapPin,
  Users,
  Search,
  ArrowRight,
  Calendar,
} from "lucide-react";

// Schema for URL search params (filter state)
const searchSchema = z.object({
  filter: z.enum(["active", "upcoming", "finished"]).catch("active"),
});

export const Route = createFileRoute("/tournaments/")({
  validateSearch: searchSchema,
  loader: () => getTournaments(),
  component: TournamentsPage,
});

function TournamentsPage() {
  const tournaments = Route.useLoaderData();
  const { filter } = Route.useSearch();
  const navigate = useNavigate({ from: "/tournaments/" });
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tournaments by status and search query
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesStatus = t.status === filter;
      const matchesSearch = t.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [tournaments, filter, searchQuery]);

  const filterTabs = [
    { key: "active" as const, label: "ATIVOS" },
    { key: "upcoming" as const, label: "EM BREVE" },
    { key: "finished" as const, label: "FINALIZADOS" },
  ];

  return (
    <div className="min-h-screen bg-paper bg-paper-texture font-sans text-ink pb-20">
      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <header className="relative mb-12 text-center md:text-left">
          {/* Decorative Background Elements */}
          <div className="hidden md:block absolute top-0 right-10 w-64 h-64 bg-[#ccff00]/10 rounded-full blur-3xl -z-10" />
          <div className="hidden md:block absolute -top-10 -left-10 w-48 h-48 bg-brawl-blue/10 rounded-full blur-2xl -z-10" />

          {/* Tape Decoration */}
          <div className="absolute top-[-25px] left-[50%] md:left-[20px] transform -translate-x-1/2 md:translate-x-0 -rotate-2 bg-tape px-4 py-1 shadow-sm border border-black/10 hidden md:block z-20">
            <span className="font-marker text-xs text-gray-500 tracking-widest">
              OFFICIAL BROADCAST
            </span>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-[0.85] mb-2 uppercase drop-shadow-sm md:transform md:-skew-x-6 text-black">
                TORNEIOS
              </h1>
              <p className="font-bold tracking-[0.2em] uppercase text-gray-500 pl-1">
                COMPETIÇÃO DE ALTO NÍVEL
              </p>
            </div>

            {/* Header Decoration (Abstract Shapes) */}
            <div className="hidden md:block relative w-32 h-32">
              <div className="w-16 h-16 bg-brawl-red border-4 border-black rotate-12 absolute top-0 right-0 shadow-comic" />
              <div className="w-12 h-12 bg-brawl-blue border-4 border-black -rotate-6 absolute bottom-4 right-8 shadow-comic" />
              <div className="w-8 h-8 bg-brawl-yellow border-4 border-black rotate-45 absolute bottom-0 right-0 shadow-comic" />
            </div>
          </div>
        </header>

        {/* Controls Section: Search & Filters */}
        <div className="mb-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-0 bg-black rounded-lg translate-x-1.5 translate-y-1.5 transition-transform group-focus-within:translate-x-2 group-focus-within:translate-y-2" />
            <div className="relative flex items-center bg-white border-4 border-black rounded-lg overflow-hidden transition-transform group-focus-within:-translate-y-0.5 group-focus-within:-translate-x-0.5">
              <div className="pl-4 pr-3 text-black">
                <Search className="w-6 h-6" strokeWidth={3} />
              </div>
              <input
                type="text"
                placeholder="BUSCAR TORNEIO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3 pr-4 font-bold uppercase placeholder:text-gray-300 focus:outline-none text-black tracking-wide bg-transparent"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex overflow-x-auto pb-4 pt-4 md:p-0 md:overflow-visible w-full md:w-auto space-x-4 hide-scrollbar px-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate({ search: { filter: tab.key } })}
                className="relative group min-w-max outline-none"
              >
                <div
                  className={clsx(
                    "absolute inset-0 bg-black rounded-lg transition-all duration-200",
                    filter === tab.key
                      ? "translate-x-1.5 translate-y-1.5 opacity-100"
                      : "translate-x-1 translate-y-1 opacity-0 group-hover:opacity-100",
                  )}
                />
                <div
                  className={clsx(
                    "relative px-6 py-3 rounded-lg border-4 border-black font-black italic uppercase tracking-wider text-sm transition-all transform duration-200",
                    filter === tab.key
                      ? "bg-brawl-yellow text-black -translate-y-0.5 -translate-x-0.5 skew-x-[-6deg]"
                      : "bg-white text-gray-400 hover:-translate-y-1 hover:-translate-x-1 hover:text-black skew-x-[-6deg] hover:skew-x-[-4deg]",
                  )}
                >
                  <span className={clsx("block transform skew-x-[6deg]")}>
                    {tab.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tournament Grid */}
        {filteredTournaments.length === 0 ? (
          <EmptyState filter={filter} hasSearch={!!searchQuery} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({
  tournament,
}: {
  tournament: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    format: string | null;
    region: string | null;
    participantsCount: number | null;
    startDate: Date | null;
    endDate: Date | null;
    status: "upcoming" | "active" | "finished";
  };
}) {
  const isActive = tournament.status === "active";
  const isFinished = tournament.status === "finished";

  return (
    <article className="group relative h-full">
      {/* Hard Shadow */}
      <div className="absolute inset-0 bg-black rounded-2xl translate-x-2.5 translate-y-2.5 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5" />

      {/* Card Body */}
      <div className="relative bg-white border-4 border-black rounded-2xl p-0 overflow-hidden flex flex-col h-full transition-transform group-hover:translate-x-1 group-hover:translate-y-1">
        {/* Card Header Illustration / Gradient */}
        <div className="h-28 bg-paper-pattern relative border-b-4 border-black overflow-hidden bg-gray-50">
          {/* Abstract Header Decoration */}
          <div
            className="absolute opacity-10 inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, black 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />

          <div
            className={`absolute inset-0 opacity-20 ${isActive ? "bg-gradient-to-br from-brawl-red to-transparent" : "bg-gradient-to-br from-gray-200 to-transparent"}`}
          />

          {/* Region Tag */}
          {tournament.region && (
            <div className="absolute top-3 right-3 bg-white border-2 border-black px-2 py-0.5 rounded-md transform rotate-2 shadow-sm z-10">
              <span className="text-[10px] font-black uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-black" />
                {tournament.region}
              </span>
            </div>
          )}
        </div>

        {/* Logo & Main Content */}
        <div className="px-5 relative flex-1 flex flex-col">
          {/* Floating Logo */}
          <div className="absolute -top-12 left-5">
            <div className="w-20 h-20 bg-white rounded-xl border-4 border-black shadow-comic overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              {tournament.logoUrl ? (
                <img
                  src={tournament.logoUrl}
                  alt={tournament.name}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Trophy className="w-8 h-8 text-gray-300" />
              )}
            </div>
            {/* Live Badge */}
            {isActive && (
              <div className="absolute -bottom-3 -right-6 bg-black text-white text-[10px] font-black px-2 py-0.5 rounded border-2 border-[#ccff00] shadow-[2px_2px_0_0_rgba(0,0,0,1)] transform -rotate-6 z-20 flex items-center animate-bounce-slight">
                <span className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse mr-1" />
                AO VIVO
              </div>
            )}
          </div>

          <div className="mt-12 mb-6 pt-2">
            {/* Date */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-black/10 inline-flex items-center">
                <Calendar className="w-3 h-3 mr-1.5" />
                {formatDateRange(tournament.startDate, tournament.endDate)}
              </span>
              {tournament.participantsCount && (
                <span className="font-mono text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border border-black/10">
                  <Users className="w-3 h-3" />
                  {tournament.participantsCount}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black italic uppercase leading-[0.9] mb-1 group-hover:text-brawl-blue transition-colors line-clamp-2">
              {tournament.name}
            </h2>
            {tournament.format && (
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                {tournament.format}
              </p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[10px]" />

          {/* Action Area */}
          <div className="pb-5 pt-2">
            {isActive ? (
              <Link
                to="/tournaments/$slug"
                params={{ slug: tournament.slug }}
                className="w-full bg-brawl-red text-white font-black italic uppercase py-3 border-4 border-black rounded-lg shadow-comic hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-hover transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                ASSISTIR AGORA
              </Link>
            ) : isFinished ? (
              <Link
                to="/tournaments/$slug"
                params={{ slug: tournament.slug }}
                className="w-full bg-gray-100 text-black font-black italic uppercase py-3 border-4 border-black rounded-lg shadow-comic hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-hover transition-all flex items-center justify-center gap-2 text-sm md:text-base group/btn"
              >
                VER RESULTADOS
                <ArrowRight
                  className="w-5 h-5 transition-transform group-hover/btn:translate-x-1"
                  strokeWidth={3}
                />
              </Link>
            ) : (
              <Link
                to="/tournaments/$slug"
                params={{ slug: tournament.slug }}
                className="w-full bg-brawl-yellow text-black font-black italic uppercase py-3 border-4 border-black rounded-lg shadow-comic hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-hover transition-all flex items-center justify-center gap-2 text-sm md:text-base group/btn"
              >
                VER DETALHES
                <ArrowRight
                  className="w-5 h-5 transition-transform group-hover/btn:translate-x-1"
                  strokeWidth={3}
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  filter,
  hasSearch,
}: {
  filter: "active" | "upcoming" | "finished";
  hasSearch: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center col-span-full">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-black rounded-full translate-x-2 translate-y-2 opacity-10" />
        <div className="relative w-32 h-32 rounded-full bg-white border-4 border-black flex items-center justify-center">
          <Search className="w-12 h-12 text-gray-300" strokeWidth={3} />
        </div>
      </div>
      <h2 className="text-3xl font-black italic uppercase mb-2 transform -skew-x-3">
        {hasSearch ? "NENHUM RESULTADO" : "NADA POR AQUI"}
      </h2>
      <p className="font-bold text-gray-500 uppercase max-w-md mx-auto text-sm">
        {hasSearch
          ? "Tente ajustar sua busca ou mudar os filtros."
          : `Não há torneios ${filter === "active" ? "ativos" : filter === "upcoming" ? "programados" : "finalizados"} no momento.`}
      </p>
    </div>
  );
}

function formatDateRange(
  startDate: Date | string | null,
  endDate: Date | string | null,
): string {
  if (!startDate) return "TBA";

  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
  };
  const startStr = start
    .toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" })
    .toUpperCase()
    .replace(".", "");

  if (!endDate) return startStr;

  const end = new Date(endDate);
  const endStr = end
    .toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" })
    .toUpperCase()
    .replace(".", "");

  return `${startStr} - ${endStr}`;
}

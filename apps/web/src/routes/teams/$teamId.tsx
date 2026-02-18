import { createFileRoute, Link } from "@tanstack/react-router";
import { getTeamBySlug } from "@/server/teams";
import { extractColorsServer } from "@/server/color-extractor";
import { TeamLogo } from "@/components/TeamLogo";
import { ArrowLeft, Trophy, Target, TrendingUp, Award } from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { getIntermediateColor } from "@/lib/color-extractor";

export const Route = createFileRoute("/teams/$teamId")({
  loader: ({ params }) => getTeamBySlug({ data: params.teamId }),
  component: TeamDetailsPage,
});

function TeamDetailsPage() {
  const { team, matches, tournaments } = Route.useLoaderData();

  // State for team colors extracted from logo
  const [teamColors, setTeamColors] = useState({
    primary: "#2e5cff",
    secondary: "#ff2e2e",
    intermediate: "#7f46d6",
  });

  // Extract colors from team logo using server-side function
  useEffect(() => {
    if (team.logoUrl) {
      extractColorsServer({ data: team.logoUrl })
        .then((colors) => {
          const intermediate = getIntermediateColor(
            colors.primary,
            colors.secondary,
          );
          setTeamColors({
            primary: colors.primary,
            secondary: colors.secondary,
            intermediate,
          });
        })
        .catch((error) => {
          console.error("Error extracting colors:", error);
        });
    }
  }, [team.logoUrl]);

  // Calculate stats
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const wins = finishedMatches.filter((m) => m.winnerId === team.id).length;
  const losses = finishedMatches.length - wins;
  const winRate =
    finishedMatches.length > 0
      ? Math.round((wins / finishedMatches.length) * 100)
      : 0;

  // Calculate current streak
  let currentStreak = 0;
  let streakType: "W" | "L" | null = null;

  for (let i = 0; i < finishedMatches.length; i++) {
    const match = finishedMatches[i];
    const isWin = match.winnerId === team.id;

    if (i === 0) {
      streakType = isWin ? "W" : "L";
      currentStreak = 1;
    } else if ((isWin && streakType === "W") || (!isWin && streakType === "L")) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Recent matches (last 10)
  const recentMatches = finishedMatches.slice(0, 10);

  return (
    <div className="min-h-screen bg-paper bg-paper-texture font-sans text-ink pb-20">
      {/* Hero Header - Team Colors Background (Dynamic) */}
      <div
        className="relative text-white overflow-hidden border-b-4 border-black transition-all duration-500"
        style={{
          background: `linear-gradient(90deg,
            ${teamColors.primary} 0%,
            ${teamColors.primary} 15%,
            ${teamColors.intermediate} 50%,
            ${teamColors.secondary} 85%,
            ${teamColors.secondary} 100%)`,
        }}
      >
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />

        {/* Soft Darkening Overlays for depth */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/20 via-transparent to-black/20" />

        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <Link
            to="/tournaments"
            search={{ filter: "active" }}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-bold uppercase tracking-wider text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
            {/* Team Logo - Platinum/Metallic 3D */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full scale-110" />

              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl border-[6px] border-black shadow-[8px_8px_0_0_#000,12px_12px_0_0_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden p-6 bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300">
                {/* Metallic shine bars */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent" />

                {/* Reflective highlights */}
                <div className="absolute top-4 left-4 w-12 h-12 bg-white/70 rounded-full blur-xl" />
                <div className="absolute bottom-6 right-6 w-8 h-8 bg-black/10 rounded-full blur-lg" />

                <TeamLogo
                  teamName={team.name}
                  logoUrl={team.logoUrl}
                  className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] relative z-10"
                />

                {/* Inner border highlight - platinum edge */}
                <div className="absolute inset-3 border-2 border-white/60 rounded-xl pointer-events-none" />
                <div className="absolute inset-2 border border-black/10 rounded-xl pointer-events-none" />
              </div>
            </div>

            {/* Team Info */}
            <div className="flex-1 text-center md:text-left">
              {team.region && (
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                  <span className="bg-black text-[#ccff00] border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
                    {team.region}
                  </span>
                </div>
              )}

              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-3 text-white drop-shadow-[4px_4px_8px_rgba(0,0,0,0.4)]">
                {team.name}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/90 font-mono text-sm uppercase font-bold">
                <span>{finishedMatches.length} Partidas</span>
                <span>•</span>
                <span>{tournaments.length} Torneios</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Partidas"
            value={finishedMatches.length.toString()}
            color="bg-white"
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Taxa de Vitória"
            value={`${winRate}%`}
            color="bg-brawl-yellow"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            label="Vitórias"
            value={wins.toString()}
            color="bg-white"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-red-600 rotate-180" />}
            label="Derrotas"
            value={losses.toString()}
            color="bg-white"
          />
          <StatCard
            icon={<Award className="w-5 h-5" />}
            label="Sequência Atual"
            value={
              currentStreak > 0
                ? `${currentStreak}${streakType}`
                : "—"
            }
            color={
              streakType === "W"
                ? "bg-green-100 border-green-500"
                : streakType === "L"
                  ? "bg-red-100 border-red-500"
                  : "bg-white"
            }
          />
        </div>

        {/* Recent Match History */}
        <div className="mb-12">
          <h2 className="text-3xl font-black italic uppercase mb-6 flex items-center gap-3">
            <div className="h-1 w-12 bg-black" />
            Histórico Recente
          </h2>

          {recentMatches.length > 0 ? (
            <div className="space-y-4">
              {recentMatches.map((match, index) => {
                const isTeamA = match.teamAId === team.id;
                const opponent = isTeamA ? match.teamB : match.teamA;
                const isWin = match.winnerId === team.id;
                const teamScore = isTeamA ? match.scoreA : match.scoreB;
                const opponentScore = isTeamA ? match.scoreB : match.scoreA;

                return (
                  <div
                    key={match.id}
                    className="relative bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all overflow-hidden"
                  >
                    {/* Colored Stripe */}
                    <div
                      className={clsx(
                        "absolute left-0 top-0 bottom-0 w-2",
                        isWin ? "bg-brawl-yellow" : "bg-gray-300",
                      )}
                    />

                    <div className="p-5 pl-6 flex items-center gap-4">
                      {/* Win/Loss Badge - Straight */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={clsx(
                            "w-16 h-16 border-[3px] border-black flex items-center justify-center font-black text-2xl uppercase italic shadow-[3px_3px_0_0_#000]",
                            isWin
                              ? "bg-[#ccff00] text-black"
                              : "bg-black text-white",
                          )}
                        >
                          {isWin ? "W" : "L"}
                        </div>
                        {/* Small match number badge */}
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-brawl-red border-2 border-black rounded-full flex items-center justify-center text-[10px] font-black text-white">
                          {index + 1}
                        </div>
                      </div>

                      {/* Tournament Badge */}
                      <div className="flex-shrink-0 hidden md:block">
                        <div className="relative group">
                          {/* Glow on hover */}
                          <div className="absolute -inset-1 bg-brawl-yellow/50 rounded blur opacity-0 group-hover:opacity-40 transition-opacity" />

                          {match.tournament?.slug ? (
                            <Link
                              to="/tournaments/$slug"
                              params={{ slug: match.tournament.slug }}
                              className="relative w-14 h-14 bg-white border-[3px] border-black flex items-center justify-center overflow-hidden shadow-[2px_2px_0_0_#000] hover:shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 transition-all rounded-sm p-2 block"
                            >
                              {match.tournament.logoUrl ? (
                                <img
                                  src={match.tournament.logoUrl}
                                  alt={match.tournament.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Trophy className="w-7 h-7 text-gray-400" />
                              )}
                            </Link>
                          ) : (
                            <div className="relative w-14 h-14 bg-white border-[3px] border-black flex items-center justify-center overflow-hidden shadow-[2px_2px_0_0_#000] rounded-sm p-2">
                              {match.tournament?.logoUrl ? (
                                <img
                                  src={match.tournament.logoUrl}
                                  alt={match.tournament.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Trophy className="w-7 h-7 text-gray-400" />
                              )}
                            </div>
                          )}

                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] border-2 border-black z-50">
                            {match.tournament?.name}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-black" />
                          </div>
                        </div>
                      </div>

                      {/* VS Section - Enhanced Logos */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Our Team - ENHANCED */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="relative group">
                            {/* Glow effect on hover */}
                            <div
                              className="absolute -inset-1 rounded blur opacity-0 group-hover:opacity-30 transition-opacity"
                              style={{ backgroundColor: teamColors.primary }}
                            />

                            <div className="relative w-16 h-16 border-[3px] border-black bg-white flex items-center justify-center overflow-hidden shadow-[3px_3px_0_0_#000] p-2 rounded-sm">
                              <TeamLogo
                                teamName={team.name}
                                logoUrl={team.logoUrl}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                          <span className="font-black uppercase text-sm hidden lg:inline-block">
                            {team.name}
                          </span>
                        </div>

                        {/* VS Badge */}
                        <div className="bg-black text-[#ccff00] px-3 py-1.5 font-black text-xs uppercase italic border-[3px] border-black shadow-[2px_2px_0_0_#000] -skew-x-12 flex-shrink-0">
                          <span className="inline-block skew-x-12">VS</span>
                        </div>

                        {/* Opponent - ENHANCED */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative group flex-shrink-0">
                            {/* Glow effect on hover */}
                            <div className="absolute -inset-1 bg-gray-400 rounded blur opacity-0 group-hover:opacity-30 transition-opacity" />

                            {opponent?.id ? (
                              <Link
                                to="/teams/$teamId"
                                params={{ teamId: opponent.slug }}
                                className="relative w-16 h-16 border-[3px] border-black bg-white flex items-center justify-center overflow-hidden shadow-[3px_3px_0_0_#000] hover:shadow-[5px_5px_0_0_#000] hover:-translate-y-0.5 transition-all p-2 rounded-sm"
                              >
                                <TeamLogo
                                  teamName={opponent.name}
                                  logoUrl={opponent.logoUrl}
                                  className="w-full h-full object-contain"
                                />
                              </Link>
                            ) : (
                              <div className="relative w-16 h-16 border-[3px] border-black bg-white flex items-center justify-center overflow-hidden shadow-[3px_3px_0_0_#000] p-2 rounded-sm">
                                <TeamLogo
                                  teamName={opponent?.name || "TBD"}
                                  logoUrl={opponent?.logoUrl}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                          {opponent?.id ? (
                            <Link
                              to="/teams/$teamId"
                              params={{ teamId: opponent.slug }}
                              className="font-black uppercase text-sm truncate hover:text-brawl-red hover:underline transition-colors"
                            >
                              {opponent.name}
                            </Link>
                          ) : (
                            <span className="font-black uppercase text-sm truncate">
                              {opponent?.name || "TBD"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score - Big and Bold */}
                      <div className="flex-shrink-0">
                        <div className="bg-tape border-[3px] border-black px-4 py-2 flex items-center gap-2 shadow-[2px_2px_0_0_#000]">
                          <span
                            className={clsx(
                              "font-body text-3xl font-black",
                              isWin ? "text-brawl-blue" : "text-black",
                            )}
                          >
                            {teamScore}
                          </span>
                          <span className="text-black text-xl font-black">:</span>
                          <span
                            className={clsx(
                              "font-body text-3xl font-black",
                              !isWin ? "text-brawl-red" : "text-black",
                            )}
                          >
                            {opponentScore}
                          </span>
                        </div>
                      </div>

                      {/* Date Badge - Straight */}
                      <div className="hidden xl:block flex-shrink-0">
                        <div className="bg-white border-[3px] border-black px-3 py-2 text-center shadow-[2px_2px_0_0_#000]">
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {new Date(match.startTime)
                              .toLocaleDateString("pt-BR", {
                                month: "short",
                                timeZone: "UTC",
                              })
                              .toUpperCase()
                              .replace(".", "")}
                          </div>
                          <div className="text-xl font-black text-black">
                            {new Date(match.startTime).getUTCDate()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border-4 border-dashed border-black/10 rounded-xl">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 font-bold uppercase">
                Nenhuma partida finalizada
              </p>
            </div>
          )}
        </div>

        {/* Tournaments Participated */}
        {tournaments.length > 0 && (
          <div>
            <h2 className="text-3xl font-black italic uppercase mb-6 flex items-center gap-3">
              <div className="h-1 w-12 bg-black" />
              Torneios
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  to="/tournaments/$slug"
                  params={{ slug: tournament.slug }}
                  className="group bg-white border-2 border-black shadow-comic hover:shadow-comic-hover hover:-translate-y-1 transition-all p-4 flex items-center gap-4"
                >
                  {tournament.logoUrl ? (
                    <img
                      src={tournament.logoUrl}
                      alt={tournament.name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <Trophy className="w-12 h-12 text-gray-300" />
                  )}

                  <div className="flex-1">
                    <h3 className="font-black uppercase text-sm group-hover:text-brawl-blue transition-colors">
                      {tournament.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold uppercase mt-0.5">
                      {tournament.region || "Global"}
                    </p>
                  </div>

                  <div
                    className={clsx(
                      "px-2 py-1 rounded text-[10px] font-black uppercase",
                      tournament.status === "active"
                        ? "bg-green-100 text-green-800"
                        : tournament.status === "upcoming"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800",
                    )}
                  >
                    {tournament.status === "active"
                      ? "Ativo"
                      : tournament.status === "upcoming"
                        ? "Em Breve"
                        : "Finalizado"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className={clsx(
        "border-2 border-black shadow-comic p-4 flex flex-col items-center justify-center text-center",
        color,
      )}
    >
      <div className="mb-2">{icon}</div>
      <div className="font-body text-3xl font-black mb-1">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
        {label}
      </div>
    </div>
  );
}

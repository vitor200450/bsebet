import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { clsx } from "clsx";

import { getUser } from "@/functions/get-user";
import { getMyBets } from "@/functions/get-my-bets";
import { TeamLogo } from "@/components/TeamLogo";

export const Route = createFileRoute("/my-bets")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }
  },
});

type FilterType = "all" | "pending" | "finished";

function RouteComponent() {
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["myBets"],
    queryFn: () => getMyBets(),
  });

  const allGroups = data?.betsByTournament ?? [];

  const filteredGroups = allGroups
    .map((group) => ({
      ...group,
      bets: group.bets.filter((bet) => {
        if (filter === "pending")
          return (
            bet.match.status === "scheduled" || bet.match.status === "live"
          );
        if (filter === "finished") return bet.match.status === "finished";
        return true;
      }),
    }))
    .filter((group) => group.bets.length > 0);

  const totalFilteredBets = filteredGroups.reduce(
    (acc, g) => acc + g.bets.length,
    0
  );

  return (
    <div className="min-h-screen bg-[#e6e6e6] pb-12 relative">
      {/* Paper texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
          backgroundRepeat: "repeat",
        }}
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10 relative z-10">
        {/* Page Header - Visual diferente do Dashboard */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-8 md:mb-12">
          <div className="flex items-center gap-4">
            {/* Ícone grande de histórico - diferencia do dashboard */}
            <div className="hidden md:flex w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#ff6b00] to-[#ff9d00] border-[4px] border-black shadow-[4px_4px_0_0_#000] items-center justify-center transform -rotate-6">
              <span className="material-symbols-outlined text-white text-3xl lg:text-4xl">
                history
              </span>
            </div>
            <div className="bg-[#ff6b00] text-white px-6 py-3 md:px-8 md:py-4 border-[3px] border-black shadow-[4px_4px_0_0_#000] transform -skew-x-12 inline-block w-fit">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter transform skew-x-12">
                MINHAS APOSTAS
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:mb-2">
            <span className="material-symbols-outlined text-[#ff6b00] text-xl">
              inventory_2
            </span>
            <span className="text-sm md:text-base font-bold text-gray-600">
              Histórico completo de palpites
            </span>
          </div>
        </div>

        {/* Filter Tabs - Visual diferente com ícones */}
        <section className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { key: "all" as FilterType, label: "TODOS", icon: "apps" },
              { key: "pending" as FilterType, label: "PENDENTES", icon: "pending" },
              { key: "finished" as FilterType, label: "FINALIZADOS", icon: "check_circle" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={clsx(
                  "px-5 py-2.5 font-black italic uppercase text-sm tracking-wider border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:shadow-[1px_1px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all transform -skew-x-6 flex items-center gap-2",
                  filter === tab.key
                    ? "bg-[#ff6b00] text-white border-black"
                    : "bg-white text-black"
                )}
              >
                <span className="material-symbols-outlined text-base transform skew-x-6">
                  {tab.icon}
                </span>
                <span className="transform skew-x-6 inline-block">
                  {tab.label}
                </span>
              </button>
            ))}

            {!isLoading && (
              <div className="bg-black text-white px-4 py-2 border-[3px] border-black text-xs font-black ml-auto transform -skew-x-6">
                <span className="transform skew-x-6 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    receipt
                  </span>
                  {totalFilteredBets} palpite{totalFilteredBets !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Bets Grouped by Tournament */}
        {isLoading ? (
          <div className="space-y-10">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-10 w-64 bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] animate-pulse mb-5" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="h-56 bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="space-y-12">
            {filteredGroups.map((group) => (
              <section key={group.tournament.id}>
                {/* Tournament Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-[#ffc700] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform rotate-2 shrink-0">
                    {group.tournament.logoUrl ? (
                      <img
                        src={group.tournament.logoUrl}
                        alt={group.tournament.name}
                        className="w-5 h-5 md:w-6 md:h-6 object-contain"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-black text-xl md:text-2xl">
                        emoji_events
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-black">
                    <Link
                      to="/tournaments/$slug"
                      params={{ slug: group.tournament.slug }}
                      className="hover:text-[#2e5cff] transition-colors"
                    >
                      {group.tournament.name}
                    </Link>
                  </h2>
                  <div className="bg-[#ccff00] px-2 py-1 border-2 border-black text-xs font-black shrink-0">
                    {group.bets.length}
                  </div>
                </div>

                {/* Bet Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.bets.map((bet) => {
                    const isFinished = bet.match.status === "finished";
                    const isLive = bet.match.status === "live";
                    const isProjected = bet.id < 0; // Synthetic bet (projected future match)
                    const won =
                      !isProjected &&
                      isFinished &&
                      bet.pointsEarned !== null &&
                      bet.pointsEarned > 0;
                    const lost = !isProjected && isFinished && !won;

                    return (
                      <div
                        key={bet.id}
                        className={clsx(
                          "border-[3px] p-5 transition-all relative",
                          isProjected
                            ? "bg-[#f8f8f8] border-dashed border-gray-400 shadow-[4px_4px_0_0_#ccc]"
                            : "bg-white border-black shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]"
                        )}
                      >
                        {/* Status Badge */}
                        <div
                          className={clsx(
                            "absolute -top-3 -right-3 px-3 py-1 border-[3px] border-black text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000] transform rotate-6",
                            isProjected
                              ? "bg-[#ff6b00] text-white"
                              : isLive
                                ? "bg-[#ff2e2e] text-white animate-pulse"
                                : won
                                  ? "bg-[#ccff00] text-black"
                                  : lost
                                    ? "bg-[#ff2e2e] text-white"
                                    : "bg-[#f0f0f0] text-black"
                          )}
                        >
                          {isProjected
                            ? "🔮 PROJEÇÃO"
                            : isLive
                              ? "🔴 AO VIVO"
                              : won
                                ? "✅ ACERTOU"
                                : lost
                                  ? "❌ ERROU"
                                  : "⏰ AGENDADO"}
                        </div>

                        {/* Match label (stage) */}
                        {bet.match.label && (
                          <div className="bg-[#f0f0f0] -mx-5 -mt-5 px-5 py-2 mb-4 border-b-[3px] border-black">
                            <div className="text-[10px] font-black text-gray-500 uppercase truncate tracking-wider">
                              {bet.match.label}
                            </div>
                          </div>
                        )}

                        {/* Teams Matchup */}
                        <div className="flex items-stretch gap-3 mb-5 mt-2">
                          {/* Team A */}
                          <div
                            className={clsx(
                              "flex-1 flex flex-col items-center justify-between gap-2 p-3 rounded-sm transition-all border-[3px] min-h-[120px]",
                              !isProjected && bet.predictedWinnerId === bet.match.teamA?.id
                                ? "bg-[#ccff00]/40 border-[#ccff00] shadow-[3px_3px_0_0_#ccff00]"
                                : isProjected
                                  ? "bg-white border-gray-300"
                                  : "bg-white border-black"
                            )}
                          >
                            {bet.match.teamA?.slug ? (
                              <Link
                                to="/teams/$teamId"
                                params={{ teamId: bet.match.teamA.slug }}
                                className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
                              >
                                <TeamLogo
                                  teamName={bet.match.teamA.name}
                                  logoUrl={bet.match.teamA.logoUrl}
                                  size="md"
                                />
                                <span className="text-[11px] font-black uppercase text-center w-full tracking-tight text-black line-clamp-2 hover:text-[#2e5cff] hover:underline">
                                  {bet.match.teamA.name}
                                </span>
                              </Link>
                            ) : (
                              <>
                                <TeamLogo
                                  teamName={bet.match.teamA?.name || "TBD"}
                                  logoUrl={bet.match.teamA?.logoUrl}
                                  size="md"
                                />
                                <span className="text-[11px] font-black uppercase text-center w-full tracking-tight text-black line-clamp-2">
                                  {bet.match.teamA?.name || "TBD"}
                                </span>
                              </>
                            )}

                            <div className="flex flex-col items-center gap-1 w-full">
                              {!isProjected && bet.predictedWinnerId === bet.match.teamA?.id && (
                                <div className="bg-black text-[#ccff00] px-2 py-0.5 text-[8px] font-black uppercase">
                                  PALPITE
                                </div>
                              )}
                              {isFinished &&
                                bet.match.winner?.id === bet.match.teamA?.id && (
                                  <div className="bg-[#ffc700] text-black px-2 py-0.5 text-[8px] font-black uppercase border border-black">
                                    VENCEU
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* VS */}
                          <div className="bg-black text-white px-2 py-1.5 rounded-full border-[3px] border-black shrink-0 self-center">
                            <span className="text-[11px] font-black italic">
                              VS
                            </span>
                          </div>

                          {/* Team B */}
                          <div
                            className={clsx(
                              "flex-1 flex flex-col items-center justify-between gap-2 p-3 rounded-sm transition-all border-[3px] min-h-[120px]",
                              !isProjected && bet.predictedWinnerId === bet.match.teamB?.id
                                ? "bg-[#ccff00]/40 border-[#ccff00] shadow-[3px_3px_0_0_#ccff00]"
                                : isProjected
                                  ? "bg-white border-gray-300"
                                  : "bg-white border-black"
                            )}
                          >
                            {bet.match.teamB?.slug ? (
                              <Link
                                to="/teams/$teamId"
                                params={{ teamId: bet.match.teamB.slug }}
                                className="flex flex-col items-center gap-2 hover:scale-105 transition-transform"
                              >
                                <TeamLogo
                                  teamName={bet.match.teamB.name}
                                  logoUrl={bet.match.teamB.logoUrl}
                                  size="md"
                                />
                                <span className="text-[11px] font-black uppercase text-center w-full tracking-tight text-black line-clamp-2 hover:text-[#ff2e2e] hover:underline">
                                  {bet.match.teamB.name}
                                </span>
                              </Link>
                            ) : (
                              <>
                                <TeamLogo
                                  teamName={bet.match.teamB?.name || "TBD"}
                                  logoUrl={bet.match.teamB?.logoUrl}
                                  size="md"
                                />
                                <span className="text-[11px] font-black uppercase text-center w-full tracking-tight text-black line-clamp-2">
                                  {bet.match.teamB?.name || "TBD"}
                                </span>
                              </>
                            )}

                            <div className="flex flex-col items-center gap-1 w-full">
                              {!isProjected && bet.predictedWinnerId === bet.match.teamB?.id && (
                                <div className="bg-black text-[#ccff00] px-2 py-0.5 text-[8px] font-black uppercase">
                                  PALPITE
                                </div>
                              )}
                              {isFinished &&
                                bet.match.winner?.id === bet.match.teamB?.id && (
                                  <div className="bg-[#ffc700] text-black px-2 py-0.5 text-[8px] font-black uppercase border border-black">
                                    VENCEU
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-[#f0f0f0] -mx-5 -mb-5 px-5 py-3 border-t-[3px] border-black space-y-2">
                          {/* Scores */}
                          {isProjected ? (
                            <div className="flex items-center justify-center gap-2 text-gray-500">
                              <span className="material-symbols-outlined text-base">
                                auto_awesome
                              </span>
                              <span className="text-xs font-black uppercase tracking-wide">
                                Baseado nas suas previsões
                              </span>
                            </div>
                          ) : isFinished ? (
                            <div className="flex items-center justify-between gap-3">
                              {/* Real score */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                                  REAL
                                </span>
                                <div className="flex items-center gap-1">
                                  <div className="bg-black text-white px-2 py-0.5 text-sm font-black min-w-[24px] text-center border-2 border-black">
                                    {bet.match.scoreA ?? "—"}
                                  </div>
                                  <span className="text-xs text-black font-black">
                                    ×
                                  </span>
                                  <div className="bg-black text-white px-2 py-0.5 text-sm font-black min-w-[24px] text-center border-2 border-black">
                                    {bet.match.scoreB ?? "—"}
                                  </div>
                                </div>
                              </div>

                              {/* Predicted score */}
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                                  PALPITE
                                </span>
                                <div className="flex items-center gap-1">
                                  <div className="bg-gray-200 text-black px-2 py-0.5 text-sm font-black min-w-[24px] text-center border-2 border-black">
                                    {bet.predictedScoreA}
                                  </div>
                                  <span className="text-xs text-black font-black">
                                    ×
                                  </span>
                                  <div className="bg-gray-200 text-black px-2 py-0.5 text-sm font-black min-w-[24px] text-center border-2 border-black">
                                    {bet.predictedScoreB}
                                  </div>
                                </div>
                              </div>

                              {/* Points earned */}
                              {bet.pointsEarned !== null &&
                                bet.pointsEarned > 0 && (
                                  <div className="bg-[#ccff00] border-[2px] border-black px-2 py-1 text-center">
                                    <div className="text-xs font-black text-black">
                                      +{bet.pointsEarned}
                                    </div>
                                    <div className="text-[8px] font-black text-black uppercase">
                                      PTS
                                    </div>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base text-black">
                                  casino
                                </span>
                                <span className="text-xs font-black text-black uppercase tracking-wide">
                                  Placar:
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="bg-black text-white px-2 py-1 text-sm font-black min-w-[24px] text-center border-2 border-black">
                                  {bet.predictedScoreA}
                                </div>
                                <span className="text-xs text-black font-black">
                                  ×
                                </span>
                                <div className="bg-black text-white px-2 py-1 text-sm font-black min-w-[24px] text-center border-2 border-black">
                                  {bet.predictedScoreB}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Badges for finished matches */}
                          {isFinished &&
                            (bet.isPerfectPick || bet.isUnderdogPick) && (
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                {bet.isPerfectPick && (
                                  <span className="bg-[#ffc700] text-black px-2 py-0.5 text-[9px] font-black uppercase border-2 border-black transform -skew-x-6 inline-block">
                                    PLACAR EXATO
                                  </span>
                                )}
                                {bet.isUnderdogPick && won && (
                                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 text-[9px] font-black uppercase border-2 border-black transform skew-x-6 inline-block">
                                    AZARÃO
                                  </span>
                                )}
                              </div>
                            )}
                        </div>

                        {/* Date stamp (for scheduled/live) */}
                        {!isFinished && (
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border-[2px] border-black px-3 py-1 text-[9px] font-black text-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] whitespace-nowrap">
                            {new Date(bet.match.startTime).toLocaleString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-12 text-center">
            <div className="bg-[#f0f0f0] border-[3px] border-black w-20 h-20 mx-auto mb-5 flex items-center justify-center transform -rotate-6">
              <span className="material-symbols-outlined text-4xl text-gray-600 transform rotate-6">
                inbox
              </span>
            </div>
            <p className="text-black font-black text-xl uppercase italic mb-2">
              {filter === "all"
                ? "Nenhum palpite encontrado"
                : filter === "pending"
                  ? "Nenhum palpite pendente"
                  : "Nenhum palpite finalizado"}
            </p>
            <p className="text-gray-700 font-bold text-sm mb-6">
              {filter === "all"
                ? "Faça suas apostas nos torneios ativos!"
                : "Tente outro filtro ou faça mais apostas."}
            </p>
            <Link to="/">
              <button className="bg-[#ffc700] text-black px-8 py-4 border-[3px] border-black font-black italic uppercase text-base tracking-wider shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all transform -skew-x-12 group">
                <span className="transform skew-x-12 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">
                    sports
                  </span>
                  VER PARTIDAS
                </span>
              </button>
            </Link>
          </div>
        )}

        {/* Bottom decorative */}
        <div className="mt-16 flex items-center justify-center gap-3 opacity-40">
          <div className="w-12 h-1 bg-black transform -skew-x-12" />
          <div className="w-3 h-3 bg-[#ccff00] border-2 border-black rotate-45" />
          <div className="w-12 h-1 bg-black transform skew-x-12" />
        </div>
      </div>
    </div>
  );
}

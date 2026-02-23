import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  ArrowLeft,
  Star,
  Trophy,
} from "lucide-react";
import { TrophyCase } from "@/components/RealisticMedal";
import { TeamLogo } from "@/components/TeamLogo";
import {
  getUserMedals,
  getUserProfile,
  getUserRecentBets,
  getUserStats,
  getUserTournamentHistory,
} from "@/server/user-profile";

export const Route = createFileRoute("/users/$userId")({
  loader: async ({ params }) => {
    const [profile, stats, medals, recentBets, tournamentHistory] =
      await Promise.all([
        getUserProfile({ data: params.userId }),
        getUserStats({ data: params.userId }),
        getUserMedals({ data: params.userId }),
        getUserRecentBets({ data: params.userId }),
        getUserTournamentHistory({ data: params.userId }),
      ]);

    if (!profile) throw notFound();

    return { profile, stats, medals, recentBets, tournamentHistory };
  },
  component: UserProfilePage,
});

function UserProfilePage() {
  const data = Route.useLoaderData();
  const user = data.profile;
  const stats = data.stats;
  const medals = data.medals;
  const recentBets = data.recentBets;
  const tourneyHistory = data.tournamentHistory;

  const memberSince = new Date(user.createdAt)
    .toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
    })
    .toUpperCase();

  return (
    <div className="relative min-h-screen bg-[#e6e6e6] pb-12 font-display">
      {/* Subtle paper texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.15] mix-blend-multiply"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
          backgroundRepeat: "repeat",
        }}
      />

      {/* Page Header */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 md:px-6 md:py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:mb-12 md:flex-row md:items-center">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {/* Title Badge md:flex-row */}
            <div className="inline-block w-fit -skew-x-12 transform border-[3px] border-black bg-black px-6 py-3 text-white shadow-[4px_4px_0_0_#000] md:px-8 md:py-4">
              <h1 className="skew-x-12 transform font-black text-3xl text-[#ccff00] uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
                PERFIL
              </h1>
            </div>
          </div>

          {/* Action Button */}
          <Link
            to="/leaderboard"
            search={{ page: 1, pageSize: 20 } as any}
            className="group w-fit -skew-x-12 transform border-[3px] border-black bg-white px-6 py-3 font-black text-black text-sm uppercase italic tracking-wider shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <span className="flex skew-x-12 transform items-center gap-2">
              <ArrowLeft
                className="h-5 w-5 transition-transform group-hover:-translate-x-1"
                strokeWidth={3}
              />
              VOLTAR
            </span>
          </Link>
        </div>

        <div className="grid h-full grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column (Profile & Trophies - 30%) */}
          <div className="flex flex-col gap-8 md:gap-10 lg:col-span-4">
            {/* User Details Box */}
            <div className="relative overflow-hidden border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[6px_6px_0_0_#000]">
              <div className="absolute top-0 left-0 h-32 w-full border-black border-b-[3px] bg-[#f0f0f0]" />

              <div className="relative z-10 flex flex-col items-center pt-8">
                <div className="relative flex h-40 w-40 -rotate-2 items-center justify-center overflow-hidden border-[4px] border-black bg-white p-1 shadow-[4px_4px_0_0_#000] transition-transform duration-300 hover:rotate-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.nickname ?? user.name ?? "User"}
                      className="h-full w-full border-[2px] border-black object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center border-2 border-black bg-tape font-black text-6xl text-black/30">
                      {(user.nickname ?? user.name ?? "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  {/* Decorative corner */}
                  <div className="absolute -top-4 -right-4 h-12 w-12 rotate-45 transform border-black border-b-[3px] border-l-[3px] bg-[#ccff00]" />
                </div>

                <div className="mt-8 mb-2 -rotate-2 border-[2px] border-black bg-[#ffc700] px-4 py-1 shadow-[2px_2px_0_0_#000]">
                  <p className="font-black text-black text-xs uppercase tracking-[0.2em]">
                    PLAYER
                  </p>
                </div>

                <h2 className="mt-2 mb-1 w-full skew-x-[-6deg] truncate text-center font-black text-3xl text-black uppercase italic tracking-tighter">
                  {user.nickname ?? user.name}
                </h2>
                <p className="mt-2 font-bold text-gray-500 text-sm uppercase">
                  Membro desde {memberSince}
                </p>
              </div>
            </div>

            {/* Top Placements (Trophy Case) */}
            <TrophyCase medals={medals} />
          </div>

          {/* Right Column (Stats & History - 70%) */}
          <div className="flex flex-col gap-10 md:gap-14 lg:col-span-8">
            {/* Statistics Section */}
            <section>
              <div className="mb-5 flex items-center gap-3">
                <div className="rotate-3 transform border-2 border-black bg-[#2e5cff] p-2 shadow-[2px_2px_0_0_#000]">
                  <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                    query_stats
                  </span>
                </div>
                <h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
                  ESTATÍSTICAS GERAIS
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {/* Total Points */}
                <div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-3xl text-[#ffc700]">
                      star
                    </span>
                    <div className="h-2 w-2 rounded-full bg-[#ffc700]" />
                  </div>
                  <div className="mb-1 font-black text-4xl text-black">
                    {stats.totalPoints}
                  </div>
                  <div className="font-black text-[10px] text-black uppercase tracking-wider">
                    Total de Pontos
                  </div>
                </div>

                {/* Accuracy */}
                <div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-3xl text-[#2e5cff]">
                      target
                    </span>
                    <div className="h-2 w-2 rounded-full bg-[#2e5cff]" />
                  </div>
                  <div className="mb-1 font-black text-4xl text-black">
                    {stats.accuracy}%
                  </div>
                  <div className="font-black text-[10px] text-black uppercase tracking-wider">
                    Taxa de Acerto
                  </div>
                </div>

                {/* Perfect Picks */}
                <div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-3xl text-[#ccff00]">
                      grade
                    </span>
                    <div className="h-2 w-2 rounded-full bg-[#ccff00]" />
                  </div>
                  <div className="mb-1 font-black text-4xl text-black">
                    {stats.perfectPicks}
                  </div>
                  <div className="font-black text-[10px] text-black uppercase tracking-wider">
                    Placares Exatos
                  </div>
                </div>

                {/* Underdog Wins */}
                <div className="group border-[3px] border-black bg-gradient-to-r from-purple-600 to-pink-600 p-5 shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-3xl text-white">
                      bolt
                    </span>
                    <div className="h-2 w-2 rounded-full bg-white opacity-50" />
                  </div>
                  <div className="mb-1 font-black text-4xl text-white">
                    {stats.underdogWins}
                  </div>
                  <div className="font-black text-[10px] text-white uppercase tracking-wider">
                    Azarões
                  </div>
                </div>

                {/* Total Bets */}
                <div className="group border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="material-symbols-outlined text-3xl text-[#ff2e2e]">
                      casino
                    </span>
                    <div className="h-2 w-2 rounded-full bg-[#ff2e2e]" />
                  </div>
                  <div className="mb-1 font-black text-4xl text-black">
                    {stats.totalBets}
                  </div>
                  <div className="font-black text-[10px] text-black uppercase tracking-wider">
                    Total de Apostas
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Bets Section */}
            {recentBets.length > 0 &&
              (() => {
                // Group bets by tournament
                const betsByTournament = recentBets.reduce(
                  (acc, bet) => {
                    const tourneyId = bet.match.tournament?.id || "unknown";
                    if (!acc[tourneyId]) {
                      acc[tourneyId] = {
                        name:
                          bet.match.tournament?.name || "Torneio Desconhecido",
                        logoUrl: bet.match.tournament?.logoUrl,
                        bets: [],
                      };
                    }
                    acc[tourneyId].bets.push(bet);
                    return acc;
                  },
                  {} as Record<
                    string,
                    {
                      name: string;
                      logoUrl?: string | null;
                      bets: typeof recentBets;
                    }
                  >,
                );

                // Sort bets within each tournament by match start time (descending = newest/upcoming first)
                Object.values(betsByTournament).forEach((group) => {
                  group.bets.sort((a, b) => {
                    return (
                      new Date(b.match.startTime).getTime() -
                      new Date(a.match.startTime).getTime()
                    );
                  });
                });

                return (
                  <section>
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <div className="-rotate-3 transform border-2 border-black bg-[#ff2e2e] p-2 shadow-[2px_2px_0_0_#000]">
                        <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                          sports_esports
                        </span>
                      </div>
                      <h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
                        Apostas Recentes
                      </h2>
                    </div>

                    <div className="flex flex-col gap-10">
                      {Object.values(betsByTournament).map(
                        (tournamentGroup, idx) => (
                          <div key={idx} className="flex flex-col gap-4">
                            {/* Tournament Header */}
                            <div className="mb-2 flex items-center gap-3 border-black border-b-[3px] pb-2">
                              {tournamentGroup.logoUrl ? (
                                <div className="h-8 w-8 flex-shrink-0 -rotate-3 overflow-hidden border-2 border-black bg-white p-0.5 shadow-[2px_2px_0_0_#000] md:h-10 md:w-10">
                                  <img
                                    src={tournamentGroup.logoUrl}
                                    alt="Logo"
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="h-5 w-5 -skew-x-12 transform border-2 border-black bg-[#ffc700]" />
                              )}
                              <h3 className="font-black text-black text-lg uppercase tracking-tight md:text-xl">
                                {tournamentGroup.name}
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                              {tournamentGroup.bets.map((bet) => {
                                const isWin = (bet.pointsEarned ?? 0) > 0;
                                const isLoss =
                                  bet.pointsEarned === 0 &&
                                  bet.match.status === "finished";

                                let statusBadgeClass =
                                  "bg-[#f0f0f0] text-black";
                                let label = "AGENDADO";

                                if (isWin) {
                                  statusBadgeClass = "bg-[#ccff00] text-black";
                                  label = `WIN (+${bet.pointsEarned})`;
                                } else if (isLoss) {
                                  statusBadgeClass = "bg-[#ff2e2e] text-white";
                                  label = "LOSS (0)";
                                } else if (bet.match.status === "live") {
                                  statusBadgeClass =
                                    "bg-[#ff2e2e] text-white animate-pulse";
                                  label = "AO VIVO";
                                }

                                return (
                                  <div
                                    key={bet.id}
                                    className="group relative cursor-pointer border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]"
                                  >
                                    {/* Status Badge */}
                                    <div
                                      className={clsx(
                                        "absolute -top-3 -right-3 rotate-6 transform border-[3px] border-black px-3 py-1 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_#000]",
                                        statusBadgeClass,
                                      )}
                                    >
                                      {label}
                                    </div>

                                    {/* Teams Matchup */}
                                    <div className="relative mb-5 flex items-stretch gap-3">
                                      {/* Team A */}
                                      {bet.match.teamA?.slug ? (
                                        <Link
                                          to="/teams/$teamId"
                                          params={{ teamId: bet.match.teamA.slug }}
                                          className={clsx(
                                            "flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
                                            bet.predictedWinnerId ===
                                              bet.match.teamA?.id
                                              ? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
                                              : "border-black bg-[#f0f0f0]",
                                          )}
                                        >
                                          <TeamLogo
                                            teamName={
                                              bet.match.teamA?.name || "TBD"
                                            }
                                            logoUrl={bet.match.teamA?.logoUrl}
                                            size="md"
                                          />
                                          <span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-brawl-blue hover:underline">
                                            {bet.match.teamA?.name || "TBD"}
                                          </span>
                                          {bet.predictedWinnerId ===
                                          bet.match.teamA?.id ? (
                                            <div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
                                              PALPITE
                                            </div>
                                          ) : (
                                            <div className="h-5" />
                                          )}
                                        </Link>
                                      ) : (
                                        <div
                                          className={clsx(
                                            "flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3",
                                            "border-black bg-[#f0f0f0]",
                                          )}
                                        >
                                          <TeamLogo teamName="TBD" size="md" />
                                          <span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight">
                                            TBD
                                          </span>
                                          <div className="h-5" />
                                        </div>
                                      )}

                                      {/* VS Separator */}
                                      <div className="z-10 shrink-0 self-center rounded-full border-[3px] border-black bg-black px-2 py-1.5 text-white">
                                        <span className="font-black text-[11px] italic">
                                          VS
                                        </span>
                                      </div>

                                      {/* Team B */}
                                      {bet.match.teamB?.slug ? (
                                        <Link
                                          to="/teams/$teamId"
                                          params={{ teamId: bet.match.teamB.slug }}
                                          className={clsx(
                                            "relative flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3 transition-all",
                                            bet.predictedWinnerId ===
                                              bet.match.teamB?.id
                                              ? "border-[#ccff00] bg-[#ccff00]/40 shadow-[3px_3px_0_0_#ccff00]"
                                              : "border-black bg-[#f0f0f0]",
                                          )}
                                        >
                                          <TeamLogo
                                            teamName={
                                              bet.match.teamB?.name || "TBD"
                                            }
                                            logoUrl={bet.match.teamB?.logoUrl}
                                            size="md"
                                          />
                                          <span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight hover:text-brawl-red hover:underline">
                                            {bet.match.teamB?.name || "TBD"}
                                          </span>
                                          {bet.predictedWinnerId ===
                                          bet.match.teamB?.id ? (
                                            <div className="bg-black px-2 py-0.5 font-black text-[#ccff00] text-[8px] uppercase">
                                              PALPITE
                                            </div>
                                          ) : (
                                            <div className="h-5" />
                                          )}
                                        </Link>
                                      ) : (
                                        <div
                                          className={clsx(
                                            "flex min-h-[120px] flex-1 flex-col items-center justify-between gap-2 rounded-sm border-[3px] p-3",
                                            "border-black bg-[#f0f0f0]",
                                          )}
                                        >
                                          <TeamLogo teamName="TBD" size="md" />
                                          <span className="line-clamp-2 w-full text-center font-black text-[11px] text-black uppercase tracking-tight">
                                            TBD
                                          </span>
                                          <div className="h-5" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Prediction Score Footer */}
                                    <div className="relative -mx-5 mt-2 -mb-5 flex flex-col overflow-hidden border-black border-t-[3px] bg-white text-black">
                                      <div className="flex items-center justify-between border-black/20 border-b-[2px] border-dashed px-5 py-2">
                                        <div className="flex items-center gap-2">
                                          <span className="material-symbols-outlined text-black text-sm">
                                            casino
                                          </span>
                                          <span className="font-black text-[10px] text-black uppercase tracking-wide">
                                            Palpite:
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-80">
                                          <div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
                                            {bet.predictedScoreA}
                                          </div>
                                          <span className="font-black text-black text-xs">
                                            ×
                                          </span>
                                          <div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
                                            {bet.predictedScoreB}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between bg-[#f4f4f4] px-5 py-2">
                                        <div className="flex items-center gap-2">
                                          <span className="material-symbols-outlined text-black text-sm">
                                            sports_score
                                          </span>
                                          <span className="font-black text-[10px] text-black uppercase tracking-wide">
                                            Real:
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {bet.match.status === "finished" ||
                                          bet.match.status === "live" ? (
                                            <>
                                              <div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
                                                {bet.match.scoreA}
                                              </div>
                                              <span className="font-black text-black text-xs">
                                                ×
                                              </span>
                                              <div className="min-w-[20px] bg-black px-1.5 py-0.5 text-center font-black text-white text-xs">
                                                {bet.match.scoreB}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="font-black text-[10px] text-black/40 uppercase tracking-widest">
                                              TBD
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Match Time Stamp */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap border-[2px] border-black bg-white px-3 py-1 font-black text-[9px] text-black uppercase tracking-wide shadow-[2px_2px_0_0_#000]">
                                      {new Date(
                                        bet.match.startTime,
                                      ).toLocaleString("pt-BR", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                );
              })()}

            {/* Tournament History Tabular Section via Cards */}
            {tourneyHistory.length > 0 && (
              <section className="mt-4 mb-8">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rotate-2 transform border-2 border-black bg-[#2e5cff] p-2 shadow-[2px_2px_0_0_#000]">
                    <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                      emoji_events
                    </span>
                  </div>
                  <h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
                    Histórico de Torneios
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  {tourneyHistory.map((history) => {
                    const isChampion = history.rank === 1;
                    const isTop3 = history.rank <= 3 && history.rank > 0;
                    return (
                      <div
                        key={history.tournamentId}
                        className="group relative flex flex-col border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3 border-black/10 border-b-2 border-dashed pb-4">
                          <div className="flex items-center gap-2 overflow-hidden">
                            {history.tournamentLogoUrl && (
                              <div className="h-6 w-6 flex-shrink-0 md:h-8 md:w-8">
                                <img
                                  src={history.tournamentLogoUrl}
                                  alt="Logo"
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            )}
                            <span
                              className="truncate font-black text-black text-sm uppercase leading-tight sm:text-base"
                              title={history.tournamentName}
                            >
                              {history.tournamentName}
                            </span>
                          </div>

                          {history.rank > 0 && (
                            <span
                              className={clsx(
                                "border-[2px] px-2 py-1 font-black text-xs shadow-[2px_2px_0_0_#000]",
                                isChampion
                                  ? "-rotate-2 border-black bg-[#ffc700] text-black"
                                  : isTop3
                                    ? "rotate-2 border-black bg-black text-white"
                                    : "border-black bg-[#f0f0f0] text-black",
                              )}
                            >
                              #{history.rank}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col border-black/10 border-r-2 border-dashed">
                            <span className="mb-1 font-black text-[9px] text-black/50 uppercase tracking-widest">
                              Perfeitos
                            </span>
                            {history.perfectPicks > 0 ? (
                              <span className="flex items-center gap-1 font-black text-black text-xl">
                                {history.perfectPicks}
                                <Star
                                  className="h-4 w-4 text-[#ffc700] drop-shadow-[1px_1px_0_0_#000]"
                                  fill="currentColor"
                                />
                              </span>
                            ) : (
                              <span className="font-bold text-black/30 text-lg">
                                -
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col pl-2">
                            <span className="mb-1 font-black text-[9px] text-black/50 uppercase tracking-widest">
                              Pontos Finais
                            </span>
                            <span className="flex items-center gap-1 font-black text-2xl text-black italic tracking-tight">
                              {history.totalPoints}
                              <span className="material-symbols-outlined text-[#2e5cff] text-xl">
                                stars
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

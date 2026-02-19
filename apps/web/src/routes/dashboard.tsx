import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Trophy, ChevronRight } from "lucide-react";

import { getUser } from "@/functions/get-user";
import { getDashboardData } from "@/functions/get-dashboard-data";
import { getMyProfile } from "@/server/users";
import { TeamLogo } from "@/components/TeamLogo";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
      });
    }
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const { data: profile } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => getMyProfile(),
    staleTime: 1000 * 60 * 5,
  });

  const displayName = profile?.nickname || session?.user.name;

  const stats = data?.stats ?? {
    totalBets: 0,
    correctPredictions: 0,
    totalPoints: 0,
    accuracy: 0,
    pendingBets: 0,
    perfectPicks: 0,
    underdogWins: 0,
  };
  const activeBets = data?.activeBets ?? [];
  const activeTournaments = data?.activeTournaments ?? [];

  return (
    <div className="min-h-screen bg-[#e6e6e6] pb-12 relative">
      {/* Subtle paper texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
          backgroundRepeat: 'repeat'
        }}
      />

      {/* Page Header */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 md:mb-12">
          {/* Command Center Title Badge */}
          <div className="bg-black text-white px-6 py-3 md:px-8 md:py-4 border-[3px] border-black shadow-[4px_4px_0_0_#000] transform -skew-x-12 inline-block w-fit">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter transform skew-x-12">
              COMMAND CENTER
            </h1>
          </div>

          {/* Welcome Message */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-700 text-xl">
              waving_hand
            </span>
            <span className="text-sm md:text-base font-bold text-gray-600">
              Bem-vindo, <span className="text-black">{displayName}</span>
            </span>
          </div>
        </div>

        {/* Statistics Section */}
        <section className="mb-10 md:mb-14">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-[#2e5cff] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform rotate-3">
              <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                query_stats
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-black">
              SUAS ESTATÍSTICAS
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Points */}
              <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-5 hover:shadow-[6px_6px_0_0_#000] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined text-3xl text-[#ffc700]">
                    star
                  </span>
                  <div className="bg-[#ffc700] w-2 h-2 rounded-full" />
                </div>
                <div className="text-4xl font-black text-black mb-1">
                  {stats.totalPoints}
                </div>
                <div className="text-[10px] font-black text-black uppercase tracking-wider">
                  Total de Pontos
                </div>
              </div>

              {/* Accuracy */}
              <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-5 hover:shadow-[6px_6px_0_0_#000] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined text-3xl text-[#2e5cff]">
                    target
                  </span>
                  <div className="bg-[#2e5cff] w-2 h-2 rounded-full" />
                </div>
                <div className="text-4xl font-black text-black mb-1">
                  {stats.accuracy}%
                </div>
                <div className="text-[10px] font-black text-black uppercase tracking-wider">
                  Taxa de Acerto
                </div>
                <div className="text-[8px] font-bold text-gray-700 mt-1">
                  {stats.correctPredictions}/{stats.totalBets} corretos
                </div>
              </div>

              {/* Perfect Picks */}
              <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-5 hover:shadow-[6px_6px_0_0_#000] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined text-3xl text-[#ccff00]">
                    grade
                  </span>
                  <div className="bg-[#ccff00] w-2 h-2 rounded-full" />
                </div>
                <div className="text-4xl font-black text-black mb-1">
                  {stats.perfectPicks}
                </div>
                <div className="text-[10px] font-black text-black uppercase tracking-wider">
                  Placares Exatos
                </div>
              </div>

              {/* Pending Bets */}
              <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-5 hover:shadow-[6px_6px_0_0_#000] transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined text-3xl text-[#ff2e2e]">
                    pending
                  </span>
                  <div className="bg-[#ff2e2e] w-2 h-2 rounded-full" />
                </div>
                <div className="text-4xl font-black text-black mb-1">
                  {stats.pendingBets}
                </div>
                <div className="text-[10px] font-black text-black uppercase tracking-wider">
                  Palpites Pendentes
                </div>
              </div>
            </div>
          )}

          {/* Additional Stats Row */}
          {!isLoading && stats.totalBets > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Underdog Wins */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 border-[3px] border-black shadow-[4px_4px_0_0_#000] p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-white mb-1">
                    {stats.underdogWins} 🐕
                  </div>
                  <div className="text-[10px] font-black text-white uppercase tracking-wider">
                    Azarões Vencedores
                  </div>
                </div>
                <span className="material-symbols-outlined text-4xl text-white opacity-50">
                  rocket_launch
                </span>
              </div>

              {/* Win Streak or Total Bets */}
              <div className="bg-black border-[3px] border-black shadow-[4px_4px_0_0_#000] p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black text-[#ccff00] mb-1">
                    {stats.totalBets}
                  </div>
                  <div className="text-[10px] font-black text-white uppercase tracking-wider">
                    Total de Apostas
                  </div>
                </div>
                <span className="material-symbols-outlined text-4xl text-[#ccff00] opacity-50">
                  casino
                </span>
              </div>
            </div>
          )}
        </section>

        {/* My Active Bets Section */}
        <section className="mb-10 md:mb-14">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="bg-[#2e5cff] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform -rotate-3">
              <span className="material-symbols-outlined text-white text-xl md:text-2xl">
                sports_esports
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-black">
              MEUS PALPITES ATIVOS
            </h2>
            {activeBets.length > 0 && (
              <div className="bg-[#ccff00] px-2 py-1 border-2 border-black text-xs font-black">
                {activeBets.length}
              </div>
            )}
            <Link
              to="/my-bets"
              className="ml-auto flex items-center gap-1 text-sm font-black uppercase tracking-wider text-[#2e5cff] hover:text-black transition-colors"
            >
              Ver todas
              <ChevronRight className="w-4 h-4" strokeWidth={3} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] animate-pulse"
                />
              ))}
            </div>
          ) : activeBets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeBets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-5 hover:shadow-[6px_6px_0_0_#000] transition-all relative cursor-pointer group"
                >
                  {/* Match Status Badge */}
                  <div
                    className={clsx(
                      "absolute -top-3 -right-3 px-3 py-1 border-[3px] border-black text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000] transform rotate-6",
                      bet.match.status === "live"
                        ? "bg-[#ff2e2e] text-white animate-pulse"
                        : "bg-[#f0f0f0] text-black"
                    )}
                  >
                    {bet.match.status === "live" ? "🔴 AO VIVO" : "⏰ AGENDADO"}
                  </div>

                  {/* Tournament Name Header */}
                  <div className="bg-[#f0f0f0] -mx-5 -mt-5 px-5 py-2 mb-4 border-b-[3px] border-black">
                    {bet.match.tournament?.slug ? (
                      <Link
                        to="/tournaments/$slug"
                        params={{ slug: bet.match.tournament.slug }}
                        className="text-[10px] font-black text-black uppercase truncate tracking-wider hover:text-brawl-blue hover:underline block"
                      >
                        {bet.match.tournament.name}
                      </Link>
                    ) : (
                      <div className="text-[10px] font-black text-black uppercase truncate tracking-wider">
                        {bet.match.tournament?.name}
                      </div>
                    )}
                  </div>

                  {/* Teams Matchup */}
                  <div className="flex items-stretch gap-3 mb-5">
                    {/* Team A */}
                    <div
                      className={clsx(
                        "flex-1 flex flex-col items-center justify-between gap-2 p-3 rounded-sm transition-all border-[3px] min-h-[120px]",
                        bet.predictedWinnerId === bet.match.teamA?.id
                          ? "bg-[#ccff00]/40 border-[#ccff00] shadow-[3px_3px_0_0_#ccff00]"
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
                          <span className="text-[11px] font-black uppercase text-center w-full tracking-tight text-black line-clamp-2 hover:text-brawl-blue hover:underline">
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
                      {bet.predictedWinnerId === bet.match.teamA?.id ? (
                        <div className="bg-black text-[#ccff00] px-2 py-0.5 text-[8px] font-black uppercase">
                          PALPITE
                        </div>
                      ) : (
                        <div className="h-5" />
                      )}
                    </div>

                    {/* VS Separator */}
                    <div className="bg-black text-white px-2 py-1.5 rounded-full border-[3px] border-black shrink-0 self-center">
                      <span className="text-[11px] font-black italic">VS</span>
                    </div>

                    {/* Team B */}
                    <div
                      className={clsx(
                        "flex-1 flex flex-col items-center justify-between gap-2 p-3 rounded-sm transition-all border-[3px] min-h-[120px]",
                        bet.predictedWinnerId === bet.match.teamB?.id
                          ? "bg-[#ccff00]/40 border-[#ccff00] shadow-[3px_3px_0_0_#ccff00]"
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
                          <span className="text-[11px] font-black uppercase text-center w-full tracking-tight text-black line-clamp-2 hover:text-brawl-red hover:underline">
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
                      {bet.predictedWinnerId === bet.match.teamB?.id ? (
                        <div className="bg-black text-[#ccff00] px-2 py-0.5 text-[8px] font-black uppercase">
                          PALPITE
                        </div>
                      ) : (
                        <div className="h-5" />
                      )}
                    </div>
                  </div>

                  {/* Prediction Score Footer */}
                  <div className="bg-[#f0f0f0] -mx-5 -mb-5 px-5 py-3 border-t-[3px] border-black flex items-center justify-between">
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
                      <span className="text-xs text-black font-black">×</span>
                      <div className="bg-black text-white px-2 py-1 text-sm font-black min-w-[24px] text-center border-2 border-black">
                        {bet.predictedScoreB}
                      </div>
                    </div>
                  </div>

                  {/* Match Time Stamp */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border-[2px] border-black px-3 py-1 text-[9px] font-black text-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] whitespace-nowrap">
                    {new Date(bet.match.startTime).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
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
                Nenhum palpite ativo
              </p>
              <p className="text-gray-700 font-bold text-sm mb-6">
                Faça suas apostas e acompanhe aqui!
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
        </section>

        {/* Quick Actions Section - Tournament Buttons */}
        <section>
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-[#ffc700] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform rotate-2">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-black" strokeWidth={3} />
            </div>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-black">
              TORNEIOS ATIVOS
            </h2>
          </div>

          {isLoading ? (
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-48 h-16 bg-[#ffc700] border-[3px] border-black shadow-[3px_3px_0_0_#000] animate-pulse transform -skew-x-12"
                />
              ))}
            </div>
          ) : activeTournaments.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {activeTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  to="/"
                  search={{ tournament: tournament.slug }}
                >
                  <button className="bg-[#ffc700] text-black px-6 py-4 md:px-8 md:py-5 border-[3px] border-black font-black italic uppercase text-sm md:text-base tracking-wider shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150 transform -skew-x-12 group">
                    <span className="transform skew-x-12 flex items-center gap-3">
                      {tournament.logoUrl ? (
                        <img
                          src={tournament.logoUrl}
                          alt={tournament.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-2xl">
                          emoji_events
                        </span>
                      )}
                      <span className="whitespace-nowrap">
                        {tournament.name}
                      </span>
                      <ChevronRight
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        strokeWidth={3}
                      />
                    </span>
                  </button>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-10 text-center">
              <div className="bg-[#ffc700] border-[3px] border-black w-20 h-20 mx-auto mb-5 flex items-center justify-center transform rotate-6">
                <Trophy className="w-10 h-10 text-black" strokeWidth={3} />
              </div>
              <p className="text-black font-black text-xl uppercase italic mb-2">
                Sem torneios ativos
              </p>
              <p className="text-gray-700 font-bold text-sm">
                Novos torneios serão exibidos aqui
              </p>
            </div>
          )}
        </section>

        {/* Bottom Decorative Elements */}
        <div className="mt-16 flex items-center justify-center gap-3 opacity-40">
          <div className="w-12 h-1 bg-black transform -skew-x-12" />
          <div className="w-3 h-3 bg-[#ccff00] border-2 border-black rotate-45" />
          <div className="w-12 h-1 bg-black transform skew-x-12" />
        </div>
      </div>
    </div>
  );
}

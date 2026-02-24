import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronDown, Crown, Star, Trophy } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import {
  MedalCountSummary,
  MiniMedalBadge,
} from "../components/MiniMedalBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { getUser } from "../functions/get-user";
import {
  getLeaderboard,
  getLeaderboardTournaments,
  type LeaderboardEntry,
} from "../server/leaderboard";

const searchSchema = z.object({
  tab: z.enum(["season", "global"]).catch("global"),
  tournamentId: z.number().optional(),
});

export const Route = createFileRoute("/leaderboard")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    tab: search.tab,
    tournamentId: search.tournamentId,
  }),
  loader: async ({ deps }) => {
    const [session, tournaments, leaderboard] = await Promise.all([
      getUser().catch(() => null),
      getLeaderboardTournaments(),
      getLeaderboard({
        data: deps.tab === "season" ? deps.tournamentId : undefined,
      }),
    ]);
    return { session, tournaments, leaderboard };
  },
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { session, leaderboard, tournaments } = Route.useLoaderData();
  const { tab, tournamentId: urlTournamentId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const currentUserId = session?.user?.id;

  // Default to first tournament if none selected in season mode
  const tournamentId =
    urlTournamentId || (tournaments.length > 0 ? tournaments[0].id : undefined);

  useEffect(() => {
    if (tab === "season" && !urlTournamentId && tournaments.length > 0) {
      navigate({
        search: (prev) => ({ ...prev, tournamentId: tournaments[0].id }),
        replace: true,
      });
    }
  }, [tab, urlTournamentId, tournaments, navigate]);

  const activeTournament = tournaments.find((t) => t.id === tournamentId);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-8">
        {/* Header */}
        <header className="relative mb-8 text-center">
          {/* Decorative background splatter */}
          <div className="absolute top-1/2 left-1/2 -z-10 h-32 w-64 -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] bg-brawl-yellow/20 blur-2xl" />

          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 rotate-3 transform items-center justify-center border-[4px] border-black bg-brawl-yellow shadow-[4px_4px_0px_0px_#000] transition-transform hover:rotate-6">
              <Trophy
                className="h-10 w-10 text-black drop-shadow-sm"
                strokeWidth={3}
              />
            </div>
          </div>
          <h1 className="-skew-x-6 transform font-black font-display text-5xl text-black uppercase italic leading-[0.85] tracking-tighter drop-shadow-sm md:text-6xl">
            RANKING{" "}
            <span className="block text-6xl text-brawl-red md:text-7xl">
              SUPREMO
            </span>
          </h1>
          <p className="mt-4 inline-block border-black/10 border-y-2 py-1 font-body font-bold text-black/60 text-xs uppercase tracking-[0.4em] md:text-sm">
            Who dominates the arena?
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="mb-10 inline-flex -skew-x-6 transform overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_#000]">
          <button
            onClick={() =>
              navigate({
                search: { tab: "season", tournamentId: tournaments[0]?.id },
              })
            }
            className={clsx(
              "relative px-8 py-3 font-black font-display text-sm uppercase transition-all",
              tab === "season"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100",
            )}
          >
            {tab === "season" && (
              <div className="pointer-events-none absolute inset-0 border-[#ccff00] border-[3px]" />
            )}
            <span className="inline-block skew-x-6 transform">TEMPORADA</span>
          </button>
          <button
            onClick={() => navigate({ search: { tab: "global" } })}
            className={clsx(
              "relative border-black border-l-[3px] px-8 py-3 font-black font-display text-sm uppercase transition-all",
              tab === "global"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100",
            )}
          >
            {tab === "global" && (
              <div className="pointer-events-none absolute inset-0 border-[#ccff00] border-[3px]" />
            )}
            <span className="inline-block skew-x-6 transform">MUNDIAL</span>
          </button>
        </div>

        {/* Tournament Hero & Selector */}
        {tab === "season" && activeTournament && (
          <div className="relative z-30 mb-8 flex w-full max-w-xs flex-col items-center">
            {/* Selected Tournament Hero */}
            <div className="group relative mb-6">
              <div className="absolute inset-0 animate-pulse rounded-full bg-[#ccff00] opacity-20 blur-xl" />
              <div className="relative z-10 flex h-32 w-32 rotate-3 items-center justify-center border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_#000] transition-transform hover:rotate-0 md:h-40 md:w-40">
                {activeTournament.logoUrl ? (
                  <img
                    src={activeTournament.logoUrl}
                    alt="Tournament Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Trophy className="h-16 w-16 text-black" />
                )}
              </div>
              {/* Badge Name */}
              <div className="absolute -bottom-4 left-1/2 z-20 -translate-x-1/2 transform whitespace-nowrap border-2 border-white bg-black px-3 py-1 font-black font-display text-white text-xs uppercase shadow-lg">
                {activeTournament.name}
              </div>
            </div>

            {/* Selector (Only if more than 1 tournament) */}
            {tournaments.length > 1 && (
              <div className="relative w-full">
                <div className="absolute inset-0 translate-x-1 translate-y-1 bg-black" />
                <DropdownMenu>
                  <DropdownMenuTrigger className="group relative flex h-12 w-full cursor-pointer items-center justify-between border-[3px] border-black bg-white px-4 py-3 font-black font-display text-black text-sm uppercase outline-none hover:bg-gray-50">
                    <span className="mr-2 max-w-[200px] truncate sm:max-w-[280px]">
                      {activeTournament.name}
                    </span>
                    <ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="mt-2 min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[90vw] rounded-none border-[3px] border-black bg-white p-0 text-black shadow-[4px_4px_0px_0px_#000]"
                    align="start"
                  >
                    <DropdownMenuRadioGroup
                      value={String(activeTournament.id)}
                      onValueChange={(val) => {
                        // Save current scroll position
                        const scrollY = window.scrollY;
                        navigate({
                          search: {
                            tab: "season",
                            tournamentId: Number(val),
                          },
                          replace: true,
                          resetScroll: false,
                        });
                        // Restore scroll position after navigation
                        requestAnimationFrame(() => {
                          window.scrollTo(0, scrollY);
                        });
                      }}
                    >
                      {tournaments.map((t) => (
                        <DropdownMenuRadioItem
                          key={t.id}
                          value={String(t.id)}
                          className="cursor-pointer whitespace-normal border-black/5 border-b-2 px-4 py-3 font-bold font-display text-black text-sm uppercase leading-tight outline-none last:border-0 hover:bg-gray-100 focus:bg-gray-100 focus:text-black data-[state=checked]:bg-brawl-yellow data-[state=checked]:text-black"
                        >
                          {t.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* Tiebreaker Rules */}
        <div className="mb-4 w-full border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-3 border-black border-b-[3px] bg-black px-4 py-2">
            <span className="font-black font-display text-[10px] text-white uppercase tracking-[0.2em]">
              Critérios de Classificação
            </span>
            <span className="ml-auto font-bold text-[10px] text-white/60 uppercase">
              {tab === "global" ? "Ranking Mundial" : "Camp Específico"}
            </span>
          </div>
          <div
            className={clsx(
              "grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3",
              tab === "global" &&
                "lg:[&>*:nth-child(5)]:col-span-2 lg:[&>*:nth-child(5)]:justify-center",
            )}
          >
            {/* 1° - Pontos Totais (comum a ambos) */}
            <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-brawl-yellow font-black font-display text-black text-sm shadow-[2px_2px_0px_0px_#000]">
                1
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase leading-none">
                  Pontos Totais
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  Critério principal
                </p>
              </div>
            </div>
            {/* 2° - Quantidade de Acertos (comum a ambos) */}
            <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-gray-200 font-black font-display text-black text-sm shadow-[2px_2px_0px_0px_#000]">
                2
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase leading-none">
                  Quantidade de Acertos
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  1° desempate
                </p>
              </div>
            </div>
            {/* 3° - Quantidade de Perfect (comum a ambos) */}
            <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-gray-300 font-black font-display text-black text-sm shadow-[2px_2px_0px_0px_#000]">
                3
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase leading-none">
                  Quantidade de Perfect
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  2° desempate
                </p>
              </div>
            </div>
            {/* 4° - Quantidade de Azarões (comum a ambos) */}
            <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-purple-400 font-black font-display text-black text-sm shadow-[2px_2px_0px_0px_#000]">
                4
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase leading-none">
                  Quantidade de Azarões
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  3° desempate
                </p>
              </div>
            </div>
            {/* 5° - Camp específico: Partida mais importante / Global: Medalhas */}
            <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-[#FFD700] font-black font-display text-black text-sm shadow-[2px_2px_0px_0px_#000]">
                5
              </div>
              <div>
                <p className="font-black text-black text-xs uppercase leading-none">
                  {tab === "global"
                    ? "Medalhas"
                    : "Acertou partida mais importante"}
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  {tab === "global" ? "4° desempate" : "Final ou decisiva"}
                </p>
              </div>
            </div>
            {/* 6° - Apenas Camp específico: Melhor resultado mês anterior */}
            {tab === "season" && (
              <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-brawl-blue font-black font-display text-white text-sm shadow-[2px_2px_0px_0px_#000]">
                  6
                </div>
                <div>
                  <p className="font-black text-black text-xs uppercase leading-none">
                    Melhor resultado mês anterior
                  </p>
                  <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                    Torneios anteriores
                  </p>
                </div>
              </div>
            )}
            {/* 7° - Apenas Camp específico: Ranking Geral */}
            {tab === "season" && (
              <div className="flex items-center gap-3 rounded border-2 border-black/10 bg-gray-50/50 px-3 py-2 sm:col-span-2 lg:col-span-1">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-brawl-red font-black font-display text-white text-sm shadow-[2px_2px_0px_0px_#000]">
                  7
                </div>
                <div>
                  <p className="font-black text-black text-xs uppercase leading-none">
                    Ranking Mundial
                  </p>
                  <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                    Posição geral
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 rounded-lg border-2 border-black/10 bg-white/50 px-3 py-2">
          <span className="font-bold text-[10px] text-black/60 uppercase tracking-wide">
            Legenda:
          </span>
          {/* Perfect Picks */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 border-2 border-black bg-brawl-yellow px-1 py-0.5">
              <Star
                className="h-3 w-3 text-black"
                fill="black"
                strokeWidth={2}
              />
              <span className="font-black font-display text-[10px] text-black">
                0
              </span>
            </div>
            <span className="text-[10px] text-black/60">Perfect Picks</span>
          </div>
          <span className="text-black/20">·</span>
          {/* Correct */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 border-2 border-black bg-white px-1 py-0.5">
              <span className="font-black font-display text-[10px] text-green-600">
                ✓
              </span>
              <span className="font-black font-display text-[10px] text-black">
                0
              </span>
            </div>
            <span className="text-[10px] text-black/60">Acertos</span>
          </div>
          <span className="text-black/20">·</span>
          {/* Accuracy */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 border-2 border-black bg-green-500 px-1 py-0.5">
              <span className="font-black font-display text-[10px] text-white">
                70%
              </span>
            </div>
            <span className="text-[10px] text-black/60">Taxa de acerto</span>
          </div>
          <span className="text-black/20">·</span>
          {/* Underdog Picks */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 border-2 border-black bg-purple-400 px-1 py-0.5">
              <span className="font-black font-display text-[10px] text-black">
                ⚡
              </span>
              <span className="font-black font-display text-[10px] text-black">
                0
              </span>
            </div>
            <span className="text-[10px] text-black/60">Azarões</span>
          </div>
          <span className="text-black/20">·</span>
          {/* Medal Icons explanation */}
          <div className="flex items-center gap-1">
            <MiniMedalBadge tier="1st" size="sm" />
            <MiniMedalBadge tier="2nd" size="sm" />
            <MiniMedalBadge tier="3rd" size="sm" />
            <span className="text-[10px] text-black/60">Medalhas</span>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          /* Empty State */
          <div className="flex w-full flex-col items-center justify-center rounded-sm border-[3px] border-black border-dashed bg-white/50 py-16 text-center">
            <div className="mb-6 flex h-20 w-20 rotate-3 items-center justify-center border-[3px] border-black bg-gray-200 opacity-40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <Trophy className="h-10 w-10 text-gray-500" strokeWidth={2} />
            </div>
            <h2 className="mb-2 font-black font-display text-3xl text-black uppercase italic tracking-tighter">
              NENHUM{" "}
              <span
                className="bg-gradient-to-br from-brawl-blue to-blue-600 bg-clip-text text-brawl-blue text-stroke-1 text-transparent"
                style={{ WebkitTextStroke: "1px black" }}
              >
                DADO
              </span>
            </h2>
            <p className="font-bold text-black/60 text-sm uppercase tracking-wide">
              Seja o primeiro a pontuar!
            </p>
          </div>
        ) : (
          <>
            {/* Podium Section */}
            {top3.length > 0 && (
              <PodiumSection
                entries={top3}
                currentUserId={currentUserId}
                tab={tab}
              />
            )}

            {/* Leaderboard List */}
            <div className="mt-10 w-full space-y-3">
              {rest.map((entry) => (
                <LeaderboardCard
                  key={entry.userId}
                  entry={entry}
                  isCurrentUser={entry.userId === currentUserId}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getTiebreakerReason(
  higher: LeaderboardEntry,
  lower: LeaderboardEntry,
  tab: "global" | "season",
): string | null {
  // Check if there's actually a tie that needed breaking
  if (higher.totalPoints !== lower.totalPoints) return null;

  // Check each tiebreaker criterion
  if (higher.correctPredictions !== lower.correctPredictions) {
    return "Acertos";
  }
  if (higher.perfectPicks !== lower.perfectPicks) {
    return "Perfect Picks";
  }
  if (higher.underdogPicks !== lower.underdogPicks) {
    return "Azarões";
  }

  if (tab === "global") {
    if (higher.medals.total !== lower.medals.total) {
      return "Medalhas";
    }
  } else {
    // Season-specific tiebreakers
    if (higher.gotMostImportantMatch !== lower.gotMostImportantMatch) {
      return "Partida decisiva";
    }
    if (
      higher.bestPreviousMonthResult !== lower.bestPreviousMonthResult &&
      (higher.bestPreviousMonthResult === null) !==
        (lower.bestPreviousMonthResult === null)
    ) {
      return "Resultado anterior";
    }
    if (higher.globalRank !== lower.globalRank) {
      return "Ranking Mundial";
    }
  }

  return null;
}

function PodiumSection({
  entries,
  currentUserId,
  tab,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  tab: "global" | "season";
}) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const podiumColors = {
    1: {
      bg: "bg-gradient-to-b from-[#FFD700] via-[#FFC125] to-[#DAA520]",
      border: "border-[#B8860B]",
      label: "1ST",
    },
    2: {
      bg: "bg-gradient-to-b from-[#D3D3D3] via-[#A8A8A8] to-[#696969]",
      border: "border-[#808080]",
      label: "2ND",
    },
    3: {
      bg: "bg-gradient-to-b from-[#CD7F32] via-[#B87333] to-[#804A00]",
      border: "border-[#8B4513]",
      label: "3RD",
    },
  };

  const PodiumBlock = ({
    entry,
    rank,
    height,
    tiebreakerReason,
  }: {
    entry?: LeaderboardEntry;
    rank: 1 | 2 | 3;
    height: string;
    tiebreakerReason?: string | null;
  }) => {
    if (!entry) return <div />;
    const colors = podiumColors[rank];
    const isMe = entry.userId === currentUserId;

    return (
      <div className="z-10 mx-[-4px] flex flex-col items-center">
        {/* Crown for 1st */}
        {rank === 1 && (
          <div className="relative mb-2">
            <Crown
              className="h-10 w-10 animate-bounce text-brawl-yellow drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              fill="#ffc700"
              strokeWidth={2.5}
              style={{ animationDuration: "2s" }}
            />
          </div>
        )}

        {/* Avatar Container */}
        <Link
          to="/users/$userId"
          params={{ userId: entry.userId }}
          className="group relative cursor-pointer"
        >
          <div
            className={clsx(
              "mb-3 overflow-hidden border-[3px] border-black bg-white transition-transform duration-300 group-hover:scale-105",
              rank === 1
                ? "h-20 w-20 shadow-[4px_4px_0px_0px_#000]"
                : "h-14 w-14 shadow-[3px_3px_0px_0px_#000]",
              isMe && "ring-[#ccff00] ring-[4px] ring-offset-0",
            )}
          >
            {entry.image ? (
              <img
                src={entry.image}
                alt={entry.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-tape font-black font-display text-2xl text-black/30">
                {entry.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Rank Badge overlapping avatar */}
          <div
            className={clsx(
              "absolute -right-2 -bottom-2 flex rotate-3 transform items-center justify-center border-[2px] border-white bg-black font-black font-display text-white",
              rank === 1 ? "h-8 w-8 text-lg" : "h-6 w-6 text-xs",
            )}
          >
            {rank}
          </div>
        </Link>

        {/* Name */}
        <Link
          to="/users/$userId"
          params={{ userId: entry.userId }}
          className="relative mt-4 mb-3 -rotate-1 border border-black bg-white px-3 py-1 shadow-[2px_2px_0px_0px_#000] transition-colors hover:bg-gray-50"
        >
          <span
            className={clsx(
              "block text-center font-black font-display text-xs uppercase leading-none tracking-tight",
              isMe ? "text-brawl-blue" : "text-black",
            )}
          >
            {entry.name}
          </span>
        </Link>

        {/* Medal Badges for Podium */}
        {entry.medals.total > 0 && (
          <div className="mb-3 flex items-center justify-center gap-1">
            <MedalCountSummary
              gold={entry.medals.gold}
              silver={entry.medals.silver}
              bronze={entry.medals.bronze}
              size="sm"
            />
          </div>
        )}

        {/* Points */}
        <div className="text-center leading-none">
          <span className="block font-black font-display text-black text-xl drop-shadow-sm">
            {entry.totalPoints}
          </span>
          <span className="font-bold text-[9px] text-black/60 uppercase tracking-widest">
            PTS
          </span>
        </div>

        {/* Tiebreaker Badge - show if this position was decided by tiebreaker */}
        {tiebreakerReason && (
          <div
            className="mt-2 inline-flex rotate-1 transform items-center gap-1 border-2 border-black bg-[#ccff00] px-1.5 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:mt-3 sm:px-2"
            title={`Desempatado por: ${tiebreakerReason}`}
          >
            <span className="hidden font-black font-display text-[8px] text-black uppercase sm:inline">
              Desempate:
            </span>
            <span className="font-black font-display text-[9px] text-black sm:text-[10px]">
              {tiebreakerReason}
            </span>
          </div>
        )}

        {/* Stats - Perfect Picks, Correct, Accuracy */}
        <div className="mt-2 flex flex-col items-center gap-2 sm:mt-3">
          {/* Stats Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {/* Perfect Picks Badge */}
            <div
              className="flex items-center gap-1 border-2 border-black bg-brawl-yellow px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Perfect Picks"
            >
              <Star
                className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-black"
                fill="black"
                strokeWidth={2}
              />
              <span className="font-black font-display text-black text-xs sm:text-sm">
                {entry.perfectPicks}
              </span>
            </div>

            {/* Correct Predictions Badge */}
            <div
              className="flex items-center gap-1 border-2 border-black bg-white px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Acertos"
            >
              <span className="font-black font-display text-green-600 text-xs sm:text-sm">
                ✓
              </span>
              <span className="font-black font-display text-black text-xs sm:text-sm">
                {entry.correctPredictions}
              </span>
            </div>

            {/* Underdog Picks Badge */}
            {entry.underdogPicks > 0 && (
              <div
                className="flex items-center gap-1 border-2 border-black bg-purple-400 px-1.5 py-0.5 sm:px-2 sm:py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                title="Azarões acertados"
              >
                <span className="font-black font-display text-black text-xs sm:text-sm">
                  ⚡
                </span>
                <span className="font-black font-display text-black text-xs sm:text-sm">
                  {entry.underdogPicks}
                </span>
              </div>
            )}

            {/* Accuracy Rate Badge */}
            {(() => {
              const accuracyRate =
                entry.totalBets > 0
                  ? Math.round(
                      (entry.correctPredictions / entry.totalBets) * 100,
                    )
                  : 0;
              return (
                <div
                  className={clsx(
                    "flex items-center gap-1 border-2 border-black px-1.5 py-0.5 sm:px-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                    accuracyRate >= 70
                      ? "bg-green-500 text-white"
                      : accuracyRate >= 40
                        ? "bg-yellow-400 text-black"
                        : "bg-red-500 text-white",
                  )}
                  title="Taxa de acerto"
                >
                  <span className="font-black font-display text-[10px] sm:text-xs uppercase">
                    Acerto
                  </span>
                  <span className="font-black font-display text-xs sm:text-sm">
                    {accuracyRate}%
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Platform base */}
        <div
          className={clsx(
            "relative mt-2 flex w-full items-center justify-center border-black border-x-[3px] border-t-[3px]",
            colors.bg,
            height,
            rank === 1 ? "z-20 w-[110%]" : "z-10 w-full",
          )}
        >
          {/* Metallic shine effect */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.3) 100%)",
            }}
          />
          {/* Side highlight */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-white/20 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/30 to-transparent" />
          <span className="absolute bottom-1 font-black font-display text-5xl text-black/20 italic">
            {rank}
          </span>
        </div>
      </div>
    );
  };

  // Calculate tiebreaker reasons
  const secondTiebreaker = second
    ? getTiebreakerReason(first, second, tab)
    : null;
  const thirdTiebreaker = third
    ? getTiebreakerReason(second || first, third, tab)
    : null;

  return (
    <div className="relative grid w-full grid-cols-3 items-end px-2 pt-8">
      {/* Floor Line */}
      <div className="absolute right-0 bottom-0 left-0 h-[3px] translate-y-[1px] bg-black" />

      {/* 2nd Place (left) */}
      <PodiumBlock
        entry={second}
        rank={2}
        height="h-24"
        tiebreakerReason={secondTiebreaker}
      />
      {/* 1st Place (center) */}
      <PodiumBlock entry={first} rank={1} height="h-32" />
      {/* 3rd Place (right) */}
      <PodiumBlock
        entry={third}
        rank={3}
        height="h-16"
        tiebreakerReason={thirdTiebreaker}
      />
    </div>
  );
}

function LeaderboardCard({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const accuracyRate =
    entry.totalBets > 0
      ? Math.round((entry.correctPredictions / entry.totalBets) * 100)
      : 0;

  return (
    <div
      className={clsx(
        "group relative flex w-full items-center gap-4 overflow-hidden border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000]",
        isCurrentUser &&
          "ring-2 ring-[#ccff00] ring-offset-2 ring-offset-paper",
      )}
    >
      {/* Current User Decorator */}
      {isCurrentUser && (
        <div className="absolute top-0 right-0 z-0 h-16 w-16 translate-x-8 -translate-y-8 rotate-45 border-black border-l-[3px] bg-[#ccff00]" />
      )}

      {/* Rank Badge */}
      <div className="z-10 flex h-10 w-10 shrink-0 -rotate-3 transform items-center justify-center border-[2px] border-white/20 bg-black shadow-[2px_2px_0px_0px_#888]">
        <span className="font-black font-display text-lg text-white italic">
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <Link
        to="/users/$userId"
        params={{ userId: entry.userId }}
        className="z-10 h-12 w-12 shrink-0 overflow-hidden border-[3px] border-black bg-gray-100"
      >
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-black font-display text-gray-300 text-xl">
            {entry.name.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      {/* Name + tiebreaker stats */}
      <div className="z-10 min-w-0 flex-1 text-black">
        <Link
          to="/users/$userId"
          params={{ userId: entry.userId }}
          className={clsx(
            "block truncate font-black font-display text-base uppercase tracking-tight hover:underline",
            isCurrentUser
              ? "text-brawl-blue"
              : "text-black hover:text-brawl-blue",
          )}
        >
          {entry.name}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Perfect Picks Badge */}
          <div
            className="flex items-center gap-1 border-2 border-black bg-brawl-yellow px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            title="Perfect Picks"
          >
            <Star className="h-3 w-3 text-black" fill="black" strokeWidth={2} />
            <span className="font-black font-display text-black text-xs">
              {entry.perfectPicks}
            </span>
          </div>

          {/* Correct Predictions Badge */}
          <div
            className="flex items-center gap-1 border-2 border-black bg-white px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            title="Acertos"
          >
            <span className="font-black font-display text-green-600 text-xs">
              ✓
            </span>
            <span className="font-black font-display text-black text-xs">
              {entry.correctPredictions}
            </span>
          </div>

          {/* Underdog Picks Badge - only show if > 0 */}
          {entry.underdogPicks > 0 && (
            <div
              className="flex items-center gap-1 border-2 border-black bg-purple-400 px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              title="Azarões acertados"
            >
              <span className="font-black font-display text-black text-xs">
                ⚡
              </span>
              <span className="font-black font-display text-black text-xs">
                {entry.underdogPicks}
              </span>
            </div>
          )}

          {/* Accuracy Rate Badge */}
          <div
            className={clsx(
              "flex items-center gap-1 border-2 border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
              accuracyRate >= 70
                ? "bg-green-500 text-white"
                : accuracyRate >= 40
                  ? "bg-yellow-400 text-black"
                  : "bg-red-500 text-white",
            )}
            title="Taxa de acerto"
          >
            <span className="font-black font-display text-[10px] uppercase">
              Acerto
            </span>
            <span className="font-black font-display text-xs">
              {accuracyRate}%
            </span>
          </div>

          {/* Medal Badges - only show if user has medals */}
          {entry.medals.total > 0 && (
            <MedalCountSummary
              gold={entry.medals.gold}
              silver={entry.medals.silver}
              bronze={entry.medals.bronze}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Points */}
      <div className="z-10 shrink-0 rotate-1 border border-black bg-white px-2 py-1 text-right shadow-[2px_2px_0px_0px_#ccc]">
        <span className="block font-body font-bold text-black text-xl leading-none">
          {entry.totalPoints}
        </span>
        <span className="block font-black text-[9px] text-black/40 uppercase leading-none tracking-widest">
          PTS
        </span>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronDown, Crown, Star, Trophy } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
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
                    <span className="mr-2 truncate">
                      {activeTournament.name}
                    </span>
                    <ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="mt-2 w-[var(--radix-dropdown-menu-trigger-width)] rounded-none border-[3px] border-black bg-white p-0 text-black shadow-[4px_4px_0px_0px_#000]"
                    align="start"
                  >
                    <DropdownMenuRadioGroup
                      value={String(activeTournament.id)}
                      onValueChange={(val) =>
                        navigate({
                          search: {
                            tab: "season",
                            tournamentId: Number(val),
                          },
                        })
                      }
                    >
                      {tournaments.map((t) => (
                        <DropdownMenuRadioItem
                          key={t.id}
                          value={String(t.id)}
                          className="cursor-pointer border-black/5 border-b-2 px-4 py-3 font-bold font-display text-black text-sm uppercase outline-none last:border-0 hover:bg-gray-100 focus:bg-gray-100 focus:text-black data-[state=checked]:bg-brawl-yellow data-[state=checked]:text-black"
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
        <div className="mb-6 w-full border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-3 border-black border-b-[3px] bg-black px-4 py-2">
            <span className="font-black font-display text-[10px] text-white uppercase tracking-[0.2em]">
              Critérios de Classificação
            </span>
          </div>
          <div className="flex flex-col divide-y-[2px] divide-black/10 sm:flex-row sm:divide-x-[2px] sm:divide-y-0">
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-brawl-yellow font-black font-display text-sm text-black shadow-[2px_2px_0px_0px_#000]">
                1
              </div>
              <div>
                <p className="font-black text-xs text-black uppercase leading-none">
                  Pontos Totais
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  Critério principal
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-gray-200 font-black font-display text-sm text-black shadow-[2px_2px_0px_0px_#000]">
                2
              </div>
              <div>
                <p className="font-black text-xs text-black uppercase leading-none">
                  Perfect Picks
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  1° desempate
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-[2px] border-black bg-gray-100 font-black font-display text-sm text-black shadow-[2px_2px_0px_0px_#000]">
                3
              </div>
              <div>
                <p className="font-black text-xs text-black uppercase leading-none">
                  Acertos Totais
                </p>
                <p className="mt-0.5 font-bold text-[10px] text-black/40 uppercase tracking-wide">
                  2° desempate
                </p>
              </div>
            </div>
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
              <PodiumSection entries={top3} currentUserId={currentUserId} />
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

function PodiumSection({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const podiumColors = {
    1: { bg: "bg-brawl-yellow", border: "border-brawl-yellow", label: "1ST" },
    2: { bg: "bg-gray-300", border: "border-gray-400", label: "2ND" },
    3: { bg: "bg-[#cd7f32]", border: "border-[#cd7f32]", label: "3RD" },
  };

  const PodiumBlock = ({
    entry,
    rank,
    height,
  }: {
    entry?: LeaderboardEntry;
    rank: 1 | 2 | 3;
    height: string;
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
          className="relative mt-2 mb-1 max-w-full -rotate-1 border border-black bg-white px-2 py-0.5 shadow-[2px_2px_0px_0px_#000] transition-colors hover:bg-gray-50"
        >
          <span
            className={clsx(
              "block max-w-[80px] truncate text-center font-black font-display text-xs uppercase leading-none tracking-tight",
              isMe ? "text-brawl-blue" : "text-black",
            )}
          >
            {entry.name}
          </span>
        </Link>

        {/* Points */}
        <div className="text-center leading-none">
          <span className="block font-black font-display text-black text-xl drop-shadow-sm">
            {entry.totalPoints}
          </span>
          <span className="font-bold text-[9px] text-black/60 uppercase tracking-widest">
            PTS
          </span>
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
          <span className="absolute bottom-1 font-black font-display text-5xl text-black/20 italic">
            {rank}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative grid w-full grid-cols-3 items-end px-2 pt-8">
      {/* Floor Line */}
      <div className="absolute right-0 bottom-0 left-0 h-[3px] translate-y-[1px] bg-black" />

      {/* 2nd Place (left) */}
      <PodiumBlock entry={second} rank={2} height="h-24" />
      {/* 1st Place (center) */}
      <PodiumBlock entry={first} rank={1} height="h-32" />
      {/* 3rd Place (right) */}
      <PodiumBlock entry={third} rank={3} height="h-16" />
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
            isCurrentUser ? "text-brawl-blue" : "text-black hover:text-brawl-blue",
          )}
        >
          {entry.name}
        </Link>
        <div className="mt-0.5 flex items-center gap-2">
          {/* Perfect Picks (1° desempate) */}
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(Math.min(3, entry.perfectPicks))].map((_, i) => (
                <Star
                  key={i}
                  className="h-3 w-3 text-brawl-yellow drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  fill="#ffc700"
                  strokeWidth={1}
                />
              ))}
            </div>
            <span className="font-black font-mono text-[10px] text-black/50">
              {entry.perfectPicks}P
            </span>
          </div>
          <span className="text-black/20">·</span>
          {/* Correct predictions (2° desempate) */}
          <span className="font-black font-mono text-[10px] text-black/40">
            {entry.correctPredictions}✓
          </span>
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

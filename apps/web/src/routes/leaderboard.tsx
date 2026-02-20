import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { Trophy, Star, Crown, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import {
  getLeaderboard,
  getLeaderboardTournaments,
  type LeaderboardEntry,
} from "../server/leaderboard";
import { getUser } from "../functions/get-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

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
      <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Header */}
        <header className="text-center mb-8 relative">
          {/* Decorative background splatter */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-brawl-yellow/20 rotate-[-5deg] blur-2xl -z-10" />

          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-brawl-yellow border-[4px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#000] rotate-3 transform transition-transform hover:rotate-6">
              <Trophy
                className="w-10 h-10 text-black drop-shadow-sm"
                strokeWidth={3}
              />
            </div>
          </div>
          <h1 className="font-display font-black text-5xl md:text-6xl italic uppercase text-black tracking-tighter transform -skew-x-6 leading-[0.85] drop-shadow-sm">
            RANKING{" "}
            <span className="text-brawl-red block text-6xl md:text-7xl">
              SUPREMO
            </span>
          </h1>
          <p className="font-bold text-xs md:text-sm text-black/60 uppercase tracking-[0.4em] mt-4 font-body border-y-2 border-black/10 py-1 inline-block">
            Who dominates the arena?
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="inline-flex bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] mb-10 transform -skew-x-6 overflow-hidden">
          <button
            onClick={() =>
              navigate({
                search: { tab: "season", tournamentId: tournaments[0]?.id },
              })
            }
            className={clsx(
              "px-8 py-3 font-display font-black uppercase text-sm transition-all relative",
              tab === "season"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100",
            )}
          >
            {tab === "season" && (
              <div className="absolute inset-0 border-[3px] border-[#ccff00] pointer-events-none" />
            )}
            <span className="transform skew-x-6 inline-block">TEMPORADA</span>
          </button>
          <button
            onClick={() => navigate({ search: { tab: "global" } })}
            className={clsx(
              "px-8 py-3 font-display font-black uppercase text-sm transition-all border-l-[3px] border-black relative",
              tab === "global"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100",
            )}
          >
            {tab === "global" && (
              <div className="absolute inset-0 border-[3px] border-[#ccff00] pointer-events-none" />
            )}
            <span className="transform skew-x-6 inline-block">MUNDIAL</span>
          </button>
        </div>

        {/* Tournament Hero & Selector */}
        {tab === "season" && activeTournament && (
          <div className="mb-8 w-full max-w-xs relative z-30 flex flex-col items-center">
            {/* Selected Tournament Hero */}
            <div className="mb-6 relative group">
              <div className="absolute inset-0 bg-[#ccff00] blur-xl opacity-20 animate-pulse rounded-full" />
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] rotate-3 transition-transform hover:rotate-0 flex items-center justify-center p-4 relative z-10">
                {activeTournament.logoUrl ? (
                  <img
                    src={activeTournament.logoUrl}
                    alt="Tournament Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Trophy className="w-16 h-16 text-black" />
                )}
              </div>
              {/* Badge Name */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white font-display font-black uppercase text-xs px-3 py-1 border-2 border-white shadow-lg whitespace-nowrap z-20">
                {activeTournament.name}
              </div>
            </div>

            {/* Selector (Only if more than 1 tournament) */}
            {tournaments.length > 1 && (
              <div className="w-full relative">
                <div className="absolute inset-0 bg-black translate-x-1 translate-y-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative w-full px-4 py-3 font-display font-black uppercase text-sm border-[3px] border-black bg-white text-black outline-none cursor-pointer hover:bg-gray-50 flex items-center justify-between group h-12">
                    <span className="truncate mr-2">
                      {activeTournament.name}
                    </span>
                    <ChevronDown className="w-5 h-5 transition-transform group-data-[state=open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[var(--radix-dropdown-menu-trigger-width)] border-[3px] border-black bg-white text-black p-0 rounded-none mt-2 shadow-[4px_4px_0px_0px_#000]"
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
                          className="font-display font-bold uppercase text-sm px-4 py-3 cursor-pointer text-black data-[state=checked]:bg-brawl-yellow data-[state=checked]:text-black hover:bg-gray-100 outline-none border-b-2 border-black/5 last:border-0 focus:bg-gray-100 focus:text-black"
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

        {/* Active tournament label - REMOVED (Replaced by Hero) */}

        {leaderboard.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center border-[3px] border-black border-dashed w-full bg-white/50 rounded-sm">
            <div className="w-20 h-20 bg-gray-200 border-[3px] border-black flex items-center justify-center mb-6 opacity-40 rotate-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <Trophy className="w-10 h-10 text-gray-500" strokeWidth={2} />
            </div>
            <h2 className="font-display font-black text-3xl italic uppercase text-black tracking-tighter mb-2">
              NENHUM{" "}
              <span
                className="text-brawl-blue text-stroke-1 text-transparent bg-clip-text bg-gradient-to-br from-brawl-blue to-blue-600"
                style={{ WebkitTextStroke: "1px black" }}
              >
                DADO
              </span>
            </h2>
            <p className="text-black/60 font-bold text-sm uppercase tracking-wide">
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
            <div className="w-full space-y-3 mt-10">
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
      <div className="flex flex-col items-center z-10 mx-[-4px]">
        {/* Crown for 1st */}
        {rank === 1 && (
          <div className="mb-2 relative">
            <Crown
              className="w-10 h-10 text-brawl-yellow drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-bounce"
              fill="#ffc700"
              strokeWidth={2.5}
              style={{ animationDuration: "2s" }}
            />
          </div>
        )}

        {/* Avatar Container */}
        <div className="relative group cursor-default">
          <div
            className={clsx(
              "border-[3px] border-black overflow-hidden mb-3 bg-white transition-transform duration-300 group-hover:scale-105",
              rank === 1
                ? "w-20 h-20 shadow-[4px_4px_0px_0px_#000]"
                : "w-14 h-14 shadow-[3px_3px_0px_0px_#000]",
              isMe && "ring-[4px] ring-[#ccff00] ring-offset-0",
            )}
          >
            {entry.image ? (
              <img
                src={entry.image}
                alt={entry.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-tape flex items-center justify-center font-display font-black text-black/30 text-2xl">
                {entry.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Rank Badge overlapping avatar */}
          <div
            className={clsx(
              "absolute -bottom-2 -right-2 bg-black text-white font-display font-black flex items-center justify-center border-[2px] border-white transform rotate-3",
              rank === 1 ? "w-8 h-8 text-lg" : "w-6 h-6 text-xs",
            )}
          >
            {rank}
          </div>
        </div>

        {/* Name */}
        <div className="relative mt-2 mb-1 px-2 py-0.5 bg-white border border-black shadow-[2px_2px_0px_0px_#000] -rotate-1 max-w-full">
          <span
            className={clsx(
              "font-display font-black uppercase text-xs tracking-tight text-center leading-none block truncate max-w-[80px]",
              isMe ? "text-brawl-blue" : "text-black",
            )}
          >
            {entry.name}
          </span>
        </div>

        {/* Points */}
        <div className="text-center leading-none">
          <span className="font-display font-black text-xl text-black drop-shadow-sm block">
            {entry.totalPoints}
          </span>
          <span className="text-[9px] font-bold text-black/60 uppercase tracking-widest">
            PTS
          </span>
        </div>

        {/* Platform base */}
        <div
          className={clsx(
            "w-full mt-2 border-x-[3px] border-t-[3px] border-black flex items-center justify-center relative",
            colors.bg,
            height,
            rank === 1 ? "z-20 w-[110%]" : "z-10 w-full",
          )}
        >
          <span className="font-display font-black text-black/20 text-5xl italic absolute bottom-1">
            {rank}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full grid grid-cols-3 items-end px-2 pt-8 relative">
      {/* Floor Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black translate-y-[1px]" />

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
        "w-full flex items-center gap-4 px-4 py-3 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] bg-white relative overflow-hidden group",
        isCurrentUser &&
          "ring-2 ring-[#ccff00] ring-offset-2 ring-offset-paper",
      )}
    >
      {/* Current User Decorator */}
      {isCurrentUser && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#ccff00] rotate-45 translate-x-8 -translate-y-8 z-0 border-l-[3px] border-black" />
      )}

      {/* Rank Badge */}
      <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#888] transform -rotate-3 z-10 border-[2px] border-white/20">
        <span className="font-display font-black text-white text-lg italic">
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="w-12 h-12 border-[3px] border-black overflow-hidden shrink-0 bg-gray-100 z-10">
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display font-black text-gray-300 text-xl">
            {entry.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + Perfect Picks */}
      <div className="flex-1 min-w-0 text-black z-10">
        <span
          className={clsx(
            "font-display font-black uppercase text-base tracking-tight block truncate",
            isCurrentUser && "text-brawl-blue",
          )}
        >
          {entry.name}
        </span>
        {entry.perfectPicks > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex">
              {[...Array(Math.min(3, entry.perfectPicks))].map((_, i) => (
                <Star
                  key={i}
                  className="w-3 h-3 text-brawl-yellow drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                  fill="#ffc700"
                  strokeWidth={1}
                />
              ))}
              {entry.perfectPicks > 3 && (
                <span className="text-[10px] font-black ml-1 text-black/50">
                  +{entry.perfectPicks - 3}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-black/50 uppercase tracking-wide">
              Perfect
            </span>
          </div>
        )}
      </div>

      {/* Points */}
      <div className="text-right shrink-0 z-10 bg-white px-2 py-1 border border-black shadow-[2px_2px_0px_0px_#ccc] rotate-1">
        <span className="font-body font-bold text-xl text-black leading-none block">
          {entry.totalPoints}
        </span>
        <span className="text-[9px] font-black text-black/40 uppercase tracking-widest block leading-none">
          PTS
        </span>
      </div>
    </div>
  );
}

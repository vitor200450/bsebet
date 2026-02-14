import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Trophy, Star, Crown } from "lucide-react";
import { clsx } from "clsx";
import {
  getLeaderboard,
  getLeaderboardTournaments,
  type LeaderboardEntry,
} from "../server/leaderboard";
import { getUser } from "../functions/get-user";

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
  const { session, tournaments, leaderboard } = Route.useLoaderData();
  const { tab, tournamentId } = Route.useSearch();
  const navigate = useNavigate({ from: "/leaderboard" });
  const currentUserId = session?.user?.id;

  const activeTournament = tournaments.find((t) => t.id === tournamentId);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-brawl-yellow border-[3px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <Trophy className="w-8 h-8 text-black" strokeWidth={3} />
            </div>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl italic uppercase text-black tracking-tighter transform -skew-x-12 leading-none">
            PREMIUM <span className="text-brawl-red">HALL OF FAME</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2">
            WHO RUNS THE BOARD?
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="inline-flex bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden mb-8">
          <button
            onClick={() =>
              navigate({
                search: { tab: "season", tournamentId: tournaments[0]?.id },
              })
            }
            className={clsx(
              "px-6 py-2.5 font-black uppercase text-sm transition-all relative",
              tab === "season"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100",
            )}
          >
            {tab === "season" && (
              <div className="absolute inset-0 border-[3px] border-[#ccff00] pointer-events-none" />
            )}
            TEMPORADA
          </button>
          <button
            onClick={() => navigate({ search: { tab: "global" } })}
            className={clsx(
              "px-6 py-2.5 font-black uppercase text-sm transition-all border-l-[3px] border-black relative",
              tab === "global"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100",
            )}
          >
            {tab === "global" && (
              <div className="absolute inset-0 border-[3px] border-[#ccff00] pointer-events-none" />
            )}
            MUNDIAL
          </button>
        </div>

        {/* Tournament Selector (only in season mode) */}
        {tab === "season" && tournaments.length > 1 && (
          <div className="mb-6 w-full max-w-xs">
            <select
              value={tournamentId ?? ""}
              onChange={(e) =>
                navigate({
                  search: {
                    tab: "season",
                    tournamentId: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  },
                })
              }
              className="w-full px-4 py-2 font-bold uppercase text-sm border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_#000] outline-none"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active tournament label */}
        {tab === "season" && activeTournament && (
          <div className="mb-6">
            <div className="bg-black text-[10px] font-black text-white px-3 py-1 rounded-full tracking-[0.2em] transform -skew-x-12 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-brawl-yellow rounded-full" />
              {activeTournament.name.toUpperCase()}
            </div>
          </div>
        )}

        {leaderboard.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-200 border-[3px] border-black flex items-center justify-center mb-6 opacity-40">
              <Trophy className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="font-display font-black text-2xl italic uppercase text-black tracking-tighter mb-2">
              NO RANKINGS <span className="text-brawl-blue">YET</span>
            </h2>
            <p className="text-gray-500 font-bold text-sm uppercase">
              Place your bets to climb the board!
            </p>
          </div>
        ) : (
          <>
            {/* Podium Section */}
            {top3.length > 0 && (
              <PodiumSection entries={top3} currentUserId={currentUserId} />
            )}

            {/* Leaderboard List */}
            <div className="w-full space-y-3 mt-8">
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
      <div className="flex flex-col items-center">
        {/* Crown for 1st */}
        {rank === 1 && (
          <Crown
            className="w-8 h-8 text-brawl-yellow mb-1 drop-shadow-sm"
            fill="#ffc700"
            strokeWidth={2}
          />
        )}

        {/* Avatar */}
        <div
          className={clsx(
            "rounded-full border-[3px] border-black overflow-hidden mb-2 shadow-[2px_2px_0px_0px_#000]",
            rank === 1 ? "w-16 h-16" : "w-12 h-12",
            isMe && "ring-[3px] ring-[#ccff00] ring-offset-2",
          )}
        >
          {entry.image ? (
            <img
              src={entry.image}
              alt={entry.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center font-black text-gray-500 text-lg">
              {entry.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <span
          className={clsx(
            "font-display font-black uppercase text-xs tracking-tight text-center leading-tight mb-1 max-w-[90px] truncate",
            isMe ? "text-brawl-blue" : "text-black",
          )}
        >
          {entry.name}
        </span>

        {/* Points */}
        <span className="font-body font-bold text-lg text-black">
          {entry.totalPoints}
        </span>
        <span className="text-[9px] font-bold text-black/60 uppercase tracking-widest">
          PTS
        </span>

        {/* Perfect Picks */}
        {entry.perfectPicks > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            <Star className="w-3 h-3 text-brawl-yellow" fill="#ffc700" />
            <span className="text-[10px] font-bold text-black/70">
              {entry.perfectPicks}
            </span>
          </div>
        )}

        {/* Platform */}
        <div
          className={clsx(
            "w-full mt-3 border-[3px] border-black flex items-center justify-center",
            colors.bg,
            height,
          )}
        >
          <span className="font-display font-black text-black text-xl italic transform -skew-x-6">
            {colors.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full grid grid-cols-3 gap-2 items-end px-2">
      {/* 2nd Place (left) */}
      <PodiumBlock entry={second} rank={2} height="h-28" />
      {/* 1st Place (center, tallest) */}
      <PodiumBlock entry={first} rank={1} height="h-40" />
      {/* 3rd Place (right) */}
      <PodiumBlock entry={third} rank={3} height="h-20" />
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
        "w-full flex items-center gap-3 px-4 py-3 border-[4px] border-black shadow-[6px_6px_0px_0px_#000] transition-all duration-200 hover:-translate-y-1",
        isCurrentUser ? "bg-[#ccff00]" : "bg-white",
      )}
    >
      {/* Rank Badge */}
      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
        <span className="font-display font-black text-white text-sm">
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full border-[2px] border-black overflow-hidden shrink-0">
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center font-black text-gray-500">
            {entry.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + Perfect Picks */}
      <div className="flex-1 min-w-0 text-black">
        <span className="font-display font-black uppercase text-sm tracking-tight block truncate">
          {entry.name}
        </span>
        {entry.perfectPicks > 0 && (
          <div className="flex items-center gap-1 mt-0.5 text-black/60">
            <Star className="w-3 h-3 text-brawl-yellow" fill="#ffc700" />
            <span className="text-[10px] font-bold">
              {entry.perfectPicks} perfect
            </span>
          </div>
        )}
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <span className="font-body font-bold text-xl text-black">
          {entry.totalPoints}
        </span>
        <span className="text-[9px] font-bold text-black/60 uppercase tracking-widest block">
          PTS
        </span>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { clsx } from "clsx";
import type { Match, Team, Prediction } from "./types";

export type Standing = {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  mapWins: number;
  mapLosses: number;
  mapDiff: number;
  points: number;
};

export function useStandings(
  matches: Match[],
  predictions?: Record<number, Prediction>,
) {
  return useMemo(() => {
    const stats = new Map<number, Standing>();

    const isGhostTeam = (team: Team) => {
      const name = team.name.toUpperCase();
      return (
        name.includes("WINNER") ||
        name.includes("LOSER") ||
        name.includes("TBD") ||
        name.includes("SEED")
      );
    };

    const initTeam = (team: Team) => {
      if (isGhostTeam(team)) return;
      if (!stats.has(team.id)) {
        stats.set(team.id, {
          team,
          played: 0,
          wins: 0,
          losses: 0,
          mapWins: 0,
          mapLosses: 0,
          mapDiff: 0,
          points: 0,
        });
      }
    };

    matches.forEach((match) => {
      if (!match.teamA || !match.teamB) return;
      initTeam(match.teamA);
      initTeam(match.teamB);

      const prediction = predictions?.[match.id];
      const isFinished = match.status === "finished";

      // Use prediction if not finished, otherwise use actual result
      const winnerId = isFinished ? match.winnerId : prediction?.winnerId;

      if (winnerId) {
        const loserId =
          match.teamA.id === winnerId ? match.teamB.id : match.teamA.id;

        const winnerStats = stats.get(winnerId);
        const loserStats = stats.get(loserId);

        // Only update if both teams are not ghosts (real teams)
        if (winnerStats && loserStats) {
          winnerStats.played += 1;
          winnerStats.wins += 1;

          loserStats.played += 1;
          loserStats.losses += 1;

          // Map Scores logic
          let scoreA = 0;
          let scoreB = 0;

          if (isFinished) {
            scoreA = match.scoreA ?? 0;
            scoreB = match.scoreB ?? 0;
          } else if (prediction?.score) {
            // Parse prediction score "2 - 1"
            const parts = prediction.score
              .split("-")
              .map((s) => parseInt(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              scoreA = parts[0];
              scoreB = parts[1];
            }
          }

          if (match.teamA.id === winnerId) {
            winnerStats.mapWins += scoreA;
            winnerStats.mapLosses += scoreB;

            loserStats.mapWins += scoreB;
            loserStats.mapLosses += scoreA;
          } else {
            winnerStats.mapWins += scoreB;
            winnerStats.mapLosses += scoreA;

            loserStats.mapWins += scoreA;
            loserStats.mapLosses += scoreB;
          }
        }
      }
    });

    // Calculate Diff
    stats.forEach((s: Standing) => (s.mapDiff = s.mapWins - s.mapLosses));

    return Array.from(stats.values()).sort((a, b) => {
      // Sort by Wins
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Then Map Diff
      if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
      // Then Map Wins
      if (b.mapWins !== a.mapWins) return b.mapWins - a.mapWins;
      return 0;
    });
  }, [matches, predictions]);
}

export function StandingsTable({ standings }: { standings: Standing[] }) {
  return (
    <div className="w-[420px] flex-shrink-0">
      <table className="w-full text-black border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] table-fixed">
        <thead className="bg-black text-white text-[10px] font-black uppercase italic tracking-wider">
          <tr>
            <th className="p-2 text-left w-48">Team</th>
            <th className="p-2 text-center w-12">W-L</th>
            <th className="p-2 text-center w-12">Maps</th>
            <th className="p-2 text-center w-12">Diff</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team.id}
              className={clsx(
                "border-b border-black/10 text-xs font-bold transition-all relative overflow-hidden",
                i < 2 ? "bg-[#ccff00]/20" : "bg-white",
                i < 2 ? "border-l-[4px] border-l-[#ccff00]" : "",
              )}
            >
              <td className="p-2 flex items-center gap-2 overflow-hidden relative">
                {/* Qualification Indicator */}
                {i < 2 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
                )}

                {s.team.logoUrl && (
                  <img
                    src={s.team.logoUrl}
                    className="w-5 h-5 object-contain flex-shrink-0 relative z-10"
                  />
                )}
                <span
                  className={clsx(
                    "uppercase block relative z-10",
                    i < 2 ? "font-black" : "",
                  )}
                >
                  {s.team.name}
                </span>

                {/* Qualifying label */}
                {i < 2 && (
                  <span className="ml-auto text-[6px] font-black uppercase text-black/60 bg-[#ccff00] px-1 py-0.5 border-black/20 flex-shrink-0">
                    QUAL
                  </span>
                )}
              </td>
              <td className="p-2 text-center">
                {s.wins}-{s.losses}
              </td>
              <td className="p-2 text-center text-gray-500">
                {s.mapWins}-{s.mapLosses}
              </td>
              <td
                className={clsx(
                  "p-2 text-center",
                  s.mapDiff > 0
                    ? "text-green-600"
                    : s.mapDiff < 0
                      ? "text-red-500"
                      : "text-gray-400",
                )}
              >
                {s.mapDiff > 0 ? "+" : ""}
                {s.mapDiff}
              </td>
            </tr>
          ))}
          {standings.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="p-4 text-center text-gray-400 italic text-[10px]"
              >
                No matches played
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

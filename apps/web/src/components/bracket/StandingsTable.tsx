import { clsx } from "clsx";
import { useMemo } from "react";
import { TeamLogo } from "../TeamLogo";
import type { Match, Prediction, Team } from "./types";

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
							.map((s) => Number.parseInt(s.trim()));
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
			<table className="w-full table-fixed border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<thead className="bg-black font-black text-[10px] text-white uppercase italic tracking-wider">
					<tr>
						<th className="w-48 p-2 text-left">Team</th>
						<th className="w-12 p-2 text-center">W-L</th>
						<th className="w-12 p-2 text-center">Maps</th>
						<th className="w-12 p-2 text-center">Diff</th>
					</tr>
				</thead>
				<tbody>
					{standings.map((s, i) => (
						<tr
							key={s.team.id}
							className={clsx(
								"relative overflow-hidden border-black/10 border-b font-bold text-xs transition-all",
								i < 2 ? "bg-[#ccff00]/20" : "bg-white",
								i < 2 ? "border-l-[#ccff00] border-l-[4px]" : "",
							)}
						>
							<td className="relative flex items-center gap-2 overflow-hidden p-2">
								{/* Qualification Indicator */}
								{i < 2 && (
									<div className="absolute top-0 bottom-0 left-0 w-1 bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
								)}

								<TeamLogo
									teamName={s.team.name}
									logoUrl={s.team.logoUrl}
									size="xs"
									className="relative z-10 flex-shrink-0"
								/>
								<span
									className={clsx(
										"relative z-10 block uppercase",
										i < 2 ? "font-black" : "",
									)}
								>
									{s.team.name}
								</span>

								{/* Qualifying label */}
								{i < 2 && (
									<span className="ml-auto flex-shrink-0 border-black/20 bg-[#ccff00] px-1 py-0.5 font-black text-[6px] text-black/60 uppercase">
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
								className="p-4 text-center text-[10px] text-gray-400 italic"
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

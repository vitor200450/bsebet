import { clsx } from "clsx";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation("admin-matches");
	return (
		<div className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-[4px_4px_0_0_#000]">
			<div className="overflow-x-auto">
				<table className="w-full text-left">
					<thead>
						<tr className="border-black border-b-2 bg-[#121212]">
							<th className="px-3 py-2.5 font-black text-[10px] text-white uppercase tracking-wider">
								{t("bracketView.colTeam")}
							</th>
							<th className="px-3 py-2.5 text-center font-black text-[10px] text-gray-300 uppercase tracking-wider">
								{t("bracketView.colWL")}
							</th>
							<th className="hidden px-3 py-2.5 text-center font-black text-[10px] text-gray-300 uppercase tracking-wider sm:table-cell">
								{t("bracketView.colMaps")}
							</th>
							<th className="px-3 py-2.5 text-center font-black text-[10px] text-gray-300 uppercase tracking-wider">
								{t("bracketView.colDiff")}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-black/10">
						{standings.map((s, i) => (
							<tr
								key={s.team.id}
								className={clsx(
									"relative font-bold text-xs transition-colors",
									i < 2 ? "bg-[#ccff00]/20" : "bg-white",
								)}
							>
								<td className="relative px-3 py-2">
									<div className="flex items-center gap-2">
										{i < 2 && (
											<div className="h-2 w-2 shrink-0 rounded-full bg-[#ccff00] shadow-[0_0_0_2px_rgba(204,255,0,0.3)]" />
										)}
										<TeamLogo
											teamName={s.team.name}
											logoUrl={s.team.logoUrl}
											size="sm"
											className="h-6 w-6 shrink-0 drop-shadow-sm"
										/>
										<span
											className={clsx(
												"truncate font-black text-sm uppercase leading-none",
												i < 2 ? "text-black" : "text-zinc-700",
											)}
										>
											{s.team.name}
										</span>
									</div>
								</td>
								<td className="px-3 py-2 text-center font-black text-[#121212]">
									{s.wins}-{s.losses}
								</td>
								<td className="hidden px-3 py-2 text-center font-bold text-gray-500 sm:table-cell">
									{s.mapWins}-{s.mapLosses}
								</td>
								<td
									className={clsx(
										"px-3 py-2 text-center font-black",
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
									{t("bracketView.noMatches")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

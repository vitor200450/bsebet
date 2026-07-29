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
			const winnerId = isFinished ? match.winnerId : prediction?.winnerId;

			if (winnerId) {
				const loserId =
					match.teamA.id === winnerId ? match.teamB.id : match.teamA.id;

				const winnerStats = stats.get(winnerId);
				const loserStats = stats.get(loserId);

				if (winnerStats && loserStats) {
					winnerStats.played += 1;
					winnerStats.wins += 1;

					loserStats.played += 1;
					loserStats.losses += 1;

					let scoreA = 0;
					let scoreB = 0;

					if (isFinished) {
						scoreA = match.scoreA ?? 0;
						scoreB = match.scoreB ?? 0;
					} else if (prediction?.score) {
						const parts = prediction.score
							.split("-")
							.map((s) => Number.parseInt(s.trim()));
						if (
							parts.length === 2 &&
							!Number.isNaN(parts[0]) &&
							!Number.isNaN(parts[1])
						) {
							scoreA = parts[0] ?? 0;
							scoreB = parts[1] ?? 0;
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

		for (const s of stats.values()) {
			s.mapDiff = s.mapWins - s.mapLosses;
		}

		return Array.from(stats.values()).sort((a, b) => {
			if (b.wins !== a.wins) return b.wins - a.wins;
			if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
			if (b.mapWins !== a.mapWins) return b.mapWins - a.mapWins;
			return 0;
		});
	}, [matches, predictions]);
}

export function StandingsTable({ standings }: { standings: Standing[] }) {
	const { t } = useTranslation("admin-matches");

	return (
		<div className="overflow-hidden border-[3px] border-black bg-white text-ink shadow-comic-md">
			<div className="overflow-x-auto">
				<table className="w-full text-left">
					<thead>
						<tr className="border-black border-b-[3px] bg-ink">
							<th className="w-10 px-2 py-2.5 text-center font-body font-bold text-[10px] text-white uppercase tracking-widest">
								#
							</th>
							<th className="px-3 py-2.5 font-body font-bold text-[10px] text-white uppercase tracking-widest">
								{t("bracketView.colTeam")}
							</th>
							<th className="px-3 py-2.5 text-center font-body font-bold text-[10px] text-white/80 uppercase tracking-widest">
								{t("bracketView.colWL")}
							</th>
							<th className="hidden px-3 py-2.5 text-center font-body font-bold text-[10px] text-white/80 uppercase tracking-widest sm:table-cell">
								{t("bracketView.colMaps")}
							</th>
							<th className="px-3 py-2.5 text-center font-body font-bold text-[10px] text-white/80 uppercase tracking-widest">
								{t("bracketView.colDiff")}
							</th>
						</tr>
					</thead>
					<tbody>
						{standings.map((s, i) => {
							const isQualifying = i < 2;
							return (
								<tr
									key={s.team.id}
									className={clsx(
										"border-black/10 border-b text-xs last:border-b-0",
										isQualifying ? "bg-electric-lime/25" : "bg-white",
									)}
								>
									<td className="px-2 py-2.5 text-center">
										<span
											className={clsx(
												"inline-flex h-6 w-6 items-center justify-center border-2 border-black font-black font-body text-[10px] tabular-nums shadow-comic-sm",
												isQualifying ? "surface-lime" : "bg-white text-ink",
											)}
										>
											{i + 1}
										</span>
									</td>
									<td className="px-3 py-2.5">
										<div className="flex min-w-0 items-center gap-2">
											<TeamLogo
												teamName={s.team.name}
												logoUrl={s.team.logoUrl}
												size="md"
												className="h-8 w-8 shrink-0"
											/>
											<span className="truncate pe-[0.25em] pb-0.5 font-black font-display text-ink text-sm uppercase italic leading-[1.15] tracking-tighter">
												{s.team.name}
											</span>
										</div>
									</td>
									<td className="px-3 py-2.5 text-center font-black font-body text-ink tabular-nums">
										{s.wins}-{s.losses}
									</td>
									<td className="hidden px-3 py-2.5 text-center font-body font-bold text-gray-500 tabular-nums sm:table-cell">
										{s.mapWins}-{s.mapLosses}
									</td>
									<td
										className={clsx(
											"px-3 py-2.5 text-center font-black font-body tabular-nums",
											s.mapDiff > 0
												? "text-brawl-blue"
												: s.mapDiff < 0
													? "text-brawl-red"
													: "text-gray-400",
										)}
									>
										{s.mapDiff > 0 ? "+" : ""}
										{s.mapDiff}
									</td>
								</tr>
							);
						})}
						{standings.length === 0 ? (
							<tr>
								<td
									colSpan={5}
									className="p-6 text-center font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest"
								>
									{t("bracketView.noMatches")}
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}

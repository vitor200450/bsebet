import { clsx } from "clsx";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MatchCard } from "./MatchCard";
import { TeamLogo } from "./TeamLogo";

interface TeamInfo {
	id?: number;
	name: string;
	logoUrl?: string | null;
}

interface Match {
	id: number;
	status: string;
	teamA?: TeamInfo | null;
	teamB?: TeamInfo | null;
	winnerId?: number | null;
	isBettingEnabled?: boolean;
	startTime: string | Date;
	[key: string]: any;
}

interface RoundRobinResultViewProps {
	groupName: string;
	matches: Match[];
	userBets: any[];
	showPredictionScore?: boolean;
}

interface TeamStanding {
	team: TeamInfo;
	played: number;
	wins: number;
	losses: number;
	mapWins: number;
	mapLosses: number;
	mapDiff: number;
	points: number;
}

export function RoundRobinResultView({
	groupName,
	matches,
	userBets,
	showPredictionScore = false,
}: RoundRobinResultViewProps) {
	const { t } = useTranslation("tournament");

	const standings = useMemo(() => {
		const teamsMap = new Map<number, TeamStanding>();

		const getTeam = (teamInfo: TeamInfo) => {
			if (!teamInfo.id) return null;
			if (!teamsMap.has(teamInfo.id)) {
				teamsMap.set(teamInfo.id, {
					team: teamInfo,
					played: 0,
					wins: 0,
					losses: 0,
					mapWins: 0,
					mapLosses: 0,
					mapDiff: 0,
					points: 0,
				});
			}
			return teamsMap.get(teamInfo.id)!;
		};

		matches.forEach((match) => {
			if (match.teamA?.id) getTeam(match.teamA);
			if (match.teamB?.id) getTeam(match.teamB);

			const isFinished = match.status === "finished";
			const bet = showPredictionScore
				? userBets?.find((b) => b.matchId === match.id)
				: null;
			const winnerId = isFinished ? match.winnerId : bet?.predictedWinnerId;

			if (winnerId) {
				const teamAState = match.teamA ? getTeam(match.teamA) : null;
				const teamBState = match.teamB ? getTeam(match.teamB) : null;

				if (teamAState) teamAState.played += 1;
				if (teamBState) teamBState.played += 1;

				if (winnerId === match.teamA?.id && teamAState) {
					teamAState.wins += 1;
					teamAState.points += 1;
					if (teamBState) teamBState.losses += 1;
				} else if (winnerId === match.teamB?.id && teamBState) {
					teamBState.wins += 1;
					teamBState.points += 1;
					if (teamAState) teamAState.losses += 1;
				}

				let scoreA = 0;
				let scoreB = 0;

				if (isFinished) {
					scoreA = match.scoreA ?? 0;
					scoreB = match.scoreB ?? 0;
				} else if (
					bet?.predictedScoreA !== undefined &&
					bet?.predictedScoreB !== undefined
				) {
					scoreA = bet.predictedScoreA;
					scoreB = bet.predictedScoreB;
				}

				if (teamAState && teamBState) {
					teamAState.mapWins += scoreA;
					teamAState.mapLosses += scoreB;
					teamBState.mapWins += scoreB;
					teamBState.mapLosses += scoreA;
				}
			}
		});

		const finalStandings = Array.from(teamsMap.values());
		finalStandings.forEach((s) => {
			s.mapDiff = s.mapWins - s.mapLosses;
		});

		return finalStandings.sort((a, b) => {
			if (b.wins !== a.wins) return b.wins - a.wins;
			if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
			return b.mapWins - a.mapWins;
		});
	}, [matches, userBets, showPredictionScore]);

	return (
		<div className="mb-12 flex flex-col gap-6 rounded-3xl border-4 border-black/5 bg-white/40 p-4 shadow-inner backdrop-blur-sm md:p-6">
			{/* Header */}
			<div className="flex flex-col items-center justify-between gap-4 border-black/10 border-b-4 pb-6 md:flex-row">
				<h3 className="font-black text-4xl text-black uppercase italic drop-shadow-sm">
					{groupName}
				</h3>
				<div className="flex items-center gap-2">
					<div className="rotate-2 border border-transparent bg-black px-4 py-1.5 font-black text-[#ccff00] text-xs uppercase tracking-widest shadow-sm">
						Round Robin
					</div>
					<div className="-rotate-2 border-2 border-black bg-white px-4 py-1.5 font-black text-black text-xs uppercase tracking-widest shadow-sm">
						Points Stage
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-8 xl:flex-row">
				{/* Standings Table - Left Side */}
				<div className="w-full shrink-0 xl:w-[450px]">
					<h4 className="mb-4 font-black text-black/80 text-xl uppercase italic">
						Standings
					</h4>
					{standings.length > 0 && (
						<div className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-[4px_4px_0_0_#000]">
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead className="border-black border-b-2 bg-[#121212] text-white">
										<tr className="border-transparent border-l-4">
											<th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider">
												#
											</th>
											<th className="px-4 py-3 font-black text-[10px] uppercase tracking-wider">
												{t("standings.team", "Team")}
											</th>
											<th className="px-4 py-3 text-center font-black text-[10px] text-gray-300 uppercase tracking-wider">
												{t("bracketView.colWL", "W-L")}
											</th>
											<th className="px-4 py-3 text-center font-black text-[10px] text-gray-300 uppercase tracking-wider">
												{t("bracketView.colMaps", "MAPS")}
											</th>
											<th className="px-4 py-3 text-center font-black text-[10px] text-gray-300 uppercase tracking-wider">
												{t("bracketView.colDiff", "DIFF")}
											</th>
										</tr>
									</thead>
									<tbody className="divide-y-2 divide-black/10">
										{standings.map((row, index) => {
											// Mark top 2 as qualifying visually (common in RR groups)
											const isTop = index < 2;

											return (
												<tr
													key={row.team.id}
													className={clsx(
														"relative overflow-hidden border-black/10 border-b font-bold text-xs transition-all",
														isTop
															? "bg-[#ccff00]/30"
															: "bg-white hover:bg-gray-50",
														isTop
															? "border-[#ccff00] border-l-4"
															: "border-transparent border-l-4",
													)}
												>
													<td className="w-12 p-2 text-center text-gray-500">
														{index + 1}
													</td>
													<td className="relative flex items-center gap-2 overflow-hidden p-2">
														<TeamLogo
															teamName={row.team.name}
															logoUrl={row.team.logoUrl}
															size="sm"
															className="drop-shadow-sm"
														/>
														<div className="flex flex-col">
															<span
																className={clsx(
																	"font-black text-sm uppercase leading-none",
																	isTop ? "text-black" : "text-zinc-700",
																)}
															>
																{row.team.name}
															</span>
														</div>
													</td>
													<td className="px-4 py-3 text-center font-black text-[#121212]">
														{row.wins}-{row.losses}
													</td>
													<td className="px-4 py-3 text-center font-bold text-gray-500">
														{row.mapWins}-{row.mapLosses}
													</td>
													<td
														className={clsx(
															"px-4 py-3 text-center font-black",
															row.mapDiff > 0
																? "text-green-600"
																: row.mapDiff < 0
																	? "text-red-500"
																	: "text-gray-400",
														)}
													>
														{row.mapDiff > 0 ? `+${row.mapDiff}` : row.mapDiff}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Match Cards - Right Side */}
				<div className="min-w-0 flex-1">
					<h4 className="mb-4 font-black text-black/80 text-xl uppercase italic">
						Matches
					</h4>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
						{matches.map((match) => (
							<MatchCard
								key={match.id}
								match={{
									...match,
									category: t("detail.stageGroups"),
									isBettingEnabled: match.isBettingEnabled ?? false,
									status: match.status as "scheduled" | "live" | "finished",
									format: "bo3",
									teamA: match.teamA as any,
									teamB: match.teamB as any,
								}}
								initialBet={
									userBets
										? userBets.find((b: any) => b.matchId === match.id)
										: undefined
								}
								showPredictionScore={showPredictionScore}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GroupStageShell } from "@/components/GroupStageShell";
import { MatchCard } from "@/components/MatchCard";
import { formatScoreDisplay } from "@/utils/score-format";
import { StandingsTable, useStandings } from "./bracket/StandingsTable";
import type { Match as BracketMatch } from "./bracket/types";

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

export function RoundRobinResultView({
	groupName,
	matches,
	userBets,
	showPredictionScore = false,
}: RoundRobinResultViewProps) {
	const { t } = useTranslation("tournament");
	const { t: tAdmin } = useTranslation("admin-matches");

	const bracketMatches: BracketMatch[] = useMemo(() => {
		return matches.map(
			(m) =>
				({
					id: m.id,
					label: m.label || "",
					name: m.name || m.label || "",
					displayOrder: m.displayOrder ?? 0,
					teamA: {
						id: m.teamA?.id ?? 0,
						name: m.teamA?.name ?? "TBD",
						logoUrl: m.teamA?.logoUrl,
						color: "blue",
					},
					teamB: {
						id: m.teamB?.id ?? 0,
						name: m.teamB?.name ?? "TBD",
						logoUrl: m.teamB?.logoUrl,
						color: "red",
					},
					format: m.format ?? "bo3",
					stats: {
						regionA: "",
						regionB: "",
						pointsA: 0,
						pointsB: 0,
						formA: "0-0",
						formB: "0-0",
						winRateA: "",
						winRateB: "",
					},
					status: m.status as BracketMatch["status"],
					scoreA: m.scoreA,
					scoreB: m.scoreB,
					winnerId: m.winnerId,
					startTime: m.startTime,
				}) as BracketMatch,
		);
	}, [matches]);

	const predictionsMap = useMemo(() => {
		if (!showPredictionScore || !userBets) return {};
		const map: Record<number, { winnerId: number; score: string }> = {};
		userBets.forEach((bet) => {
			map[bet.matchId] = {
				winnerId: bet.predictedWinnerId,
				score: formatScoreDisplay(bet.predictedScoreA, bet.predictedScoreB),
			};
		});
		return map;
	}, [userBets, showPredictionScore]);

	const standings = useStandings(bracketMatches, predictionsMap);

	return (
		<GroupStageShell
			title={groupName}
			formatLabel={tAdmin("bracketView.roundRobin")}
			badgeLabel={tAdmin("bracketView.top2Advance")}
		>
			<div className="flex flex-col gap-8 xl:flex-row">
				<div className="w-full shrink-0 xl:max-w-md">
					<p className="mb-3 font-black font-display text-ink text-sm uppercase italic tracking-tighter">
						{t("detail.standings")}
					</p>
					<StandingsTable standings={standings} />
				</div>

				<div className="min-w-0 flex-1">
					<p className="mb-3 font-black font-display text-ink text-sm uppercase italic tracking-tighter">
						{t("detail.matches")}
					</p>
					{matches.length > 0 ? (
						<div className="flex flex-col gap-4">
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
									initialBet={userBets?.find(
										(b: any) => b.matchId === match.id,
									)}
									showPredictionScore={showPredictionScore}
								/>
							))}
						</div>
					) : (
						<div className="border-[3px] border-black border-dashed bg-tape/40 py-10 text-center font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
							{tAdmin("bracketView.noMatches")}
						</div>
					)}
				</div>
			</div>
		</GroupStageShell>
	);
}

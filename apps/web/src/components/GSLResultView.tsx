import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	GroupStageColumnLabel,
	GroupStageShell,
} from "@/components/GroupStageShell";
import { MatchCard } from "@/components/MatchCard";
import { formatScoreDisplay } from "@/utils/score-format";
import { StandingsTable, useStandings } from "./bracket/StandingsTable";
import type { Match as BracketMatch } from "./bracket/types";

export interface GSLResultViewProps {
	groupName: string;
	matches: any[];
	userBets?: any[];
	showPredictionScore?: boolean;
}

export function GSLResultView({
	groupName,
	matches,
	userBets,
	showPredictionScore,
}: GSLResultViewProps) {
	const { t } = useTranslation("admin-matches");
	const { t: tTournament } = useTranslation("tournament");

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
					status: m.status,
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

	const findMatch = (patterns: string[]) =>
		matches.find((m) => {
			const text = (m.name || m.label || "").toLowerCase();
			return patterns.some((p) => text.includes(p.toLowerCase()));
		});

	const openingMatches = matches.filter((m) => {
		const text = (m.name || m.label || "").toLowerCase();
		return (
			text.includes("opening") ||
			text.includes("abertura") ||
			text.includes("rodada 1") ||
			text.includes("round 1")
		);
	});

	const winnersMatch = findMatch(["winners", "vencedores", "winner"]);
	const elimMatch = findMatch(["elimination", "eliminação", "loser"]);
	const deciderMatch = findMatch(["decider", "decisiva", "decisivo"]);

	const renderMatch = (match?: any) => {
		if (!match) {
			return (
				<div className="mx-auto flex h-28 w-full max-w-sm items-center justify-center border-[3px] border-black border-dashed bg-tape/40 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
					{tTournament("detail.tba")}
				</div>
			);
		}

		return (
			<MatchCard
				className="mx-auto max-w-md"
				match={{
					...match,
					category: tTournament("detail.stageGroups"),
					isBettingEnabled: match.isBettingEnabled ?? false,
					status: match.status as "scheduled" | "live" | "finished",
					format: match.format ?? "bo3",
					teamA: match.teamA,
					teamB: match.teamB,
				}}
				initialBet={userBets?.find((b) => b.matchId === match.id)}
				showPredictionScore={showPredictionScore}
			/>
		);
	};

	return (
		<GroupStageShell
			title={groupName}
			formatLabel={t("bracketView.gslFormat")}
			badgeLabel={t("bracketView.top2Advance")}
		>
			<div className="flex flex-col gap-8 xl:flex-row">
				<div className="w-full shrink-0 xl:max-w-md">
					<p className="mb-3 font-black font-display text-ink text-sm uppercase italic tracking-tighter">
						{tTournament("detail.standings")}
					</p>
					<StandingsTable standings={standings} />
				</div>

				<div className="min-w-0 flex-1">
					<p className="mb-3 font-black font-display text-ink text-sm uppercase italic tracking-tighter">
						{tTournament("detail.matches")}
					</p>
					<div className="scrollbar-hide overflow-x-auto pb-2">
						<div className="flex min-w-max items-stretch gap-4 sm:gap-6">
							<div className="w-[26rem] shrink-0">
								<GroupStageColumnLabel tone="ink">
									{t("bracketView.openingMatches")}
								</GroupStageColumnLabel>
								<div className="flex flex-col gap-4">
									{openingMatches.length > 0
										? openingMatches.map((m) => (
												<div key={m.id}>{renderMatch(m)}</div>
											))
										: renderMatch(undefined)}
								</div>
							</div>

							<div
								aria-hidden="true"
								className="hidden w-px shrink-0 self-stretch border-black border-l-2 border-dashed opacity-30 sm:block"
							/>

							<div className="w-[26rem] shrink-0">
								<div className="mb-8">
									<GroupStageColumnLabel tone="lime">
										{t("bracketView.winnersMatch")}
									</GroupStageColumnLabel>
									{renderMatch(winnersMatch)}
								</div>
								<div>
									<GroupStageColumnLabel tone="red">
										{t("bracketView.eliminationMatch")}
									</GroupStageColumnLabel>
									{renderMatch(elimMatch)}
								</div>
							</div>

							<div
								aria-hidden="true"
								className="hidden w-px shrink-0 self-stretch border-black border-l-2 border-dashed opacity-30 sm:block"
							/>

							<div className="w-[26rem] shrink-0">
								<GroupStageColumnLabel tone="tape">
									{t("bracketView.deciderMatch")}
								</GroupStageColumnLabel>
								{renderMatch(deciderMatch)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</GroupStageShell>
	);
}

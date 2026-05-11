import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MatchCard as BracketMatchCard } from "./bracket/MatchCard";
import type { Match, Prediction } from "./bracket/types";
import { MatchCard } from "./MatchCard";
import { TeamLogo } from "./TeamLogo";

export interface SwissTeamBucket {
	id: number;
	name: string;
	logoUrl?: string | null;
	status?: string;
}

interface SwissStageViewProps {
	matches?: Match[];
	buckets?: Record<string, SwissTeamBucket[]>;
	groupedRounds?: Array<{
		roundLabel: string;
		matches: any[];
	}>;
	predictions?: Record<number, Prediction>;
	onUpdatePrediction?: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	onRemovePrediction?: (matchId: number) => void;
	onShowReview?: () => void;
	isReadOnly?: boolean;
	editableMatchIds?: Set<number>;
	matchDayStatus?: string | null;
	userBets?: any[];
	showPredictionScore?: boolean;
}

function computeBuckets(input: Match[]) {
	const teamMap = new Map<
		number,
		{ id: number; name: string; logoUrl?: string; wins: number; losses: number }
	>();

	for (const m of input) {
		const teamA = m.teamA;
		const teamB = m.teamB;
		if (teamA && !teamMap.has(teamA.id)) {
			teamMap.set(teamA.id, {
				id: teamA.id,
				name: teamA.name,
				logoUrl: teamA.logoUrl,
				wins: 0,
				losses: 0,
			});
		}
		if (teamB && !teamMap.has(teamB.id)) {
			teamMap.set(teamB.id, {
				id: teamB.id,
				name: teamB.name,
				logoUrl: teamB.logoUrl,
				wins: 0,
				losses: 0,
			});
		}

		if (m.status !== "finished" || !m.winnerId || !m.teamA?.id || !m.teamB?.id)
			continue;

		const loserId = m.winnerId === m.teamA.id ? m.teamB.id : m.teamA.id;
		const winner = teamMap.get(m.winnerId);
		const loser = teamMap.get(loserId);
		if (winner) winner.wins += 1;
		if (loser) loser.losses += 1;
	}

	const buckets: Record<
		string,
		Array<{ id: number; name: string; logoUrl?: string; status: string }>
	> = {};

	for (const team of teamMap.values()) {
		const record = `${team.wins}-${team.losses}`;
		if (!buckets[record]) buckets[record] = [];
		buckets[record].push({
			id: team.id,
			name: team.name,
			logoUrl: team.logoUrl,
			status: "alive",
		});
	}

	const sortedKeys = Object.keys(buckets).sort((a, b) => {
		const [aW, aL] = a.split("-").map(Number);
		const [bW, bL] = b.split("-").map(Number);
		if (bW !== aW) return bW - aW;
		return aL - bL;
	});

	const sorted: Record<
		string,
		Array<{ id: number; name: string; logoUrl?: string; status: string }>
	> = {};
	for (const key of sortedKeys) {
		sorted[key] = buckets[key];
	}

	return sorted;
}

function groupMatchesByRound(input: Match[]) {
	const roundMap = new Map<number, Match[]>();

	for (const m of input) {
		const roundIdx = m.roundIndex ?? 0;
		if (!roundMap.has(roundIdx)) roundMap.set(roundIdx, []);
		roundMap.get(roundIdx)!.push(m);
	}

	return Array.from(roundMap.entries())
		.sort(([a], [b]) => a - b)
		.map(([roundIdx, roundMatches]) => ({
			roundLabel: `Round ${roundIdx + 1}`,
			matches: roundMatches.sort(
				(a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
			),
		}));
}

export function SwissStageView({
	matches,
	buckets: bucketsProp,
	groupedRounds: groupedRoundsProp,
	predictions = {},
	onUpdatePrediction,
	onRemovePrediction,
	onShowReview,
	isReadOnly = false,
	editableMatchIds,
	matchDayStatus,
	userBets,
	showPredictionScore,
}: SwissStageViewProps) {
	const { t } = useTranslation("tournament");

	const buckets = useMemo(
		() => bucketsProp ?? (matches ? computeBuckets(matches) : {}),
		[bucketsProp, matches],
	);
	const groupedRounds = useMemo(
		() => groupedRoundsProp ?? (matches ? groupMatchesByRound(matches) : []),
		[groupedRoundsProp, matches],
	);

	const isInteractive = Boolean(onUpdatePrediction);
	const hasPendingBets = Object.keys(predictions).length > 0;

	return (
		<div className="flex w-full flex-col gap-8">
			{/* Standings Buckets */}
			{Object.keys(buckets).length > 0 && (
				<section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
					{Object.entries(buckets).map(([bucket, teams]) => (
						<div key={bucket} className="border-2 border-black bg-white p-3">
							<div className="mb-2 flex items-center gap-2">
								<span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-[#ccff00] font-black text-[10px] text-black">
									{teams.length}
								</span>
								<h3 className="font-black text-black text-sm uppercase tracking-tight">
									{bucket}
								</h3>
							</div>
							<div className="flex flex-col gap-1">
								{teams.map((team) => (
									<div
										key={team.id}
										className="flex items-center gap-2 rounded-sm bg-[#f0f0f0] px-2 py-1"
									>
										<TeamLogo
											teamName={team.name}
											logoUrl={team.logoUrl}
											size="sm"
											className="h-5 w-5 shrink-0"
										/>
										<span
											className="overflow-hidden text-ellipsis font-bold text-black text-xs uppercase"
											title={team.name}
										>
											{team.name}
										</span>
									</div>
								))}
							</div>
						</div>
					))}
				</section>
			)}

			{/* Matches grouped by round */}
			<section className="flex flex-col gap-6">
				{groupedRounds.map((round) => (
					<div
						key={round.roundLabel}
						className="rounded-lg border-2 border-black bg-white p-4"
					>
						<div className="mb-3 inline-block rounded-sm border-2 border-black bg-ink px-3 py-1 font-black text-[#ccff00] text-xs uppercase tracking-wider">
							{round.roundLabel}
						</div>
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{round.matches.map((match: any) =>
								isInteractive && onUpdatePrediction ? (
									<BracketMatchCard
										key={match.id}
										match={match}
										prediction={predictions[match.id]}
										onUpdatePrediction={onUpdatePrediction}
										onRemovePrediction={onRemovePrediction}
										isReadOnly={isReadOnly}
										editableMatchIds={editableMatchIds}
										matchDayStatus={matchDayStatus}
									/>
								) : (
									<MatchCard
										key={match.id}
										match={{
											...match,
											format: "bo3",
											teamA: match.teamA,
											teamB: match.teamB,
										}}
										initialBet={userBets?.find(
											(bet: any) => bet.matchId === match.id,
										)}
										showPredictionScore={showPredictionScore}
									/>
								),
							)}
						</div>
					</div>
				))}

				{/* Review / Lock Bets button (interactive mode only) */}
				{hasPendingBets && !isReadOnly && onShowReview && (
					<div className="flex justify-center pt-2">
						<button
							onClick={onShowReview}
							className="flex items-center gap-2 border-[3px] border-black bg-[#ccff00] px-8 py-3 font-black text-black uppercase shadow-[4px_4px_0px_0px_#000] transition-all hover:shadow-[6px_6px_0px_0px_#000] active:translate-y-0.5 active:shadow-none"
						>
							<span className="material-symbols-outlined text-lg">
								rate_review
							</span>
							{t("betting:reviewBets")}
						</button>
					</div>
				)}
			</section>
		</div>
	);
}

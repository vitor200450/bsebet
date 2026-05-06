import { MatchCard } from "./MatchCard";
import { useTranslation } from "react-i18next";

export interface SwissTeamBucket {
	id: number;
	name: string;
	logoUrl?: string | null;
	status?: string;
}

interface SwissStageViewProps {
	buckets: Record<string, SwissTeamBucket[]>;
	groupedRounds: Array<{
		roundLabel: string;
		matches: any[];
	}>;
	userBets: any[];
	showPredictionScore?: boolean;
}

export function SwissStageView({
	buckets,
	groupedRounds,
	userBets,
	showPredictionScore,
}: SwissStageViewProps) {
	const { t } = useTranslation("tournament");

	return (
		<div className="flex flex-col gap-8">
			<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				{Object.entries(buckets).map(([bucket, teams]) => (
					<div
						key={bucket}
						className="border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000]"
					>
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-black text-lg uppercase italic">{bucket}</h3>
							<span className="border-2 border-black bg-[#ccff00] px-2 py-1 font-black text-[10px] uppercase text-black">
								{teams.length}
							</span>
						</div>
						<div className="flex flex-col gap-2">
							{teams.map((team) => (
								<div
									key={team.id}
									className="flex items-center justify-between border-2 border-black bg-[#f0f0f0] px-3 py-2"
								>
									<span className="font-black uppercase text-black">
										{team.name}
									</span>
									<span className="font-bold text-[10px] uppercase text-gray-600">
										{team.status
											? t(`swiss.${team.status}`, {
													defaultValue: team.status,
												})
											: bucket}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</section>
			<section className="flex flex-col gap-6">
				{groupedRounds.map((round) => (
					<div
						key={round.roundLabel}
						className="rounded-xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000]"
					>
						<h3 className="mb-4 font-black text-xl uppercase italic text-black">
							{round.roundLabel}
						</h3>
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{round.matches.map((match) => (
								<MatchCard
									key={match.id}
									match={{
										...match,
										format: "bo3",
										teamA: match.teamA,
										teamB: match.teamB,
									}}
									initialBet={userBets.find(
										(bet: any) => bet.matchId === match.id,
									)}
									showPredictionScore={showPredictionScore}
								/>
							))}
						</div>
					</div>
				))}
			</section>
		</div>
	);
}

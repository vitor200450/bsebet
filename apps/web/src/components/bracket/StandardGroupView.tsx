import { useTranslation } from "react-i18next";
import { MatchCard } from "./MatchCard";
import { StandingsTable, useStandings } from "./StandingsTable";
import type { Match, Prediction } from "./types";

interface StandardGroupViewProps {
	groupName: string;
	matches: Match[];
	predictions: Record<number, Prediction>;
	onUpdatePrediction: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	onRemovePrediction?: (matchId: number) => void;
	renderMatchCard?: (match: Match) => React.ReactNode;
	isReadOnly?: boolean;
}

export function StandardGroupView({
	groupName,
	matches,
	predictions,
	onUpdatePrediction,
	onRemovePrediction,
	renderMatchCard,
	isReadOnly = false,
}: StandardGroupViewProps) {
	const { t } = useTranslation("admin-matches");
	const standings = useStandings(matches, predictions);

	const DefaultCard = (m: Match) => (
		<MatchCard
			key={m.id}
			match={m}
			prediction={predictions[m.id]}
			onUpdatePrediction={onUpdatePrediction}
			onRemovePrediction={onRemovePrediction}
			isReadOnly={isReadOnly}
		/>
	);

	const renderCard = (m: Match) => {
		return renderMatchCard ? renderMatchCard(m) : DefaultCard(m);
	};

	return (
		<div className="flex flex-col gap-5 rounded-md border-2 border-black bg-white p-4 text-ink shadow-comic md:p-5">
			<div className="flex flex-col gap-3 border-black/10 border-b-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
				<h3 className="font-black font-display text-ink text-lg uppercase italic tracking-tight md:text-xl">
					{groupName} <span className="text-gray-400">-</span>{" "}
					{t("bracketView.roundRobin")}
				</h3>
				<div className="w-fit rounded-sm border-2 border-black bg-ink px-2 py-1 font-body font-bold text-[9px] text-electric-lime uppercase tracking-widest shadow-[1px_1px_0px_0px_#000] md:px-2.5 md:text-[10px]">
					{t("bracketView.top2Advance")}
				</div>
			</div>

			<div className="flex flex-col gap-6 md:flex-row">
				<div className="w-full min-w-0 md:w-auto md:min-w-56">
					<StandingsTable standings={standings} />
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{matches.map((m) => (
							<div key={m.id} className="w-full">
								{renderCard(m)}
							</div>
						))}
					</div>
					{matches.length === 0 && (
						<div className="rounded-md border-2 border-ink/20 border-dashed p-8 text-center">
							<p className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("bracketView.noMatches")}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

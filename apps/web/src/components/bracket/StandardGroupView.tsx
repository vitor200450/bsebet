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
		<div className="flex flex-col gap-5 rounded-lg border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000] md:p-5">
			{/* Header */}
			<div className="flex items-center justify-between border-black/10 border-b-2 pb-3">
				<h3 className="font-black font-display text-ink text-lg uppercase italic tracking-tight md:text-xl">
					{groupName} — {t("bracketView.roundRobin")}
				</h3>
				<div className="rounded-sm border-2 border-black bg-ink px-2 py-1 font-bold text-[#ccff00] text-[9px] uppercase tracking-wider shadow-[1px_1px_0px_0px_#000] md:px-2.5 md:text-[10px]">
					{t("bracketView.top2Advance")}
				</div>
			</div>

			<div className="flex flex-col gap-6 md:flex-row">
				{/* STANDINGS TABLE */}
				<div className="w-full min-w-0 md:w-auto md:min-w-56">
					<StandingsTable standings={standings} />
				</div>

				{/* MATCH LIST */}
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{matches.map((m) => (
							<div key={m.id} className="w-full">
								{renderCard(m)}
							</div>
						))}
					</div>
					{matches.length === 0 && (
						<div className="rounded border-2 border-gray-300 border-dashed p-8 text-center text-gray-400 text-sm italic">
							{t("bracketView.noMatches")}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

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
		<div className="flex flex-col gap-6 rounded-xl border-2 border-black/5 bg-white/50 p-6 shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between border-black/10 border-b-2 pb-4">
				<h3 className="font-black text-2xl text-black uppercase italic">
					{groupName} -- Round Robin
				</h3>
				<div className="bg-black px-3 py-1 font-bold text-[#ccff00] text-[10px] uppercase tracking-widest">
					Top 2 Advance
				</div>
			</div>

			<div className="flex flex-col gap-8 xl:flex-row">
				{/* STANDINGS TABLE */}
				<StandingsTable standings={standings} />

				{/* MATCH LIST */}
				<div className="flex flex-grow flex-col gap-4">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{matches.map((m) => (
							<div key={m.id} className="w-full">
								{renderCard(m)}
							</div>
						))}
					</div>
					{matches.length === 0 && (
						<div className="p-8 text-center text-gray-400 text-sm italic">
							No matches scheduled
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

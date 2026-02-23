import { useMemo } from "react";
import { MatchCard } from "./MatchCard";
import { StandingsTable, useStandings } from "./StandingsTable";
import type { Match, Prediction } from "./types";

interface GSLGroupViewProps {
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

export function GSLGroupView({
	groupName,
	matches,
	predictions,
	onUpdatePrediction,
	onRemovePrediction,
	renderMatchCard,
	isReadOnly = false,
}: GSLGroupViewProps) {
	// Sort matches by displayOrder (1-5)
	const sortedMatches = useMemo(() => {
		return [...matches].sort(
			(a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
		);
	}, [matches]);

	// Calculate Standings
	const standings = useStandings(matches, predictions);

	// Layout:
	// Left: Standings
	// Right: Match Bracket (Opening col, Winners/Elim col, Decider col)

	const openingMatches = sortedMatches.filter((m) =>
		m.name?.toLowerCase().includes("opening match"),
	);
	const winnersMatch = sortedMatches.find((m) =>
		m.name?.toLowerCase().includes("winners match"),
	);
	const elimMatch = sortedMatches.find((m) =>
		m.name?.toLowerCase().includes("elimination match"),
	);
	const deciderMatch = sortedMatches.find((m) =>
		m.name?.toLowerCase().includes("decider match"),
	);

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

	const renderCard = (m?: Match) => {
		if (!m) return <div className="h-28 w-72 opacity-0" />;
		return renderMatchCard ? renderMatchCard(m) : DefaultCard(m);
	};

	return (
		<div className="flex flex-col gap-6 rounded-xl border-2 border-black/5 bg-white/50 p-6 shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between border-black/10 border-b-2 pb-4">
				<h3 className="font-black text-2xl text-black uppercase italic">
					{groupName} -- GSL Format
				</h3>
				<div className="bg-black px-3 py-1 font-bold text-[#ccff00] text-[10px] uppercase tracking-widest">
					Top 2 Advance
				</div>
			</div>

			<div className="flex flex-col gap-8 xl:flex-row">
				{/* STANDINGS TABLE */}
				<StandingsTable standings={standings} />

				{/* BRACKET VIEW */}
				<div className="flex items-center gap-8 overflow-x-auto pb-4">
					{/* Round 1: Opening */}
					<div className="flex w-64 shrink-0 flex-col justify-center gap-6">
						<div className="mb-1 text-center font-bold text-[9px] text-gray-400 uppercase">
							Opening Matches
						</div>
						{openingMatches.map((m) => (
							<div key={m.id}>{renderCard(m)}</div>
						))}
					</div>

					{/* Connector */}
					<div className="h-full w-4 shrink-0 border-black/20 border-r-2 border-dashed" />

					{/* Round 2: Winners & Elimination */}
					<div className="flex w-64 shrink-0 flex-col justify-center gap-12">
						<div className="flex flex-col gap-2">
							<div className="mx-auto mb-1 w-max bg-black px-2 py-0.5 text-center font-bold text-[#ccff00] text-[9px] uppercase">
								Winners Match
							</div>
							{renderCard(winnersMatch)}
						</div>
						<div className="flex flex-col gap-2">
							<div className="mx-auto mb-1 w-max bg-black/5 px-2 py-0.5 text-center font-bold text-[9px] text-red-500 uppercase">
								Elimination Match
							</div>
							{renderCard(elimMatch)}
						</div>
					</div>

					{/* Connector */}
					<div className="h-full w-4 shrink-0 border-black/20 border-r-2 border-dashed" />

					{/* Round 3: Decider */}
					<div className="flex w-64 shrink-0 flex-col justify-center gap-2">
						<div className="mx-auto mb-1 w-max bg-gray-200 px-2 py-0.5 text-center font-bold text-[9px] text-black uppercase">
							Decider Match
						</div>
						{renderCard(deciderMatch)}
					</div>
				</div>
			</div>
		</div>
	);
}

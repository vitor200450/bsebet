import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation("admin-matches");
	const sortedMatches = useMemo(() => {
		return [...matches].sort(
			(a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
		);
	}, [matches]);

	const standings = useStandings(matches, predictions);

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
		if (!m) return <div className="h-28 w-64 opacity-0" />;
		return renderMatchCard ? renderMatchCard(m) : DefaultCard(m);
	};

	return (
		<div className="flex flex-col gap-5 rounded-lg border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000]">
			{/* Header */}
			<div className="flex items-center justify-between border-black/10 border-b-2 pb-3">
				<h3 className="font-black font-display text-ink text-xl uppercase italic tracking-tight">
					{groupName} — {t("bracketView.gslFormat")}
				</h3>
				<div className="rounded-sm border-2 border-black bg-ink px-2.5 py-1 font-bold text-[#ccff00] text-[10px] uppercase tracking-wider shadow-[1px_1px_0px_0px_#000]">
					{t("bracketView.top2Advance")}
				</div>
			</div>

			<div className="flex flex-col gap-6 xl:flex-row">
				{/* STANDINGS TABLE */}
				<StandingsTable standings={standings} />

				{/* BRACKET VIEW */}
				<div className="flex items-center gap-6 overflow-x-auto pb-3">
					{/* Round 1: Opening */}
					<div className="flex w-64 shrink-0 flex-col justify-center gap-5">
						<div className="mb-1 text-center font-bold text-[9px] text-gray-500 uppercase tracking-wider">
							{t("bracketView.openingMatches")}
						</div>
						{openingMatches.map((m) => (
							<div key={m.id}>{renderCard(m)}</div>
						))}
					</div>

					{/* Connector */}
					<div className="h-full w-4 shrink-0 border-black/20 border-r-2 border-dashed" />

					{/* Round 2: Winners & Elimination */}
					<div className="flex w-64 shrink-0 flex-col justify-center gap-10">
						<div className="flex flex-col gap-2">
							<div className="mx-auto mb-1 w-max rounded-sm border-2 border-black bg-ink px-2 py-0.5 text-center font-bold text-[#ccff00] text-[9px] uppercase shadow-[1px_1px_0px_0px_#000]">
								{t("bracketView.winnersMatch")}
							</div>
							{renderCard(winnersMatch)}
						</div>
						<div className="flex flex-col gap-2">
							<div className="mx-auto mb-1 w-max rounded-sm bg-brawl-red/10 px-2 py-0.5 text-center font-bold text-[9px] text-brawl-red uppercase">
								{t("bracketView.eliminationMatch")}
							</div>
							{renderCard(elimMatch)}
						</div>
					</div>

					{/* Connector */}
					<div className="h-full w-4 shrink-0 border-black/20 border-r-2 border-dashed" />

					{/* Round 3: Decider */}
					<div className="flex w-64 shrink-0 flex-col justify-center gap-2">
						<div className="mx-auto mb-1 w-max rounded-sm bg-tape px-2 py-0.5 text-center font-bold text-[9px] text-ink uppercase">
							{t("bracketView.deciderMatch")}
						</div>
						{renderCard(deciderMatch)}
					</div>
				</div>
			</div>
		</div>
	);
}

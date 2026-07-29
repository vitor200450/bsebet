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
		<div className="flex flex-col gap-5 rounded-md border-2 border-black bg-white p-4 text-ink shadow-comic sm:p-5">
			<div className="flex flex-col gap-3 border-black/10 border-b-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
				<h3 className="font-black font-display text-ink text-lg uppercase italic tracking-tight sm:text-xl">
					{groupName} <span className="text-gray-400">-</span>{" "}
					{t("bracketView.gslFormat")}
				</h3>
				<div className="w-fit rounded-sm border-2 border-black bg-ink px-2.5 py-1 font-body font-bold text-[10px] text-electric-lime uppercase tracking-widest shadow-[1px_1px_0px_0px_#000]">
					{t("bracketView.top2Advance")}
				</div>
			</div>

			<div className="flex flex-col gap-6 xl:flex-row">
				<div className="w-full min-w-0 xl:w-auto xl:min-w-56">
					<StandingsTable standings={standings} />
				</div>

				<div className="scrollbar-hide flex snap-x snap-mandatory items-center gap-4 overflow-x-auto pb-3 sm:gap-6">
					<div className="flex w-64 min-w-[16rem] shrink-0 snap-start flex-col justify-center gap-5">
						<div className="mb-1 text-center font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
							{t("bracketView.openingMatches")}
						</div>
						{openingMatches.map((m) => (
							<div key={m.id}>{renderCard(m)}</div>
						))}
					</div>

					<div className="h-full w-4 shrink-0 border-black/20 border-r-2 border-dashed" />

					<div className="flex w-64 min-w-[16rem] shrink-0 snap-start flex-col justify-center gap-10">
						<div className="flex flex-col gap-2">
							<div className="mx-auto mb-1 w-max rounded-sm border-2 border-black bg-ink px-2 py-0.5 text-center font-body font-bold text-[9px] text-electric-lime uppercase tracking-widest shadow-[1px_1px_0px_0px_#000]">
								{t("bracketView.winnersMatch")}
							</div>
							{renderCard(winnersMatch)}
						</div>
						<div className="flex flex-col gap-2">
							<div className="mx-auto mb-1 w-max rounded-sm border-2 border-black bg-brawl-red px-2 py-0.5 text-center font-body font-bold text-[9px] text-white uppercase tracking-widest">
								{t("bracketView.eliminationMatch")}
							</div>
							{renderCard(elimMatch)}
						</div>
					</div>

					<div className="h-full w-4 shrink-0 border-black/20 border-r-2 border-dashed" />

					<div className="flex w-64 min-w-[16rem] shrink-0 snap-start flex-col justify-center gap-2">
						<div className="mx-auto mb-1 w-max rounded-sm border-2 border-black bg-tape px-2 py-0.5 text-center font-body font-bold text-[9px] text-ink uppercase tracking-widest">
							{t("bracketView.deciderMatch")}
						</div>
						{renderCard(deciderMatch)}
					</div>
				</div>
			</div>
		</div>
	);
}

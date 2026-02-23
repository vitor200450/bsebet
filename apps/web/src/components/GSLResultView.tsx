import { useMemo } from "react";
import { MatchCard as BracketMatchCard } from "./bracket/MatchCard";
import { StandingsTable, useStandings } from "./bracket/StandingsTable";
import type { Match as BracketMatch } from "./bracket/types";

// Define local types to bridge the gap or just reuse bracket types if possible
// We need to map our main app Match/Team types to these for the Standings logic.

export interface GSLResultViewProps {
	groupName: string;
	matches: any[]; // Accepting the main app matches (we'll cast/map them)
	userBets?: any[]; // For initialBet prop
	showPredictionScore?: boolean;
}

export function GSLResultView({
	groupName,
	matches,
	userBets,
	showPredictionScore,
}: GSLResultViewProps) {
	// Map main app matches to BracketMatch for logic compatibility
	const bracketMatches: BracketMatch[] = useMemo(() => {
		return matches.map(
			(m) =>
				({
					id: m.id,
					label: m.label || "",
					name: m.name || m.label || "", // Use name if available, fallback to label
					displayOrder: m.displayOrder ?? 0,
					teamA: {
						id: m.teamA?.id ?? 0,
						name: m.teamA?.name ?? "TBD",
						logoUrl: m.teamA?.logoUrl,
						color: "blue", // Mock
					},
					teamB: {
						id: m.teamB?.id ?? 0,
						name: m.teamB?.name ?? "TBD",
						logoUrl: m.teamB?.logoUrl,
						color: "red", // Mock
					},
					format: m.format ?? "bo3",
					stats: {
						// Mock stats
						regionA: "",
						regionB: "",
						pointsA: 0,
						pointsB: 0,
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

	// Transform userBets for standings logic if showPredictionScore is active
	const predictionsMap = useMemo(() => {
		if (!showPredictionScore || !userBets) return {};
		const map: Record<number, any> = {};
		userBets.forEach((bet) => {
			map[bet.matchId] = {
				winnerId: bet.predictedWinnerId,
				score: `${bet.predictedScoreA} - ${bet.predictedScoreB}`,
			};
		});
		return map;
	}, [userBets, showPredictionScore]);

	// Calculate Standings (using real results + predictions if requested)
	const standings = useStandings(bracketMatches, predictionsMap);

	// Identify GSL Links
	// Logic:
	// - Opening Matches (2 matches)
	// - Winners Match (Winner of openings)
	// - Elimination Match (Loser of openings)
	// - Decider Match (Loser of Winner vs Winner of Elim)

	// We rely on string matching "Opening", "Winners", "Elimination", "Decider"
	// just like GSLGroupView.

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
	const elimMatch = findMatch([
		"elimination",
		"eliminação",
		"loser",
		"elimination",
	]);
	const deciderMatch = findMatch(["decider", "decisiva", "decisivo"]);

	// Custom Card Wrapper for Layout
	// Since our cards are huge, we might need to scale them down or use a scrolling container.
	// For GSL, layout is tree-like.
	const CardWrapper = ({ match }: { match?: any }) => {
		if (!match)
			return (
				<div className="flex h-40 w-80 items-center justify-center rounded border-2 border-black/10 border-dashed font-bold text-gray-300 text-xs uppercase opacity-20">
					TBD
				</div>
			);

		// We render the REAL MatchCard here (The one from Bracket system for consistent layout)
		const initialBet = userBets?.find((b) => b.matchId === match.id);

		return (
			<div className="w-72 origin-center transform p-4 transition-all hover:z-10 hover:scale-[1.02]">
				<BracketMatchCard
					match={{
						...match,
						teamA: match.teamA || {
							id: 0,
							name: match.labelTeamA || "TBD",
							color: "blue",
						},
						teamB: match.teamB || {
							id: 0,
							name: match.labelTeamB || "TBD",
							color: "red",
						},
					}}
					prediction={
						initialBet
							? {
									winnerId: initialBet.predictedWinnerId ?? 0,
									score: `${initialBet.predictedScoreA} - ${initialBet.predictedScoreB}`,
									pointsEarned: initialBet.pointsEarned,
									isCorrect: match.winnerId === initialBet.predictedWinnerId,
									isUnderdogPick: initialBet.isUnderdogPick,
									isPerfectPick:
										match.scoreA === initialBet.predictedScoreA &&
										match.scoreB === initialBet.predictedScoreB,
								}
							: undefined
					}
					onUpdatePrediction={() => {}}
					isReadOnly={true}
				/>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6 rounded-3xl border-4 border-black/5 bg-white/40 p-4 shadow-inner backdrop-blur-sm md:p-6">
			{/* Header */}
			<div className="flex flex-col items-center justify-between gap-4 border-black/10 border-b-4 pb-6 md:flex-row">
				<h3 className="font-black text-4xl text-black uppercase italic drop-shadow-sm">
					{groupName}
				</h3>
				<div className="flex items-center gap-2">
					<div className="rotate-2 border border-transparent bg-black px-4 py-1.5 font-black text-[#ccff00] text-xs uppercase tracking-widest shadow-sm">
						GSL Format
					</div>
					<div className="-rotate-2 border-2 border-black bg-white px-4 py-1.5 font-black text-black text-xs uppercase tracking-widest shadow-sm">
						Top 2 Advance
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-8 xl:flex-row">
				{/* STANDINGS TABLE - Left Side */}
				<div className="xl:min-w-[400px]">
					<h4 className="mb-4 font-black text-black/80 text-xl uppercase italic">
						Standings
					</h4>
					<StandingsTable standings={standings} />
				</div>

				{/* BRACKET VIEW - Right Side (Scrollable) */}
				<div className="flex-1 overflow-x-auto pb-8">
					<div className="flex min-w-max items-center gap-16 pt-8">
						{/* Round 1: Opening */}
						<div className="flex flex-col justify-center gap-8">
							<div className="relative text-center">
								<span className="mb-4 inline-block -skew-x-12 bg-black px-3 py-1 font-black text-sm text-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
									Opening Matches
								</span>
							</div>
							{openingMatches.map((m) => (
								<CardWrapper key={m.id} match={m} />
							))}
						</div>

						{/* Connector 1 */}
						<div className="flex h-full flex-col justify-around py-20 opacity-30">
							<span className="material-symbols-outlined text-4xl">
								chevron_right
							</span>
						</div>

						{/* Round 2: Winners & Elimination */}
						<div className="flex flex-col justify-center gap-16">
							<div className="flex flex-col gap-4">
								<div className="text-center">
									<span className="inline-block border-2 border-black bg-[#ccff00] px-3 py-1 font-black text-black text-xs uppercase shadow-sm">
										Winners Match
									</span>
								</div>
								<CardWrapper match={winnersMatch} />
							</div>

							<div className="flex flex-col gap-4">
								<div className="text-center">
									<span className="inline-block border-2 border-black bg-brawl-red px-3 py-1 font-black text-white text-xs uppercase shadow-sm">
										Elimination Match
									</span>
								</div>
								<CardWrapper match={elimMatch} />
							</div>
						</div>

						{/* Connector 2 */}
						<div className="flex h-full flex-col justify-center opacity-30">
							<span className="material-symbols-outlined text-4xl">
								chevron_right
							</span>
						</div>

						{/* Round 3: Decider */}
						<div className="flex flex-col justify-center gap-4">
							<div className="text-center">
								<span className="inline-block border-2 border-black bg-gray-200 px-3 py-1 font-black text-black text-xs uppercase shadow-sm">
									Decider Match
								</span>
							</div>
							<CardWrapper match={deciderMatch} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

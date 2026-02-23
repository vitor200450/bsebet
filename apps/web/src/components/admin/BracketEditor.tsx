import { clsx } from "clsx";
import { Plus, Zap } from "lucide-react";
import { useMemo } from "react";
import { GSLGroupView } from "../bracket/GSLGroupView";
import { StandardGroupView } from "../bracket/StandardGroupView";
import type { Match } from "../bracket/types";

const MATCH_HEIGHT = 125;

// Abbreviate long team labels for bracket display
function abbreviateLabel(label: string | null | undefined): string {
	if (!label) return "TBD";

	// Light abbreviations - keep it readable
	const abbreviations: Record<string, string> = {
		Bracket: "",
		Upper: "UB",
		Lower: "LB",
	};

	let result = label;
	for (const [full, abbr] of Object.entries(abbreviations)) {
		result = result.replace(new RegExp(full, "gi"), abbr);
	}

	// Clean up extra spaces
	result = result.replace(/\s+/g, " ").trim();

	// If still too long (>20 chars), truncate
	if (result.length > 20) {
		result = result.slice(0, 18) + "…";
	}

	return result;
}

interface BracketEditorProps {
	matches: Match[];
	onEditMatch?: (match: Match) => void;
	onUpdateMatch?: (
		matchId: number,
		data: { roundIndex: number; bracketSide: string },
	) => void;
	onCreateMatch: (data: {
		roundIndex: number;
		bracketSide: string;
		label: string;
	}) => void;
	onGenerateNextRound?: (roundIndex: number, side: string) => void;
	onGenerateFullBracket?: (roundIndex: number, side: string) => void;
	stageType?: string;
}

export function BracketEditor({
	matches,
	onEditMatch,
	onCreateMatch,
	onGenerateFullBracket,
	stageType = "Double Elimination",
}: BracketEditorProps) {
	// Group matches by Side > Round
	const { upper, lower, final, bracketType } = useMemo(() => {
		const upp: Record<number, Match[]> = {};
		const low: Record<number, Match[]> = {};
		const fin: Match[] = [];

		matches.forEach((m) => {
			// Use the explicit DB fields if available, otherwise fallback (or ignore)
			const side = (m as any).bracketSide || "upper";
			const round = (m as any).roundIndex ?? 0;

			if (side === "grand_final") {
				fin.push(m);
			} else if (side === "lower") {
				if (!low[round]) low[round] = [];
				low[round].push(m);
			} else if (side === "groups") {
				// Do nothing, handled separately in the Groups column
			} else {
				if (!upp[round]) upp[round] = [];
				upp[round].push(m);
			}
		});

		// Sort matches in each round by displayOrder
		const sortMatches = (a: Match, b: Match) => {
			const orderA = (a as any).displayOrder ?? 999;
			const orderB = (b as any).displayOrder ?? 999;
			return orderA - orderB || a.id - b.id;
		};

		Object.values(upp).forEach((roundMatches) =>
			roundMatches.sort(sortMatches),
		);
		Object.values(low).forEach((roundMatches) =>
			roundMatches.sort(sortMatches),
		);
		fin.sort(sortMatches);

		return {
			upper: upp,
			lower: low,
			final: fin,
			bracketType: matches.some((m) => m.bracketSide === "groups")
				? "groups"
				: "elimination",
		};
	}, [matches]);

	const getRoundTitle = (side: "upper" | "lower", idx: number): string => {
		const isDouble = stageType === "Double Elimination";

		if (side === "upper") {
			if (!isDouble) {
				return (
					["Quarter-Finals", "Semi-Finals", "Final"][idx] || `Round ${idx + 1}`
				);
			}
			return (
				["Quarter-Finals", "Semi-Finals", "UB Final"][idx] || `UB R${idx + 1}`
			);
		}
		return ["LB R1", "LB R2", "LB Semi", "LB Final"][idx] || `LB R${idx + 1}`;
	};

	// Extract round indices
	const upperRounds = Object.keys(upper)
		.map(Number)
		.sort((a, b) => a - b);
	const lowerRounds = Object.keys(lower)
		.map(Number)
		.sort((a, b) => a - b);

	return (
		<div className="min-h-[600px] overflow-x-auto overflow-y-visible">
			{/* GLOBAL ACTIONS BAR */}
			<div className="mb-8 flex items-center justify-between rounded-lg border-2 border-black/10 border-dashed bg-white/50 p-4">
				<div className="flex flex-col">
					<h2 className="font-black text-3xl text-black uppercase italic">
						Bracket Editor
					</h2>
					<p className="font-bold text-[10px] text-black/40 uppercase">
						Tournament Structure Management
					</p>
				</div>

				<div className="flex items-center gap-4">
					{onGenerateFullBracket && (
						<button
							onClick={() => onGenerateFullBracket(0, "upper")}
							className="group relative flex items-center gap-2 border-4 border-black bg-[#ccff00] px-6 py-2 font-black text-black text-sm uppercase italic shadow-[4px_4px_0px_0px_#000] transition-colors hover:bg-black hover:text-[#ccff00] active:translate-y-1 active:shadow-none"
						>
							<Zap className="h-5 w-5 group-hover:animate-pulse" />
							{bracketType === "groups"
								? "Generate Group Matches"
								: "Generate Entire Bracket"}
						</button>
					)}
				</div>
			</div>

			<div className="flex min-w-max items-center gap-16 px-4">
				{/* GROUPS COLUMN */}
				{bracketType === "groups" && (
					<div className="flex w-full flex-col gap-12">
						{Object.entries(
							matches.reduce(
								(acc, m) => {
									// Group by Label (e.g. "Group A")
									const groupName = m.label || "Unknown Group";
									if (!acc[groupName]) acc[groupName] = [];
									acc[groupName].push(m);
									return acc;
								},
								{} as Record<string, Match[]>,
							),
						)
							.sort(([groupNameA], [groupNameB]) =>
								groupNameA.localeCompare(groupNameB),
							)
							.map(([groupName, groupMatches]) => {
								// DETECT FORMAT: GSL vs Round Robin
								const isGSL =
									groupMatches.length === 5 &&
									groupMatches.some((m) => m.name?.includes("Opening"));

								if (isGSL) {
									return (
										<GSLGroupView
											key={groupName}
											groupName={groupName}
											matches={groupMatches}
											predictions={{}}
											onUpdatePrediction={() => {}}
											renderMatchCard={(m) => (
												<EditorMatchCard
													match={m}
													onClick={() => onEditMatch?.(m)}
												/>
											)}
										/>
									);
								}

								return (
									<StandardGroupView
										key={groupName}
										groupName={groupName}
										matches={groupMatches}
										predictions={{}}
										onUpdatePrediction={() => {}}
										renderMatchCard={(m) => (
											<EditorMatchCard
												match={m}
												onClick={() => onEditMatch?.(m)}
											/>
										)}
									/>
								);
							})}
					</div>
				)}

				{/* LEFT COLUMN (UPPER + LOWER) */}
				{(Object.keys(upper).length > 0 ||
					Object.keys(lower).length > 0 ||
					final.length > 0) && (
					<div className="flex flex-col gap-12">
						{/* UPPER BRACKET + GRAND FINAL */}
						<div className="flex flex-col gap-4">
							{stageType === "Double Elimination" && (
								<div className="relative mb-4 h-8">
									<div className="absolute top-0 left-0 z-10 -skew-x-12 transform border-2 border-white bg-black px-4 py-1.5 font-black text-white text-xs uppercase italic tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
										UPPER BRACKET
									</div>
								</div>
							)}
							<div className="flex items-stretch gap-6 text-black">
								{upperRounds.map((roundIdx) => (
									<div
										key={`upper-${roundIdx}`}
										className="flex flex-col gap-2"
									>
										<div className="h-4 text-center font-bold text-[9px] text-gray-500 uppercase tracking-wider">
											{getRoundTitle("upper", roundIdx)}
										</div>
										<div className="flex h-full flex-col justify-around gap-4">
											{/* Render matches for this round */}
											{(upper[roundIdx] || []).map((match) => (
												<div key={match.id} className="w-64">
													<EditorMatchCard
														match={match}
														onClick={() => onEditMatch?.(match)}
													/>
												</div>
											))}
											{/* Add Match Button if empty (optional, keeping minimal as per request) */}
											{(upper[roundIdx] || []).length === 0 && (
												<div className="w-64">
													<AddMatchButton
														onClick={() =>
															onCreateMatch({
																roundIndex: roundIdx,
																bracketSide: "upper",
																label: "New Match",
															})
														}
													/>
												</div>
											)}
										</div>
									</div>
								))}

								{/* GRAND FINAL Appended */}
								{(stageType === "Double Elimination" || final.length > 0) && (
									<div className="flex flex-col gap-2">
										<div className="h-4 text-center font-bold text-[9px] text-gray-500 uppercase tracking-wider">
											GRAND FINAL
										</div>
										<div className="flex h-full flex-col justify-around gap-4">
											{(final || []).map((match) => (
												<div key={match.id} className="w-64">
													<EditorMatchCard
														match={match}
														onClick={() => onEditMatch?.(match)}
													/>
												</div>
											))}
											{final.length === 0 && (
												<div className="w-64">
													<AddMatchButton
														onClick={() =>
															onCreateMatch({
																roundIndex: 0,
																bracketSide: "grand_final",
																label: "Grand Final",
															})
														}
													/>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						</div>

						{/* LOWER BRACKET */}
						{lowerRounds.length > 0 && (
							<div className="relative border-black/10 border-t-[3px] border-dashed pt-8">
								<div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
									<div className="-skew-x-12 transform border-2 border-white bg-black px-4 py-1.5 font-black text-white text-xs uppercase italic tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
										LOWER BRACKET
									</div>
								</div>
								<div className="flex items-stretch gap-6">
									{lowerRounds.map((roundIdx) => (
										<div
											key={`lower-${roundIdx}`}
											className="flex flex-col gap-2"
										>
											<div className="text-center font-bold text-[9px] text-gray-500 uppercase tracking-wider">
												{getRoundTitle("lower", roundIdx)}
											</div>
											<div className="flex h-full flex-col justify-around gap-4">
												{(lower[roundIdx] || []).map((match) => (
													<div key={match.id} className="w-64">
														<EditorMatchCard
															match={match}
															onClick={() => onEditMatch?.(match)}
														/>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function AddMatchButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className="group flex h-10 w-full items-center justify-center rounded border-2 border-black/10 border-dashed bg-gray-50/10 transition-all hover:border-black hover:bg-white"
		>
			<div className="flex items-center gap-2 font-bold text-[9px] text-black/20 uppercase group-hover:text-black">
				<Plus className="h-3 w-3" /> Add Match
			</div>
		</button>
	);
}

function EditorMatchCard({
	match,
	onClick,
}: {
	match: Match;
	onClick?: () => void;
}) {
	return (
		<div
			onClick={onClick}
			style={{ minHeight: MATCH_HEIGHT }}
			className={clsx(
				"group relative flex w-full cursor-pointer flex-col border-[2px] border-black bg-white p-1.5 pt-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5",
			)}
		>
			{/* Status Badges */}
			{match.status === "live" && (
				<div className="absolute -top-2 -right-1 z-20 animate-pulse border-2 border-black bg-red-500 px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
					LIVE
				</div>
			)}
			{match.status === "finished" && (
				<div className="absolute -top-2 -right-1 z-20 border-2 border-black bg-black px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
					FINAL
				</div>
			)}

			{/* HEADER - Strict top-alignment for baseline consistency */}
			<div className="relative -mx-1.5 -mt-1.5 mb-1 box-border flex min-h-7 flex-shrink-0 flex-col justify-center gap-0.5 border-black border-b-2 bg-gray-50/50 px-1.5 py-0.5 pr-10">
				<div className="flex w-full items-center justify-between">
					<div className="min-w-0 flex-grow pr-1">
						<span className="line-clamp-2 block text-left font-black text-[10px] text-black uppercase italic leading-tight antialiased">
							{match.name || match.label}
						</span>
					</div>
					<span className="flex-shrink-0 font-bold font-mono text-[9px] text-gray-400">
						#{match.displayOrder ?? "-"}
					</span>
				</div>
				{match.startTime && (
					<div className="font-bold text-[7px] text-gray-600">
						📅{" "}
						{new Date(match.startTime).toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
						})}{" "}
						•{" "}
						{new Date(match.startTime).toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				)}
			</div>

			{/* TEAMS AREA - Proportional grid for better breathing room */}
			<div className="flex flex-grow flex-col justify-center gap-1 pb-0.5">
				{/* TEAM A */}
				<div className="grid h-9 grid-cols-[2rem_1fr_1.75rem] items-center overflow-hidden border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
					<div className="flex h-full items-center justify-center border-black border-r-2 bg-gray-100 p-0.5">
						{match.teamA?.logoUrl ? (
							<img
								src={match.teamA.logoUrl}
								alt=""
								className="h-6 w-6 object-contain"
							/>
						) : (
							<div className="h-5 w-5 rounded-full border border-black/5 bg-black/5" />
						)}
					</div>
					<div className="flex h-full items-center overflow-hidden px-1.5">
						<span className="block w-full truncate text-left font-black text-[10px] text-black uppercase leading-none tracking-tighter">
							{match.teamA?.name || abbreviateLabel(match.labelTeamA)}
						</span>
					</div>
					<div className="flex h-full items-center justify-center border-black border-l-2 bg-black font-black text-[#ccff00] text-[11px] italic">
						{(match as any).scoreA ?? match.stats?.pointsA ?? "0"}
					</div>
				</div>

				{/* TEAM B */}
				<div className="grid h-9 grid-cols-[2rem_1fr_1.75rem] items-center overflow-hidden border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
					<div className="flex h-full items-center justify-center border-black border-r-2 bg-gray-100 p-0.5">
						{match.teamB?.logoUrl ? (
							<img
								src={match.teamB.logoUrl}
								alt=""
								className="h-6 w-6 object-contain"
							/>
						) : (
							<div className="h-5 w-5 rounded-full border border-black/5 bg-black/5" />
						)}
					</div>
					<div className="flex h-full items-center overflow-hidden px-1.5">
						<span className="block w-full truncate text-left font-black text-[10px] text-black uppercase leading-none tracking-tighter">
							{match.teamB?.name || abbreviateLabel(match.labelTeamB)}
						</span>
					</div>
					<div className="flex h-full items-center justify-center border-black border-l-2 bg-black font-black text-[#ccff00] text-[11px] italic">
						{(match as any).scoreB ?? match.stats?.pointsB ?? "0"}
					</div>
				</div>
			</div>

			<div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
				{/* Edit actions could go here */}
			</div>
		</div>
	);
}

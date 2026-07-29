import { clsx } from "clsx";
import { Plus, Zap } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MatchSchedulePills } from "@/components/admin/MatchSchedulePills";
import { GSLGroupView } from "../bracket/GSLGroupView";
import { StandardGroupView } from "../bracket/StandardGroupView";
import type { Match } from "../bracket/types";

const MATCH_HEIGHT = 132;

// Abbreviate long team labels for bracket display
function abbreviateLabel(label: string | null | undefined): string {
	if (!label) return "";

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
	const { t } = useTranslation("admin-matches");
	// Group matches by Side > Round
	const { upper, lower, final, thirdPlace, bracketType } = useMemo(() => {
		const upp: Record<number, Match[]> = {};
		const low: Record<number, Match[]> = {};
		const fin: Match[] = [];
		const tp: Match[] = [];

		matches.forEach((m) => {
			// Use the explicit DB fields if available, otherwise fallback (or ignore)
			const side = (m as any).bracketSide || "upper";
			const round = (m as any).roundIndex ?? 0;

			if (side === "grand_final") {
				fin.push(m);
			} else if (side === "third_place") {
				tp.push(m);
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
			thirdPlace: tp,
			bracketType: matches.some((m) => m.bracketSide === "groups")
				? "groups"
				: "elimination",
		};
	}, [matches]);

	const getRoundTitle = (side: "upper" | "lower", idx: number): string => {
		const isDouble = stageType === "Double Elimination";
		const roundLabels = [
			t("bracketEditor.quarterFinals"),
			t("bracketEditor.semiFinals"),
			t("bracketEditor.final"),
		];
		const ubLabels = [
			t("bracketEditor.quarterFinals"),
			t("bracketEditor.semiFinals"),
			t("bracketEditor.ubFinal"),
		];
		const lbLabels = [
			t("bracketEditor.lbR1"),
			t("bracketEditor.lbR2"),
			t("bracketEditor.lbSemi"),
			t("bracketEditor.lbFinal"),
		];

		if (side === "upper") {
			if (!isDouble) {
				return roundLabels[idx] || `${t("bracketEditor.round")} ${idx + 1}`;
			}
			return ubLabels[idx] || t("bracketEditor.ubRound", { round: idx + 1 });
		}
		return lbLabels[idx] || t("bracketEditor.lbRound", { round: idx + 1 });
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
			<div className="mb-8 border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<h2 className="font-black font-display text-2xl text-black uppercase italic">
							{t("bracketEditor.title")}
						</h2>
						<p className="mt-1 font-body font-bold text-gray-500 text-sm tracking-wide">
							{t("bracketEditor.subtitle")}
						</p>
					</div>

					{onGenerateFullBracket && (
						<button
							type="button"
							onClick={() => onGenerateFullBracket(0, "upper")}
							className="admin-press-comic group flex w-full shrink-0 items-center justify-center gap-2 border-[3px] border-black bg-electric-lime px-6 py-2 font-black font-display text-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-electric-lime sm:w-auto"
						>
							<Zap
								className="h-5 w-5 motion-safe:group-hover:animate-pulse"
								strokeWidth={2.5}
							/>
							{bracketType === "groups"
								? t("bracketEditor.generateGroups")
								: t("bracketEditor.generateBracket")}
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
									const groupName = m.label || t("bracketEditor.unknownGroup");
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
										{t("bracketEditor.upperBracket")}
									</div>
								</div>
							)}
							<div className="flex items-stretch gap-6 text-black">
								{upperRounds.map((roundIdx) => (
									<div
										key={`upper-${roundIdx}`}
										className="flex flex-col gap-2"
									>
										<div className="h-4 text-center font-body font-bold text-[9px] text-gray-500 uppercase tracking-wider">
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
														label={t("bracketEditor.addMatch")}
														onClick={() =>
															onCreateMatch({
																roundIndex: roundIdx,
																bracketSide: "upper",
																label: t("bracketEditor.newMatch"),
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
										<div className="h-4 text-center font-body font-bold text-[9px] text-gray-500 uppercase tracking-wider">
											{t("bracketEditor.grandFinal")}
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
														label={t("bracketEditor.addMatch")}
														onClick={() =>
															onCreateMatch({
																roundIndex: 0,
																bracketSide: "grand_final",
																label: t("bracketEditor.grandFinal"),
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

						{/* THIRD PLACE — small, less prominent */}
						{thirdPlace.length > 0 && (
							<div className="relative mt-6 border-black/5 border-t pt-5">
								<div className="mx-auto flex max-w-xs flex-col items-center gap-3">
									<span className="rounded-sm border border-black/20 bg-white px-2 py-0.5 font-body font-bold text-[9px] text-gray-400 uppercase tracking-wider">
										{t("bracketEditor.thirdPlace")}
									</span>
									{thirdPlace.map((match) => (
										<div key={match.id} className="w-64">
											<EditorMatchCard
												match={match}
												onClick={() => onEditMatch?.(match)}
											/>
										</div>
									))}
								</div>
							</div>
						)}

						{/* LOWER BRACKET */}
						{lowerRounds.length > 0 && (
							<div className="relative border-black/10 border-t-[3px] border-dashed pt-8">
								<div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
									<div className="-skew-x-12 transform border-2 border-white bg-black px-4 py-1.5 font-black text-white text-xs uppercase italic tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
										{t("bracketEditor.lowerBracket")}
									</div>
								</div>
								<div className="flex items-stretch gap-6">
									{lowerRounds.map((roundIdx) => (
										<div
											key={`lower-${roundIdx}`}
											className="flex flex-col gap-2"
										>
											<div className="text-center font-body font-bold text-[9px] text-gray-500 uppercase tracking-wider">
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

function AddMatchButton({
	onClick,
	label,
}: {
	onClick: () => void;
	label?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="admin-card-interactive admin-dashed-add group flex h-10 w-full items-center justify-center border-2 border-black/10 border-dashed bg-gray-50/10"
		>
			<div className="admin-dashed-add-label flex items-center gap-2 font-body font-bold text-[9px] text-black/20 uppercase tracking-widest">
				<Plus className="h-3 w-3" /> {label}
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
	const { t, i18n } = useTranslation("admin-matches");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const isWalkover = match.status === "finished" && match.resultType === "wo";
	const isFinished = match.status === "finished";
	const walkoverScore = (() => {
		if (!isWalkover) return { a: null, b: null };

		if (match.winnerId && match.teamA?.id && match.teamB?.id) {
			return {
				a: match.winnerId === match.teamA.id ? "W" : "FF",
				b: match.winnerId === match.teamB.id ? "W" : "FF",
			};
		}

		if ((match.scoreA ?? 0) !== (match.scoreB ?? 0)) {
			return {
				a: (match.scoreA ?? 0) > (match.scoreB ?? 0) ? "W" : "FF",
				b: (match.scoreB ?? 0) > (match.scoreA ?? 0) ? "W" : "FF",
			};
		}

		if (match.teamAPreviousMatchId && !match.teamBPreviousMatchId) {
			return { a: "W", b: "FF" };
		}

		if (!match.teamAPreviousMatchId && match.teamBPreviousMatchId) {
			return { a: "FF", b: "W" };
		}

		if (!match.teamA?.id && match.teamB?.id) {
			return { a: "W", b: "FF" };
		}

		if (match.teamA?.id && !match.teamB?.id) {
			return { a: "FF", b: "W" };
		}

		return { a: "FF", b: "FF" };
	})();
	const teamAWon =
		isFinished &&
		(walkoverScore.a === "W" ||
			(match.winnerId != null && match.winnerId === match.teamA?.id));
	const teamBWon =
		isFinished &&
		(walkoverScore.b === "W" ||
			(match.winnerId != null && match.winnerId === match.teamB?.id));

	const scoreCellClass = (isWinner: boolean) =>
		clsx(
			"flex h-full items-center justify-center border-black border-l-2 font-black text-[11px] italic tabular-nums",
			isFinished && isWinner
				? "bg-black text-electric-lime"
				: isFinished
					? "bg-gray-200 text-gray-400"
					: "bg-gray-100 text-gray-300",
		);

	return (
		<div
			onClick={onClick}
			style={{ minHeight: MATCH_HEIGHT }}
			className="admin-card-interactive admin-card-lift-hover admin-bracket-card group relative flex w-full cursor-pointer flex-col border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
		>
			{match.status === "live" && (
				<div className="absolute -top-2 -right-1 z-20 border-2 border-black bg-brawl-red px-1.5 py-0.5 font-body font-bold text-[8px] text-white uppercase tracking-widest shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] motion-safe:animate-pulse">
					{t("bracketEditor.badgeLive")}
				</div>
			)}
			{match.status === "finished" && (
				<div className="absolute -top-2 -right-1 z-20 border-2 border-black bg-black px-1.5 py-0.5 font-body font-bold text-[8px] text-white uppercase tracking-widest shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
					{t("bracketEditor.badgeFinal")}
				</div>
			)}
			{isWalkover && (
				<div className="absolute top-7 -right-1 z-20 border-2 border-black bg-brawl-red px-1.5 py-0.5 font-body font-bold text-[8px] text-white uppercase tracking-widest shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
					{t("bracketEditor.badgeWO")}
				</div>
			)}

			<div className="flex flex-shrink-0 flex-col gap-1.5 border-black border-b-[3px] bg-gray-50 px-2 py-1.5">
				<div className="flex items-start justify-between gap-2">
					<span className="line-clamp-2 min-w-0 flex-1 text-left font-black font-display text-[10px] text-black uppercase italic leading-[1.15]">
						{match.name || match.label}
					</span>
					<span className="shrink-0 font-body font-bold text-[9px] text-gray-400 uppercase tabular-nums tracking-widest">
						#{match.displayOrder ?? "-"}
					</span>
				</div>

				<MatchSchedulePills startTime={match.startTime} locale={locale} />
			</div>

			<div className="flex flex-grow flex-col justify-center gap-1.5 p-1.5">
				<div className="grid h-9 grid-cols-[2rem_1fr_1.75rem] items-center overflow-hidden border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
					<div className="flex h-full items-center justify-center border-black border-r-2 bg-gray-100 p-0.5">
						{match.teamA?.logoUrl ? (
							<img
								src={match.teamA.logoUrl}
								alt=""
								className="h-6 w-6 object-contain"
							/>
						) : (
							<div className="h-5 w-5 border border-black/10 bg-black/5" />
						)}
					</div>
					<div className="flex h-full min-w-0 items-center px-1.5">
						<span className="block w-full truncate pr-0.5 text-left font-black font-display text-[10px] text-black uppercase italic leading-[1.15] tracking-tighter">
							{match.teamA?.name || abbreviateLabel(match.labelTeamA)}
						</span>
					</div>
					<div className={scoreCellClass(teamAWon)}>
						{walkoverScore.a ?? match.scoreA ?? match.stats?.pointsA ?? "-"}
					</div>
				</div>

				<div className="grid h-9 grid-cols-[2rem_1fr_1.75rem] items-center overflow-hidden border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
					<div className="flex h-full items-center justify-center border-black border-r-2 bg-gray-100 p-0.5">
						{match.teamB?.logoUrl ? (
							<img
								src={match.teamB.logoUrl}
								alt=""
								className="h-6 w-6 object-contain"
							/>
						) : (
							<div className="h-5 w-5 border border-black/10 bg-black/5" />
						)}
					</div>
					<div className="flex h-full min-w-0 items-center px-1.5">
						<span className="block w-full truncate pr-0.5 text-left font-black font-display text-[10px] text-black uppercase italic leading-[1.15] tracking-tighter">
							{match.teamB?.name || abbreviateLabel(match.labelTeamB)}
						</span>
					</div>
					<div className={scoreCellClass(teamBWon)}>
						{walkoverScore.b ?? match.scoreB ?? match.stats?.pointsB ?? "-"}
					</div>
				</div>
			</div>
		</div>
	);
}

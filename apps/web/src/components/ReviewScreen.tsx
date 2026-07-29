import { useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BetSplitBar } from "@/components/BetSplitBar";
import {
	SpraySplat,
	TapeLabel,
	TournamentLogoSticker,
} from "@/components/betting/BettingDecor";
import type { Match, Prediction } from "@/components/bracket/types";
import { InlineLoader } from "@/components/inline-loader";
import { PublicPageShell } from "@/components/PublicPageShell";
import { ReviewMatchCard } from "@/components/ReviewMatchCard";
import { useLangLink } from "@/i18n/useLangLink";
import { queryClient } from "@/router";
import type { BetStats } from "@/server/bets";
import {
	canReturnToBetting,
	getSubmittableBetPayloads,
	toSubmittableMatchRows,
} from "@/utils/bet-submission";
import { formatScoreDisplay } from "@/utils/score-format";

export function ReviewScreen({
	matches,
	predictions,
	onUpdatePrediction,
	onBack,
	isReadOnly = false,
	tournamentId,
	userId,
	userBets = [],
	setSelectedMatchDayId,
	setShowReview,
	setPredictions,
	setSelectedTournamentId,
	matchDayStatus,
	onLockRecoveryMatch,
	stalePredictionMatchIds = new Set<number>(),
	projectedMatches = [],
	editableRecoveryMatchIds = new Set<number>(),
	canReturnToBetting = true,
}: {
	matches: any[];
	predictions: Record<number, Prediction>;
	onUpdatePrediction: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	onBack: () => void;
	isReadOnly?: boolean;
	tournamentId: number;
	userId: string;
	userBets?: any[];
	setSelectedMatchDayId?: (id: number | null) => void;
	setShowReview?: (show: boolean) => void;
	setPredictions?: React.Dispatch<
		React.SetStateAction<Record<number, Prediction>>
	>;
	setSelectedTournamentId?: (id: number | null) => void;
	matchDayStatus?: string;
	onLockRecoveryMatch?: (matchId: number) => void;
	stalePredictionMatchIds?: Set<number>;
	projectedMatches?: any[];
	editableRecoveryMatchIds?: Set<number>;
	canReturnToBetting?: boolean;
}) {
	const { t, i18n } = useTranslation("betting");
	const reduceMotion = useReducedMotion();
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const [editingScoreMatchId, setEditingScoreMatchId] = useState<number | null>(
		null,
	);
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
	const [matchBetStats, setMatchBetStats] = useState<Record<number, BetStats>>(
		{},
	);

	useEffect(() => {
		const matchIds = matches
			.map((m: any) => m.id)
			.filter((id: number) => id > 0);
		if (matchIds.length === 0) return;

		let cancelled = false;

		(async () => {
			try {
				const { getMatchBetStats } = await import("@/server/bets");
				const results = await Promise.all(
					matchIds.map((id: number) =>
						getMatchBetStats({ data: { matchId: id } }),
					),
				);
				if (cancelled) return;
				const statsMap: Record<number, BetStats> = {};
				matchIds.forEach((id: number, i: number) => {
					if (results[i]) statsMap[id] = results[i];
				});
				setMatchBetStats(statsMap);
			} catch {
				// non-fatal — bars simply won't appear
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [matches]);

	const effectiveStaleIds = useMemo(
		() => stalePredictionMatchIds || new Set<number>(),
		[stalePredictionMatchIds],
	);
	const effectiveProjectedMatches = useMemo(() => {
		const source = projectedMatches?.length ? projectedMatches : matches;
		const allowedMatchIds = new Set(matches.map((m: any) => Number(m.id)));
		return source.filter((m: any) => allowedMatchIds.has(Number(m.id)));
	}, [projectedMatches, matches]);
	const effectiveEditableIds = useMemo(
		() => editableRecoveryMatchIds || new Set<number>(),
		[editableRecoveryMatchIds],
	);

	const hasValidBetsToSubmit = useMemo(() => {
		return (
			getSubmittableBetPayloads({
				predictions,
				matches: toSubmittableMatchRows(matches),
				userBets,
				matchDayStatus,
				stalePredictionMatchIds: effectiveStaleIds,
				editableRecoveryMatchIds: effectiveEditableIds,
			}).length > 0
		);
	}, [
		predictions,
		matches,
		effectiveStaleIds,
		effectiveEditableIds,
		userBets,
		matchDayStatus,
	]);

	const matchesToDisplay = useMemo(() => {
		return effectiveProjectedMatches
			.filter(
				(match: any) =>
					isReadOnly ||
					predictions[match.id] ||
					match.status === "finished" ||
					match.status === "live" ||
					effectiveStaleIds.has(match.id) ||
					(matchDayStatus === "locked" &&
						match.status === "scheduled" &&
						match.teamA?.id &&
						match.teamB?.id),
			)
			.sort((a: any, b: any) => {
				const roundA = a.roundIndex ?? 0;
				const roundB = b.roundIndex ?? 0;
				if (roundA !== roundB) return roundA - roundB;

				return (a.displayOrder || 0) - (b.displayOrder || 0);
			});
	}, [
		effectiveProjectedMatches,
		predictions,
		isReadOnly,
		effectiveStaleIds,
		matchDayStatus,
	]);

	const matchIdsInDisplay = useMemo(() => {
		return new Set(matchesToDisplay.map((m: any) => m.id));
	}, [matchesToDisplay]);

	const filteredUserBets = useMemo(() => {
		return userBets.filter((bet: any) => matchIdsInDisplay.has(bet.matchId));
	}, [userBets, matchIdsInDisplay]);

	const totalPoints = useMemo(() => {
		return filteredUserBets.reduce(
			(sum, bet) => sum + (bet.pointsEarned || 0),
			0,
		);
	}, [filteredUserBets]);

	const stats = useMemo(() => {
		const finished = matchesToDisplay.filter(
			(m: any) => m.status === "finished",
		);
		const withBets = finished.filter((m: any) =>
			filteredUserBets.find((b: any) => b.matchId === m.id),
		);
		const correct = withBets.filter((m: any) => {
			const bet = filteredUserBets.find((b: any) => b.matchId === m.id);
			return bet && m.winnerId === bet.predictedWinnerId;
		});
		const perfectPicks = filteredUserBets.filter((b) => b.isPerfectPick).length;
		const underdogPicks = filteredUserBets.filter(
			(b) => b.isUnderdogPick && b.pointsEarned > 0,
		).length;

		return {
			total: withBets.length,
			correct: correct.length,
			perfectPicks,
			underdogPicks,
		};
	}, [matchesToDisplay, filteredUserBets]);

	return (
		<>
			<PublicPageShell className="fade-in slide-in-from-bottom-5 flex w-full animate-in flex-col p-4 pb-32 duration-300 md:p-6">
				<div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center">
					{/* Soft spray atmosphere behind header */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -top-8 left-1/2 z-0 h-40 w-[120%] max-w-3xl -translate-x-1/2 opacity-50"
					>
						<SpraySplat
							variant="blue"
							maskIndex={2}
							rotate={-18}
							className="absolute top-0 left-[5%] h-full w-[45%]"
						/>
						<SpraySplat
							variant="red"
							maskIndex={4}
							rotate={22}
							className="absolute top-0 right-[5%] h-full w-[45%]"
						/>
					</div>

					<header className="relative z-10 mb-8 flex w-full flex-col items-center text-center">
						<h2 className="mb-4 pb-1 font-black font-display text-2xl text-ink uppercase italic leading-[1.1] tracking-tighter sm:text-3xl">
							{t("review.reviewTitle")}
						</h2>
						<div className="flex w-full flex-col items-center gap-2.5">
							{matches[0]?.tournamentLogoUrl ? (
								<TournamentLogoSticker
									src={matches[0].tournamentLogoUrl}
									alt={matches[0]?.tournamentName || t("review.titleFallback")}
									rotate="-2deg"
									size="sm"
								/>
							) : null}
							<TapeLabel rotate="-3deg" className="min-w-0 max-w-md">
								{matches[0]?.tournamentName || t("review.titleFallback")}
							</TapeLabel>
						</div>
					</header>

					{matchDayStatus === "locked" && editableRecoveryMatchIds.size > 0 && (
						<div className="slide-in-from-top-5 relative z-10 mb-6 w-full max-w-2xl animate-in border-[4px] border-black bg-brawl-yellow p-4 shadow-comic-lg duration-500">
							<div className="flex items-start gap-3">
								<span className="material-symbols-outlined text-3xl text-black">
									notification_important
								</span>
								<div className="flex-1">
									<h4 className="font-black font-display text-black text-lg uppercase italic">
										{t("recovery.available")}
									</h4>
									<p className="mt-1 font-body font-bold text-black/80 text-sm">
										{t("recovery.errorPrompt")}
									</p>
								</div>
							</div>
						</div>
					)}

					{!isReadOnly && canReturnToBetting ? (
						<button
							type="button"
							onClick={onBack}
							className="relative z-10 mb-6 flex w-fit items-center gap-2 font-black font-display text-ink text-sm uppercase transition-colors hover:text-bsen-red"
						>
							<span className="material-symbols-outlined text-lg">
								arrow_back
							</span>
							{t("recovery.backToPicks")}
						</button>
					) : (
						<button
							type="button"
							onClick={() => {
								setSelectedTournamentId?.(null);
								setSelectedMatchDayId?.(null);
								setShowReview?.(false);
								setPredictions?.({});
							}}
							className="relative z-10 mb-6 flex w-fit cursor-pointer items-center gap-2 font-black font-display text-ink text-sm uppercase transition-colors hover:text-brawl-blue"
						>
							<span className="material-symbols-outlined text-lg">
								emoji_events
							</span>
							{t("review.viewTournaments")}
						</button>
					)}

					{isReadOnly && stats.total > 0 && (
						<div className="relative z-10 mb-8 w-full overflow-hidden border-[4px] border-black bg-white shadow-comic-lg">
							<div className="surface-ink flex items-center justify-between border-black border-b-[4px] px-4 py-2">
								<span className="font-body font-bold text-[10px] uppercase tracking-widest">
									{t("review.pointsSummary")}
								</span>
								<span className="material-symbols-outlined text-base text-electric-lime">
									leaderboard
								</span>
							</div>

							<div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
								<div className="surface-lime -rotate-1 transform border-[3px] border-black p-3 text-center shadow-comic-sm">
									<div className="font-black font-display text-3xl text-black italic tabular-nums">
										{totalPoints}
									</div>
									<div className="mt-1 font-body font-bold text-[9px] text-black/60 uppercase tracking-widest">
										{t("review.totalPointsLabel")}
									</div>
								</div>

								<div className="surface-brawl-blue rotate-1 transform border-[3px] border-black p-3 text-center shadow-comic-sm">
									<div className="font-black font-display text-3xl text-white italic tabular-nums">
										{stats.correct}/{stats.total}
									</div>
									<div className="mt-1 font-body font-bold text-[9px] text-white/80 uppercase tracking-widest">
										{t("review.correctPicks")}
									</div>
								</div>

								<div className="surface-ink -rotate-1 transform border-[3px] border-black p-3 text-center shadow-comic-sm">
									<div className="font-black font-display text-3xl text-electric-lime italic tabular-nums">
										{stats.perfectPicks}
									</div>
									<div className="mt-1 font-body font-bold text-[9px] text-white/80 uppercase tracking-widest">
										{t("review.perfectPicks")}
									</div>
								</div>

								<div className="surface-yellow rotate-1 transform border-[3px] border-black p-3 text-center shadow-comic-sm">
									<div className="font-black font-display text-3xl text-black italic tabular-nums">
										{stats.underdogPicks}
									</div>
									<div className="mt-1 font-body font-bold text-[9px] text-black/70 uppercase tracking-widest">
										{t("bonus.underdogLabel")}
									</div>
								</div>
							</div>

							{stats.total > 0 && (
								<div className="px-4 pb-4">
									<div className="mb-1 flex items-center justify-between">
										<span className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
											{t("review.accuracy")}
										</span>
										<span className="font-body font-bold text-[9px] text-ink tabular-nums">
											{Math.round((stats.correct / stats.total) * 100)}%
										</span>
									</div>
									<div className="h-2 overflow-hidden border-2 border-black bg-tape">
										<div
											className="h-full bg-electric-lime transition-all duration-500"
											style={{
												width: `${(stats.correct / stats.total) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
						</div>
					)}

					<div className="relative z-10 mx-auto mb-12 w-full max-w-4xl space-y-8 px-1">
						<div className="flex flex-col gap-8">
							{matchesToDisplay.map((match: any, idx: number) => {
								const mId = Number(match.id);
								return (
									<motion.div
										key={match.id}
										initial={reduceMotion ? false : { opacity: 0, y: 16 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.35,
											delay: reduceMotion ? 0 : Math.min(idx * 0.04, 0.4),
											ease: [0.16, 1, 0.3, 1],
										}}
									>
										<ReviewMatchCard
											match={match}
											idx={idx}
											prediction={predictions[mId]}
											betData={filteredUserBets.find(
												(b) => Number(b.matchId) === mId,
											)}
											isReadOnly={isReadOnly}
											matchDayStatus={matchDayStatus}
											stalePredictionMatchIds={stalePredictionMatchIds}
											editableRecoveryMatchIds={editableRecoveryMatchIds}
											predictions={predictions}
											editingScoreMatchId={editingScoreMatchId}
											setEditingScoreMatchId={setEditingScoreMatchId}
											onUpdatePrediction={onUpdatePrediction}
											betStats={matchBetStats[match.id]}
											locale={locale}
										/>
									</motion.div>
								);
							})}
						</div>
					</div>

					{!isReadOnly && hasValidBetsToSubmit ? (
						<button
							type="button"
							onClick={() => setIsSuccessModalOpen(true)}
							className="surface-lime relative mb-12 flex w-full max-w-xs items-center justify-center gap-3 border-[4px] border-black py-4 font-black font-display text-xl uppercase italic shadow-comic-lg transition-all hover:brightness-95 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
						>
							{editableRecoveryMatchIds.size > 0 && (
								<span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-black bg-brawl-yellow font-body font-bold text-black text-sm shadow-comic-sm">
									{editableRecoveryMatchIds.size}
								</span>
							)}
							<span className="material-symbols-outlined text-2xl text-black">
								verified
							</span>
							{editableRecoveryMatchIds.size > 0
								? t("review.updateBets")
								: t("review.lockAll")}
						</button>
					) : (
						<div className="mb-12 flex w-full max-w-xs items-center justify-center gap-3 border-[4px] border-black/20 bg-tape py-4 font-black font-display text-ink/40 text-xl uppercase italic">
							<span className="material-symbols-outlined text-2xl">lock</span>
							{isReadOnly ? t("review.picksLocked") : t("review.noValidPicks")}
						</div>
					)}
				</div>
			</PublicPageShell>

			{isSuccessModalOpen && (
				<SubmitBetsModal
					predictions={predictions}
					matchList={effectiveProjectedMatches}
					onClose={() => setIsSuccessModalOpen(false)}
					tournamentId={tournamentId}
					userId={userId}
					stalePredictionMatchIds={stalePredictionMatchIds}
					editableRecoveryMatchIds={editableRecoveryMatchIds}
					onLockRecoveryMatch={onLockRecoveryMatch}
					onUpdatePrediction={onUpdatePrediction}
					userBets={userBets}
					onSuccess={() => {
						queryClient.invalidateQueries({
							queryKey: ["myBets"],
							exact: false,
						});
					}}
					matchDayStatus={matchDayStatus}
				/>
			)}
		</>
	);
}

function SubmitBetsModal({
	predictions,
	matchList,
	onClose,
	tournamentId,
	userId,
	stalePredictionMatchIds = new Set(),
	editableRecoveryMatchIds = new Set(),
	onLockRecoveryMatch,
	onUpdatePrediction,
	userBets = [],
	onSuccess,
	matchDayStatus,
}: {
	predictions: Record<number, Prediction>;
	matchList: Match[];
	onClose: () => void;
	tournamentId: number;
	userId: string;
	onUpdatePrediction?: (
		matchId: number,
		winnerId: number,
		score?: string,
	) => void;
	stalePredictionMatchIds?: Set<number>;
	editableRecoveryMatchIds?: Set<number>;
	onLockRecoveryMatch?: (matchId: number) => void;
	userBets?: any[];
	matchDayStatus?: string;
	onSuccess?: () => void;
}) {
	const { t, i18n } = useTranslation("betting");
	const navigate = useNavigate();
	const { routeTo } = useLangLink();
	const [status, setStatus] = useState<
		"idle" | "submitting" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [matchBetStats, setMatchBetStats] = useState<Record<number, BetStats>>(
		{},
	);

	const hasValidBetsToSubmit = useMemo(() => {
		return (
			getSubmittableBetPayloads({
				predictions,
				matches: toSubmittableMatchRows(matchList),
				userBets,
				matchDayStatus,
				stalePredictionMatchIds,
				editableRecoveryMatchIds,
			}).length > 0
		);
	}, [
		predictions,
		matchList,
		stalePredictionMatchIds,
		editableRecoveryMatchIds,
		userBets,
		matchDayStatus,
	]);

	useEffect(() => {
		if (status === "success") {
			onSuccess?.();
		}
	}, [status, onSuccess]);

	useEffect(() => {
		const matchIds = Object.keys(predictions)
			.map(Number)
			.filter((id) => {
				const match = matchList.find((m: any) => m.id === id);
				return match && match.status !== "finished" && match.status !== "live";
			});

		if (matchIds.length === 0) return;

		let cancelled = false;

		(async () => {
			try {
				const { getMatchBetStats } = await import("@/server/bets");
				const results = await Promise.all(
					matchIds.map((id) => getMatchBetStats({ data: { matchId: id } })),
				);
				if (cancelled) return;
				const statsMap: Record<number, BetStats> = {};
				matchIds.forEach((id, i) => {
					if (results[i]) statsMap[id] = results[i];
				});
				setMatchBetStats(statsMap);
			} catch {
				// non-fatal
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const handleSubmit = async () => {
		setStatus("submitting");
		setErrorMessage(null);

		try {
			const betsToSubmit = getSubmittableBetPayloads({
				predictions,
				matches: toSubmittableMatchRows(matchList),
				userBets,
				matchDayStatus,
				stalePredictionMatchIds,
				editableRecoveryMatchIds,
			});

			if (betsToSubmit.length === 0) {
				throw new Error("No valid bets to submit (matches may have started).");
			}

			const { submitMultipleBets } = await import("@/server/bets");
			await submitMultipleBets({
				data: {
					bets: betsToSubmit,
					lang: i18n.language === "en" ? "en" : "pt",
				},
			});

			betsToSubmit.forEach((bet) => {
				onUpdatePrediction?.(
					bet.matchId,
					bet.predictedWinnerId,
					formatScoreDisplay(bet.predictedScoreA, bet.predictedScoreB),
				);
				onLockRecoveryMatch?.(bet.matchId);
			});

			setStatus("success");
			const key = `bse-predictions-${tournamentId}-${userId}`;
			localStorage.removeItem(key);
		} catch (error: any) {
			console.error("[SUBMIT BETS] Error submitting bets:", error);
			setStatus("error");
			setErrorMessage(
				error.message || "Failed to submit bets. Please try again.",
			);
		}
	};

	if (status === "success") {
		return (
			<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-6 backdrop-blur-md duration-300">
				<div className="zoom-in-95 relative flex w-full max-w-md transform animate-in flex-col items-center overflow-hidden border-[6px] border-black bg-brawl-yellow p-8 text-center shadow-[16px_16px_0px_0px_#000] duration-500">
					<div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
					<div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-bsen-red/20 blur-2xl" />

					<div className="mb-6 flex h-24 w-24 rotate-3 items-center justify-center rounded-full border-[4px] border-black bg-white shadow-comic-md">
						<span className="material-symbols-outlined font-black text-6xl text-electric-lime">
							celebration
						</span>
					</div>

					<h3 className="mb-4 -skew-x-12 transform pb-1 font-black font-display text-5xl text-black uppercase italic leading-[1.1] tracking-tighter">
						{t("review.successTitle")}{" "}
						<span className="text-bsen-red">
							{t("review.successTitleHighlight")}
						</span>
					</h3>

					<p className="mb-8 font-body font-bold text-black text-lg leading-snug">
						{t("toast.confirmed")}
					</p>

					<button
						type="button"
						onClick={() => {
							onClose();
							navigate(routeTo("/my-bets"));
						}}
						className="surface-ink w-full border-[4px] border-black py-4 font-black font-display text-lg uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--color-electric-lime)] transition-all hover:bg-charcoal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					>
						{t("review.viewMyBets")}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-6 backdrop-blur-md duration-300">
			<div className="relative flex w-full max-w-md flex-col items-center overflow-hidden border-[6px] border-black bg-paper p-8 text-center shadow-[16px_16px_0px_0px_#000]">
				<h3 className="mb-4 font-black font-display text-3xl text-ink uppercase italic">
					{t("review.confirmTitle")}
				</h3>

				<p className="mb-4 font-body font-bold text-gray-600">
					{t("review.description")}
				</p>

				{Object.keys(predictions).length > 0 && (
					<div className="mb-6 max-h-[35vh] w-full space-y-3 overflow-y-auto">
						{Object.entries(predictions).map(([matchIdStr, pred]) => {
							const matchId = Number(matchIdStr);
							const match = matchList.find((m: any) => m.id === matchId);
							if (
								!match ||
								match.status === "live" ||
								match.status === "finished"
							)
								return null;
							if (
								matchDayStatus === "locked" &&
								!editableRecoveryMatchIds.has(matchId)
							)
								return null;

							const teamAName =
								match.teamA?.name ?? match.labelTeamA ?? t("matchCard.tbd");
							const teamBName =
								match.teamB?.name ?? match.labelTeamB ?? t("matchCard.tbd");
							const pickedTeamName =
								pred.winnerId === match.teamA?.id
									? teamAName
									: pred.winnerId === match.teamB?.id
										? teamBName
										: "?";
							const stats = matchBetStats[matchId];

							return (
								<div
									key={matchId}
									className="w-full border-2 border-black bg-white p-3 text-left shadow-comic-sm"
								>
									<div className="mb-2 flex items-center justify-between gap-2">
										<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
											{teamAName} vs {teamBName}
										</span>
										<span className="surface-lime shrink-0 border border-black px-1.5 py-0.5 font-body font-bold text-[9px] uppercase tracking-widest">
											{pickedTeamName}
										</span>
									</div>
									{stats && match.teamA?.id && match.teamB?.id && (
										<BetSplitBar
											teamAName={teamAName}
											teamBName={teamBName}
											stats={stats}
											compact
										/>
									)}
								</div>
							);
						})}
					</div>
				)}

				{status === "error" && (
					<div className="mb-6 w-full border-2 border-bsen-red bg-bsen-red/10 p-3 text-left font-body font-bold text-bsen-red text-xs">
						{errorMessage}
					</div>
				)}

				<div className="flex w-full gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={status === "submitting"}
						className="flex-1 border-[3px] border-black bg-tape py-3 font-black font-display text-ink uppercase shadow-comic-md transition-all hover:bg-white active:shadow-none"
					>
						{t("common:actions.cancel")}
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={status === "submitting" || !hasValidBetsToSubmit}
						className={clsx(
							"flex flex-1 items-center justify-center gap-2 border-[3px] border-black py-3 font-black font-display uppercase shadow-comic-md transition-all active:shadow-none",
							hasValidBetsToSubmit
								? "surface-lime hover:brightness-95"
								: "cursor-not-allowed bg-tape text-ink/40",
						)}
					>
						{status === "submitting" ? (
							<InlineLoader size="sm" />
						) : (
							<span>{t("review.lockIn")}</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

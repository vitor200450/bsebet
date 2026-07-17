import { clsx } from "clsx";
import { Calendar, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BetStats } from "@/server/bets";
import { BetSplitBar } from "./BetSplitBar";
import { TeamLogo } from "./TeamLogo";

interface TeamInfo {
	id?: number;
	name: string;
	logoUrl?: string | null;
}

interface MatchBetCardProps {
	matchLabel: string;
	headerLogoUrl?: string | null;
	headerLogoAlt?: string;
	teamA: TeamInfo;
	teamB: TeamInfo;
	status: "scheduled" | "live" | "finished";
	resultType?: "wo" | null;
	startTime?: string;
	predictedWinnerId?: number | null;
	predictedScoreA?: number;
	predictedScoreB?: number;
	actualScoreA?: number | null;
	actualScoreB?: number | null;
	actualWinnerId?: number | null;
	pointsEarned?: number | null;
	isPerfectPick?: boolean;
	isUnderdogPick?: boolean;
	isProjected?: boolean;
	locale?: string;
	className?: string;
	betStats?: BetStats;
}

export function MatchBetCard({
	matchLabel,
	headerLogoUrl,
	headerLogoAlt,
	teamA,
	teamB,
	status,
	resultType,
	startTime,
	predictedWinnerId,
	predictedScoreA,
	predictedScoreB,
	actualScoreA,
	actualScoreB,
	actualWinnerId,
	pointsEarned,
	isPerfectPick,
	isUnderdogPick,
	isProjected = false,
	locale = "pt-BR",
	className,
	betStats,
}: MatchBetCardProps) {
	const { t } = useTranslation("betting");

	const isFinished = status === "finished";
	const isLive = status === "live";
	const isWalkover = resultType === "wo";

	const won = isFinished && (pointsEarned ?? 0) > 0;
	const lost = isFinished && !won && !isProjected;
	const hasPredictedScore =
		typeof predictedScoreA === "number" && typeof predictedScoreB === "number";

	// Walkover display
	const woA =
		isWalkover && actualWinnerId === teamA.id ? "W" : isWalkover ? "FF" : null;
	const woB =
		isWalkover && actualWinnerId === teamB.id ? "W" : isWalkover ? "FF" : null;

	const pickedA = predictedWinnerId === teamA.id;
	const pickedB = predictedWinnerId === teamB.id;

	const aWon = actualWinnerId === teamA.id;
	const bWon = actualWinnerId === teamB.id;

	const statusConfig = isProjected
		? { label: t("labels.projection"), color: "bg-gray-500 text-white" }
		: isLive
			? {
					label: t("badges.live"),
					color: "animate-pulse bg-brawl-red text-white",
				}
			: isWalkover
				? { label: "W.O.", color: "bg-ink text-white" }
				: won
					? { label: t("result.correct"), color: "bg-electric-lime text-black" }
					: lost
						? { label: t("result.incorrect"), color: "bg-brawl-red text-white" }
						: { label: t("result.scheduled"), color: "bg-tape text-ink" };

	const borderColor = isProjected
		? "border-gray-300 border-dashed"
		: won
			? "border-electric-lime"
			: lost
				? "border-brawl-red"
				: "border-black";

	const shadowColor = isProjected
		? "shadow-[3px_3px_0_0_#d1d5db]"
		: won
			? "shadow-[3px_3px_0_0_var(--color-electric-lime)]"
			: lost
				? "shadow-[3px_3px_0_0_#ff2e2e]"
				: "shadow-comic";

	const accentColor = isProjected
		? "bg-gray-400"
		: won
			? "bg-electric-lime"
			: lost
				? "bg-brawl-red"
				: isLive
					? "bg-brawl-red animate-pulse"
					: "bg-brawl-yellow";

	const pickedTeamBgA =
		pickedA && !isProjected ? "ring-4 ring-inset ring-electric-lime" : "";
	const pickedWinnerBgA = pickedA && aWon && isFinished ? "bg-paper" : "";

	const pickedTeamBgB =
		pickedB && !isProjected ? "ring-4 ring-inset ring-electric-lime" : "";
	const pickedWinnerBgB = pickedB && bWon && isFinished ? "bg-paper" : "";

	return (
		<div
			className={clsx(
				"group relative overflow-hidden rounded-lg bg-white transition-all",
				borderColor,
				shadowColor,
				"hover:-translate-y-0.5",
				className,
			)}
		>
			{/* Top accent bar */}
			<div className={clsx("h-1.5 w-full", accentColor)} />

			{/* Header */}
			<div className="flex items-center justify-between gap-2 border-black border-b-2 bg-paper px-3 py-1.5">
				<div className="flex min-w-0 items-center gap-2">
					{headerLogoUrl ? (
						<img
							src={headerLogoUrl}
							alt={headerLogoAlt || matchLabel}
							className="h-5 w-5 shrink-0 object-contain"
						/>
					) : null}
					<span className="truncate font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
						{matchLabel}
					</span>
				</div>
				<div
					className={clsx(
						"shrink-0 rounded-sm border-2 border-black px-2 py-0.5 font-black font-display text-[9px] uppercase tracking-wider shadow-comic-press",
						statusConfig.color,
					)}
				>
					{statusConfig.label}
				</div>
			</div>

			{/* Main: Teams & Score */}
			<div className="flex flex-col items-stretch md:flex-row">
				{/* Team A */}
				<div
					className={clsx(
						"flex flex-1 flex-col items-center gap-2 border-black px-3 py-4 transition-colors md:border-r-2",
						pickedTeamBgA,
						pickedWinnerBgA,
					)}
				>
					<TeamLogo
						teamName={teamA.name}
						logoUrl={teamA.logoUrl}
						size="xl"
						className="drop-shadow-sm"
					/>
					<p className="max-w-full text-center font-black font-display text-ink text-sm uppercase leading-tight">
						{teamA.name}
					</p>
					{pickedA && !isProjected && (
						<div className="flex items-center gap-1 rounded-sm border border-black bg-electric-lime px-1.5 py-0.5 font-black font-display text-[8px] text-black uppercase shadow-comic-press">
							<span className="material-symbols-outlined text-[10px]">
								check_circle
							</span>
							{t("betLabel")}
						</div>
					)}
					{aWon && isFinished && (
						<div className="flex items-center gap-1 font-body font-bold text-[#121212] text-[9px] uppercase tracking-widest">
							<Crown className="h-3 w-3 text-[#ffc700]" strokeWidth={2.5} />
							{t("correctWinner")}
						</div>
					)}
				</div>

				{/* Center: Scores */}
				<div className="flex flex-col items-center justify-center gap-2 border-black border-y-2 px-2 py-3 md:min-w-[120px] md:shrink-0 md:border-y-0">
					{/* VS or Score */}
					{!isFinished ? (
						<div className="flex flex-col items-center gap-2">
							{hasPredictedScore ? (
								<>
									<span className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
										{t("betPredictionPrefix")}
									</span>
									<div className="flex items-center gap-2">
										<span className="font-black font-body text-3xl text-ink tabular-nums">
											{predictedScoreA}
										</span>
										<span className="font-black font-body text-gray-300 text-xl">
											-
										</span>
										<span className="font-black font-body text-3xl text-ink tabular-nums">
											{predictedScoreB}
										</span>
									</div>
								</>
							) : (
								<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-black shadow-[2px_2px_0_0_var(--color-electric-lime)]">
									<span className="font-black font-display text-white text-xs italic">
										VS
									</span>
								</div>
							)}
							{!isProjected && startTime && (
								<span className="flex items-center gap-1 text-center font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
									<Calendar className="h-3 w-3" strokeWidth={2} />
									{new Date(startTime).toLocaleString(locale, {
										day: "2-digit",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							)}
						</div>
					) : (
						<div className="flex flex-col items-center gap-2.5">
							{/* Actual Score */}
							<span className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
								{t("matchCard.score")}
							</span>
							<div className="flex items-center gap-1.5">
								<span
									className={clsx(
										"flex h-12 w-12 items-center justify-center rounded-md border-2 border-black font-black font-body text-xl tabular-nums shadow-comic-sm",
										aWon ? "bg-electric-lime text-black" : "bg-ink text-white",
									)}
								>
									{woA ?? actualScoreA ?? "—"}
								</span>
								<span className="font-black font-body text-gray-400 text-sm">
									-
								</span>
								<span
									className={clsx(
										"flex h-12 w-12 items-center justify-center rounded-md border-2 border-black font-black font-body text-xl tabular-nums shadow-comic-sm",
										bWon ? "bg-electric-lime text-black" : "bg-ink text-white",
									)}
								>
									{woB ?? actualScoreB ?? "—"}
								</span>
							</div>
							{/* Predicted Score */}
							{hasPredictedScore && !isProjected && (
								<div className="mt-1 flex flex-col items-center gap-0.5">
									<span className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
										{t("betPredictionPrefix")}
									</span>
									<span className="font-black font-body text-gray-400 text-xl tabular-nums">
										{predictedScoreA} - {predictedScoreB}
									</span>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Team B */}
				<div
					className={clsx(
						"flex flex-1 flex-col items-center gap-2 border-black px-3 py-4 transition-colors md:border-l-2",
						pickedTeamBgB,
						pickedWinnerBgB,
					)}
				>
					<TeamLogo
						teamName={teamB.name}
						logoUrl={teamB.logoUrl}
						size="xl"
						className="drop-shadow-sm"
					/>
					<p className="max-w-full text-center font-black font-display text-ink text-sm uppercase leading-tight">
						{teamB.name}
					</p>
					{pickedB && !isProjected && (
						<div className="flex items-center gap-1 rounded-sm border border-black bg-electric-lime px-1.5 py-0.5 font-black font-display text-[8px] text-black uppercase shadow-comic-press">
							<span className="material-symbols-outlined text-[10px]">
								check_circle
							</span>
							{t("betLabel")}
						</div>
					)}
					{bWon && isFinished && (
						<div className="flex items-center gap-1 font-body font-bold text-[#121212] text-[9px] uppercase tracking-widest">
							<Crown className="h-3 w-3 text-[#ffc700]" strokeWidth={2.5} />
							{t("correctWinner")}
						</div>
					)}
				</div>
			</div>

			{/* Footer - Points & Badges */}
			{isFinished && !isProjected && (
				<div className="flex items-center justify-between border-black border-t-2 bg-paper px-3 py-2">
					<div className="flex items-center gap-2">
						{isPerfectPick && (
							<span className="rounded-sm border border-black bg-brawl-yellow px-2 py-0.5 font-black font-display text-[9px] text-black uppercase">
								{t("perfectScore")}
							</span>
						)}
						{isUnderdogPick && won && (
							<span className="rounded-sm border border-black bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 font-black font-display text-[9px] text-white uppercase">
								{t("labels.underdogLabel")}
							</span>
						)}
						{isFinished && (pointsEarned == null || pointsEarned === 0) && (
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("result.noPoints")}
							</span>
						)}
					</div>

					{typeof pointsEarned === "number" && pointsEarned > 0 && (
						<span className="rounded-md border border-black bg-electric-lime px-2.5 py-0.5 font-black font-body text-black text-sm tabular-nums shadow-comic-press">
							+{pointsEarned}
						</span>
					)}
				</div>
			)}

			{/* Community bet stats — shown whenever betStats is provided */}
			{betStats && !isProjected && (
				<div className="w-full">
					<BetSplitBar
						teamAName={teamA.name}
						teamBName={teamB.name}
						stats={betStats}
					/>
				</div>
			)}
		</div>
	);
}

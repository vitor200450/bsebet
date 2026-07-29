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

type TeamSideProps = {
	team: TeamInfo;
	isPicked: boolean;
	isProjected: boolean;
	isFinished: boolean;
	didWin: boolean;
	side: "a" | "b";
	pickLabel: string;
	winnerLabel: string;
};

function TeamSide({
	team,
	isPicked,
	isProjected,
	isFinished,
	didWin,
	side,
	pickLabel,
	winnerLabel,
}: TeamSideProps) {
	const showPick = isPicked && !isProjected;

	return (
		<div
			className={clsx(
				"relative flex flex-1 flex-col items-center gap-2 px-3 py-4 transition-colors",
				side === "a"
					? "md:border-black md:border-r-2"
					: "md:border-black md:border-l-2",
				showPick ? "surface-lime" : "bg-white text-ink",
			)}
		>
			{showPick && (
				<div className="absolute inset-y-0 left-0 w-1.5 bg-ink md:hidden" />
			)}

			<div className="flex flex-col items-center gap-2">
				<TeamLogo
					teamName={team.name}
					logoUrl={team.logoUrl}
					size="xl"
					className={clsx("drop-shadow-sm", showPick && "scale-105")}
				/>
				<p
					className={clsx(
						"max-w-full text-center font-black font-display text-ink uppercase leading-tight tracking-tighter",
						showPick ? "text-base" : "text-sm",
					)}
				>
					{team.name}
				</p>
			</div>

			{showPick && (
				<div className="flex items-center gap-1 rounded-sm border-2 border-black bg-ink px-2 py-0.5 font-black font-display text-[9px] text-white uppercase shadow-comic-press">
					<span className="material-symbols-outlined text-[11px] text-electric-lime">
						check_circle
					</span>
					{pickLabel}
				</div>
			)}

			{didWin && isFinished && (
				<div className="flex items-center gap-1 font-body font-bold text-[9px] text-ink uppercase tracking-widest">
					<Crown className="h-3 w-3 text-brawl-yellow" strokeWidth={2.5} />
					{winnerLabel}
				</div>
			)}
		</div>
	);
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
		: lost
			? "border-brawl-red"
			: "border-black";

	const shadowColor = isProjected
		? "shadow-[3px_3px_0_0_#d1d5db]"
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

	return (
		<div
			className={clsx(
				"group relative overflow-hidden rounded-lg border-2 bg-white text-ink transition-all",
				borderColor,
				shadowColor,
				"hover:-translate-y-0.5",
				className,
			)}
		>
			{/* Result / status accent — not a pick indicator */}
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
				<TeamSide
					team={teamA}
					isPicked={pickedA}
					isProjected={isProjected}
					isFinished={isFinished}
					didWin={aWon}
					side="a"
					pickLabel={t("review.pickBadge")}
					winnerLabel={t("correctWinner")}
				/>

				{/* Center: Scores */}
				<div className="flex flex-col items-center justify-center gap-2 border-black border-y-2 bg-white px-2 py-3 md:min-w-[120px] md:shrink-0 md:border-y-0">
					{!isFinished ? (
						<div className="flex flex-col items-center gap-2">
							{hasPredictedScore ? (
								<>
									<span className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
										{t("betPredictionPrefix")}
									</span>
									<div className="flex items-center gap-2">
										<span
											className={clsx(
												"font-black font-body text-3xl tabular-nums",
												pickedA ? "text-ink" : "text-gray-400",
											)}
										>
											{predictedScoreA}
										</span>
										<span className="font-black font-body text-gray-300 text-xl">
											-
										</span>
										<span
											className={clsx(
												"font-black font-body text-3xl tabular-nums",
												pickedB ? "text-ink" : "text-gray-400",
											)}
										>
											{predictedScoreB}
										</span>
									</div>
								</>
							) : (
								<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-ink shadow-comic-sm">
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
							<span className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
								{t("matchCard.score")}
							</span>
							<div className="flex items-center gap-1.5">
								<span
									className={clsx(
										"flex h-12 w-12 items-center justify-center rounded-md border-2 border-black font-black font-body text-xl tabular-nums shadow-comic-sm",
										aWon ? "surface-lime" : "surface-ink",
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
										bWon ? "surface-lime" : "surface-ink",
									)}
								>
									{woB ?? actualScoreB ?? "—"}
								</span>
							</div>
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

				<TeamSide
					team={teamB}
					isPicked={pickedB}
					isProjected={isProjected}
					isFinished={isFinished}
					didWin={bWon}
					side="b"
					pickLabel={t("review.pickBadge")}
					winnerLabel={t("correctWinner")}
				/>
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

			{betStats && !isProjected && teamA.id && teamB.id && (
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

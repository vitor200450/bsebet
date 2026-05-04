import { clsx } from "clsx";
import { Calendar, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
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
					? { label: t("result.correct"), color: "bg-[#ccff00] text-black" }
					: lost
						? { label: t("result.incorrect"), color: "bg-brawl-red text-white" }
						: { label: t("result.scheduled"), color: "bg-tape text-ink" };

	const borderColor = isProjected
		? "border-gray-300 border-dashed"
		: won
			? "border-[#ccff00]"
			: lost
				? "border-brawl-red"
				: "border-black";

	const shadowColor = isProjected
		? "shadow-[3px_3px_0_0_#d1d5db]"
		: won
			? "shadow-[3px_3px_0_0_#ccff00]"
			: lost
				? "shadow-[3px_3px_0_0_#ff2e2e]"
				: "shadow-[3px_3px_0_0_#000]";

	const accentColor = isProjected
		? "bg-gray-400"
		: won
			? "bg-[#ccff00]"
			: lost
				? "bg-brawl-red"
				: isLive
					? "bg-brawl-red animate-pulse"
					: "bg-[#ffc700]";

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
			<div className="flex items-center justify-between gap-2 border-black border-b-2 bg-[#fafafa] px-3 py-1.5">
				<div className="flex min-w-0 items-center gap-2">
					{headerLogoUrl ? (
						<img
							src={headerLogoUrl}
							alt={headerLogoAlt || matchLabel}
							className="h-5 w-5 shrink-0 object-contain"
						/>
					) : null}
					<span className="truncate font-black text-[10px] text-gray-500 uppercase tracking-widest">
						{matchLabel}
					</span>
				</div>
				<div
					className={clsx(
						"shrink-0 rounded-sm border-2 border-black px-2 py-0.5 font-black text-[9px] uppercase tracking-wider shadow-[1px_1px_0_0_#000]",
						statusConfig.color,
					)}
				>
					{statusConfig.label}
				</div>
			</div>

			{/* Main: Teams & Score */}
			<div className="flex items-stretch">
				{/* Team A */}
				<div
					className={clsx(
						"flex flex-1 flex-col items-center gap-2 border-black/10 border-r px-3 py-4 transition-colors",
						pickedA && !isProjected && "bg-[#2e5cff]/28",
						aWon && isFinished && "bg-[#ccff00]/5",
					)}
				>
					<TeamLogo
						teamName={teamA.name}
						logoUrl={teamA.logoUrl}
						size="xl"
						className="drop-shadow-sm"
					/>
					<p className="max-w-full truncate text-center font-black text-ink text-sm uppercase">
						{teamA.name}
					</p>
					{pickedA && !isProjected && (
						<div className="flex items-center gap-1 rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[8px] text-black uppercase shadow-[1px_1px_0_0_#000]">
							<span className="material-symbols-outlined text-[10px]">
								check_circle
							</span>
							{t("betLabel")}
						</div>
					)}
					{aWon && isFinished && (
						<div className="flex items-center gap-1 font-black text-[#ffc700] text-[9px] uppercase">
							<Crown className="h-3 w-3" strokeWidth={2.5} />
							{t("correctWinner")}
						</div>
					)}
				</div>

				{/* Center: Scores */}
				<div className="flex min-w-[128px] shrink-0 flex-col items-center justify-center gap-2 px-3 py-3">
					{/* VS or Score */}
					{!isFinished ? (
						<div className="flex flex-col items-center gap-2">
							{hasPredictedScore ? (
								<>
									<span className="font-black text-[9px] text-gray-500 uppercase tracking-[0.18em]">
										{t("betPredictionPrefix")}
									</span>
									<div className="flex items-center gap-2">
										<span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-black bg-ink font-black text-lg text-white shadow-[2px_2px_0_0_#ccff00]">
											{predictedScoreA}
										</span>
										<span className="font-black text-gray-400 text-sm">-</span>
										<span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-black bg-ink font-black text-lg text-white shadow-[2px_2px_0_0_#ccff00]">
											{predictedScoreB}
										</span>
									</div>
								</>
							) : (
								<div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-black shadow-[2px_2px_0_0_#ccff00]">
									<span className="font-black text-white text-xs italic">VS</span>
								</div>
							)}
							{!isProjected && startTime && (
								<span className="flex items-center gap-1 text-center font-bold text-[10px] text-gray-500">
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
							<span className="font-black text-[9px] text-gray-500 uppercase tracking-[0.18em]">
								{t("matchCard.score")}
							</span>
							<div className="flex items-center gap-1.5">
								<span
									className={clsx(
										"flex h-12 w-12 items-center justify-center rounded-md border-2 border-black font-black text-xl shadow-[2px_2px_0_0_#000]",
										aWon ? "bg-[#ccff00] text-black" : "bg-ink text-white",
									)}
								>
									{woA ?? actualScoreA ?? "—"}
								</span>
								<span className="font-black text-gray-400 text-sm">-</span>
								<span
									className={clsx(
										"flex h-12 w-12 items-center justify-center rounded-md border-2 border-black font-black text-xl shadow-[2px_2px_0_0_#000]",
										bWon ? "bg-[#ccff00] text-black" : "bg-ink text-white",
									)}
								>
									{woB ?? actualScoreB ?? "—"}
								</span>
							</div>
							{/* Predicted Score */}
							{hasPredictedScore && !isProjected && (
								<div className="flex flex-col items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5">
									<span className="font-bold text-[9px] text-gray-500 uppercase tracking-[0.18em]">
										{t("betPredictionPrefix")}
									</span>
									<span className="font-black text-ink text-base">
										{predictedScoreA}-{predictedScoreB}
									</span>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Team B */}
				<div
					className={clsx(
						"flex flex-1 flex-col items-center gap-2 border-black/10 border-l px-3 py-4 transition-colors",
						pickedB && !isProjected && "bg-[#ff2e2e]/28",
						bWon && isFinished && "bg-[#ccff00]/5",
					)}
				>
					<TeamLogo
						teamName={teamB.name}
						logoUrl={teamB.logoUrl}
						size="xl"
						className="drop-shadow-sm"
					/>
					<p className="max-w-full truncate text-center font-black text-ink text-sm uppercase">
						{teamB.name}
					</p>
					{pickedB && !isProjected && (
						<div className="flex items-center gap-1 rounded-sm border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[8px] text-black uppercase shadow-[1px_1px_0_0_#000]">
							<span className="material-symbols-outlined text-[10px]">
								check_circle
							</span>
							{t("betLabel")}
						</div>
					)}
					{bWon && isFinished && (
						<div className="flex items-center gap-1 font-black text-[#ffc700] text-[9px] uppercase">
							<Crown className="h-3 w-3" strokeWidth={2.5} />
							{t("correctWinner")}
						</div>
					)}
				</div>
			</div>

			{/* Footer - Points & Badges */}
			{isFinished && !isProjected && (
				<div className="flex items-center justify-between border-black border-t-2 bg-white px-3 py-2">
					<div className="flex items-center gap-2">
						{isPerfectPick && (
							<span className="rounded-sm border border-black bg-[#ffc700] px-2 py-0.5 font-black text-[9px] text-black uppercase">
								{t("perfectScore")}
							</span>
						)}
						{isUnderdogPick && won && (
							<span className="rounded-sm border border-black bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 font-black text-[9px] text-white uppercase">
								{t("labels.underdogLabel")}
							</span>
						)}
					</div>

					{pointsEarned !== null && pointsEarned > 0 && (
						<span className="rounded-md bg-[#ccff00] px-2 py-0.5 font-black text-black text-sm">
							+{pointsEarned}
						</span>
					)}
				</div>
			)}
		</div>
	);
}

import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Calendar, Check, Crown, Minus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
import { TeamLogo } from "./TeamLogo";

interface TeamInfo {
	id?: number;
	name: string;
	logoUrl?: string | null;
	slug?: string | null;
}

export interface ActiveBetRowProps {
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
	/** `row` = full-width strip (dashboard). `tile` = compact grid card (my-bets). */
	variant?: "row" | "tile";
}

export function ActiveBetRow({
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
	variant = "row",
}: ActiveBetRowProps) {
	const { t } = useTranslation("betting");
	const { linkTo } = useLangLink();

	const isLive = status === "live";
	const isFinished = status === "finished";
	const isWalkover = resultType === "wo";
	/** Synthetic card for a path match the user never locked a pick on. */
	const isNoBet = isProjected && isFinished;
	const isFutureProjection = isProjected && !isFinished;
	const won = isFinished && !isProjected && (pointsEarned ?? 0) > 0;
	const lost = isFinished && !won && !isProjected;

	const pickedA = !isProjected && predictedWinnerId === teamA.id;
	const pickedB = !isProjected && predictedWinnerId === teamB.id;
	const aWon = actualWinnerId === teamA.id;
	const bWon = actualWinnerId === teamB.id;

	const hasPredictedScore =
		!isProjected &&
		typeof predictedScoreA === "number" &&
		typeof predictedScoreB === "number";
	const hasActualScore =
		typeof actualScoreA === "number" ||
		typeof actualScoreB === "number" ||
		isWalkover;

	const woA =
		isWalkover && actualWinnerId === teamA.id ? "W" : isWalkover ? "FF" : null;
	const woB =
		isWalkover && actualWinnerId === teamB.id ? "W" : isWalkover ? "FF" : null;

	const statusPill = isNoBet
		? {
				label: t("labels.noBet"),
				className: "bg-tape text-ink",
			}
		: isFutureProjection
			? {
					label: t("labels.projection"),
					className: "bg-gray-500 text-white",
				}
			: isLive
				? {
						label: t("badges.live"),
						className: "animate-pulse bg-brawl-red text-white",
					}
				: isWalkover && !won && !lost
					? { label: "W.O.", className: "bg-ink text-white" }
					: won
						? {
								label: t("result.correct"),
								className: "bg-electric-lime text-black",
							}
						: lost
							? {
									label: t("result.incorrect"),
									className: "bg-brawl-red text-white",
								}
							: null;

	const borderClass =
		isNoBet || isFutureProjection
			? "border-gray-300 border-dashed"
			: "border-black";

	const shadowClass =
		isNoBet || isFutureProjection
			? "shadow-[3px_3px_0_0_#d1d5db]"
			: "shadow-comic";

	const pickSideClass = (isPicked: boolean) => {
		if (!isPicked || isProjected) return "border-transparent";
		if (won) return "border-black bg-electric-lime/40 text-ink";
		if (lost) return "border-black bg-tape text-ink";
		return "border-black surface-lime";
	};

	const scorePrimary =
		isFinished && hasActualScore
			? `${woA ?? actualScoreA ?? "—"}-${woB ?? actualScoreB ?? "—"}`
			: hasPredictedScore
				? `${predictedScoreA}-${predictedScoreB}`
				: null;

	const scoreSecondary =
		isFinished && hasActualScore && hasPredictedScore && !isProjected
			? `${predictedScoreA}-${predictedScoreB}`
			: null;

	const showFooterBadges =
		isFinished &&
		!isProjected &&
		(!!isPerfectPick || (!!isUnderdogPick && won) || pointsEarned === 0);

	const renderTeamName = (team: TeamInfo, textClassName: string) => {
		if (!team.slug) {
			return <span className={textClassName}>{team.name}</span>;
		}
		return (
			<Link
				to={linkTo("/teams/$teamId")}
				params={{ teamId: team.slug }}
				title={t("teamPage")}
				aria-label={`${t("teamPage")}: ${team.name}`}
				className={clsx(textClassName, "hover:text-brawl-blue hover:underline")}
				onClick={(e) => e.stopPropagation()}
			>
				{team.name}
			</Link>
		);
	};

	const renderTeamRow = (
		team: TeamInfo,
		isPicked: boolean,
		didWin: boolean,
	) => (
		<div
			className={clsx(
				"flex h-14 items-center gap-2.5 rounded-md border px-2",
				pickSideClass(isPicked),
			)}
		>
			{team.slug ? (
				<Link
					to={linkTo("/teams/$teamId")}
					params={{ teamId: team.slug }}
					title={t("teamPage")}
					aria-label={`${t("teamPage")}: ${team.name}`}
					className="shrink-0 transition-opacity hover:opacity-80"
					onClick={(e) => e.stopPropagation()}
				>
					<TeamLogo
						teamName={team.name}
						logoUrl={team.logoUrl}
						size="lg"
						className="shrink-0"
					/>
				</Link>
			) : (
				<TeamLogo
					teamName={team.name}
					logoUrl={team.logoUrl}
					size="lg"
					className="shrink-0"
				/>
			)}
			{renderTeamName(
				team,
				"min-w-0 flex-1 truncate pr-1 font-black font-display text-ink text-sm uppercase italic leading-[1.15] tracking-tighter sm:text-base",
			)}
			<div className="flex w-10 shrink-0 items-center justify-end gap-0.5">
				{didWin && isFinished && (
					<Crown
						className="h-4 w-4 shrink-0 text-brawl-yellow"
						strokeWidth={2.5}
					/>
				)}
				{isPicked && won && (
					<Check className="h-4 w-4 shrink-0 text-ink" strokeWidth={3} />
				)}
				{isPicked && lost && (
					<X className="h-4 w-4 shrink-0 text-brawl-red" strokeWidth={3} />
				)}
			</div>
		</div>
	);

	if (variant === "tile") {
		return (
			<div
				className={clsx(
					"relative flex h-full flex-col overflow-hidden rounded-lg border-2 bg-white text-ink",
					borderClass,
					shadowClass,
					className,
				)}
			>
				<div className="flex h-9 shrink-0 items-center justify-between gap-1.5 border-black border-b bg-paper px-3 py-1.5">
					<span className="min-w-0 truncate font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
						{matchLabel}
					</span>
					<div className="flex shrink-0 items-center gap-1">
						{statusPill ? (
							<span
								className={clsx(
									"inline-flex items-center gap-0.5 rounded-sm border-2 border-black px-1.5 py-0.5 font-black font-display text-[8px] uppercase shadow-comic-press",
									statusPill.className,
								)}
							>
								{isNoBet && <Minus className="h-2.5 w-2.5" strokeWidth={3} />}
								{won && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
								{lost && <X className="h-2.5 w-2.5" strokeWidth={3} />}
								{statusPill.label}
							</span>
						) : null}
						{typeof pointsEarned === "number" && pointsEarned > 0 && (
							<span className="rounded-sm border-2 border-black bg-electric-lime px-1.5 py-0.5 font-black font-body text-[9px] text-black tabular-nums shadow-comic-press">
								+{pointsEarned}
							</span>
						)}
					</div>
				</div>

				<div className="flex flex-1 flex-col justify-center gap-2 px-3 py-3">
					{renderTeamRow(teamA, pickedA, aWon)}

					<div className="flex h-12 shrink-0 flex-col items-center justify-center">
						{scorePrimary ? (
							<span className="font-black font-body text-2xl text-ink tabular-nums leading-none">
								{scorePrimary}
							</span>
						) : (
							<span className="font-black font-display text-gray-400 text-xs uppercase italic">
								VS
							</span>
						)}
						{scoreSecondary ? (
							<span className="mt-1 font-body font-bold text-[10px] text-gray-400 tabular-nums">
								{scoreSecondary}
							</span>
						) : !isFinished && !isProjected && startTime ? (
							<span className="mt-1 flex items-center gap-1 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								<Calendar className="h-3 w-3" strokeWidth={2} />
								{new Date(startTime).toLocaleString(locale, {
									day: "2-digit",
									month: "short",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						) : (
							<span className="mt-1 h-[14px]" aria-hidden />
						)}
					</div>

					{renderTeamRow(teamB, pickedB, bWon)}
				</div>

				<div className="mt-auto flex min-h-8 shrink-0 flex-wrap items-center gap-1 border-black border-t bg-paper px-3 py-1.5">
					{showFooterBadges ? (
						<>
							{isPerfectPick && (
								<span className="rounded-sm border border-black bg-brawl-yellow px-1 py-0.5 font-black font-display text-[8px] text-black uppercase">
									{t("perfectScore")}
								</span>
							)}
							{isUnderdogPick && won && (
								<span className="rounded-sm border border-black bg-ink px-1 py-0.5 font-black font-display text-[8px] text-white uppercase">
									{t("labels.underdogLabel")}
								</span>
							)}
							{(pointsEarned == null || pointsEarned === 0) && (
								<span className="font-body font-bold text-[8px] text-gray-500 uppercase tracking-widest">
									{t("result.noPoints")}
								</span>
							)}
						</>
					) : null}
				</div>
			</div>
		);
	}

	// --- Row variant (dashboard preview) ---
	return (
		<div
			className={clsx(
				"overflow-hidden rounded-lg border-2 bg-white text-ink",
				borderClass,
				shadowClass,
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2 border-black border-b bg-paper px-3 py-1.5">
				<div className="flex min-w-0 items-center gap-2">
					{headerLogoUrl ? (
						<img
							src={headerLogoUrl}
							alt={headerLogoAlt || matchLabel}
							className="h-4 w-4 shrink-0 object-contain"
						/>
					) : null}
					<span className="truncate font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
						{matchLabel}
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					{statusPill ? (
						<span
							className={clsx(
								"inline-flex items-center gap-1 rounded-sm border-2 border-black px-1.5 py-0.5 font-black font-display text-[9px] uppercase shadow-comic-press",
								statusPill.className,
							)}
						>
							{isNoBet && <Minus className="h-3 w-3" strokeWidth={3} />}
							{won && <Check className="h-3 w-3" strokeWidth={3} />}
							{lost && <X className="h-3 w-3" strokeWidth={3} />}
							{statusPill.label}
						</span>
					) : startTime && !isProjected ? (
						<span className="flex items-center gap-1 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
							<Calendar className="h-3 w-3" strokeWidth={2} />
							{new Date(startTime).toLocaleString(locale, {
								day: "2-digit",
								month: "short",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					) : null}
					{typeof pointsEarned === "number" && pointsEarned > 0 && (
						<span className="rounded-sm border-2 border-black bg-electric-lime px-1.5 py-0.5 font-black font-body text-[10px] text-black tabular-nums shadow-comic-press">
							+{pointsEarned}
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2 bg-white p-2.5 sm:gap-3 sm:p-3">
				<div
					className={clsx(
						"flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2 py-1.5",
						pickSideClass(pickedA),
					)}
				>
					{teamA.slug ? (
						<Link
							to={linkTo("/teams/$teamId")}
							params={{ teamId: teamA.slug }}
							title={t("teamPage")}
							aria-label={`${t("teamPage")}: ${teamA.name}`}
							className="shrink-0 transition-opacity hover:opacity-80"
							onClick={(e) => e.stopPropagation()}
						>
							<TeamLogo
								teamName={teamA.name}
								logoUrl={teamA.logoUrl}
								size="sm"
								className="shrink-0"
							/>
						</Link>
					) : (
						<TeamLogo
							teamName={teamA.name}
							logoUrl={teamA.logoUrl}
							size="sm"
							className="shrink-0"
						/>
					)}
					{renderTeamName(
						teamA,
						"min-w-0 flex-1 truncate pr-1.5 font-black font-display text-ink text-xs uppercase italic leading-[1.15] tracking-tighter sm:text-sm",
					)}
					{pickedA && won && (
						<Check
							className="ml-auto h-3.5 w-3.5 shrink-0 text-ink"
							strokeWidth={3}
						/>
					)}
					{pickedA && lost && (
						<X
							className="ml-auto h-3.5 w-3.5 shrink-0 text-brawl-red"
							strokeWidth={3}
						/>
					)}
				</div>

				<div className="flex shrink-0 flex-col items-center px-1">
					{scorePrimary ? (
						<span className="font-black font-body text-ink text-sm tabular-nums sm:text-base">
							{scorePrimary}
						</span>
					) : (
						<span className="font-black font-display text-[10px] text-gray-400 uppercase italic">
							VS
						</span>
					)}
					{scoreSecondary && (
						<span className="font-body font-bold text-[9px] text-gray-400 tabular-nums">
							{scoreSecondary}
						</span>
					)}
				</div>

				<div
					className={clsx(
						"flex min-w-0 flex-1 items-center justify-end gap-2 rounded-md border px-2 py-1.5",
						pickSideClass(pickedB),
					)}
				>
					{pickedB && won && (
						<Check
							className="mr-auto h-3.5 w-3.5 shrink-0 text-ink"
							strokeWidth={3}
						/>
					)}
					{pickedB && lost && (
						<X
							className="mr-auto h-3.5 w-3.5 shrink-0 text-brawl-red"
							strokeWidth={3}
						/>
					)}
					{renderTeamName(
						teamB,
						"min-w-0 flex-1 truncate pr-1.5 text-right font-black font-display text-ink text-xs uppercase italic leading-[1.15] tracking-tighter sm:text-sm",
					)}
					{teamB.slug ? (
						<Link
							to={linkTo("/teams/$teamId")}
							params={{ teamId: teamB.slug }}
							title={t("teamPage")}
							aria-label={`${t("teamPage")}: ${teamB.name}`}
							className="shrink-0 transition-opacity hover:opacity-80"
							onClick={(e) => e.stopPropagation()}
						>
							<TeamLogo
								teamName={teamB.name}
								logoUrl={teamB.logoUrl}
								size="sm"
								className="shrink-0"
							/>
						</Link>
					) : (
						<TeamLogo
							teamName={teamB.name}
							logoUrl={teamB.logoUrl}
							size="sm"
							className="shrink-0"
						/>
					)}
				</div>
			</div>
		</div>
	);
}

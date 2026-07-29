import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Calendar, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
import { TeamLogo } from "./TeamLogo";

export type Team = {
	id: number;
	name: string;
	slug?: string | null;
	logoUrl?: string | null;
	region?: string | null;
};

export type Match = {
	id: number;
	label?: string | null;
	name?: string | null;
	labelTeamA?: string | null;
	labelTeamB?: string | null;
	teamA?: Team | null;
	teamB?: Team | null;
	format: string;
	category: string;
	startTime: string | Date;
	status: "scheduled" | "live" | "finished";
	resultType?: "normal" | "wo";
	isBettingEnabled: boolean;
	scoreA?: number | null;
	scoreB?: number | null;
	winnerId?: number | null;
};

export type Bet = {
	id: number;
	matchId: number;
	predictedWinnerId: number | null;
	predictedScoreA: number;
	predictedScoreB: number;
	pointsEarned?: number | null;
	isUnderdogPick?: boolean | null;
	isPerfectPick?: boolean | null;
};

interface MatchCardProps {
	match: Match;
	initialBet?: Bet;
	showPredictionScore?: boolean;
	className?: string;
}

function cleanMatchLabel(name?: string | null, label?: string | null): string {
	const candidate = name || label || "";
	return candidate
		.replace(/Group\s+\w+\s*([-:|]\s*)?/i, "")
		.replace(/Match\s*\d*/i, "")
		.trim();
}

export function MatchCard({
	match,
	initialBet,
	showPredictionScore = false,
	className,
}: MatchCardProps) {
	const { t, i18n } = useTranslation("betting");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const { linkTo } = useLangLink();

	const isLive = match.status === "live";
	const isFinished = match.status === "finished";
	const isWalkover = match.resultType === "wo";
	const teamA = match.teamA;
	const teamB = match.teamB;

	const matchLabel = cleanMatchLabel(match.name, match.label);
	const showScores = isLive || isFinished || showPredictionScore;

	const userPredictedWinnerA =
		showPredictionScore &&
		!!teamA?.id &&
		initialBet?.predictedWinnerId === teamA.id;
	const userPredictedWinnerB =
		showPredictionScore &&
		!!teamB?.id &&
		initialBet?.predictedWinnerId === teamB.id;

	const walkoverScoreA =
		teamA?.id && match.winnerId === teamA.id
			? t("walkover.win")
			: t("walkover.forfeit");
	const walkoverScoreB =
		teamB?.id && match.winnerId === teamB.id
			? t("walkover.win")
			: t("walkover.forfeit");

	const displayScoreA =
		showPredictionScore && initialBet
			? initialBet.predictedScoreA
			: (match.scoreA ?? 0);
	const displayScoreB =
		showPredictionScore && initialBet
			? initialBet.predictedScoreB
			: (match.scoreB ?? 0);

	const start = new Date(match.startTime);
	const formattedStartDate = start
		.toLocaleDateString(locale, {
			day: "2-digit",
			month: "short",
			timeZone: "America/Sao_Paulo",
		})
		.toUpperCase()
		.replace(".", "");
	const formattedStartTime = start.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Sao_Paulo",
	});

	const betCorrect =
		!!initialBet && match.winnerId === initialBet.predictedWinnerId;
	const betIncorrect = isFinished && !!initialBet && !betCorrect;
	const points = initialBet?.pointsEarned;

	const renderTeam = (
		side: "a" | "b",
		team: Team | null | undefined,
		fallbackLabel: string | null | undefined,
		isPicked: boolean,
	) => {
		const name = team?.name || fallbackLabel || t("matchCard.tbd");

		return (
			<div
				className={clsx(
					"flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md border px-2 py-2 text-center sm:gap-2 sm:px-3",
					isPicked
						? "surface-lime border-black"
						: "border-transparent bg-transparent",
				)}
			>
				{team?.slug ? (
					<Link
						to={linkTo("/teams/$teamId")}
						params={{ teamId: team.slug }}
						className="shrink-0 transition-opacity hover:opacity-80"
						onClick={(e) => e.stopPropagation()}
					>
						<TeamLogo
							teamName={name}
							logoUrl={team.logoUrl}
							size="lg"
							className="shrink-0"
						/>
					</Link>
				) : (
					<TeamLogo
						teamName={name}
						logoUrl={team?.logoUrl}
						size="lg"
						className="shrink-0"
					/>
				)}

				<div className="flex w-full min-w-0 flex-col items-center gap-0.5">
					{team?.slug ? (
						<Link
							to={linkTo("/teams/$teamId")}
							params={{ teamId: team.slug }}
							title={team.name}
							className="line-clamp-2 w-full break-words px-0.5 pb-0.5 text-center font-black font-display text-ink text-sm uppercase italic leading-[1.15] tracking-tighter hover:text-brawl-blue hover:underline sm:text-base"
						>
							{team.name}
						</Link>
					) : (
						<span
							title={name}
							className="line-clamp-2 w-full break-words px-0.5 pb-0.5 text-center font-black font-display text-ink text-sm uppercase italic leading-[1.15] tracking-tighter sm:text-base"
						>
							{name}
						</span>
					)}
					{initialBet && !showPredictionScore ? (
						<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
							{t("betPredictionPrefix")}{" "}
							{side === "a"
								? initialBet.predictedScoreA
								: initialBet.predictedScoreB}
						</span>
					) : null}
				</div>
			</div>
		);
	};

	return (
		<article
			className={clsx(
				"relative mx-auto w-full max-w-2xl overflow-hidden border-[3px] border-black bg-white text-ink shadow-comic-md transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press",
				isLive && "ring-2 ring-brawl-red ring-offset-2",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2 border-black border-b-[3px] bg-paper px-3 py-1.5">
				<div className="flex min-w-0 items-center gap-2">
					{matchLabel ? (
						<span className="surface-ink -skew-x-6 border-2 border-black px-2 py-0.5 font-black font-display text-[9px] uppercase italic shadow-comic-sm sm:text-[10px]">
							<span className="inline-block skew-x-6">{matchLabel}</span>
						</span>
					) : (
						<span className="truncate font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
							{match.category}
						</span>
					)}
					{initialBet && showPredictionScore ? (
						<span className="surface-lime border-2 border-black px-1.5 py-0.5 font-black font-display text-[8px] uppercase shadow-comic-sm">
							{t("betSaved")}
						</span>
					) : null}
					{isWalkover && isFinished ? (
						<span className="surface-brawl-red border-2 border-black px-1.5 py-0.5 font-black font-display text-[8px] uppercase shadow-comic-sm">
							{t("badges.wo")}
						</span>
					) : null}
				</div>

				<div className="flex shrink-0 items-center gap-1.5">
					{isLive ? (
						<span className="surface-brawl-red inline-flex animate-pulse items-center border-2 border-black px-1.5 py-0.5 font-black font-display text-[9px] uppercase shadow-comic-sm">
							{t("badges.live")}
						</span>
					) : (
						<span
							className="flex items-center gap-1 font-body font-bold text-[10px] text-gray-600 uppercase tabular-nums tracking-widest"
							suppressHydrationWarning
						>
							<Calendar className="h-3 w-3" strokeWidth={2.5} />
							{formattedStartDate} {formattedStartTime}
						</span>
					)}
					{isFinished && initialBet && typeof points === "number" ? (
						<span
							className={clsx(
								"inline-flex items-center gap-1 border-2 border-black px-1.5 py-0.5 font-black font-body text-[10px] uppercase tabular-nums shadow-comic-sm",
								betCorrect ? "surface-lime" : "surface-brawl-red",
							)}
						>
							{betCorrect ? (
								<Check className="h-3 w-3" strokeWidth={3} />
							) : (
								<X className="h-3 w-3" strokeWidth={3} />
							)}
							{points > 0 ? `+${points}` : points} {t("matchCard.pts")}
						</span>
					) : null}
				</div>
			</div>

			<div className="flex items-stretch gap-2 bg-white p-2.5 sm:gap-3 sm:p-3">
				{renderTeam("a", teamA, match.labelTeamA, !!userPredictedWinnerA)}

				<div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 self-center sm:w-24">
					{showScores ? (
						<div className="flex items-center gap-1.5 sm:gap-2">
							<span
								className={clsx(
									"flex h-9 w-8 items-center justify-center border-[3px] border-black font-black font-body text-lg tabular-nums shadow-comic-sm sm:h-11 sm:w-10 sm:text-2xl",
									userPredictedWinnerA ||
										(isFinished && match.winnerId === teamA?.id)
										? "surface-lime"
										: "bg-white text-ink",
								)}
							>
								{isWalkover && isFinished ? walkoverScoreA : displayScoreA}
							</span>
							<span className="font-black font-display text-ink text-xs uppercase italic">
								{isWalkover && isFinished
									? t("walkover.forfeit")
									: t("matchCard.vs")}
							</span>
							<span
								className={clsx(
									"flex h-9 w-8 items-center justify-center border-[3px] border-black font-black font-body text-lg tabular-nums shadow-comic-sm sm:h-11 sm:w-10 sm:text-2xl",
									userPredictedWinnerB ||
										(isFinished && match.winnerId === teamB?.id)
										? "surface-lime"
										: "bg-white text-ink",
								)}
							>
								{isWalkover && isFinished ? walkoverScoreB : displayScoreB}
							</span>
						</div>
					) : (
						<div className="surface-ink -skew-x-12 border-[3px] border-black px-2.5 py-1 shadow-comic-sm">
							<span className="inline-block skew-x-12 font-black font-display text-[10px] text-electric-lime uppercase italic sm:text-xs">
								{t("matchCard.vs")}
							</span>
						</div>
					)}
				</div>

				{renderTeam("b", teamB, match.labelTeamB, !!userPredictedWinnerB)}
			</div>

			{isFinished && initialBet && points != null ? (
				<div className="flex flex-wrap items-center gap-2 border-black border-t-[3px] bg-paper px-3 py-1.5">
					{betIncorrect ? (
						<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
							{t("prediction.incorrect")}
						</span>
					) : (
						<>
							{initialBet.isPerfectPick ? (
								<span className="surface-yellow border border-black px-1.5 py-0.5 font-black font-display text-[8px] uppercase">
									{t("perfectScore")}
								</span>
							) : (
								<span className="font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
									{t("correctWinner")}
								</span>
							)}
							{initialBet.isUnderdogPick ? (
								<span className="surface-ink border border-black px-1.5 py-0.5 font-black font-display text-[8px] uppercase">
									{t("labels.underdogLabel")}
								</span>
							) : null}
						</>
					)}
					<span className="ml-auto font-body font-bold text-[10px] text-ink uppercase tabular-nums tracking-widest">
						{t("totalPoints", { count: points })}
					</span>
				</div>
			) : null}
		</article>
	);
}

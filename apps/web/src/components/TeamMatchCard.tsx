import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TeamLogo } from "@/components/TeamLogo";
import { useLangLink } from "@/i18n/useLangLink";

type TeamRef = {
	id?: number | null;
	name?: string | null;
	slug?: string | null;
	logoUrl?: string | null;
};

type TournamentRef = {
	name?: string | null;
	slug?: string | null;
	logoUrl?: string | null;
};

type SharedMatchProps = {
	team: { id: number; name: string; logoUrl?: string | null };
	teamAId: number | null;
	teamA: TeamRef | null;
	teamB: TeamRef | null;
	startTime: string | Date;
	tournament?: TournamentRef | null;
	locale: string;
};

type TeamUpcomingRowProps = SharedMatchProps & {
	status: "scheduled" | "live" | "finished";
};

type TeamHistoryRowProps = SharedMatchProps & {
	winnerId?: number | null;
	scoreA?: number | null;
	scoreB?: number | null;
	resultType?: "wo" | null;
};

function formatMonthDay(
	date: Date,
	locale: string,
): { month: string; day: number } {
	return {
		month: date
			.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })
			.toUpperCase()
			.replace(".", ""),
		day: date.getUTCDate(),
	};
}

function formatTime(date: Date, locale: string): string {
	return date.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
		hour12: false,
	});
}

function resolveOpponent(
	teamId: number,
	teamAId: number | null,
	teamA: TeamRef | null,
	teamB: TeamRef | null,
): TeamRef | null {
	return teamAId === teamId ? teamB : teamA;
}

function OpponentCell({
	opponent,
	tournament,
	tbdLabel,
}: {
	opponent: TeamRef | null;
	tournament?: TournamentRef | null;
	tbdLabel: string;
}) {
	const { linkTo } = useLangLink();
	const name = opponent?.name || tbdLabel;

	const tournamentLink =
		tournament?.slug && tournament.name ? (
			<Link
				to={linkTo("/tournaments/$slug")}
				params={{ slug: tournament.slug }}
				className="mt-0.5 flex min-w-0 items-center gap-1.5 font-body font-bold text-[9px] text-gray-600 uppercase tracking-widest transition-colors hover:text-ink"
			>
				{tournament.logoUrl ? (
					<img
						src={tournament.logoUrl}
						alt=""
						className="h-3.5 w-3.5 shrink-0 object-contain"
					/>
				) : (
					<Trophy className="h-3 w-3 shrink-0 text-gray-500" />
				)}
				<span className="min-w-0 break-words leading-tight">
					{tournament.name}
				</span>
			</Link>
		) : tournament?.name ? (
			<span className="mt-0.5 flex min-w-0 items-center gap-1.5 font-body font-bold text-[9px] text-gray-600 uppercase tracking-widest">
				{tournament.logoUrl ? (
					<img
						src={tournament.logoUrl}
						alt=""
						className="h-3.5 w-3.5 shrink-0 object-contain"
					/>
				) : (
					<Trophy className="h-3 w-3 shrink-0 text-gray-500" />
				)}
				<span className="min-w-0 break-words leading-tight">
					{tournament.name}
				</span>
			</span>
		) : null;

	const nameEl = (
		<span className="min-w-0 break-words pe-[0.2em] pb-0.5 font-black font-display text-ink text-sm uppercase italic leading-[1.15] tracking-tighter">
			{name}
		</span>
	);

	const textStack = (
		<div className="min-w-0 flex-1">
			{opponent?.slug ? (
				<Link
					to={linkTo("/teams/$teamId")}
					params={{ teamId: opponent.slug }}
					className="block transition-colors hover:text-brawl-blue"
				>
					{nameEl}
				</Link>
			) : (
				nameEl
			)}
			{tournamentLink}
		</div>
	);

	return (
		<div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
			<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-white p-1 shadow-comic-sm sm:h-10 sm:w-10">
				<TeamLogo
					teamName={name}
					logoUrl={opponent?.logoUrl}
					className="h-full w-full object-contain"
				/>
			</div>
			{textStack}
		</div>
	);
}

function DateCell({ month, day }: { month: string; day: number }) {
	return (
		<div className="hidden w-14 shrink-0 text-right sm:block">
			<div className="font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
				{month}
			</div>
			<div className="font-black font-display text-ink text-sm tabular-nums leading-none">
				{day}
			</div>
		</div>
	);
}

function MatchRowShell({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-center gap-2.5 px-3 py-2.5 text-ink sm:gap-3 sm:px-4 sm:py-3">
			{children}
		</li>
	);
}

/** Compact W/L form strip — oldest left, most recent right. */
export function TeamFormStrip({
	results,
}: {
	results: Array<{ id: number; won: boolean }>;
}) {
	const { t } = useTranslation("team");
	if (results.length === 0) return null;

	return (
		<div
			className="flex flex-wrap items-center gap-1"
			aria-label={t("sections.form")}
		>
			{results.map((result) => (
				<span
					key={result.id}
					className={clsx(
						"flex h-6 w-6 items-center justify-center border-2 border-black font-black font-display text-[10px] uppercase shadow-comic-sm",
						result.won ? "surface-lime" : "surface-ink",
					)}
					title={result.won ? t("status.win") : t("status.loss")}
				>
					{result.won ? t("status.win") : t("status.loss")}
				</span>
			))}
		</div>
	);
}

/** Compact upcoming row — mirrors history layout. */
export function TeamUpcomingRow({
	team,
	teamAId,
	teamA,
	teamB,
	status,
	startTime,
	tournament,
	locale,
}: TeamUpcomingRowProps) {
	const { t } = useTranslation("team");
	const { linkTo } = useLangLink();

	const opponent = resolveOpponent(team.id, teamAId, teamA, teamB);
	const isLive = status === "live";
	const start = new Date(startTime);
	const { month, day } = formatMonthDay(start, locale);
	const time = formatTime(start, locale);

	return (
		<MatchRowShell>
			<span
				className={clsx(
					"flex h-8 shrink-0 items-center justify-center border-[3px] border-black font-black font-display text-[9px] uppercase italic leading-none shadow-comic-sm",
					isLive ? "surface-brawl-red min-w-8 px-1.5" : "surface-lime w-8",
				)}
				aria-label={isLive ? t("status.live") : t("vs")}
			>
				{isLive ? t("status.live") : t("vs")}
			</span>

			<div
				className={clsx(
					"flex min-w-[3.25rem] shrink-0 items-center justify-center border-2 border-black px-2 py-1 font-black font-body tabular-nums shadow-comic-sm sm:min-w-[3.75rem] sm:px-2.5",
					isLive ? "surface-brawl-red" : "bg-tape text-ink",
				)}
			>
				<span className="text-sm sm:text-base">
					{isLive ? t("status.now") : time}
				</span>
			</div>

			<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
				<span className="shrink-0 font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
					{t("vs")}
				</span>
				<OpponentCell
					opponent={opponent}
					tournament={tournament}
					tbdLabel={t("tbd")}
				/>
			</div>

			<DateCell month={month} day={day} />

			<Link
				to={linkTo("/")}
				className={clsx(
					"shrink-0 border-2 border-black px-2.5 py-1.5 font-black font-display text-[10px] uppercase tracking-wider shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press sm:px-3 sm:text-xs",
					isLive ? "surface-brawl-red" : "surface-yellow",
				)}
			>
				{isLive ? t("actions.follow") : t("actions.bet")}
			</Link>
		</MatchRowShell>
	);
}

/** Compact result row — outcome, score, then opponent. */
export function TeamHistoryRow({
	team,
	teamAId,
	teamA,
	teamB,
	winnerId,
	scoreA,
	scoreB,
	resultType,
	startTime,
	tournament,
	locale,
}: TeamHistoryRowProps) {
	const { t } = useTranslation("team");

	const opponent = resolveOpponent(team.id, teamAId, teamA, teamB);
	const isTeamA = teamAId === team.id;
	const isWin = winnerId === team.id;
	const isWalkover = resultType === "wo";
	const teamScore = isTeamA ? scoreA : scoreB;
	const opponentScore = isTeamA ? scoreB : scoreA;
	const teamScoreDisplay = isWalkover ? (isWin ? "W" : "FF") : teamScore;
	const opponentScoreDisplay = isWalkover
		? isWin
			? "FF"
			: "W"
		: opponentScore;

	const start = new Date(startTime);
	const { month, day } = formatMonthDay(start, locale);

	return (
		<MatchRowShell>
			<span
				className={clsx(
					"flex h-8 w-8 shrink-0 items-center justify-center border-[3px] border-black font-black font-display text-xs uppercase italic shadow-comic-sm",
					isWin ? "surface-lime" : "surface-ink",
				)}
				aria-label={isWin ? t("status.win") : t("status.loss")}
			>
				{isWin ? t("status.win") : t("status.loss")}
			</span>

			<div
				className={clsx(
					"flex shrink-0 items-center gap-1 border-2 border-black px-2 py-1 font-black font-body tabular-nums shadow-comic-sm sm:px-2.5",
					isWin ? "bg-electric-lime/30 text-ink" : "bg-tape text-ink",
				)}
			>
				<span className="text-sm sm:text-base">{teamScoreDisplay}</span>
				<span className="font-display text-xs opacity-50">-</span>
				<span className="text-sm sm:text-base">{opponentScoreDisplay}</span>
				{isWalkover ? (
					<span className="surface-ink ml-0.5 border border-black px-1 py-0.5 font-body font-bold text-[8px] uppercase tracking-widest">
						{t("status.wo")}
					</span>
				) : null}
			</div>

			<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
				<span className="shrink-0 font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
					{t("vs")}
				</span>
				<OpponentCell
					opponent={opponent}
					tournament={tournament}
					tbdLabel={t("tbd")}
				/>
			</div>

			<DateCell month={month} day={day} />
		</MatchRowShell>
	);
}

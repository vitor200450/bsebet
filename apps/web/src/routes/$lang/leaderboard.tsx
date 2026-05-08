import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Calendar,
	ChevronDown,
	Crown,
	Globe,
	Star,
	Target,
	Trophy,
	Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { useLangLink } from "@/i18n/useLangLink";
import {
	MedalCountSummary,
	MiniMedalBadge,
} from "../../components/MiniMedalBadge";
import { getUser } from "../../functions/get-user";
import {
	getLeaderboard,
	getLeaderboardTournaments,
	type LeaderboardEntry,
} from "../../server/leaderboard";

const searchSchema = z.object({
	tab: z.enum(["season", "global"]).catch("global"),
	tournamentId: z.number().optional(),
});

export const Route = createFileRoute("/$lang/leaderboard")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		tab: search.tab,
		tournamentId: search.tournamentId,
	}),
	loader: async ({ deps }) => {
		const [session, tournaments, leaderboard] = await Promise.all([
			getUser().catch(() => null),
			getLeaderboardTournaments(),
			getLeaderboard({
				data: deps.tab === "season" ? deps.tournamentId : undefined,
			}),
		]);
		return { session, tournaments, leaderboard };
	},
	component: LeaderboardPage,
});

function LeaderboardPage() {
	const { t } = useTranslation("leaderboard");
	const { session, leaderboard, tournaments } = Route.useLoaderData();
	const { tab, tournamentId: urlTournamentId } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const currentUserId = session?.user?.id;

	// Default to first tournament if none selected in season mode
	const tournamentId =
		urlTournamentId || (tournaments.length > 0 ? tournaments[0].id : undefined);

	useEffect(() => {
		if (tab === "season" && !urlTournamentId && tournaments.length > 0) {
			navigate({
				search: (prev) => ({ ...prev, tournamentId: tournaments[0].id }),
				replace: true,
			});
		}
	}, [tab, urlTournamentId, tournaments, navigate]);

	const activeTournament = tournaments.find((t) => t.id === tournamentId);
	const tournamentOptions = tournaments.map((tournament) => ({
		value: String(tournament.id),
		label: tournament.name,
	}));

	const top3 = leaderboard.slice(0, 3);
	const rest = leaderboard.slice(3);

	return (
		<div className="relative min-h-screen bg-[#f0f0f0]">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			<div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8 md:py-12">
				{/* Clean Header */}
				<header className="mb-8 text-center">
					<div className="mb-4 flex justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-black bg-[#ffc700] shadow-[3px_3px_0_0_#000]">
							<Trophy className="h-8 w-8 text-black" strokeWidth={2.5} />
						</div>
					</div>
					<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl">
						{t("title")}
					</h1>
					<p className="mt-2 font-bold text-gray-600 text-lg">
						{t("subtitle")}
					</p>
				</header>

				{/* Tab Switcher - Clean */}
				<div className="mb-8 flex items-center gap-1 rounded-lg border-2 border-black bg-white p-1 shadow-[3px_3px_0_0_#000]">
					<button
						type="button"
						onClick={() =>
							navigate({
								search: { tab: "season", tournamentId: tournaments[0]?.id },
							})
						}
						className={clsx(
							"flex items-center gap-2 rounded-md px-4 py-2 font-bold text-sm uppercase tracking-wider transition-all",
							tab === "season"
								? "bg-[#121212] text-white"
								: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-[#121212]",
						)}
					>
						<Calendar className="h-4 w-4" strokeWidth={2.5} />
						{t("tabs.season")}
					</button>
					<button
						type="button"
						onClick={() => navigate({ search: { tab: "global" } })}
						className={clsx(
							"flex items-center gap-2 rounded-md px-4 py-2 font-bold text-sm uppercase tracking-wider transition-all",
							tab === "global"
								? "bg-[#121212] text-white"
								: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-[#121212]",
						)}
					>
						<Globe className="h-4 w-4" strokeWidth={2.5} />
						{t("tabs.global")}
					</button>
				</div>

				{/* Tournament Selector - Clean */}
				{tab === "season" && activeTournament && (
					<div className="mb-8 flex w-full max-w-sm flex-col items-center">
						<div className="mb-4 w-full rounded-lg border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
							<div className="mb-2 flex items-center gap-2 text-gray-600">
								<Calendar className="h-4 w-4" strokeWidth={2.5} />
								<span className="font-bold text-sm uppercase tracking-wider">
									{t("selectTournament")}
								</span>
							</div>
							<CustomSelect
								label=""
								value={String(activeTournament.id)}
								onChange={(value) => {
									const scrollY = window.scrollY;
									navigate({
										search: {
											tab: "season",
											tournamentId: Number(value),
										},
										replace: true,
										resetScroll: false,
									});
									requestAnimationFrame(() => {
										window.scrollTo(0, scrollY);
									});
								}}
								options={tournamentOptions}
								placeholder={t("selectTournament")}
							/>
						</div>

						{/* Tournament Logo */}
						<div className="relative mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-white shadow-[3px_3px_0_0_#000]">
							{activeTournament.logoUrl ? (
								<img
									src={activeTournament.logoUrl}
									alt="Tournament Logo"
									className="h-full w-full object-contain p-3"
								/>
							) : (
								<Trophy className="h-10 w-10 text-gray-300" strokeWidth={2} />
							)}
						</div>

						{/* Tournament Name Badge */}
						<div className="mb-4 rounded-lg border-2 border-black bg-[#121212] px-4 py-2 shadow-[3px_3px_0_0_#000]">
							<span className="font-black text-sm text-white uppercase">
								{activeTournament.name}
							</span>
						</div>
					</div>
				)}

				{/* Tiebreaker Rules - Clean */}
				<div className="mb-6 w-full rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
					<div className="mb-4 flex items-center gap-2 border-black/10 border-b pb-3">
						<Target className="h-4 w-4 text-[#121212]" strokeWidth={2} />
						<span className="font-bold text-[#121212] text-sm uppercase tracking-wider">
							{t("rankingCriteria")}
						</span>
						<span className="ml-auto rounded bg-[#f0f0f0] px-2 py-1 font-bold text-[10px] text-gray-600 uppercase">
							{tab === "global" ? t("tabs.global") : t("tabs.tournament")}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{/* Criteria */}
						{[
							{
								num: 1,
								label: t("columns.totalPoints"),
								desc: t("columns.primaryCriteria"),
								color: "bg-[#ffc700]",
							},
							{
								num: 2,
								label: t("columns.hitCount"),
								desc: t("columns.tiebreaker1"),
								color: "bg-gray-200",
							},
							{
								num: 3,
								label: t("columns.perfect"),
								desc: t("columns.tiebreaker2"),
								color: "bg-gray-300",
							},
							{
								num: 4,
								label: t("columns.underdogs"),
								desc: t("columns.tiebreaker3"),
								color: "bg-purple-300",
							},
							{
								num: 5,
								label:
									tab === "global"
										? t("columns.medals")
										: t("columns.decisiveMatch"),
								desc:
									tab === "global"
										? t("columns.tiebreaker4")
										: t("columns.tiebreakerFinal"),
								color: "bg-yellow-300",
							},
							...(tab === "season"
								? [
										{
											num: 6,
											label: t("columns.lastMonthResult"),
											desc: t("columns.previousTournaments"),
											color: "bg-[#2e5cff] text-white",
										},
										{
											num: 7,
											label: t("tabs.global"),
											desc: t("columns.globalPosition"),
											color: "bg-[#ff2e2e] text-white",
										},
									]
								: []),
						].map((c) => (
							<div
								key={c.num}
								className="flex items-center gap-3 rounded-lg bg-[#f8f8f8] px-3 py-2"
							>
								<div
									className={clsx(
										"flex h-6 w-6 shrink-0 items-center justify-center rounded font-black text-xs",
										c.color,
									)}
								>
									{c.num}
								</div>
								<div>
									<p className="font-bold text-[#121212] text-xs uppercase">
										{c.label}
									</p>
									<p className="font-medium text-[10px] text-gray-500">
										{c.desc}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Legend - Clean */}
				<div className="mb-6 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-black/10 bg-white/80 px-4 py-3">
					<span className="font-bold text-[10px] text-gray-500 uppercase">
						{t("legend")}:
					</span>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded bg-[#ffc700] px-1.5 py-0.5">
							<Star
								className="h-3 w-3 text-black"
								fill="black"
								strokeWidth={0}
							/>
							<span className="font-black text-[10px] text-black">0</span>
						</div>
						<span className="text-[10px] text-gray-600">
							{t("columns.perfect")}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded border border-black/20 bg-white px-1.5 py-0.5">
							<span className="font-black text-[10px] text-green-600">✓</span>
							<span className="font-black text-[10px] text-black">0</span>
						</div>
						<span className="text-[10px] text-gray-600">
							{t("columns.hits")}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded bg-green-500 px-1.5 py-0.5">
							<span className="font-black text-[10px] text-white">70%</span>
						</div>
						<span className="text-[10px] text-gray-600">
							{t("columns.hitRate")}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded bg-purple-400 px-1.5 py-0.5">
							<Zap className="h-3 w-3 text-black" strokeWidth={2} />
							<span className="font-black text-[10px] text-black">0</span>
						</div>
						<span className="text-[10px] text-gray-600">
							{t("columns.underdogs")}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<MiniMedalBadge tier="1st" size="sm" />
						<MiniMedalBadge tier="2nd" size="sm" />
						<MiniMedalBadge tier="3rd" size="sm" />
						<span className="text-[10px] text-gray-600">
							{t("columns.medals")}
						</span>
					</div>
				</div>

				{leaderboard.length === 0 ? (
					/* Empty State - Clean */
					<div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-black/30 border-dashed bg-white/50 py-16 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f0f0]">
							<Trophy className="h-8 w-8 text-gray-400" strokeWidth={2} />
						</div>
						<h2 className="mb-2 font-black text-[#121212] text-xl uppercase">
							{t("empty")}
						</h2>
						<p className="text-gray-600 text-sm">{t("emptyHint")}</p>
					</div>
				) : (
					<>
						{/* Podium Section */}
						{top3.length > 0 && (
							<PodiumSection
								entries={top3}
								currentUserId={currentUserId}
								tab={tab}
							/>
						)}

						{/* Leaderboard List */}
						<div className="mt-10 w-full space-y-3">
							{rest.map((entry) => (
								<LeaderboardCard
									key={entry.userId}
									entry={entry}
									isCurrentUser={entry.userId === currentUserId}
								/>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function getTiebreakerReason(
	higher: LeaderboardEntry,
	lower: LeaderboardEntry,
	tab: "global" | "season",
	t: (key: string) => string,
): string | null {
	// Check if there's actually a tie that needed breaking
	if (higher.totalPoints !== lower.totalPoints) return null;

	// Check each tiebreaker criterion
	if (higher.correctPredictions !== lower.correctPredictions) {
		return t("columns.hits");
	}
	if (higher.perfectPicks !== lower.perfectPicks) {
		return t("columns.perfect");
	}
	if (higher.underdogPicks !== lower.underdogPicks) {
		return t("columns.underdogs");
	}

	if (tab === "global") {
		if (higher.medals.total !== lower.medals.total) {
			return t("columns.medals");
		}
	} else {
		// Season-specific tiebreakers
		if (higher.gotMostImportantMatch !== lower.gotMostImportantMatch) {
			return t("columns.decisiveMatch");
		}
		if (
			higher.bestPreviousMonthResult !== lower.bestPreviousMonthResult &&
			(higher.bestPreviousMonthResult === null) !==
				(lower.bestPreviousMonthResult === null)
		) {
			return t("columns.lastMonthResult");
		}
		if (higher.globalRank !== lower.globalRank) {
			return t("tabs.global");
		}
	}

	return null;
}

function PodiumSection({
	entries,
	currentUserId,
	tab,
}: {
	entries: LeaderboardEntry[];
	currentUserId?: string;
	tab: "global" | "season";
}) {
	const { t } = useTranslation("leaderboard");
	const first = entries[0];
	const second = entries[1];
	const third = entries[2];

	const podiumConfig = {
		1: {
			bg: "bg-[#ffc700]",
			border: "border-[#ffc700]",
			shadow: "shadow-[6px_6px_0_0_#000]",
			height: "h-56",
			avatar: "h-24 w-24",
			avatarBorder: "border-[#ffc700]",
			crown: true,
			z: "z-20",
			scale: "scale-105",
			rankColor: "text-[#d4a800]",
			rankSize: "text-7xl",
			medal: { gold: true, silver: false, bronze: false },
		},
		2: {
			bg: "bg-[#c0c0c0]",
			border: "border-[#c0c0c0]",
			shadow: "shadow-[4px_4px_0_0_#000]",
			height: "h-44",
			avatar: "h-20 w-20",
			avatarBorder: "border-[#a8a8a8]",
			crown: false,
			z: "z-10",
			scale: "",
			rankColor: "text-[#909090]",
			rankSize: "text-6xl",
			medal: { gold: false, silver: true, bronze: false },
		},
		3: {
			bg: "bg-[#cd7f32]",
			border: "border-[#cd7f32]",
			shadow: "shadow-[4px_4px_0_0_#000]",
			height: "h-38",
			avatar: "h-20 w-20",
			avatarBorder: "border-[#a0622e]",
			crown: false,
			z: "z-10",
			scale: "",
			rankColor: "text-[#8b5e2a]",
			rankSize: "text-5xl",
			medal: { gold: false, silver: false, bronze: true },
		},
	};

	const PodiumColumn = ({
		entry,
		rank,
		tiebreakerReason,
	}: {
		entry?: LeaderboardEntry;
		rank: 1 | 2 | 3;
		tiebreakerReason?: string | null;
	}) => {
		const { linkTo } = useLangLink();
		if (!entry) return <div className="flex flex-1 flex-col items-center" />;
		const cfg = podiumConfig[rank];
		const isMe = entry.userId === currentUserId;
		const accuracyRate =
			entry.totalBets > 0
				? Math.round((entry.correctPredictions / entry.totalBets) * 100)
				: 0;

		const rankLabel = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";
		const medalKind = cfg.medal.gold
			? "gold"
			: cfg.medal.silver
				? "silver"
				: "bronze";

		return (
			<div
				className={clsx("flex flex-1 flex-col items-center", cfg.z, cfg.scale)}
			>
				{/* Crown for 1st */}
				{cfg.crown && (
					<div className="mb-1">
						<Crown
							className="h-8 w-8 text-[#ffc700]"
							fill="#ffc700"
							strokeWidth={2}
						/>
					</div>
				)}

				{/* Medal badge for 2nd/3rd */}
				{!cfg.crown && (
					<div className="mb-1">
						<MiniMedalBadge
							tier={rankLabel as "1st" | "2nd" | "3rd"}
							size="sm"
						/>
					</div>
				)}

				{/* Avatar */}
				<Link
					to={linkTo("/users/$userId")}
					params={{ userId: entry.userId }}
					className="group relative"
				>
					<div
						className={clsx(
							"mb-1 overflow-hidden rounded-lg border-2 bg-white transition-transform group-hover:scale-105",
							cfg.avatar,
							cfg.avatarBorder,
							cfg.shadow,
							isMe && "ring-[#ccff00] ring-[3px]",
						)}
					>
						{entry.image ? (
							<img
								src={entry.image}
								alt={entry.name}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-[#f0f0f0] font-black text-gray-400 text-xl">
								{entry.name.charAt(0).toUpperCase()}
							</div>
						)}
					</div>
					{/* Rank badge */}
					<div
						className={clsx(
							"absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-lg border-2 border-black font-black text-xs shadow-sm",
							rank === 1
								? "bg-[#ffc700] text-black"
								: "bg-[#121212] text-white",
						)}
					>
						{rank}
					</div>
				</Link>

				{/* Name */}
				<Link
					to={linkTo("/users/$userId")}
					params={{ userId: entry.userId }}
					className="mb-1"
				>
					<span
						className={clsx(
							"block max-w-[140px] truncate text-center font-black text-sm uppercase tracking-tight",
							isMe ? "text-[#2e5cff]" : "text-[#121212]",
							rank === 1 && "text-base",
						)}
					>
						{entry.name}
					</span>
				</Link>

				{/* Points */}
				<div className="mb-2 text-center">
					<span
						className={clsx(
							"block font-black leading-none",
							rank === 1 ? "text-4xl" : "text-3xl",
							rank === 1 ? "text-black" : "text-[#121212]",
						)}
					>
						{entry.totalPoints}
					</span>
					<span className="block font-bold text-[10px] text-gray-500 uppercase tracking-[0.2em]">
						PTS
					</span>
				</div>

				{/* Medals */}
				<div className="mb-1.5 h-6">
					{entry.medals.total > 0 && (
						<MedalCountSummary
							gold={entry.medals.gold}
							silver={entry.medals.silver}
							bronze={entry.medals.bronze}
							size="sm"
						/>
					)}
				</div>

				{/* Tiebreaker */}
				<div className="mb-2 h-6">
					{tiebreakerReason && (
						<div className="inline-flex items-center rounded border border-black bg-[#ccff00] px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
							<span className="font-black text-[9px] text-black uppercase">
								{tiebreakerReason}
							</span>
						</div>
					)}
				</div>

				{/* Stats */}
				<div className="mb-4 flex flex-col items-center gap-1.5">
					<div className="flex items-center gap-1">
						<div className="flex items-center gap-0.5 rounded border border-black bg-[#ffc700] px-1.5 py-0.5 shadow-[1.5px_1.5px_0_0_#000]">
							<Star className="h-3 w-3 text-black" fill="black" />
							<span className="font-black text-[10px] text-black">
								{entry.perfectPicks}
							</span>
						</div>
						<div className="flex items-center gap-0.5 rounded border border-black bg-white px-1.5 py-0.5 shadow-[1.5px_1.5px_0_0_#000]">
							<span className="font-black text-[10px] text-green-600">✓</span>
							<span className="font-black text-[10px] text-black">
								{entry.correctPredictions}
							</span>
						</div>
						{entry.underdogPicks > 0 && (
							<div className="flex items-center gap-0.5 rounded border border-black bg-purple-400 px-1.5 py-0.5 shadow-[1.5px_1.5px_0_0_#000]">
								<Zap className="h-3 w-3 text-black" strokeWidth={3} />
								<span className="font-black text-[10px] text-black">
									{entry.underdogPicks}
								</span>
							</div>
						)}
					</div>
					<div
						className={clsx(
							"rounded border border-black px-2 py-0.5 shadow-[2px_2px_0_0_#000]",
							accuracyRate >= 70
								? "bg-green-500"
								: accuracyRate >= 40
									? "bg-yellow-400"
									: "bg-red-500",
						)}
					>
						<span
							className={clsx(
								"font-black text-[10px]",
								accuracyRate >= 40 ? "text-black" : "text-white",
							)}
						>
							{accuracyRate}%
						</span>
					</div>
				</div>

				{/* Base */}
				<div
					className={clsx(
						"relative mt-auto w-full rounded-t-xl border-[3px] border-black transition-all",
						rank === 1 ? "-skew-x-1" : rank === 2 ? "-skew-x-1" : "skew-x-1",
						cfg.bg,
						cfg.height,
						cfg.shadow,
					)}
				>
					<span
						className={clsx(
							"absolute bottom-2 left-1/2 -translate-x-1/2 select-none font-black italic tracking-tighter",
							rank === 1 ? "skew-x-1" : rank === 2 ? "skew-x-1" : "-skew-x-1",
							cfg.rankSize,
							cfg.rankColor,
						)}
					>
						{rank}
					</span>
				</div>
			</div>
		);
	};

	// Calculate tiebreaker reasons
	const secondTiebreaker = second
		? getTiebreakerReason(first, second, tab, t)
		: null;
	const thirdTiebreaker = third
		? getTiebreakerReason(second || first, third, tab, t)
		: null;

	return (
		<div className="relative flex w-full items-end gap-3 px-2 pt-8 md:gap-6 lg:gap-8">
			{/* Floor Line */}
			<div className="absolute right-0 bottom-0 left-0 h-1.5 bg-black" />

			{/* 2nd Place */}
			<PodiumColumn
				entry={second}
				rank={2}
				tiebreakerReason={secondTiebreaker}
			/>
			{/* 1st Place */}
			<PodiumColumn entry={first} rank={1} />
			{/* 3rd Place */}
			<PodiumColumn entry={third} rank={3} tiebreakerReason={thirdTiebreaker} />
		</div>
	);
}

function LeaderboardCard({
	entry,
	isCurrentUser,
}: {
	entry: LeaderboardEntry;
	isCurrentUser: boolean;
}) {
	const { linkTo } = useLangLink();
	const accuracyRate =
		entry.totalBets > 0
			? Math.round((entry.correctPredictions / entry.totalBets) * 100)
			: 0;

	return (
		<div
			className={clsx(
				"group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-black bg-white px-3 py-2.5 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]",
				isCurrentUser && "ring-2 ring-[#ccff00]",
			)}
		>
			{/* Rank Badge */}
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-black/10 bg-[#121212]">
				<span className="font-black text-white text-xl italic">
					{entry.rank}
				</span>
			</div>

			{/* Avatar */}
			<Link
				to={linkTo("/users/$userId")}
				params={{ userId: entry.userId }}
				className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-[#f0f0f0]"
			>
				{entry.image ? (
					<img
						src={entry.image}
						alt={entry.name}
						className="h-full w-full object-cover transition-transform group-hover:scale-105"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center font-black text-gray-400 text-xl">
						{entry.name.charAt(0).toUpperCase()}
					</div>
				)}
			</Link>

			{/* Name + Stats */}
			<div className="flex min-w-0 flex-1 flex-col justify-center">
				<Link
					to={linkTo("/users/$userId")}
					params={{ userId: entry.userId }}
					className={clsx(
						"block truncate font-bold text-sm uppercase tracking-tight hover:underline",
						isCurrentUser ? "text-[#2e5cff]" : "text-[#121212]",
					)}
				>
					{entry.name}
				</Link>
				<div className="mt-1 flex flex-wrap items-center gap-1">
					<div className="flex items-center gap-0.5 rounded bg-[#ffc700] px-1.5 py-0.5">
						<Star className="h-2.5 w-2.5 text-black" fill="black" />
						<span className="font-black text-[10px] text-black">
							{entry.perfectPicks}
						</span>
					</div>
					<div className="flex items-center gap-0.5 rounded border border-black/20 bg-white px-1.5 py-0.5">
						<span className="font-black text-[10px] text-green-600">✓</span>
						<span className="font-black text-[10px] text-black">
							{entry.correctPredictions}
						</span>
					</div>
					{entry.underdogPicks > 0 && (
						<div className="flex items-center gap-0.5 rounded bg-purple-400 px-1.5 py-0.5">
							<span className="font-black text-[10px] text-black">
								⚡{entry.underdogPicks}
							</span>
						</div>
					)}
					<div
						className={clsx(
							"rounded px-1.5 py-0.5",
							accuracyRate >= 70
								? "bg-green-500"
								: accuracyRate >= 40
									? "bg-yellow-400"
									: "bg-red-500",
						)}
					>
						<span
							className={clsx(
								"font-black text-[10px]",
								accuracyRate >= 40 ? "text-black" : "text-white",
							)}
						>
							{accuracyRate}%
						</span>
					</div>
					{entry.medals.total > 0 && (
						<MedalCountSummary
							gold={entry.medals.gold}
							silver={entry.medals.silver}
							bronze={entry.medals.bronze}
							size="sm"
						/>
					)}
				</div>
			</div>

			{/* Points */}
			<div className="shrink-0 rounded-md border-2 border-black bg-white px-3 py-1.5 text-center shadow-[2px_2px_0_0_#000]">
				<span className="block font-black text-[#121212] text-xl leading-none">
					{entry.totalPoints}
				</span>
				<span className="block font-bold text-[9px] text-gray-500 uppercase tracking-wider">
					PTS
				</span>
			</div>
		</div>
	);
}

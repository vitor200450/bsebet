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
import { z } from "zod";
import {
	MedalCountSummary,
	MiniMedalBadge,
} from "../components/MiniMedalBadge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { getUser } from "../functions/get-user";
import {
	getLeaderboard,
	getLeaderboardTournaments,
	type LeaderboardEntry,
} from "../server/leaderboard";

const searchSchema = z.object({
	tab: z.enum(["season", "global"]).catch("global"),
	tournamentId: z.number().optional(),
});

export const Route = createFileRoute("/leaderboard")({
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

			<div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-8 md:py-12">
				{/* Clean Header */}
				<header className="mb-8 text-center">
					<div className="mb-4 flex justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-black bg-[#ffc700] shadow-[3px_3px_0_0_#000]">
							<Trophy className="h-8 w-8 text-black" strokeWidth={2.5} />
						</div>
					</div>
					<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl">
						Ranking
					</h1>
					<p className="mt-2 font-bold text-gray-600 text-lg">
						Os melhores prognosticadores da BSEBET
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
						Temporada
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
						Mundial
					</button>
				</div>

				{/* Tournament Selector - Clean */}
				{tab === "season" && activeTournament && (
					<div className="mb-8 flex w-full max-w-sm flex-col items-center">
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

						{/* Selector (Only if more than 1 tournament) */}
						{tournaments.length > 1 && (
							<div className="w-full">
								<DropdownMenu>
									<DropdownMenuTrigger className="group flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border-2 border-black bg-white px-4 font-bold text-[#121212] text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] outline-none transition-all hover:shadow-[2px_2px_0_0_#000]">
										<span className="mr-2 truncate">
											{activeTournament.name}
										</span>
										<ChevronDown
											className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
											strokeWidth={2.5}
										/>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										className="mt-1 min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[90vw] rounded-lg border-2 border-black bg-white p-0 text-black shadow-[4px_4px_0_0_#000]"
										align="start"
									>
										<DropdownMenuRadioGroup
											value={String(activeTournament.id)}
											onValueChange={(val) => {
												const scrollY = window.scrollY;
												navigate({
													search: {
														tab: "season",
														tournamentId: Number(val),
													},
													replace: true,
													resetScroll: false,
												});
												requestAnimationFrame(() => {
													window.scrollTo(0, scrollY);
												});
											}}
										>
											{tournaments.map((t) => (
												<DropdownMenuRadioItem
													key={t.id}
													value={String(t.id)}
													className="cursor-pointer whitespace-normal border-black/5 border-b px-4 py-3 font-bold text-sm uppercase leading-tight outline-none last:border-0 hover:bg-gray-50 focus:bg-gray-100 data-[state=checked]:bg-[#ffc700]"
												>
													{t.name}
												</DropdownMenuRadioItem>
											))}
										</DropdownMenuRadioGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)}
					</div>
				)}

				{/* Tiebreaker Rules - Clean */}
				<div className="mb-6 w-full rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
					<div className="mb-4 flex items-center gap-2 border-black/10 border-b pb-3">
						<Target className="h-4 w-4 text-[#121212]" strokeWidth={2} />
						<span className="font-bold text-[#121212] text-sm uppercase tracking-wider">
							Critérios de Classificação
						</span>
						<span className="ml-auto rounded bg-[#f0f0f0] px-2 py-1 font-bold text-[10px] text-gray-600 uppercase">
							{tab === "global" ? "Ranking Mundial" : "Camp Específico"}
						</span>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{/* Criteria */}
						{[
							{
								num: 1,
								label: "Pontos Totais",
								desc: "Critério principal",
								color: "bg-[#ffc700]",
							},
							{
								num: 2,
								label: "Quantidade de Acertos",
								desc: "1° desempate",
								color: "bg-gray-200",
							},
							{
								num: 3,
								label: "Perfect Picks",
								desc: "2° desempate",
								color: "bg-gray-300",
							},
							{
								num: 4,
								label: "Azarões",
								desc: "3° desempate",
								color: "bg-purple-300",
							},
							{
								num: 5,
								label: tab === "global" ? "Medalhas" : "Partida decisiva",
								desc: tab === "global" ? "4° desempate" : "Final",
								color: "bg-yellow-300",
							},
							...(tab === "season"
								? [
										{
											num: 6,
											label: "Resultado mês anterior",
											desc: "Torneios anteriores",
											color: "bg-[#2e5cff] text-white",
										},
										{
											num: 7,
											label: "Ranking Mundial",
											desc: "Posição geral",
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
						Legenda:
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
						<span className="text-[10px] text-gray-600">Perfect</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded border border-black/20 bg-white px-1.5 py-0.5">
							<span className="font-black text-[10px] text-green-600">✓</span>
							<span className="font-black text-[10px] text-black">0</span>
						</div>
						<span className="text-[10px] text-gray-600">Acertos</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded bg-green-500 px-1.5 py-0.5">
							<span className="font-black text-[10px] text-white">70%</span>
						</div>
						<span className="text-[10px] text-gray-600">Taxa</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="flex items-center gap-1 rounded bg-purple-400 px-1.5 py-0.5">
							<Zap className="h-3 w-3 text-black" strokeWidth={2} />
							<span className="font-black text-[10px] text-black">0</span>
						</div>
						<span className="text-[10px] text-gray-600">Azarões</span>
					</div>
					<div className="flex items-center gap-1">
						<MiniMedalBadge tier="1st" size="sm" />
						<MiniMedalBadge tier="2nd" size="sm" />
						<MiniMedalBadge tier="3rd" size="sm" />
						<span className="text-[10px] text-gray-600">Medalhas</span>
					</div>
				</div>

				{leaderboard.length === 0 ? (
					/* Empty State - Clean */
					<div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-black/30 border-dashed bg-white/50 py-16 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f0f0]">
							<Trophy className="h-8 w-8 text-gray-400" strokeWidth={2} />
						</div>
						<h2 className="mb-2 font-black text-[#121212] text-xl uppercase">
							Nenhum dado disponível
						</h2>
						<p className="text-gray-600 text-sm">Seja o primeiro a pontuar!</p>
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
): string | null {
	// Check if there's actually a tie that needed breaking
	if (higher.totalPoints !== lower.totalPoints) return null;

	// Check each tiebreaker criterion
	if (higher.correctPredictions !== lower.correctPredictions) {
		return "Acertos";
	}
	if (higher.perfectPicks !== lower.perfectPicks) {
		return "Perfect Picks";
	}
	if (higher.underdogPicks !== lower.underdogPicks) {
		return "Azarões";
	}

	if (tab === "global") {
		if (higher.medals.total !== lower.medals.total) {
			return "Medalhas";
		}
	} else {
		// Season-specific tiebreakers
		if (higher.gotMostImportantMatch !== lower.gotMostImportantMatch) {
			return "Partida decisiva";
		}
		if (
			higher.bestPreviousMonthResult !== lower.bestPreviousMonthResult &&
			(higher.bestPreviousMonthResult === null) !==
				(lower.bestPreviousMonthResult === null)
		) {
			return "Resultado anterior";
		}
		if (higher.globalRank !== lower.globalRank) {
			return "Ranking Mundial";
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
	const first = entries[0];
	const second = entries[1];
	const third = entries[2];

	const podiumColors = {
		1: { bg: "bg-gradient-to-b from-[#FFD700] to-[#DAA520]", height: "h-28" },
		2: { bg: "bg-gradient-to-b from-[#C0C0C0] to-[#808080]", height: "h-20" },
		3: { bg: "bg-gradient-to-b from-[#CD7F32] to-[#8B4513]", height: "h-16" },
	};

	const PodiumBlock = ({
		entry,
		rank,
		tiebreakerReason,
	}: {
		entry?: LeaderboardEntry;
		rank: 1 | 2 | 3;
		tiebreakerReason?: string | null;
	}) => {
		if (!entry) return <div />;
		const colors = podiumColors[rank];
		const isMe = entry.userId === currentUserId;
		const accuracyRate =
			entry.totalBets > 0
				? Math.round((entry.correctPredictions / entry.totalBets) * 100)
				: 0;

		return (
			<div className="flex flex-col items-center">
				{/* Crown for 1st */}
				{rank === 1 && (
					<div className="mb-2">
						<Crown
							className="h-8 w-8 text-[#ffc700]"
							fill="#ffc700"
							strokeWidth={2}
						/>
					</div>
				)}

				{/* Avatar */}
				<Link
					to="/users/$userId"
					params={{ userId: entry.userId }}
					className="group relative"
				>
					<div
						className={clsx(
							"mb-2 overflow-hidden rounded-lg border-2 border-black bg-white transition-transform group-hover:scale-105",
							rank === 1
								? "h-16 w-16 shadow-[3px_3px_0_0_#000]"
								: "h-12 w-12 shadow-[2px_2px_0_0_#000]",
							isMe && "ring-2 ring-[#ccff00]",
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
							"absolute -right-1.5 -bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-black font-black text-white text-xs shadow-sm",
						)}
					>
						{rank}
					</div>
				</Link>

				{/* Name */}
				<Link
					to="/users/$userId"
					params={{ userId: entry.userId }}
					className="mb-2"
				>
					<span
						className={clsx(
							"block text-center font-bold text-xs uppercase",
							isMe ? "text-[#2e5cff]" : "text-[#121212]",
						)}
					>
						{entry.name}
					</span>
				</Link>

				{/* Medals */}
				{entry.medals.total > 0 && (
					<div className="mb-2">
						<MedalCountSummary
							gold={entry.medals.gold}
							silver={entry.medals.silver}
							bronze={entry.medals.bronze}
							size="sm"
						/>
					</div>
				)}

				{/* Points */}
				<div className="mb-2 text-center">
					<span className="block font-black text-[#121212] text-lg">
						{entry.totalPoints}
					</span>
					<span className="font-bold text-[9px] text-gray-500 uppercase tracking-wider">
						PTS
					</span>
				</div>

				{/* Tiebreaker */}
				{tiebreakerReason && (
					<div className="mb-2 rounded-md bg-[#ccff00] px-2 py-0.5 text-center">
						<span className="font-black text-[9px] text-black uppercase">
							{tiebreakerReason}
						</span>
					</div>
				)}

				{/* Stats */}
				<div className="mb-3 flex flex-wrap items-center justify-center gap-1">
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
				</div>

				{/* Platform */}
				<div
					className={clsx(
						"relative w-full rounded-t-lg border-black border-x-2 border-t-2",
						colors.bg,
						colors.height,
					)}
				>
					<span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-black text-4xl text-black/10 italic">
						{rank}
					</span>
				</div>
			</div>
		);
	};

	// Calculate tiebreaker reasons
	const secondTiebreaker = second
		? getTiebreakerReason(first, second, tab)
		: null;
	const thirdTiebreaker = third
		? getTiebreakerReason(second || first, third, tab)
		: null;

	return (
		<div className="relative grid w-full grid-cols-3 items-end px-2 pt-8">
			{/* Floor Line */}
			<div className="absolute right-0 bottom-0 left-0 h-0.5 bg-black" />

			{/* 2nd Place (left) */}
			<PodiumBlock
				entry={second}
				rank={2}
				tiebreakerReason={secondTiebreaker}
			/>
			{/* 1st Place (center) */}
			<PodiumBlock entry={first} rank={1} />
			{/* 3rd Place (right) */}
			<PodiumBlock entry={third} rank={3} tiebreakerReason={thirdTiebreaker} />
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
	const accuracyRate =
		entry.totalBets > 0
			? Math.round((entry.correctPredictions / entry.totalBets) * 100)
			: 0;

	return (
		<div
			className={clsx(
				"group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-black bg-white px-3 py-3 shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[4px_4px_0_0_#000]",
				isCurrentUser && "ring-2 ring-[#ccff00]",
			)}
		>
			{/* Rank Badge */}
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#121212]">
				<span className="font-black text-lg text-white italic">
					{entry.rank}
				</span>
			</div>

			{/* Avatar */}
			<Link
				to="/users/$userId"
				params={{ userId: entry.userId }}
				className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-[#f0f0f0]"
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
			<div className="min-w-0 flex-1">
				<Link
					to="/users/$userId"
					params={{ userId: entry.userId }}
					className={clsx(
						"block truncate font-bold text-sm uppercase tracking-tight hover:underline",
						isCurrentUser ? "text-[#2e5cff]" : "text-[#121212]",
					)}
				>
					{entry.name}
				</Link>
				<div className="mt-1.5 flex flex-wrap items-center gap-1">
					<div className="flex items-center gap-0.5 rounded bg-[#ffc700] px-1.5 py-0.5">
						<Star
							className="h-2.5 w-2.5 text-black"
							fill="black"
							strokeWidth={0}
						/>
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
			<div className="shrink-0 rounded-md border border-black bg-white px-2 py-1 text-right shadow-[2px_2px_0_0_#ccc]">
				<span className="block font-black text-[#121212] text-lg leading-none">
					{entry.totalPoints}
				</span>
				<span className="block font-bold text-[9px] text-gray-500 uppercase tracking-wider">
					PTS
				</span>
			</div>
		</div>
	);
}

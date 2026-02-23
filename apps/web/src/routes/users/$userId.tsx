import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	ArrowLeft,
	Award,
	Crown,
	Medal,
	Star,
	Target,
	TrendingUp,
	Trophy,
} from "lucide-react";
import {
	getUserMedals,
	getUserProfile,
	getUserRecentBets,
	getUserStats,
	getUserTournamentHistory,
	type UserMedal,
	type UserRecentBet,
	type UserTournamentHistory,
} from "@/server/user-profile";

export const Route = createFileRoute("/users/$userId")({
	loader: async ({ params }) => {
		const [profile, stats, medals, recentBets, tournamentHistory] =
			await Promise.all([
				getUserProfile({ data: params.userId }),
				getUserStats({ data: params.userId }),
				getUserMedals({ data: params.userId }),
				getUserRecentBets({ data: params.userId }),
				getUserTournamentHistory({ data: params.userId }),
			]);

		if (!profile) throw notFound();

		return { profile, stats, medals, recentBets, tournamentHistory };
	},
	component: UserProfilePage,
});

// Medal config by placement
const MEDAL_CONFIG = {
	1: {
		icon: Crown,
		iconColor: "#ffc700",
		iconFill: "#ffc700",
		bg: "bg-brawl-yellow",
		label: "1°",
	},
	2: {
		icon: Medal,
		iconColor: "#9ca3af",
		iconFill: "#C0C0C0",
		bg: "bg-gray-300",
		label: "2°",
	},
	3: {
		icon: Award,
		iconColor: "#cd7f32",
		iconFill: "#cd7f32",
		bg: "bg-[#f5d7a0]",
		label: "3°",
	},
} as const;

function UserProfilePage() {
	const { profile, stats, medals, recentBets, tournamentHistory } =
		Route.useLoaderData();

	const displayName = profile.nickname || profile.name;
	const memberSince = new Date(profile.createdAt).toLocaleDateString("pt-BR", {
		year: "numeric",
		month: "long",
	});

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans text-ink">
			{/* Hero Header */}
			<div className="relative overflow-hidden border-black border-b-4 bg-black text-white">
				{/* Background pattern */}
				<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
				<div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

				{/* Accent bar at bottom */}
				<div className="absolute right-0 bottom-0 left-0 h-1 bg-gradient-to-r from-brawl-blue via-[#ccff00] to-brawl-red" />

				<div className="relative z-10 mx-auto max-w-3xl px-4 py-8">
					<Link
						to="/leaderboard"
						search={{ tab: "global" }}
						className="mb-6 inline-flex items-center gap-2 font-bold text-sm text-white/60 uppercase tracking-wider transition-colors hover:text-white"
					>
						<ArrowLeft className="h-4 w-4" />
						Ranking
					</Link>

					<div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
						{/* Avatar */}
						<div className="relative flex-shrink-0">
							<div className="h-28 w-28 overflow-hidden border-[4px] border-white bg-gray-800 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] md:h-32 md:w-32">
								{profile.image ? (
									<img
										src={profile.image}
										alt={displayName}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center font-black font-display text-5xl text-white/20">
										{displayName.charAt(0).toUpperCase()}
									</div>
								)}
							</div>
						</div>

						{/* Name + medals inline */}
						<div className="flex-1 text-center md:text-left">
							<h1 className="mb-1 font-black font-display text-4xl text-white uppercase italic leading-none tracking-tighter drop-shadow-sm md:text-5xl">
								{displayName}
							</h1>
							<p className="mb-4 font-bold text-sm text-white/40 uppercase tracking-widest">
								Membro desde {memberSince}
							</p>

							{/* Inline medal badges */}
							{medals.length > 0 && (
								<div className="flex flex-wrap justify-center gap-2 md:justify-start">
									{medals.map((medal) => {
										const config = MEDAL_CONFIG[medal.placement];
										const Icon = config.icon;
										return (
											<Link
												key={medal.tournamentId}
												to="/tournaments/$slug"
												params={{ slug: medal.tournamentSlug }}
												className="group flex items-center gap-1.5 border-[2px] border-white/30 bg-white/10 px-2 py-1 transition-all hover:border-white/60 hover:bg-white/20"
											>
												<Icon
													className="h-4 w-4 flex-shrink-0"
													fill={config.iconFill}
													color={config.iconColor}
													strokeWidth={1.5}
												/>
												{medal.tournamentLogoUrl ? (
													<img
														src={medal.tournamentLogoUrl}
														alt={medal.tournamentName}
														className="h-4 w-4 object-contain"
													/>
												) : (
													<Trophy className="h-4 w-4 text-white/40" />
												)}
												<span className="font-black text-[10px] text-white uppercase tracking-wide">
													{config.label}
												</span>
											</Link>
										);
									})}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="mx-auto max-w-3xl px-4 py-8">
				{/* Stats Bar */}
				<div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
					<ProfileStatCard
						icon={<Star className="h-5 w-5 text-brawl-yellow" fill="#ffc700" strokeWidth={1.5} />}
						label="Total de Pontos"
						value={stats.totalPoints.toLocaleString("pt-BR")}
						color="bg-white"
					/>
					<ProfileStatCard
						icon={<Target className="h-5 w-5 text-brawl-blue" strokeWidth={2} />}
						label="Precisão"
						value={`${stats.accuracy}%`}
						color="bg-white"
					/>
					<ProfileStatCard
						icon={<Crown className="h-5 w-5" fill="#ccff00" color="#ccff00" strokeWidth={1.5} />}
						label="Perfect Picks"
						value={stats.perfectPicks.toString()}
						color="bg-black"
						valueColor="text-[#ccff00]"
						labelColor="text-white/60"
					/>
					<ProfileStatCard
						icon={<TrendingUp className="h-5 w-5 text-brawl-red" strokeWidth={2} />}
						label="Total de Apostas"
						value={stats.totalBets.toString()}
						color="bg-white"
					/>
				</div>

				{/* Medals Section */}
				<section className="mb-10">
					<SectionHeader
						title="MEDALHAS"
						accent="bg-brawl-yellow"
					/>

					{medals.length === 0 ? (
						<EmptyState
							icon={<Trophy className="h-10 w-10 text-gray-300" />}
							message="Nenhuma medalha ainda"
							sub="Chegue ao top 3 de um torneio finalizado"
						/>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
							{medals.map((medal) => (
								<MedalCard key={medal.tournamentId} medal={medal} />
							))}
						</div>
					)}
				</section>

				{/* Tournament History Section */}
				{tournamentHistory.length > 0 && (
					<section className="mb-10">
						<SectionHeader title="TORNEIOS" accent="bg-brawl-blue" />

						<div className="space-y-3">
							{tournamentHistory.map((t) => (
								<TournamentHistoryRow key={t.tournamentId} tournament={t} />
							))}
						</div>
					</section>
				)}

				{/* Recent Bets Section */}
				<section>
					<SectionHeader title="ATIVIDADE RECENTE" accent="bg-brawl-red" />

					{recentBets.length === 0 ? (
						<EmptyState
							icon={<TrendingUp className="h-10 w-10 text-gray-300" />}
							message="Nenhuma aposta finalizada"
							sub="As apostas resolvidas aparecerão aqui"
						/>
					) : (
						<div className="space-y-3">
							{recentBets.slice(0, 15).map((bet) => (
								<RecentBetRow key={bet.id} bet={bet} />
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}

// --- Sub-components ---

function ProfileStatCard({
	icon,
	label,
	value,
	color,
	valueColor = "text-black",
	labelColor = "text-black/50",
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	color: string;
	valueColor?: string;
	labelColor?: string;
}) {
	return (
		<div
			className={clsx(
				"flex flex-col items-center justify-center border-[3px] border-black p-4 text-center shadow-[4px_4px_0px_0px_#000]",
				color,
			)}
		>
			<div className="mb-2">{icon}</div>
			<div className={clsx("mb-1 font-black font-body text-2xl", valueColor)}>
				{value}
			</div>
			<div
				className={clsx(
					"font-bold text-[10px] uppercase tracking-widest",
					labelColor,
				)}
			>
				{label}
			</div>
		</div>
	);
}

function SectionHeader({
	title,
	accent,
}: {
	title: string;
	accent: string;
}) {
	return (
		<div className="mb-5 flex items-center gap-3">
			<div className={clsx("h-1 w-10", accent)} />
			<h2 className="font-black font-display text-2xl text-black uppercase italic tracking-tight">
				{title}
			</h2>
		</div>
	);
}

function EmptyState({
	icon,
	message,
	sub,
}: {
	icon: React.ReactNode;
	message: string;
	sub: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center border-[3px] border-black border-dashed bg-white/50 py-12 text-center">
			<div className="mb-4 opacity-50">{icon}</div>
			<p className="font-black font-display text-lg text-black uppercase italic">
				{message}
			</p>
			<p className="mt-1 font-bold text-sm text-black/40 uppercase tracking-wide">
				{sub}
			</p>
		</div>
	);
}

function MedalCard({ medal }: { medal: UserMedal }) {
	const config = MEDAL_CONFIG[medal.placement];
	const Icon = config.icon;

	return (
		<Link
			to="/tournaments/$slug"
			params={{ slug: medal.tournamentSlug }}
			className="group relative flex flex-col items-center gap-3 border-[3px] border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000]"
		>
			{/* Placement icon */}
			<div
				className={clsx(
					"flex h-14 w-14 items-center justify-center border-[3px] border-black shadow-[3px_3px_0px_0px_#000]",
					config.bg,
				)}
			>
				<Icon
					className="h-8 w-8"
					fill={config.iconFill}
					color={config.iconColor}
					strokeWidth={1.5}
				/>
			</div>

			{/* Tournament logo */}
			{medal.tournamentLogoUrl ? (
				<img
					src={medal.tournamentLogoUrl}
					alt={medal.tournamentName}
					className="h-12 w-12 object-contain"
				/>
			) : (
				<Trophy className="h-12 w-12 text-gray-300" />
			)}

			{/* Info */}
			<div className="text-center">
				<p className="font-black font-display text-sm text-black uppercase tracking-tight leading-tight group-hover:text-brawl-blue">
					{medal.tournamentName}
				</p>
				<div className="mt-1 flex items-center justify-center gap-1">
					<span className="font-black font-body text-xl text-black">
						{medal.totalPoints}
					</span>
					<span className="font-bold text-[10px] text-black/40 uppercase tracking-widest">
						PTS
					</span>
				</div>
			</div>

			{/* Placement badge */}
			<div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center border-[2px] border-white bg-black font-black font-display text-sm text-white shadow-[2px_2px_0px_0px_#000]">
				{config.label}
			</div>
		</Link>
	);
}

function TournamentHistoryRow({
	tournament,
}: {
	tournament: UserTournamentHistory;
}) {
	const statusLabel =
		tournament.tournamentStatus === "active"
			? "Ativo"
			: tournament.tournamentStatus === "finished"
				? "Finalizado"
				: "Em Breve";

	const statusColor =
		tournament.tournamentStatus === "active"
			? "bg-green-100 text-green-800"
			: tournament.tournamentStatus === "finished"
				? "bg-gray-100 text-gray-800"
				: "bg-blue-100 text-blue-800";

	return (
		<Link
			to="/tournaments/$slug"
			params={{ slug: tournament.tournamentSlug }}
			className="group flex items-center gap-4 border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000]"
		>
			{/* Logo */}
			<div className="h-10 w-10 flex-shrink-0 overflow-hidden border-[2px] border-black bg-gray-50 p-1">
				{tournament.tournamentLogoUrl ? (
					<img
						src={tournament.tournamentLogoUrl}
						alt={tournament.tournamentName}
						className="h-full w-full object-contain"
					/>
				) : (
					<Trophy className="h-full w-full text-gray-300" />
				)}
			</div>

			{/* Name + status */}
			<div className="min-w-0 flex-1">
				<p className="truncate font-black font-display text-sm text-black uppercase tracking-tight group-hover:text-brawl-blue">
					{tournament.tournamentName}
				</p>
				<div className="mt-0.5 flex items-center gap-2">
					<span
						className={clsx(
							"rounded px-2 py-0.5 font-black text-[9px] uppercase",
							statusColor,
						)}
					>
						{statusLabel}
					</span>
					<span className="font-bold text-[10px] text-black/40">
						{tournament.numBets} apostas
					</span>
				</div>
			</div>

			{/* Rank */}
			{tournament.rank > 0 && (
				<div className="flex-shrink-0 text-center">
					<div className="font-black font-display text-xl text-black">
						#{tournament.rank}
					</div>
					<div className="font-bold text-[9px] text-black/40 uppercase tracking-widest">
						Rank
					</div>
				</div>
			)}

			{/* Points */}
			<div className="-rotate-1 flex-shrink-0 border border-black bg-white px-2 py-1 text-right shadow-[2px_2px_0px_0px_#ccc]">
				<span className="block font-black font-body text-xl text-black leading-none">
					{tournament.totalPoints}
				</span>
				<span className="block font-black text-[9px] text-black/40 uppercase leading-none tracking-widest">
					PTS
				</span>
			</div>
		</Link>
	);
}

function RecentBetRow({ bet }: { bet: UserRecentBet }) {
	const teamA = bet.match.teamA;
	const teamB = bet.match.teamB;
	const winner = bet.match.winner;
	const predicted = bet.predictedWinner;

	const isCorrect = (bet.pointsEarned ?? 0) > 0;
	const isPerfect = bet.isPerfectPick === true;
	const points = bet.pointsEarned ?? 0;

	// Predicted score
	const predScore = `${bet.predictedScoreA} - ${bet.predictedScoreB}`;
	// Real score
	const realScore =
		bet.match.scoreA !== null && bet.match.scoreB !== null
			? `${bet.match.scoreA} - ${bet.match.scoreB}`
			: "—";

	return (
		<div
			className={clsx(
				"relative flex items-center gap-3 overflow-hidden border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_#000]",
			)}
		>
			{/* Left accent stripe */}
			<div
				className={clsx(
					"absolute top-0 bottom-0 left-0 w-1.5",
					isCorrect ? "bg-green-400" : "bg-red-400",
				)}
			/>

			{/* Result badge */}
			<div
				className={clsx(
					"ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center border-[2px] border-black font-black font-display text-sm uppercase italic shadow-[2px_2px_0px_0px_#000]",
					isCorrect ? "bg-[#ccff00] text-black" : "bg-black text-white",
				)}
			>
				{isCorrect ? "✓" : "✗"}
			</div>

			{/* Match info */}
			<div className="min-w-0 flex-1">
				{/* Teams with logos */}
				<div className="flex items-center gap-1.5">
					{/* Team A */}
					<div className="flex flex-shrink-0 items-center gap-1">
						<div className="h-5 w-5 overflow-hidden border border-black bg-gray-100">
							{teamA?.logoUrl ? (
								<img
									src={teamA.logoUrl}
									alt={teamA.name}
									className="h-full w-full object-contain p-px"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center font-black text-[8px] text-black/40">
									{teamA?.name?.charAt(0) ?? "?"}
								</div>
							)}
						</div>
						<span className="max-w-[60px] truncate font-black text-xs text-black uppercase md:max-w-[80px]">
							{teamA?.name ?? "?"}
						</span>
					</div>

					<span className="flex-shrink-0 font-black text-[10px] text-black/40">vs</span>

					{/* Team B */}
					<div className="flex flex-shrink-0 items-center gap-1">
						<div className="h-5 w-5 overflow-hidden border border-black bg-gray-100">
							{teamB?.logoUrl ? (
								<img
									src={teamB.logoUrl}
									alt={teamB.name}
									className="h-full w-full object-contain p-px"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center font-black text-[8px] text-black/40">
									{teamB?.name?.charAt(0) ?? "?"}
								</div>
							)}
						</div>
						<span className="max-w-[60px] truncate font-black text-xs text-black uppercase md:max-w-[80px]">
							{teamB?.name ?? "?"}
						</span>
					</div>

					{isPerfect && (
						<div className="flex-shrink-0">
							<Star
								className="h-3.5 w-3.5 text-brawl-yellow drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]"
								fill="#ffc700"
								strokeWidth={1}
							/>
						</div>
					)}
				</div>

				{/* Scores */}
				<div className="mt-0.5 flex items-center gap-3 font-bold text-[10px] text-black/50 uppercase tracking-wide">
					<span>
						Previsto:{" "}
						<span className="text-brawl-blue">
							{predicted?.name ?? "?"} {predScore}
						</span>
					</span>
					<span>•</span>
					<span>
						Real:{" "}
						<span className={isCorrect ? "text-green-600" : "text-red-500"}>
							{winner?.name ?? "?"} {realScore}
						</span>
					</span>
				</div>
			</div>

			{/* Points earned */}
			<div className="flex-shrink-0 text-right">
				<span
					className={clsx(
						"block font-black font-body text-xl leading-none",
						isCorrect ? "text-green-600" : "text-black/30",
					)}
				>
					{isCorrect ? `+${points}` : "0"}
				</span>
				<span className="block font-bold text-[9px] text-black/40 uppercase leading-none tracking-widest">
					PTS
				</span>
			</div>
		</div>
	);
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import { Award, ChevronRight, Crown, Medal, Trophy } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getLeaderboard } from "@/server/leaderboard";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TournamentPodiumProps {
	tournamentId: number;
	tournamentName: string;
	tournamentLogoUrl?: string | null;
	className?: string;
}

const podiumConfig = {
	1: {
		icon: Crown,
		bg: "bg-gradient-to-br from-[#FFD700] via-[#FFFACD] to-[#DAA520]",
		border: "border-[#B8860B]",
		text: "text-[#8B6914]",
		shadow: "shadow-[6px_6px_0_0_#B8860B]",
		height: "h-32",
		scale: "scale-110",
		zIndex: "z-30",
		label: "CAMPEÃO",
	},
	2: {
		icon: Medal,
		bg: "bg-gradient-to-br from-[#E6E6E6] via-[#FFFFFF] to-[#A3A3A3]",
		border: "border-[#808080]",
		text: "text-[#505050]",
		shadow: "shadow-[4px_4px_0_0_#808080]",
		height: "h-24",
		scale: "scale-100",
		zIndex: "z-20",
		label: "2º LUGAR",
	},
	3: {
		icon: Award,
		bg: "bg-gradient-to-br from-[#CD7F32] via-[#E6A869] to-[#804F1F]",
		border: "border-[#8B4513]",
		text: "text-white",
		shadow: "shadow-[4px_4px_0_0_#8B4513]",
		height: "h-20",
		scale: "scale-100",
		zIndex: "z-20",
		label: "3º LUGAR",
	},
};

export function TournamentPodium({
	tournamentId,
	tournamentName,
	tournamentLogoUrl,
	className,
}: TournamentPodiumProps) {
	const { data: leaderboard, isLoading } = useQuery({
		queryKey: ["tournamentLeaderboard", tournamentId],
		queryFn: () => getLeaderboard({ data: tournamentId }),
		staleTime: 1000 * 60 * 5,
	});

	if (isLoading) {
		return (
			<div
				className={cn(
					"rounded-xl border-[3px] border-black bg-white p-8 shadow-[4px_4px_0_0_#000]",
					className,
				)}
			>
				<div className="flex h-40 items-center justify-center">
					<div className="h-8 w-8 animate-spin border-4 border-black border-t-transparent" />
				</div>
			</div>
		);
	}

	const top3 = leaderboard?.slice(0, 3) || [];

	if (top3.length === 0) {
		return null;
	}

	const first = top3[0];
	const second = top3[1];
	const third = top3[2];

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-xl border-[3px] border-black bg-white shadow-[6px_6px_0_0_#000]",
				className,
			)}
		>
			{/* Header */}
			<div className="relative overflow-hidden border-black border-b-[3px] bg-black p-6">
				{/* Background Pattern */}
				<div className="absolute inset-0 opacity-10">
					<div
						className="h-full w-full"
						style={{
							backgroundImage: `radial-gradient(circle at 20% 50%, #FFD700 2px, transparent 2px),
                                radial-gradient(circle at 80% 50%, #FFD700 2px, transparent 2px)`,
							backgroundSize: "40px 40px",
						}}
					/>
				</div>

				<div className="relative z-10 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-14 w-14 -rotate-3 transform items-center justify-center border-[3px] border-white bg-[#FFD700] shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
							{tournamentLogoUrl ? (
								<img
									src={tournamentLogoUrl}
									alt={tournamentName}
									className="h-10 w-10 object-contain"
								/>
							) : (
								<Trophy className="h-8 w-8 text-black" fill="black" />
							)}
						</div>
						<div>
							<p className="font-black text-[10px] text-white/60 uppercase tracking-widest">
								Pódio Final
							</p>
							<h2 className="font-black text-white text-xl uppercase italic tracking-tight md:text-2xl">
								{tournamentName}
							</h2>
						</div>
					</div>

					<Link
						to="/leaderboard"
						search={{ tab: "season", tournamentId }}
						className="group hidden items-center gap-2 border-2 border-white bg-white px-4 py-2 font-black text-black text-xs uppercase tracking-wider transition-all hover:bg-[#ccff00] sm:flex"
					>
						Ver Ranking
						<ChevronRight
							className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
							strokeWidth={3}
						/>
					</Link>
				</div>
			</div>

			{/* Podium */}
			<div className="relative bg-[#f5f5f5] p-6 pt-12">
				<div className="mx-auto flex max-w-md items-end justify-center gap-2 md:gap-4">
					{/* 2nd Place - Left */}
					{second && (
						<PodiumBlock entry={second} rank={2} config={podiumConfig[2]} />
					)}

					{/* 1st Place - Center */}
					{first && (
						<PodiumBlock
							entry={first}
							rank={1}
							config={podiumConfig[1]}
							isWinner
						/>
					)}

					{/* 3rd Place - Right */}
					{third && (
						<PodiumBlock entry={third} rank={3} config={podiumConfig[3]} />
					)}
				</div>

				{/* Floor */}
				<div className="mx-auto mt-0 h-2 max-w-md rounded-full bg-gradient-to-r from-black/20 via-black/40 to-black/20" />
			</div>
		</div>
	);
}

interface PodiumBlockProps {
	entry: {
		userId: string;
		name: string;
		image: string | null;
		totalPoints: number;
		medals: {
			gold: number;
			silver: number;
			bronze: number;
		};
	};
	rank: 1 | 2 | 3;
	config: (typeof podiumConfig)[1];
	isWinner?: boolean;
}

function PodiumBlock({ entry, rank, config, isWinner }: PodiumBlockProps) {
	const Icon = config.icon;

	return (
		<div
			className={cn("flex flex-col items-center", config.zIndex, config.scale)}
		>
			{/* Avatar */}
			<Link
				to="/users/$userId"
				params={{ userId: entry.userId }}
				className={cn(
					"group relative mb-3 border-[3px] border-black bg-white shadow-[4px_4px_0_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]",
					isWinner ? "h-20 w-20 md:h-24 md:w-24" : "h-14 w-14 md:h-16 md:w-16",
				)}
			>
				{/* Inner container with overflow-hidden for the image */}
				<div className="h-full w-full overflow-hidden">
					{entry.image ? (
						<img
							src={entry.image}
							alt={entry.name}
							className="h-full w-full object-cover transition-transform group-hover:scale-110"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-gray-200 font-black text-2xl text-black/30">
							{entry.name.charAt(0).toUpperCase()}
						</div>
					)}
				</div>

				{/* Rank Badge - positioned outside the overflow container */}
				<div
					className={cn(
						"absolute -right-2 -bottom-2 flex transform items-center justify-center border-2 border-white font-black text-white shadow-[2px_2px_0_0_#000]",
						isWinner ? "h-8 w-8 text-lg" : "h-6 w-6 text-xs",
						config.bg,
						config.border,
						config.text,
						rank === 1 ? "rotate-6" : "-rotate-6",
					)}
				>
					<Icon
						size={isWinner ? 16 : 12}
						fill={rank === 1 ? "currentColor" : "none"}
						strokeWidth={2.5}
					/>
				</div>
			</Link>

			{/* Name */}
			<Link
				to="/users/$userId"
				params={{ userId: entry.userId }}
				className={cn(
					"mb-2 transform border border-black bg-white px-3 py-1 text-center shadow-[2px_2px_0_0_#000] transition-all hover:bg-gray-50",
					isWinner ? "-rotate-1" : "rotate-1",
				)}
			>
				<span
					className={cn(
						"block max-w-[100px] truncate font-black uppercase tracking-tight",
						isWinner ? "text-sm" : "text-xs",
					)}
				>
					{entry.name}
				</span>
			</Link>

			{/* Label Badge */}
			<div
				className={cn(
					"mb-2 border-2 border-black px-2 py-0.5 font-black text-[10px] uppercase tracking-wider",
					config.bg,
					config.text,
				)}
			>
				{config.label}
			</div>

			{/* Points */}
			<div className="mb-3 text-center">
				<span
					className={cn(
						"block font-black text-black drop-shadow-sm",
						isWinner ? "text-2xl" : "text-xl",
					)}
				>
					{entry.totalPoints}
				</span>
				<span className="font-bold text-[9px] text-black/60 uppercase tracking-widest">
					PTS
				</span>
			</div>

			{/* Platform */}
			<div
				className={cn(
					"w-full border-black border-x-[3px] border-t-[3px]",
					config.bg,
					config.border,
					config.height,
				)}
			>
				<span
					className={cn(
						"flex h-full items-center justify-center font-black text-4xl italic opacity-20",
						config.text,
					)}
				>
					{rank}
				</span>
			</div>
		</div>
	);
}

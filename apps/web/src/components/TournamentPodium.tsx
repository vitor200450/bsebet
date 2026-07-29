import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import { ChevronRight, Crown, Medal, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import { InlineLoader } from "@/components/inline-loader";
import { useLangLink } from "@/i18n/useLangLink";
import { getLeaderboard } from "@/server/leaderboard";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface TournamentPodiumProps {
	tournamentId: number;
	className?: string;
}

const podiumConfig = {
	1: {
		icon: Crown,
		platform: "surface-yellow",
		badge: "surface-yellow",
		height: "h-11",
		zIndex: "z-30",
	},
	2: {
		icon: Medal,
		platform: "bg-[#d4d4d4] text-ink",
		badge: "bg-[#d4d4d4] text-ink",
		height: "h-8",
		zIndex: "z-20",
	},
	3: {
		icon: Trophy,
		platform: "bg-[#c47a3a] text-white",
		badge: "bg-[#c47a3a] text-white",
		height: "h-6",
		zIndex: "z-20",
	},
} as const;

export function TournamentPodium({
	tournamentId,
	className,
}: TournamentPodiumProps) {
	const { t } = useTranslation("tournament");
	const { routeTo } = useLangLink();
	const { data: leaderboard, isLoading } = useQuery({
		queryKey: ["tournamentLeaderboard", tournamentId],
		queryFn: () => getLeaderboard({ data: tournamentId }),
		staleTime: 1000 * 60 * 5,
	});

	if (isLoading) {
		return (
			<div
				className={cn(
					"border-[3px] border-black bg-white p-6 shadow-comic-md",
					className,
				)}
			>
				<div className="flex h-20 items-center justify-center">
					<InlineLoader size="md" />
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
				"overflow-hidden border-[3px] border-black bg-white text-ink shadow-comic-md",
				className,
			)}
		>
			<div className="surface-ink flex items-center justify-between gap-3 border-black border-b-[3px] px-4 py-2.5">
				<div className="flex min-w-0 items-center gap-2">
					<span className="surface-yellow flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black shadow-comic-sm">
						<Crown className="h-3.5 w-3.5 text-ink" fill="currentColor" />
					</span>
					<h2 className="truncate font-black font-display text-sm text-white uppercase italic tracking-tighter md:text-base">
						{t("podium.title")}
					</h2>
				</div>

				<Link
					{...routeTo("/leaderboard")}
					search={{ tab: "season", tournamentId }}
					className="group surface-lime inline-flex shrink-0 items-center gap-1 border-2 border-black px-2.5 py-1 font-black font-display text-[10px] uppercase tracking-wider shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press sm:gap-1.5 sm:px-3 sm:text-xs"
				>
					{t("podium.viewRanking")}
					<ChevronRight
						className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
						strokeWidth={3}
					/>
				</Link>
			</div>

			<div className="bg-paper px-3 pt-5 pb-3 sm:px-5">
				<div className="mx-auto flex max-w-sm items-end justify-center gap-2 sm:gap-3">
					{second ? (
						<PodiumBlock entry={second} rank={2} config={podiumConfig[2]} />
					) : null}
					{first ? (
						<PodiumBlock
							entry={first}
							rank={1}
							config={podiumConfig[1]}
							isWinner
						/>
					) : null}
					{third ? (
						<PodiumBlock entry={third} rank={3} config={podiumConfig[3]} />
					) : null}
				</div>
			</div>
		</div>
	);
}

interface PodiumEntry {
	userId: string;
	name: string;
	image: string | null;
	totalPoints: number;
}

interface PodiumBlockProps {
	entry: PodiumEntry;
	rank: 1 | 2 | 3;
	config: (typeof podiumConfig)[1];
	isWinner?: boolean;
}

function PodiumBlock({ entry, rank, config, isWinner }: PodiumBlockProps) {
	const { t } = useTranslation("tournament");
	const { routeTo, lang } = useLangLink();
	const Icon = config.icon;

	return (
		<div
			className={cn("flex min-w-0 flex-1 flex-col items-center", config.zIndex)}
		>
			<Link
				{...routeTo("/users/$userId")}
				params={{ userId: entry.userId, lang }}
				className={cn(
					"group relative mb-2 border-[3px] border-black bg-white shadow-comic-sm transition-all hover:-translate-y-0.5 hover:shadow-comic-md",
					isWinner ? "h-14 w-14 sm:h-16 sm:w-16" : "h-11 w-11 sm:h-12 sm:w-12",
				)}
			>
				<div className="h-full w-full overflow-hidden">
					{entry.image ? (
						<img
							src={entry.image}
							alt={entry.name}
							className="h-full w-full object-cover transition-transform group-hover:scale-105"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-tape font-black font-display text-ink text-lg uppercase">
							{entry.name.charAt(0).toUpperCase()}
						</div>
					)}
				</div>

				<div
					className={cn(
						"absolute -right-1.5 -bottom-1.5 flex items-center justify-center border-2 border-black shadow-comic-sm",
						isWinner ? "h-6 w-6" : "h-5 w-5",
						config.badge,
					)}
				>
					<Icon
						size={isWinner ? 12 : 10}
						fill={rank === 1 ? "currentColor" : "none"}
						strokeWidth={2.5}
					/>
				</div>
			</Link>

			<Link
				{...routeTo("/users/$userId")}
				params={{ userId: entry.userId, lang }}
				className={cn(
					"mb-1 w-full truncate pe-[0.2em] pb-0.5 text-center font-black font-display text-ink uppercase italic leading-[1.15] tracking-tighter hover:underline",
					isWinner ? "text-xs" : "text-[11px]",
				)}
			>
				{entry.name}
			</Link>

			<div className="mb-2 text-center">
				<span
					className={cn(
						"block font-black font-body text-ink tabular-nums leading-none",
						isWinner ? "text-lg" : "text-sm",
					)}
				>
					{entry.totalPoints}
				</span>
				<span className="font-body font-bold text-[8px] text-gray-500 uppercase tracking-widest">
					{t("podium.points")}
				</span>
			</div>

			<div
				className={cn(
					"flex w-full items-center justify-center border-black border-x-[3px] border-t-[3px]",
					config.platform,
					config.height,
				)}
			>
				<span className="font-black font-display text-2xl italic opacity-25">
					{rank}
				</span>
			</div>
		</div>
	);
}

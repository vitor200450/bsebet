import { Link } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import { Award, ChevronRight, Medal, Trophy } from "lucide-react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type MedalTier = "1st" | "2nd" | "3rd";

interface MedalSummaryProps {
	total: number;
	gold: number;
	silver: number;
	bronze: number;
	recentMedals?: Array<{
		tournamentName: string;
		placement: 1 | 2 | 3;
		tournamentSlug?: string;
	}>;
	userId?: string;
	showLink?: boolean;
	className?: string;
}

const tierConfig = {
	gold: {
		icon: Trophy,
		bg: "bg-gradient-to-br from-[#FFD700] via-[#FFFACD] to-[#DAA520]",
		border: "border-[#B8860B]",
		text: "text-[#8B6914]",
		shadow: "shadow-[4px_4px_0_0_#B8860B]",
		label: "OUROS",
	},
	silver: {
		icon: Medal,
		bg: "bg-gradient-to-br from-[#E6E6E6] via-[#FFFFFF] to-[#A3A3A3]",
		border: "border-[#808080]",
		text: "text-[#505050]",
		shadow: "shadow-[4px_4px_0_0_#808080]",
		label: "PRATAS",
	},
	bronze: {
		icon: Award,
		bg: "bg-gradient-to-br from-[#CD7F32] via-[#E6A869] to-[#804F1F]",
		border: "border-[#8B4513]",
		text: "text-white",
		shadow: "shadow-[4px_4px_0_0_#8B4513]",
		label: "BRONZES",
	},
};

export function MedalSummary({
	total,
	gold,
	silver,
	bronze,
	recentMedals,
	userId,
	showLink = true,
	className,
}: MedalSummaryProps) {
	const hasMedals = total > 0;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="rotate-3 transform border-2 border-black bg-[#FFD700] p-1.5 shadow-[2px_2px_0_0_#000]">
						<Trophy className="h-4 w-4 text-black" strokeWidth={2.5} />
					</div>
					<h3 className="font-black text-black text-sm uppercase italic tracking-tight">
						Suas Conquistas
					</h3>
				</div>
				{showLink && userId && (
					<Link
						to="/users/$userId"
						params={{ userId }}
						className="group flex items-center gap-1 font-black text-[#2e5cff] text-[10px] uppercase tracking-wider transition-colors hover:text-black"
					>
						Ver todas
						<ChevronRight
							className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
							strokeWidth={3}
						/>
					</Link>
				)}
			</div>

			{!hasMedals ? (
				// Empty State
				<div className="flex items-center gap-3 rounded border-2 border-black/20 border-dashed bg-white/50 p-4">
					<div className="flex h-10 w-10 -rotate-6 transform items-center justify-center border-2 border-black/30 bg-gray-200">
						<Trophy className="h-5 w-5 text-gray-400" />
					</div>
					<div>
						<p className="font-black text-black/60 text-sm uppercase italic">
							Nenhuma medalha ainda
						</p>
						<p className="font-bold text-[10px] text-black/40">
							Participe de torneios para ganhar!
						</p>
					</div>
				</div>
			) : (
				<>
					{/* Medal Count Cards */}
					<div className="grid grid-cols-3 gap-3">
						{/* Gold */}
						<div
							className={cn(
								"relative flex flex-col items-center border-[3px] p-3 transition-transform hover:-translate-y-0.5",
								tierConfig.gold.bg,
								tierConfig.gold.border,
								tierConfig.gold.shadow,
							)}
						>
							<tierConfig.gold.icon
								className={cn("h-5 w-5", tierConfig.gold.text)}
								fill={gold > 0 ? "currentColor" : "none"}
								strokeWidth={2.5}
							/>
							<span
								className={cn("mt-1 font-black text-2xl", tierConfig.gold.text)}
							>
								{gold}
							</span>
							<span
								className={cn(
									"font-black text-[8px] uppercase tracking-wider",
									tierConfig.gold.text,
								)}
							>
								{tierConfig.gold.label}
							</span>
						</div>

						{/* Silver */}
						<div
							className={cn(
								"relative flex flex-col items-center border-[3px] p-3 transition-transform hover:-translate-y-0.5",
								tierConfig.silver.bg,
								tierConfig.silver.border,
								tierConfig.silver.shadow,
							)}
						>
							<tierConfig.silver.icon
								className={cn("h-5 w-5", tierConfig.silver.text)}
								strokeWidth={2.5}
							/>
							<span
								className={cn(
									"mt-1 font-black text-2xl",
									tierConfig.silver.text,
								)}
							>
								{silver}
							</span>
							<span
								className={cn(
									"font-black text-[8px] uppercase tracking-wider",
									tierConfig.silver.text,
								)}
							>
								{tierConfig.silver.label}
							</span>
						</div>

						{/* Bronze */}
						<div
							className={cn(
								"relative flex flex-col items-center border-[3px] p-3 transition-transform hover:-translate-y-0.5",
								tierConfig.bronze.bg,
								tierConfig.bronze.border,
								tierConfig.bronze.shadow,
							)}
						>
							<tierConfig.bronze.icon
								className={cn("h-5 w-5", tierConfig.bronze.text)}
								strokeWidth={2.5}
							/>
							<span
								className={cn(
									"mt-1 font-black text-2xl",
									tierConfig.bronze.text,
								)}
							>
								{bronze}
							</span>
							<span
								className={cn(
									"font-black text-[8px] uppercase tracking-wider",
									tierConfig.bronze.text,
								)}
							>
								{tierConfig.bronze.label}
							</span>
						</div>
					</div>

					{/* Total Badge */}
					<div className="flex items-center justify-center">
						<div className="inline-flex items-center gap-2 border-2 border-black bg-black px-4 py-2 shadow-[3px_3px_0_0_#000]">
							<Trophy className="h-4 w-4 text-[#FFD700]" fill="#FFD700" />
							<span className="font-black text-sm text-white uppercase tracking-wider">
								Total de Medalhas:
							</span>
							<span className="font-black text-[#FFD700] text-xl">{total}</span>
						</div>
					</div>

					{/* Recent Medals */}
					{recentMedals && recentMedals.length > 0 && (
						<div className="space-y-2">
							<h4 className="font-black text-[10px] text-black/60 uppercase tracking-wider">
								Últimas Conquistas
							</h4>
							<div className="space-y-2">
								{recentMedals.slice(0, 3).map((medal, index) => (
									<div
										key={index}
										className="flex items-center gap-2 rounded border border-black/10 bg-white p-2"
									>
										<MedalBadge placement={medal.placement} size="sm" />
										<span className="flex-1 truncate font-bold text-black text-xs">
											{medal.tournamentName}
										</span>
										<span className="font-black text-[10px] text-black/40">
											#{medal.placement}º
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

// Simple medal badge for inline display
interface MedalBadgeProps {
	placement: 1 | 2 | 3;
	size?: "sm" | "md" | "lg";
	className?: string;
}

function MedalBadge({ placement, size = "md", className }: MedalBadgeProps) {
	const config =
		placement === 1
			? tierConfig.gold
			: placement === 2
				? tierConfig.silver
				: tierConfig.bronze;

	const sizeClasses = {
		sm: "h-5 w-5",
		md: "h-6 w-6",
		lg: "h-8 w-8",
	};

	const iconSizes = {
		sm: 10,
		md: 14,
		lg: 18,
	};

	return (
		<div
			className={cn(
				"flex items-center justify-center border-2 border-black",
				sizeClasses[size],
				config.bg,
				className,
			)}
		>
			<config.icon
				size={iconSizes[size]}
				className={config.text}
				fill={placement === 1 ? "currentColor" : "none"}
				strokeWidth={2.5}
			/>
		</div>
	);
}

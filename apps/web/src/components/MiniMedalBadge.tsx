import { type ClassValue, clsx } from "clsx";
import { Award, Medal, Trophy } from "lucide-react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type MedalTier = "1st" | "2nd" | "3rd";

interface MiniMedalBadgeProps {
	tier: MedalTier;
	count?: number;
	showCount?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const tierConfig = {
	"1st": {
		icon: Trophy,
		bg: "bg-[#FFD700]",
		border: "border-[#B8860B]",
		iconColor: "text-[#B8860B]",
		shadow: "shadow-[2px_2px_0_0_#B8860B]",
		label: "OURO",
	},
	"2nd": {
		icon: Medal,
		bg: "bg-[#C0C0C0]",
		border: "border-[#808080]",
		iconColor: "text-[#606060]",
		shadow: "shadow-[2px_2px_0_0_#808080]",
		label: "PRATA",
	},
	"3rd": {
		icon: Award,
		bg: "bg-[#CD7F32]",
		border: "border-[#8B4513]",
		iconColor: "text-[#8B4513]",
		shadow: "shadow-[2px_2px_0_0_#8B4513]",
		label: "BRONZE",
	},
};

const sizeConfig = {
	sm: {
		container: "h-5 w-5",
		icon: 10,
		font: "text-[9px]",
		countBadge: "h-3 min-w-3 px-1 text-[8px] -top-1 -right-1",
	},
	md: {
		container: "h-6 w-6",
		icon: 12,
		font: "text-[10px]",
		countBadge: "h-4 min-w-4 px-1 text-[9px] -top-1.5 -right-1.5",
	},
	lg: {
		container: "h-8 w-8",
		icon: 16,
		font: "text-xs",
		countBadge: "h-5 min-w-5 px-1.5 text-[10px] -top-2 -right-2",
	},
};

export function MiniMedalBadge({
	tier,
	count,
	showCount = false,
	size = "md",
	className,
}: MiniMedalBadgeProps) {
	const config = tierConfig[tier];
	const sizeClasses = sizeConfig[size];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				"relative inline-flex items-center justify-center rounded-full border-2",
				config.bg,
				config.border,
				config.shadow,
				sizeClasses.container,
				className,
			)}
			title={`${config.label}${count ? `: ${count}` : ""}`}
		>
			<Icon
				size={sizeClasses.icon}
				className={cn(config.iconColor, "drop-shadow-sm")}
				fill={tier === "1st" ? "currentColor" : "none"}
				strokeWidth={2.5}
			/>

			{/* Count Badge */}
			{showCount && count !== undefined && count > 0 && (
				<div
					className={cn(
						"absolute flex items-center justify-center rounded-full border border-black bg-black font-black text-white shadow-[1px_1px_0_0_rgba(0,0,0,0.3)]",
						sizeClasses.countBadge,
					)}
				>
					{count}
				</div>
			)}
		</div>
	);
}

// Medal Count Summary Component - for displaying total counts
interface MedalCountSummaryProps {
	gold?: number;
	silver?: number;
	bronze?: number;
	total?: number;
	size?: "sm" | "md" | "lg";
	showTotal?: boolean;
	className?: string;
}

export function MedalCountSummary({
	gold = 0,
	silver = 0,
	bronze = 0,
	total,
	size = "md",
	showTotal = false,
	className,
}: MedalCountSummaryProps) {
	const hasMedals = gold > 0 || silver > 0 || bronze > 0;
	const totalMedals = total ?? gold + silver + bronze;

	if (!hasMedals) {
		return (
			<div
				className={cn(
					"inline-flex items-center gap-1.5 text-black/40",
					className,
				)}
			>
				<Trophy size={sizeConfig[size].icon} />
				<span className={cn("font-bold", sizeConfig[size].font)}>0</span>
			</div>
		);
	}

	return (
		<div className={cn("inline-flex items-center gap-1", className)}>
			{gold > 0 && (
				<MiniMedalBadge tier="1st" count={gold} showCount={true} size={size} />
			)}
			{silver > 0 && (
				<MiniMedalBadge
					tier="2nd"
					count={silver}
					showCount={true}
					size={size}
				/>
			)}
			{bronze > 0 && (
				<MiniMedalBadge
					tier="3rd"
					count={bronze}
					showCount={true}
					size={size}
				/>
			)}
			{showTotal && totalMedals > 0 && (
				<span
					className={cn("ml-1 font-black text-black", sizeConfig[size].font)}
				>
					({totalMedals})
				</span>
			)}
		</div>
	);
}

// Compact inline medal display - for leaderboard cards
interface InlineMedalDisplayProps {
	placement: 1 | 2 | 3;
	className?: string;
}

export function InlineMedalDisplay({
	placement,
	className,
}: InlineMedalDisplayProps) {
	const tierMap: Record<number, MedalTier> = {
		1: "1st",
		2: "2nd",
		3: "3rd",
	};

	const tier = tierMap[placement];
	const config = tierConfig[tier];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				"inline-flex h-5 w-5 items-center justify-center rounded border",
				config.bg,
				config.border,
				"border-black",
				"shadow-[1px_1px_0_0_#000]",
				className,
			)}
			title={`${placement}º Lugar`}
		>
			<Icon
				size={10}
				className={config.iconColor}
				fill={placement === 1 ? "currentColor" : "none"}
				strokeWidth={2.5}
			/>
		</div>
	);
}

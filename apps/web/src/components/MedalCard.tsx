import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type MedalTier = "1st" | "2nd" | "3rd";

interface MedalCardProps {
	tier: MedalTier;
	tournamentName: string;
	points: number;
	logoUrl?: string | null;
	className?: string;
}

const tierConfig = {
	"1st": {
		badgeWrapper: "-top-3 -left-3 lg:-top-5 lg:-left-5 z-20",
		badgeBg: "bg-[#ff2e2e] text-white",
		badgeText: "CHAMPION",
		badgeSize: "text-sm",
		cardBg:
			"bg-gradient-to-br from-[#FFD700] via-[#FFFACD] via-[#FFD700] via-[#B8860B] to-[#DAA520]",
		icon: "trophy",
		tierLabel: "Gold Tier",
		tierColor: "text-black",
		shadow: "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
		hoverShadow: "group-hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
		rotation: "",
		pointsBg: "bg-white text-black",
		starHover: "group-hover:bg-[#ffc700] text-[#ffc700]",
		glossColor: "from-white/40 to-transparent",
	},
	"2nd": {
		badgeWrapper: "-top-3 -left-3 lg:-top-4 lg:-left-4 z-20",
		badgeBg: "bg-[#2e5cff] text-white",
		badgeText: "2ND PLACE",
		badgeSize: "text-xs md:text-sm",
		cardBg:
			"bg-gradient-to-br from-[#E6E6E6] via-[#FFFFFF] via-[#D1D1D1] via-[#A3A3A3] to-[#737373]",
		icon: "military_tech",
		tierLabel: "Silver Tier",
		tierColor: "text-black",
		shadow: "shadow-[4px_4px_0_0_#000]",
		hoverShadow: "group-hover:shadow-[6px_6px_0_0_#000]",
		rotation: "",
		pointsBg: "bg-white text-black",
		starHover: "group-hover:bg-[#e6e6e6] text-[#e6e6e6]",
		glossColor: "from-white/30 to-transparent",
	},
	"3rd": {
		badgeWrapper: "-bottom-3 -right-3 lg:-bottom-4 lg:-right-4 z-20",
		badgeBg: "bg-black text-[#ffc700]",
		badgeText: "3RD PLACE",
		badgeSize: "text-[10px] md:text-xs",
		cardBg:
			"bg-gradient-to-br from-[#CD7F32] via-[#E6A869] via-[#A0522D] via-[#8B4513] to-[#804F1F]",
		icon: "workspace_premium",
		tierLabel: "Bronze Tier",
		tierColor: "text-white drop-shadow-[1px_1px_0_rgba(0,0,0,1)]",
		shadow: "shadow-[4px_4px_0_0_#000]",
		hoverShadow: "group-hover:shadow-[6px_6px_0_0_#000]",
		rotation: "",
		pointsBg: "bg-black text-white",
		starHover: "group-hover:bg-[#cd7f32] text-[#cd7f32]",
		glossColor: "from-white/20 to-transparent",
	},
};

export function MedalCard({
	tier,
	tournamentName,
	points,
	logoUrl,
	className,
}: MedalCardProps) {
	const config = tierConfig[tier];

	return (
		<div
			className={cn(
				"group relative transition-transform duration-300",
				config.rotation,
				className,
			)}
		>
			{/* Badge */}
			<div className={cn("absolute", config.badgeWrapper)}>
				<div
					className={cn(
						"-skew-x-12 border-[3px] border-black px-4 py-1 shadow-[4px_4px_0_0_#000]",
						config.badgeBg,
					)}
				>
					<span
						className={cn(
							"block skew-x-12 font-black uppercase italic",
							config.badgeSize,
						)}
					>
						{config.badgeText}
					</span>
				</div>
			</div>

			{/* Card Body */}
			<div
				className={cn(
					"relative flex h-full flex-col overflow-hidden border-[3px] border-black p-0 transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-1",
					config.cardBg,
					config.shadow,
					config.hoverShadow,
				)}
			>
				{/* Gloss Sheen Effect */}
				<div
					className={cn(
						"pointer-events-none absolute inset-0 z-10 -translate-y-1/2 rotate-[25deg] scale-150 bg-gradient-to-tr mix-blend-overlay",
						config.glossColor,
					)}
				/>

				{/* Inner Highlight Rim */}
				<div className="pointer-events-none absolute inset-[2px] z-10 border border-white/30" />

				{/* Visual Header area */}
				<div
					className={cn(
						"relative flex aspect-video w-full items-center justify-center overflow-hidden border-black border-b-[3px] bg-white/40 backdrop-blur-sm transition-all duration-500",
						tier === "1st" ? "aspect-square lg:aspect-video" : "",
						logoUrl
							? "relative" // Maintain relative position for inner layers
							: "opacity-90", // Slight opacity if it's just a solid color/icon
					)}
				>
					{/* Subtle noise texture or gradient sheen could go here, for now it shines through cardBg */}
					{logoUrl ? (
						<div className="relative z-10 h-32 w-32 rotate-3 rounded-sm bg-transparent p-2 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] sm:h-40 sm:w-40 md:h-20 md:w-20 lg:h-48 lg:w-48 xl:h-28 xl:w-28">
							<img
								src={logoUrl || undefined}
								alt="Tournament"
								className="h-full w-full -rotate-3 object-contain"
							/>
						</div>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="material-symbols-outlined text-[80px] text-black/40 drop-shadow-[2px_2px_0_rgba(255,255,255,0.5)]">
								{config.icon}
							</span>
						</div>
					)}
				</div>

				{/* Content Area */}
				<div className="flex flex-grow flex-col gap-2 bg-white p-4 lg:p-5">
					<div>
						<h3
							className={cn(
								"mb-1 font-black text-lg uppercase italic leading-none sm:text-xl md:mb-2 lg:text-3xl xl:text-4xl",
								config.tierColor,
							)}
						>
							{config.tierLabel}
						</h3>
						<p
							className="overflow-hidden border-black/10 border-b-2 pb-2 font-bold text-[10px] text-gray-500 uppercase tracking-widest lg:text-xs"
							style={{ wordBreak: "break-word" }}
							title={tournamentName}
						>
							{tournamentName}
						</p>
					</div>

					<div className="mt-auto flex items-end justify-between pt-2 sm:pt-4">
						<div className="flex flex-col">
							<span className="font-bold text-[10px] text-gray-500 uppercase">
								Total Points
							</span>
							<span
								className={cn(
									"mt-1 border-[2px] border-black px-2 py-1 font-black font-mono text-lg shadow-[2px_2px_0_0_#000] sm:border-[3px] sm:px-3 sm:text-xl sm:shadow-[4px_4px_0_0_#000] md:text-2xl lg:text-3xl",
									config.pointsBg,
								)}
							>
								{points}
							</span>
						</div>

						{/* Optional interactive element / purely decorative for MVP */}
						<div
							className={cn(
								"flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border-[2px] border-black bg-black shadow-[2px_2px_0_0_#000] transition-colors sm:h-10 sm:w-10 sm:border-[3px] sm:shadow-[4px_4px_0_0_#000] lg:h-12 lg:w-12",
								config.starHover.split(" ")[0], // bg-color
							)}
						>
							<span
								className={cn(
									"material-symbols-outlined text-lg group-hover:text-black sm:text-xl lg:text-2xl",
									config.starHover.split(" ")[1], // text-color
								)}
							>
								stars
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

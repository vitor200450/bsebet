import { Link } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import { Award, Crown, Medal, Star, Trophy } from "lucide-react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type MedalTier = "1st" | "2nd" | "3rd";

interface RealisticMedalProps {
	tier: MedalTier;
	tournamentName: string;
	points: number;
	logoUrl?: string | null;
	tournamentSlug?: string;
	className?: string;
}

const tierConfig = {
	"1st": {
		// Gold
		ribbon: "bg-gradient-to-b from-[#ff4444] via-[#cc0000] to-[#880000]",
		ribbonBorder: "border-[#880000]",
		medal: "bg-gradient-to-br from-[#FFF8DC] via-[#FFD700] to-[#B8860B]",
		medalBorder: "border-[#B8860B]",
		innerRing: "bg-gradient-to-br from-[#FFD700] via-[#FFF8DC] to-[#DAA520]",
		text: "text-[#8B6914]",
		shadow: "shadow-[0_8px_0_0_#8B6914]",
		icon: Crown,
		label: "CHAMPION",
		stars: 5,
	},
	"2nd": {
		// Silver
		ribbon: "bg-gradient-to-b from-[#4169E1] via-[#1e3a8a] to-[#0f172a]",
		ribbonBorder: "border-[#1e3a8a]",
		medal: "bg-gradient-to-br from-[#F5F5F5] via-[#C0C0C0] to-[#696969]",
		medalBorder: "border-[#696969]",
		innerRing: "bg-gradient-to-br from-[#E8E8E8] via-[#D3D3D3] to-[#A9A9A9]",
		text: "text-[#4a4a4a]",
		shadow: "shadow-[0_8px_0_0_#696969]",
		icon: Medal,
		label: "2ND PLACE",
		stars: 3,
	},
	"3rd": {
		// Bronze
		ribbon: "bg-gradient-to-b from-[#228B22] via-[#006400] to-[#003300]",
		ribbonBorder: "border-[#006400]",
		medal: "bg-gradient-to-br from-[#F4A460] via-[#CD7F32] to-[#8B4513]",
		medalBorder: "border-[#8B4513]",
		innerRing: "bg-gradient-to-br from-[#D2691E] via-[#CD7F32] to-[#A0522D]",
		text: "text-white",
		shadow: "shadow-[0_8px_0_0_#5c3a1e]",
		icon: Award,
		label: "3RD PLACE",
		stars: 1,
	},
};

export function RealisticMedal({
	tier,
	tournamentName,
	points,
	logoUrl,
	tournamentSlug,
	className,
}: RealisticMedalProps) {
	const config = tierConfig[tier];
	const Icon = config.icon;

	const content = (
		<div className={cn("group relative flex flex-col items-center", className)}>
			{/* Medal Container with hover animation */}
			<div className="relative transition-transform duration-300 group-hover:-translate-y-2">
				{/* Ribbon Top (V-shape) */}
				<div className="relative mx-auto flex justify-center">
					{/* Left ribbon */}
					<div
						className={cn(
							"h-12 w-8 origin-top-right -rotate-12 transform border-2 border-black",
							config.ribbon,
							"shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]",
						)}
					/>
					{/* Right ribbon */}
					<div
						className={cn(
							"-ml-1 h-12 w-8 origin-top-left rotate-12 transform border-2 border-black",
							config.ribbon,
							"shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]",
						)}
					/>
				</div>

				{/* Ribbon Knot */}
				<div
					className={cn(
						"absolute top-10 left-1/2 z-10 h-6 w-10 -translate-x-1/2 transform border-2 border-black",
						config.ribbon,
						"shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]",
					)}
				/>

				{/* Main Medal Body */}
				<div
					className={cn(
						"relative z-20 mt-2 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-black",
						config.medal,
						config.shadow,
						"transition-all duration-300 group-hover:shadow-[0_12px_0_0_rgba(0,0,0,0.3)]",
					)}
				>
					{/* Outer decorative ring */}
					<div
						className={cn(
							"absolute inset-1.5 rounded-full border-2 border-black/20",
							config.innerRing,
						)}
					/>

					{/* Inner decorative ring */}
					<div
						className={cn(
							"absolute inset-3 rounded-full border border-white/40",
						)}
					/>

					{/* Stars decoration - positioned higher when there's a logo */}
					<div
						className={cn(
							"absolute flex gap-0.5",
							logoUrl ? "top-1.5" : "top-2",
						)}
					>
						{Array.from({ length: config.stars }).map((_, i) => (
							<Star
								key={i}
								size={logoUrl ? 6 : tier === "1st" ? 8 : 6}
								className={cn(
									tier === "1st"
										? "text-[#B8860B]"
										: tier === "2nd"
											? "text-[#696969]"
											: "text-[#8B4513]",
									"fill-current",
								)}
							/>
						))}
					</div>

					{/* Center Content - Logo or Icon */}
					<div className="relative z-10 flex flex-col items-center">
						{/* Logo or Icon */}
						{logoUrl ? (
							<div
								className={cn(
									"relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-black/20 p-1 shadow-inner",
									tier === "1st" &&
										"bg-gradient-to-br from-[#FFD700]/60 to-[#B8860B]/60",
									tier === "2nd" &&
										"bg-gradient-to-br from-[#C0C0C0]/60 to-[#696969]/60",
									tier === "3rd" &&
										"bg-gradient-to-br from-[#CD7F32]/60 to-[#8B4513]/60",
								)}
							>
								<img
									src={logoUrl}
									alt={tournamentName}
									className={cn(
										"h-full w-full object-contain drop-shadow-xl",
										// Strong forged metal effect
										tier === "1st" &&
											"brightness-[1.3] contrast-[1.2] saturate-[4] sepia-[0.6]",
										tier === "2nd" &&
											"brightness-[1.4] contrast-[1.3] grayscale saturate-0",
										tier === "3rd" &&
											"brightness-[1.1] contrast-[1.2] saturate-[3] sepia-[1]",
									)}
								/>
								{/* Metallic shine overlay */}
								<div
									className={cn(
										"pointer-events-none absolute inset-0 rounded-full",
										tier === "1st" &&
											"bg-gradient-to-br from-[#FFD700]/40 via-transparent to-[#B8860B]/20",
										tier === "2nd" &&
											"bg-gradient-to-br from-white/30 via-transparent to-[#696969]/20",
										tier === "3rd" &&
											"bg-gradient-to-br from-[#CD7F32]/30 via-transparent to-[#8B4513]/20",
									)}
								/>
								{/* Beveled edge highlight */}
								<div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/30 border-r-black/20 border-b-black/20" />
							</div>
						) : (
							<Icon
								size={tier === "1st" ? 36 : 28}
								className={cn(
									"drop-shadow-md",
									config.text,
									tier === "1st" && "fill-[#FFD700]",
								)}
								strokeWidth={2}
							/>
						)}

						{/* Points */}
						<div
							className={cn(
								"mt-2 rounded border border-black/30 px-2 py-0.5 font-black text-xs shadow-sm",
								tier === "1st"
									? "bg-[#FFF8DC] text-[#8B6914]"
									: tier === "2nd"
										? "bg-[#F5F5F5] text-[#4a4a4a]"
										: "bg-[#8B4513] text-white",
							)}
						>
							{points} pts
						</div>
					</div>

					{/* Shine effect */}
					<div
						className="absolute inset-0 rounded-full opacity-30"
						style={{
							background:
								"linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
						}}
					/>
				</div>

				{/* Placement Badge - Moved to top right to avoid covering content */}
				<div
					className={cn(
						"absolute -top-1 -right-2 z-30 rotate-12 transform border-2 border-black px-2 py-0.5 font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0_0_#000]",
						tier === "1st"
							? "bg-[#ff4444] text-white"
							: tier === "2nd"
								? "bg-[#4169E1] text-white"
								: "bg-[#228B22] text-white",
					)}
				>
					{config.label}
				</div>
			</div>

			{/* Tournament Name - colored to match medal */}
			<div className="mt-4 max-w-[160px] text-center">
				<p
					className={cn(
						"break-words font-black text-sm uppercase leading-tight tracking-tight",
						tier === "1st" && "text-[#B8860B] drop-shadow-sm",
						tier === "2nd" && "text-[#696969] drop-shadow-sm",
						tier === "3rd" && "text-[#8B4513] drop-shadow-sm",
					)}
				>
					{tournamentName}
				</p>
			</div>
		</div>
	);

	if (tournamentSlug) {
		return (
			<Link
				to="/tournaments/$slug"
				params={{ slug: tournamentSlug }}
				className="block cursor-pointer"
			>
				{content}
			</Link>
		);
	}

	return content;
}

// Trophy Case Grid Component
interface TrophyCaseProps {
	medals: Array<{
		tournamentId: number;
		tournamentName: string;
		tournamentSlug: string;
		tournamentLogoUrl: string | null;
		placement: 1 | 2 | 3;
		totalPoints: number;
	}>;
	className?: string;
}

export function TrophyCase({ medals, className }: TrophyCaseProps) {
	if (medals.length === 0) return null;

	return (
		<section className={cn("", className)}>
			{/* Header */}
			<div className="mb-6 flex items-center gap-3">
				<div className="rotate-2 transform border-2 border-black bg-[#FFD700] p-2 shadow-[2px_2px_0_0_#000]">
					<Trophy className="h-5 w-5 text-black" strokeWidth={3} fill="black" />
				</div>
				<h2 className="font-black text-black text-xl uppercase italic tracking-tighter md:text-2xl">
					TROPHY CASE
				</h2>
				<div className="ml-auto flex items-center gap-1 rounded-full border-2 border-black bg-black px-3 py-1">
					<span className="font-black text-sm text-white">{medals.length}</span>
					<span className="font-bold text-[10px] text-white/60 uppercase">
						medalhas
					</span>
				</div>
			</div>

			{/* Medal Grid */}
			<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
				{medals.map((medal) => {
					const tierMap: Record<number, MedalTier> = {
						1: "1st",
						2: "2nd",
						3: "3rd",
					};
					const tier = tierMap[medal.placement] || "3rd";

					return (
						<RealisticMedal
							key={`${medal.tournamentId}-${medal.placement}`}
							tier={tier}
							tournamentName={medal.tournamentName}
							points={medal.totalPoints}
							logoUrl={medal.tournamentLogoUrl}
							tournamentSlug={medal.tournamentSlug}
						/>
					);
				})}
			</div>
		</section>
	);
}

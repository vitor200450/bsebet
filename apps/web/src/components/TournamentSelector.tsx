import { clsx } from "clsx";
import { ArrowRight, Calendar, Gamepad2, Globe, Trophy } from "lucide-react";

export interface TournamentOption {
	id: number;
	name: string;
	logoUrl?: string | null;
	status: string;
	matchCount: number;
	startDate?: string | null;
	activeStage?: string;
	hasUserBets?: boolean;
	hasRecoveryBets?: boolean;
	recoveryMatchCount?: number;
	colors?: {
		primary: string;
		secondary: string;
		tertiary: string;
		style: "linear" | "radial";
	} | null;
}

interface TournamentSelectorProps {
	tournaments: TournamentOption[];
	onSelect: (tournamentId: number) => void;
}

const STATUS_STYLES: Record<
	string,
	{ bg: string; icon: React.ReactNode; label: string }
> = {
	active: {
		bg: "bg-[#ccff00]",
		icon: <span className="h-2 w-2 animate-pulse rounded-full bg-black" />,
		label: "ACTIVE",
	},
	upcoming: {
		bg: "bg-[#ffc700]",
		icon: <Calendar className="h-3.5 w-3.5" />,
		label: "UPCOMING",
	},
	finished: {
		bg: "bg-gray-300",
		icon: null,
		label: "FINISHED",
	},
};

const CARD_ICONS = [
	<Trophy className="h-40 w-40 text-black drop-shadow-md" />,
	<Globe className="h-40 w-40 text-black drop-shadow-md" />,
];

const CARD_BG_COLORS = ["bg-[#ccff00]/20", "bg-blue-100"];

const CARD_PATTERNS = [
	"radial-gradient(#000 1px, transparent 1px)",
	"repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
];

export function TournamentSelector({
	tournaments,
	onSelect,
}: TournamentSelectorProps) {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-between overflow-x-hidden bg-paper bg-paper-texture">
			{/* Subtle Noise Texture Overlay */}
			<div
				className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
				}}
			/>

			{/* Header Section */}
			{/* Header Section */}
			<header className="relative z-10 flex w-full justify-center px-4 pt-32 pb-8 md:pt-40 md:pb-16">
				<div className="mx-auto w-full max-w-2xl -rotate-1 transform">
					<div className="relative border-[#ccff00] border-b-4 bg-black px-4 py-3 text-center text-white shadow-[4px_4px_0px_0px_#000] md:px-8 md:py-4 md:shadow-[6px_6px_0px_0px_#000]">
						<h1 className="font-black font-display text-2xl uppercase italic leading-tight tracking-tighter sm:text-3xl md:text-5xl">
							Choose Your Tournament
						</h1>
						{/* Corner decorations */}
						<div className="absolute -top-1.5 -right-1.5 h-3 w-3 border-2 border-black bg-[#ccff00] md:-top-2 md:-right-2 md:h-4 md:w-4" />
						<div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 border-2 border-black bg-[#ccff00] md:-bottom-2 md:-left-2 md:h-4 md:w-4" />
					</div>
				</div>
			</header>

			{/* Main Content: Tournament Cards */}
			<main className="z-10 flex w-full max-w-7xl flex-grow flex-col flex-wrap items-center justify-center gap-8 px-4 py-8 md:flex-row md:items-stretch md:gap-12">
				{tournaments.map((tournament, index) => {
					const statusStyle =
						STATUS_STYLES[tournament.status] || STATUS_STYLES.upcoming;
					const icon = tournament.logoUrl
						? null
						: CARD_ICONS[index % CARD_ICONS.length];

					// Dynamic Gradient Logic
					let customStyle = {};
					let cardBgClass = CARD_BG_COLORS[index % CARD_BG_COLORS.length];

					if (tournament.colors) {
						const { primary, secondary, tertiary, style } = tournament.colors;
						cardBgClass = ""; // Remove default class if custom colors exist

						if (style === "radial") {
							customStyle = {
								background: `radial-gradient(ellipse at center, ${primary} 0%, ${primary} 40%, ${tertiary} 80%, ${secondary} 100%)`,
							};
						} else {
							customStyle = {
								background: `linear-gradient(135deg, ${primary} 0%, ${tertiary} 50%, ${secondary} 100%)`,
							};
						}
					}

					const pattern = CARD_PATTERNS[index % CARD_PATTERNS.length];

					const isDisabled =
						tournament.matchCount === 0 && !tournament.hasUserBets;

					return (
						<div
							key={tournament.id}
							className={clsx(
								"group relative w-full max-w-md transition-all duration-200",
								isDisabled
									? "pointer-events-none cursor-not-allowed opacity-60 grayscale"
									: "cursor-pointer",
							)}
							onClick={() => !isDisabled && onSelect(tournament.id)}
						>
							<div
								className={clsx(
									"relative flex h-full flex-col overflow-hidden rounded-xl border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000] transition-all duration-200",
									!isDisabled &&
										"group-hover:translate-x-[3px] group-hover:translate-y-[3px] group-hover:shadow-[3px_3px_0px_0px_#000]",
								)}
							>
								{/* Recovery Bets Badge - Most prominent */}
								{tournament.hasRecoveryBets && (
									<div className="absolute top-4 left-4 z-20 flex animate-pulse items-center gap-1 rounded-full border-2 border-black bg-brawl-yellow px-2 py-1 font-black text-[10px] text-black uppercase shadow-[3px_3px_0px_0px_#000]">
										<span className="material-symbols-outlined text-sm">
											sync_problem
										</span>
										{tournament.recoveryMatchCount} RECUPERAÇÃO
									</div>
								)}

								{/* User Bets Badge */}
								{tournament.hasUserBets && !tournament.hasRecoveryBets && (
									<div className="absolute top-4 left-4 z-20 flex animate-pulse items-center gap-1 rounded-full border-2 border-black bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 font-black text-[10px] text-white uppercase shadow-[3px_3px_0px_0px_#000]">
										<span>📊</span>
										SUAS APOSTAS
									</div>
								)}

								{/* Status Badge */}
								<div
									className={`absolute top-4 right-4 ${isDisabled ? "bg-gray-400" : statusStyle.bg} z-20 flex items-center gap-1 rounded-full border-2 border-black px-3 py-1 font-bold text-black text-sm uppercase shadow-[3px_3px_0px_0px_#000]`}
								>
									{statusStyle.icon}
									{statusStyle.label}
								</div>

								{/* Card Hero */}
								<div
									className={`h-64 w-full ${isDisabled ? "bg-gray-200" : cardBgClass} relative mb-6 flex items-center justify-center overflow-hidden rounded-lg border-2 border-black`}
									style={!isDisabled ? customStyle : undefined}
								>
									<div
										className="absolute inset-0 opacity-20"
										style={{
											backgroundImage: pattern,
											backgroundSize: "12px 12px",
										}}
									/>
									{tournament.logoUrl ? (
										<img
											src={tournament.logoUrl}
											alt={tournament.name}
											className={clsx(
												"relative z-10 h-48 w-48 object-contain drop-shadow-2xl transition-transform",
												!isDisabled && "hover:scale-105",
											)}
										/>
									) : (
										<div
											className={clsx(
												"relative z-10 transition-transform",
												!isDisabled && "hover:scale-110",
											)}
										>
											{icon}
										</div>
									)}
								</div>

								{/* Content */}
								<div className="flex-grow space-y-6">
									<h2 className="border-black border-l-4 pl-4 font-black text-3xl text-black uppercase leading-tight">
										{tournament.name}
									</h2>

									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col gap-1">
											<span className="font-black text-[10px] text-zinc-400 uppercase tracking-tighter">
												Start Date
											</span>
											<div className="flex items-center gap-2 rounded-lg border-2 border-zinc-200 bg-white px-3 py-1.5 font-bold font-display text-sm text-zinc-600">
												<Calendar className="h-4 w-4 text-black" />
												<span>
													{tournament.startDate
														? new Date(tournament.startDate).toLocaleDateString(
																"pt-BR",
																{
																	day: "2-digit",
																	month: "short",
																	timeZone: "UTC",
																},
															)
														: "TBD"}
												</span>
											</div>
										</div>

										<div className="flex flex-col gap-1">
											<span className="font-black text-[10px] text-zinc-400 uppercase tracking-tighter">
												Current Phase
											</span>
											<div
												className={clsx(
													"flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border-2 px-3 py-1.5 font-bold font-display text-sm text-zinc-600",
													isDisabled
														? "border-gray-300 bg-gray-100"
														: "border-[#ccff00] bg-[#ccff00]/10",
												)}
											>
												<Trophy className="h-4 w-4 min-w-[16px] text-black" />
												<span className="uppercase">
													{tournament.activeStage || "Fase de Grupos"}
												</span>
											</div>
										</div>
									</div>

									<div
										className={clsx(
											"flex w-fit items-center gap-2 rounded-full border-2 border-black px-4 py-1.5 font-black font-display text-white text-xs shadow-[3px_3px_0px_0px_#ccff00]",
											isDisabled ? "bg-gray-500 shadow-none" : "bg-black",
										)}
									>
										<Gamepad2 className="h-4 w-4" />
										<span>{tournament.matchCount} MATCHES AVAILABLE</span>
									</div>
								</div>

								{/* Action Button */}
								<div className="mt-8">
									<button
										disabled={isDisabled}
										className={clsx(
											"flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black px-6 py-3 font-bold text-white uppercase shadow-[3px_3px_0px_0px_#000] transition-all duration-200",
											isDisabled
												? "cursor-not-allowed border-gray-500 bg-gray-400 shadow-none"
												: "bg-black hover:bg-zinc-800 group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_0px_#000]",
										)}
									>
										{isDisabled ? (
											"AGUARDE"
										) : (
											<>
												{tournament.hasUserBets ? "Ver Apostas" : "Bet Now"}
												<ArrowRight className="h-5 w-5 text-[#ccff00]" />
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</main>

			{/* Footer */}
			<footer className="z-10 w-full py-8 text-center">
				<p className="inline-block rounded bg-white/50 px-4 py-1 font-body text-sm text-zinc-500 uppercase tracking-wide backdrop-blur-sm">
					// Pick a tournament to start betting //
				</p>
			</footer>

			{/* Decorative floating elements */}
			<div className="absolute top-1/4 left-10 z-0 hidden h-12 w-12 animate-bounce rounded-full border-4 border-black bg-[#ccff00] shadow-[3px_3px_0px_0px_#000] xl:block" />
			<div className="absolute right-10 bottom-1/4 z-0 hidden h-8 w-8 rotate-45 transform border-4 border-black bg-[#ffc700] shadow-[3px_3px_0px_0px_#000] xl:block" />
			<div className="pointer-events-none absolute top-1/3 right-20 z-0 rotate-12 select-none font-black text-9xl text-black italic opacity-5">
				VS
			</div>
		</div>
	);
}

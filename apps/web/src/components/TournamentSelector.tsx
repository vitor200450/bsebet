import { clsx } from "clsx";
import { ArrowRight, Calendar, Gamepad2, Globe, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

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
	{ bg: string; icon: React.ReactNode; labelKey: string }
> = {
	active: {
		bg: "bg-[#ccff00]",
		icon: <span className="h-2 w-2 animate-pulse rounded-full bg-black" />,
		labelKey: "statusActive",
	},
	upcoming: {
		bg: "bg-[#ffc700]",
		icon: <Calendar className="h-3.5 w-3.5" />,
		labelKey: "statusUpcoming",
	},
	finished: {
		bg: "bg-gray-300",
		icon: null,
		labelKey: "statusFinished",
	},
};

const CARD_ICONS = [
	<Trophy className="h-32 w-32 text-black drop-shadow-md" strokeWidth={1.5} />,
	<Globe className="h-32 w-32 text-black drop-shadow-md" strokeWidth={1.5} />,
];

const CARD_PATTERNS = [
	"radial-gradient(#000 1px, transparent 1px)",
	"repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
];

export function TournamentSelector({
	tournaments,
	onSelect,
}: TournamentSelectorProps) {
	const { t, i18n } = useTranslation("tournament");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	return (
		<div className="relative flex min-h-screen flex-col items-center overflow-x-hidden bg-paper">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			{/* Header Section */}
			<header className="relative z-10 flex w-full justify-center px-4 pt-24 pb-8 md:pt-32 md:pb-12">
				<div className="mx-auto w-full max-w-2xl -rotate-1 transform">
					<div className="relative border-[#ccff00] border-b-4 bg-ink px-4 py-3 text-center text-white shadow-[4px_4px_0px_0px_#000] md:px-8 md:py-4 md:shadow-[6px_6px_0px_0px_#000]">
						<h1 className="font-black font-display text-2xl uppercase italic leading-tight tracking-tighter sm:text-3xl md:text-5xl">
							{t("selector.chooseTitle")}
						</h1>
						{/* Corner decorations */}
						<div className="absolute -top-1.5 -right-1.5 h-3 w-3 border-2 border-black bg-[#ccff00] md:-top-2 md:-right-2 md:h-4 md:w-4" />
						<div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 border-2 border-black bg-[#ccff00] md:-bottom-2 md:-left-2 md:h-4 md:w-4" />
					</div>
				</div>
			</header>

			{/* Main Content: Tournament Cards */}
			<main className="z-10 flex w-full max-w-7xl flex-grow flex-col flex-wrap items-center justify-center gap-6 px-4 py-8 md:flex-row md:items-stretch md:gap-8">
				{tournaments.map((tournament, index) => {
					const statusStyle =
						STATUS_STYLES[tournament.status] || STATUS_STYLES.upcoming;
					const icon = tournament.logoUrl
						? null
						: CARD_ICONS[index % CARD_ICONS.length];

					// Dynamic Gradient Logic
					let customStyle = {};
					let cardBgClass = "bg-tape";

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
									"relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] transition-all duration-200",
									!isDisabled &&
										"group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_#000]",
								)}
							>
								{/* Recovery Bets Badge - Most prominent */}
								{tournament.hasRecoveryBets && (
									<div className="absolute top-3 left-3 z-20 flex animate-pulse items-center gap-1 rounded-md border-2 border-black bg-brawl-yellow px-2 py-1 font-black text-[10px] text-black uppercase shadow-[2px_2px_0px_0px_#000]">
										<span className="material-symbols-outlined text-sm">
											sync_problem
										</span>
										{tournament.recoveryMatchCount} {t("selector.recovery")}
									</div>
								)}

								{/* User Bets Badge */}
								{tournament.hasUserBets && !tournament.hasRecoveryBets && (
									<div className="absolute top-3 left-3 z-20 flex animate-pulse items-center gap-1 rounded-md border-2 border-black bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 font-black text-[10px] text-white uppercase shadow-[2px_2px_0px_0px_#000]">
										<span>📊</span>
										{t("selector.yourBets")}
									</div>
								)}

								{/* Status Badge */}
								<div
									className={`absolute top-3 right-3 ${isDisabled ? "bg-gray-400" : statusStyle.bg} z-20 flex items-center gap-1 rounded-md border-2 border-black px-2.5 py-1 font-bold text-black text-xs uppercase shadow-[2px_2px_0px_0px_#000]`}
								>
									{statusStyle.icon}
									{t("selector." + statusStyle.labelKey)}
								</div>

								{/* Card Hero */}
								<div
									className={`h-56 w-full ${isDisabled ? "bg-gray-200" : cardBgClass} relative mb-5 flex items-center justify-center overflow-hidden rounded-md border-2 border-black`}
									style={!isDisabled ? customStyle : undefined}
								>
									<div
										className="absolute inset-0 opacity-15"
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
												"relative z-10 h-36 w-36 object-contain drop-shadow-2xl transition-transform",
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
								<div className="flex-grow space-y-4 px-5 pb-5">
									<h2 className="border-ink border-l-4 pl-3 font-black text-2xl text-ink uppercase leading-tight md:text-3xl">
										{tournament.name}
									</h2>

									<div className="grid grid-cols-2 gap-3">
										<div className="flex flex-col gap-1">
											<span className="font-black text-[10px] text-gray-500 uppercase tracking-wider">
												{t("selector.startDate")}
											</span>
											<div className="flex items-center gap-2 rounded-md border-2 border-black bg-white px-3 py-1.5 font-bold font-display text-ink text-sm shadow-[2px_2px_0px_0px_#000]">
												<Calendar
													className="h-4 w-4 text-ink"
													strokeWidth={2.5}
												/>
												<span>
													{tournament.startDate
														? new Date(tournament.startDate).toLocaleDateString(
																locale,
																{
																	day: "2-digit",
																	month: "short",
																	timeZone: "UTC",
																},
															)
														: t("browse.noDates")}
												</span>
											</div>
										</div>

										<div className="flex flex-col gap-1">
											<span className="font-black text-[10px] text-gray-500 uppercase tracking-wider">
												{t("selector.currentPhase")}
											</span>
											<div
												className={clsx(
													"flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border-2 px-3 py-1.5 font-bold font-display text-sm shadow-[2px_2px_0px_0px_#000]",
													isDisabled
														? "border-gray-300 bg-gray-100 text-gray-500"
														: "border-[#ccff00] bg-[#ccff00]/10 text-ink",
												)}
											>
												<Trophy
													className="h-4 w-4 min-w-[16px] text-ink"
													strokeWidth={2.5}
												/>
												<span className="uppercase">
													{tournament.activeStage || t("selector.groupStage")}
												</span>
											</div>
										</div>
									</div>

									<div
										className={clsx(
											"flex w-fit items-center gap-2 rounded-md border-2 border-black px-3 py-1.5 font-black font-display text-white text-xs shadow-[2px_2px_0px_0px_#ccff00]",
											isDisabled ? "bg-gray-500 shadow-none" : "bg-ink",
										)}
									>
										<Gamepad2 className="h-4 w-4" strokeWidth={2.5} />
										<span>
											{t("selector.matchesAvailable", {
												count: tournament.matchCount,
											})}
										</span>
									</div>
								</div>

								{/* Action Button */}
								<div className="mt-auto px-5 pb-5">
									<button
										disabled={isDisabled}
										className={clsx(
											"flex w-full items-center justify-center gap-2 rounded-md border-2 border-black px-6 py-3 font-bold text-white uppercase shadow-[3px_3px_0px_0px_#000] transition-all duration-200",
											isDisabled
												? "cursor-not-allowed border-gray-500 bg-gray-400 shadow-none"
												: "bg-ink hover:bg-black group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_0px_#000]",
										)}
									>
										{isDisabled ? (
											t("selector.wait")
										) : (
											<>
												{tournament.hasUserBets
													? t("selector.viewBets")
													: t("selector.betNow")}
												<ArrowRight
													className="h-5 w-5 text-[#ccff00]"
													strokeWidth={3}
												/>
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
				<p className="inline-block rounded-md border border-black/10 bg-white/60 px-4 py-1.5 font-body text-gray-500 text-sm uppercase tracking-wide backdrop-blur-sm">
					{t("selector.pickHint")}
				</p>
			</footer>
		</div>
	);
}

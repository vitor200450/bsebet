import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { PublicPageShell } from "@/components/PublicPageShell";

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

function statusPill(
	status: string,
	t: (key: string) => string,
): { className: string; label: string } {
	switch (status) {
		case "active":
			return { className: "surface-lime", label: t("selector.statusActive") };
		case "finished":
			return {
				className: "surface-tape",
				label: t("selector.statusFinished"),
			};
		default:
			return {
				className: "surface-yellow",
				label: t("selector.statusUpcoming"),
			};
	}
}

export function TournamentSelector({
	tournaments,
	onSelect,
}: TournamentSelectorProps) {
	const { t, i18n } = useTranslation("tournament");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	return (
		<PublicPageShell className="relative flex flex-col items-center overflow-x-hidden px-4 py-6 pt-20 md:pt-24">
			<div className="relative z-10 w-full max-w-3xl">
				<header className="mb-8 flex flex-col items-center text-center">
					<h1 className="mb-3 pb-1 font-black font-display text-3xl text-ink uppercase italic leading-[1.1] tracking-tighter md:text-4xl">
						{t("selector.chooseTitle")}
					</h1>
					<p className="max-w-md font-display text-gray-600 text-sm sm:text-base">
						{t("selector.pickHint")}
					</p>
				</header>

				<ul className="flex flex-col gap-2">
					{tournaments.map((tournament) => {
						const isDisabled =
							tournament.matchCount === 0 && !tournament.hasUserBets;
						const pill = statusPill(tournament.status, t);
						const stage = tournament.activeStage || t("selector.groupStage");
						const dateLabel = tournament.startDate
							? new Date(tournament.startDate).toLocaleDateString(locale, {
									day: "2-digit",
									month: "short",
									timeZone: "UTC",
								})
							: null;

						const flag = tournament.hasRecoveryBets
							? {
									className: "surface-yellow",
									label:
										`${tournament.recoveryMatchCount ?? ""} ${t("selector.recovery")}`.trim(),
								}
							: tournament.hasUserBets
								? {
										className: "surface-brawl-blue",
										label: t("selector.yourBets"),
									}
								: null;

						return (
							<li key={tournament.id}>
								<button
									type="button"
									disabled={isDisabled}
									onClick={() => !isDisabled && onSelect(tournament.id)}
									className={clsx(
										"flex w-full items-center gap-3 border-[3px] border-black px-3 py-3 text-left text-ink shadow-comic-sm transition-all duration-150 sm:gap-4 sm:px-4 sm:py-3.5",
										isDisabled
											? "cursor-not-allowed bg-tape opacity-55"
											: "bg-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
									)}
								>
									{tournament.logoUrl ? (
										<img
											src={tournament.logoUrl}
											alt={tournament.name}
											draggable={false}
											className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
										/>
									) : (
										<div className="flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24">
											<span className="material-symbols-outlined text-5xl text-ink">
												emoji_events
											</span>
										</div>
									)}

									{/* Copy */}
									<div className="min-w-0 flex-1">
										<span className="mb-1 block font-black font-display text-base uppercase italic leading-[1.1] tracking-tight sm:text-xl">
											{tournament.name}
										</span>
										<span className="block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
											{stage}
											{dateLabel ? ` · ${dateLabel}` : ""}
										</span>
										{!isDisabled && tournament.matchCount > 0 ? (
											<span className="mt-1 block font-body font-bold text-[10px] text-ink uppercase tabular-nums tracking-widest">
												{t("selector.matchesAvailable", {
													count: tournament.matchCount,
												})}
											</span>
										) : null}
										{flag ? (
											<span
												className={clsx(
													"mt-2 inline-block border-2 border-black px-2 py-0.5 font-body font-bold text-[10px] uppercase tracking-widest",
													flag.className,
												)}
											>
												{flag.label}
											</span>
										) : null}
									</div>

									{/* Status / wait */}
									<span
										className={clsx(
											"shrink-0 border-2 border-black px-2 py-1 font-body font-bold text-[10px] uppercase tracking-widest",
											isDisabled ? "surface-tape" : pill.className,
										)}
									>
										{isDisabled ? t("selector.wait") : pill.label}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</PublicPageShell>
	);
}

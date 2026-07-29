import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { BettingEmptyState } from "@/components/BettingEmptyState";
import { TapeLabel } from "@/components/betting/BettingDecor";
import { PublicPageShell } from "@/components/PublicPageShell";

interface MatchDay {
	id: number;
	label: string;
	date: Date | string;
	status: "draft" | "open" | "locked" | "finished";
	matchCount?: number;
}

interface MatchDaySelectorProps {
	matchDays: MatchDay[];
	activeMatchDayId: number | null;
	onSelect: (matchDayId: number) => void;
	tournamentName?: string;
}

function statusPill(
	status: MatchDay["status"],
	t: (key: string) => string,
): { className: string; label: string } {
	switch (status) {
		case "open":
			return { className: "surface-lime", label: t("matchDay.betsOpen") };
		case "locked":
			return { className: "surface-yellow", label: t("matchDay.betsClosed") };
		case "finished":
			return {
				className: "surface-brawl-blue",
				label: t("matchDay.completed"),
			};
		default:
			return { className: "surface-tape", label: t("matchDay.draft") };
	}
}

export function MatchDaySelector({
	matchDays,
	activeMatchDayId,
	onSelect,
	tournamentName,
}: MatchDaySelectorProps) {
	const { t, i18n } = useTranslation("tournament");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	const sortedMatchDays = [...matchDays].sort((a, b) => {
		const dateA = new Date(a.date).getTime();
		const dateB = new Date(b.date).getTime();
		if (dateA !== dateB) {
			return dateA - dateB;
		}
		return a.id - b.id;
	});

	return (
		<PublicPageShell className="relative flex flex-col items-center p-6">
			<div className="relative z-10 w-full max-w-xl">
				<header className="mb-8 flex flex-col items-center text-center">
					<h1 className="mb-3 pb-1 font-black font-display text-3xl text-ink uppercase italic leading-[1.1] tracking-tighter md:text-4xl">
						{t("matchDay.selectTitle")}
					</h1>
					{tournamentName ? (
						<div className="mb-3 flex w-full justify-center">
							<TapeLabel rotate="-2deg" className="min-w-0 max-w-md">
								{tournamentName}
							</TapeLabel>
						</div>
					) : null}
					<p className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest md:text-xs">
						{t("matchDay.selectPrompt")}
					</p>
				</header>

				<ul className="flex flex-col gap-2">
					{sortedMatchDays.map((md) => {
						const isActive = md.id === activeMatchDayId;
						const isDraft = md.status === "draft";
						const pill = statusPill(md.status, t);
						const dateLabel = new Date(md.date).toLocaleDateString(locale, {
							day: "2-digit",
							month: "short",
						});

						return (
							<li key={md.id}>
								<button
									type="button"
									onClick={() => {
										if (isDraft) return;
										onSelect(md.id);
									}}
									disabled={isDraft}
									aria-current={isActive ? "true" : undefined}
									className={clsx(
										"flex w-full items-center gap-4 border-[3px] border-black px-4 py-3.5 text-left text-ink shadow-comic-sm transition-all duration-150",
										isDraft && "cursor-not-allowed opacity-55",
										!isDraft &&
											"hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
										isActive ? "surface-lime" : "bg-white",
										isDraft && "bg-tape",
									)}
								>
									{/* Date block */}
									<div className="w-14 shrink-0 sm:w-16">
										<span className="block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
											{new Date(md.date).toLocaleDateString(locale, {
												weekday: "short",
											})}
										</span>
										<span className="block font-black font-display text-base text-ink uppercase italic tabular-nums leading-tight sm:text-lg">
											{dateLabel}
										</span>
									</div>

									{/* Label + match count */}
									<div className="min-w-0 flex-1">
										<span className="block truncate font-black font-display text-base uppercase italic leading-[1.1] tracking-tight sm:text-xl">
											{md.label}
										</span>
										{md.matchCount !== undefined && md.matchCount > 0 ? (
											<span className="mt-0.5 block font-body font-bold text-[10px] text-gray-500 uppercase tabular-nums tracking-widest">
												{t("matchDay.matchCount", { count: md.matchCount })}
											</span>
										) : isDraft ? (
											<span className="mt-0.5 block font-body font-bold text-[10px] text-brawl-red uppercase tracking-widest">
												{t("matchDay.noMatches")}
											</span>
										) : null}
									</div>

									{/* Single status signal — never stack with "active" */}
									{isDraft ? (
										<span className="surface-ink shrink-0 border-2 border-black px-2 py-1 font-body font-bold text-[10px] uppercase tracking-widest">
											{t("matchDay.unavailable")}
										</span>
									) : (
										<span
											className={clsx(
												"shrink-0 border-2 border-black px-2 py-1 font-body font-bold text-[10px] uppercase tracking-widest",
												isActive ? "bg-ink text-white" : pill.className,
											)}
										>
											{isActive ? t("matchDay.active") : pill.label}
										</span>
									)}
								</button>
							</li>
						);
					})}
				</ul>

				{matchDays.length === 0 && (
					<BettingEmptyState
						layout="embedded"
						icon="calendar_month"
						title={t("matchDay.noMatchDayTitle")}
						description={t("matchDay.noMatchDay")}
					/>
				)}
			</div>
		</PublicPageShell>
	);
}

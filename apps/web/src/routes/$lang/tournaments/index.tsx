import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SpraySplat } from "@/components/betting/BettingDecor";
import { PublicPageShell } from "@/components/PublicPageShell";
import {
	getTournamentPresentationTheme,
	presentationThemeBadgeClass,
	venueModePillClass,
} from "@/components/tournament-presentation";
import { useLangLink } from "@/i18n/useLangLink";
import type { PresentationTheme } from "@/server/event-kind-template";
import { getTournaments } from "@/server/tournaments";
import { resolveTournamentFormatLabel } from "@/utils/tournament-format";
import {
	resolveTournamentVisualIdentity,
	stageBarStyle,
} from "@/utils/tournament-visual-identity";

const searchSchema = z.object({
	filter: z.enum(["active", "upcoming", "finished"]).catch("active"),
});

export const Route = createFileRoute("/$lang/tournaments/")({
	validateSearch: searchSchema,
	loader: () => getTournaments(),
	component: TournamentsPage,
});

type TournamentListItem = Awaited<ReturnType<typeof getTournaments>>[number];

const STATUS_TAB_SURFACE = {
	active: "surface-lime",
	upcoming: "surface-yellow",
	finished: "surface-tape",
} as const;

function BrowseAtmosphere() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<SpraySplat
				variant="blue"
				maskIndex={2}
				rotate={-10}
				className="absolute top-[6%] left-[-14%] h-52 w-80 opacity-30 sm:left-[-4%] sm:opacity-40 md:top-[4%] md:left-[0%] md:h-72 md:w-[28rem]"
			/>
			<SpraySplat
				variant="red"
				maskIndex={5}
				rotate={16}
				className="absolute right-[-16%] bottom-[18%] h-52 w-80 opacity-30 sm:right-[-4%] sm:opacity-40 md:right-[0%] md:bottom-[12%] md:h-72 md:w-[28rem]"
			/>
		</div>
	);
}

function TournamentsPage() {
	const { t } = useTranslation("tournament");
	const tournaments = Route.useLoaderData();
	const { filter } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const reduceMotion = useReducedMotion();

	const statusCounts = useMemo(() => {
		return {
			active: tournaments.filter((item) => item.status === "active").length,
			upcoming: tournaments.filter((item) => item.status === "upcoming").length,
			finished: tournaments.filter((item) => item.status === "finished").length,
		};
	}, [tournaments]);

	const filteredTournaments = useMemo(() => {
		return tournaments.filter((item) => {
			const matchesStatus = item.status === filter;
			const matchesSearch = item.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			return matchesStatus && matchesSearch;
		});
	}, [tournaments, filter, searchQuery]);

	const filterTabs = [
		{
			key: "active" as const,
			label: t("browse.tabs.active"),
			count: statusCounts.active,
		},
		{
			key: "upcoming" as const,
			label: t("browse.tabs.scheduled"),
			count: statusCounts.upcoming,
		},
		{
			key: "finished" as const,
			label: t("browse.tabs.finished"),
			count: statusCounts.finished,
		},
	];

	return (
		<PublicPageShell className="relative overflow-x-hidden pb-16">
			<BrowseAtmosphere />

			<div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				<header className="mb-10 md:mb-12">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black font-display text-4xl text-ink uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
								{t("browse.title")}
							</h1>
							<p className="mt-2 font-bold font-display text-gray-600 text-lg">
								{t("browse.description")}
							</p>
						</div>
						<div className="flex items-center gap-2 text-gray-500">
							<span className="material-symbols-outlined text-xl">
								emoji_events
							</span>
							<span className="font-body font-bold text-[10px] uppercase tracking-widest">
								{t("browse.totalCount", { count: tournaments.length })}
							</span>
						</div>
					</div>
				</header>

				<div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-stretch">
					<label className="relative flex w-full items-center gap-3 border-[3px] border-black bg-white px-4 py-3 text-ink shadow-comic-md transition-all focus-within:translate-x-[1px] focus-within:translate-y-[1px] focus-within:shadow-comic-press lg:max-w-sm">
						<span className="material-symbols-outlined text-ink text-xl">
							search
						</span>
						<span className="sr-only">{t("browse.searchPlaceholder")}</span>
						<input
							type="search"
							placeholder={t("browse.searchPlaceholder")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full bg-transparent font-bold font-display text-ink placeholder:text-gray-400 focus:outline-none"
						/>
					</label>

					<div
						role="tablist"
						aria-label={t("browse.title")}
						className="flex flex-1 flex-wrap gap-2"
					>
						{filterTabs.map((tab) => {
							const isSelected = filter === tab.key;
							return (
								<button
									type="button"
									role="tab"
									aria-selected={isSelected}
									key={tab.key}
									onClick={() =>
										navigate({
											search: { filter: tab.key },
										})
									}
									className={clsx(
										"flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 border-[3px] border-black px-4 py-3 font-black font-display text-sm uppercase tracking-wider shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
										isSelected
											? STATUS_TAB_SURFACE[tab.key]
											: "hover-surface-lime bg-white text-ink",
									)}
								>
									<span>{tab.label}</span>
									<span
										className={clsx(
											"border-2 border-black px-1.5 py-0.5 font-body font-bold text-[10px] tabular-nums tracking-widest",
											isSelected ? "bg-white text-ink" : "surface-ink",
										)}
									>
										{tab.count}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{filteredTournaments.length === 0 ? (
					<EmptyState filter={filter} hasSearch={!!searchQuery} />
				) : (
					<ul className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
						{filteredTournaments.map((tournament, index) => (
							<motion.li
								key={tournament.id}
								initial={reduceMotion ? false : { opacity: 0, y: 18 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.35,
									delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.3),
									ease: [0.16, 1, 0.3, 1],
								}}
							>
								<TournamentCard tournament={tournament} index={index} />
							</motion.li>
						))}
					</ul>
				)}
			</div>
		</PublicPageShell>
	);
}

function themeLabelKey(theme: PresentationTheme): string | null {
	if (theme === "qualifier") return "browse.themeQualifier";
	if (theme === "monthly_finals") return "browse.themeMonthlyFinals";
	if (theme === "major") return "browse.themeMajor";
	return null;
}

function TournamentCard({
	tournament,
	index,
}: {
	tournament: TournamentListItem;
	index: number;
}) {
	const { t, i18n } = useTranslation("tournament");
	const { linkTo } = useLangLink();
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const isActive = tournament.status === "active";
	const isFinished = tournament.status === "finished";
	const theme = getTournamentPresentationTheme(tournament.eventKind);
	const themeKey = themeLabelKey(theme);
	const themeBadge = presentationThemeBadgeClass(theme);
	const identity = resolveTournamentVisualIdentity({
		eventKind: tournament.eventKind,
		region: tournament.region,
		venueMode: tournament.venueMode,
	});

	const statusConfig = isActive
		? {
				label: t("common:matchStatus.live"),
				surface: "surface-brawl-red",
				icon: "radio_button_checked",
				pulse: true,
			}
		: isFinished
			? {
					label: t("common:matchStatus.finished"),
					surface: "surface-tape",
					icon: "check_circle",
					pulse: false,
				}
			: {
					label: t("common:matchStatus.scheduled"),
					surface: "surface-yellow",
					icon: "calendar_month",
					pulse: false,
				};

	const ctaLabel = isActive
		? t("browse.follow")
		: isFinished
			? t("browse.viewResults")
			: t("browse.viewDetails");

	const ctaSurface = isActive
		? "surface-brawl-red"
		: isFinished
			? "surface-ink"
			: "surface-yellow";

	return (
		<article className="group h-full">
			<div
				className={clsx(
					"relative flex h-full flex-col overflow-hidden border-[3px] border-black bg-white text-ink shadow-comic-md transition-all duration-200 group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-comic-press group-active:translate-x-[3px] group-active:translate-y-[3px] group-active:shadow-none",
					identity.cardFrameClass,
					theme === "monthly_finals" &&
						"ring-2 ring-electric-lime ring-offset-2",
				)}
			>
				<div
					className={clsx(
						identity.stageBarClass,
						"relative z-10",
						theme === "monthly_finals" && identity.region.textOnAccentClass,
					)}
					style={stageBarStyle(identity)}
				>
					<div className="flex min-w-0 items-center gap-2">
						{tournament.region && (
							<span
								className={clsx(
									"shrink-0 border-2 border-black px-2 py-0.5 font-body font-bold text-[10px] uppercase tracking-widest shadow-comic-sm",
									identity.region.tintClass,
									identity.region.textOnAccentClass,
								)}
							>
								{tournament.region}
							</span>
						)}
						<span className="truncate font-body font-bold text-[10px] uppercase tracking-widest opacity-80">
							{resolveTournamentFormatLabel(
								tournament.format,
								tournament.stages,
								t,
							)}
						</span>
					</div>
					<div
						className={clsx(
							"flex shrink-0 items-center gap-1 border-2 border-black px-2 py-0.5 font-body font-bold text-[10px] uppercase tracking-widest shadow-comic-sm",
							statusConfig.surface,
						)}
					>
						<span
							className={clsx(
								"material-symbols-outlined text-sm",
								statusConfig.pulse && "animate-pulse",
							)}
						>
							{statusConfig.icon}
						</span>
						{statusConfig.label}
					</div>
				</div>

				<div
					className={clsx(
						"relative flex h-52 items-center justify-center overflow-hidden border-black border-b-[3px] sm:h-60",
						theme === "major" ? "bg-charcoal" : "bg-paper",
					)}
				>
					{identity.decorDensity !== "minimal" && (
						<>
							<SpraySplat
								variant={index % 2 === 0 ? "blue" : "red"}
								maskIndex={(index % 6) + 1}
								rotate={index % 2 === 0 ? -8 : 12}
								className="absolute -top-6 -left-8 h-32 w-48 opacity-25"
							/>
							<SpraySplat
								variant={index % 2 === 0 ? "red" : "blue"}
								maskIndex={((index + 2) % 6) + 1}
								rotate={index % 2 === 0 ? 14 : -10}
								className="absolute -right-10 -bottom-8 h-28 w-44 opacity-20"
							/>
						</>
					)}

					{tournament.logoUrl ? (
						<img
							src={tournament.logoUrl}
							alt={tournament.name}
							draggable={false}
							className="relative z-10 h-36 w-36 object-contain drop-shadow-[3px_3px_0_rgba(0,0,0,0.2)] sm:h-44 sm:w-44"
						/>
					) : (
						<div className="relative z-10 flex h-36 w-36 items-center justify-center border-[3px] border-black bg-white shadow-comic-md sm:h-44 sm:w-44">
							<span className="material-symbols-outlined text-6xl text-ink sm:text-7xl">
								emoji_events
							</span>
						</div>
					)}
				</div>

				<div className="flex flex-grow flex-col gap-4 px-4 pt-4 pb-4 sm:px-5 sm:pb-5">
					<div className="flex flex-wrap gap-2">
						<span
							className={clsx(
								"rounded-none border-2 border-black px-2 py-1 font-body font-bold text-[10px] uppercase tracking-widest",
								venueModePillClass(tournament.venueMode),
							)}
						>
							{tournament.venueMode === "lan"
								? t("browse.venueLan")
								: t("browse.venueOnline")}
						</span>
						{themeKey && themeBadge && (
							<span
								className={clsx(
									"px-2 py-1 font-body font-bold text-[10px] uppercase tracking-widest",
									themeBadge || identity.kindBadgeClass,
								)}
							>
								{t(themeKey)}
							</span>
						)}
					</div>

					<h2 className="border-ink border-l-4 pb-1 pl-3 font-black font-display text-ink text-xl uppercase italic leading-[1.1] tracking-tight sm:text-2xl">
						{tournament.name}
					</h2>

					<div className="grid grid-cols-2 gap-2">
						<div className="flex flex-col gap-1">
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("browse.datesLabel")}
							</span>
							<div className="flex min-w-0 items-center gap-1.5 border-2 border-black bg-white px-2.5 py-1.5 font-body font-bold text-[10px] text-ink uppercase tracking-widest shadow-comic-sm">
								<span className="material-symbols-outlined shrink-0 text-base text-ink">
									calendar_month
								</span>
								<span className="truncate tabular-nums tracking-normal">
									{formatDateRange(
										tournament.startDate,
										tournament.endDate,
										locale,
										t("browse.noDates"),
									)}
								</span>
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("browse.teamsLabel")}
							</span>
							<div className="flex items-center gap-1.5 border-2 border-black bg-white px-2.5 py-1.5 font-body font-bold text-[10px] text-ink uppercase tracking-widest shadow-comic-sm sm:text-xs">
								<span className="material-symbols-outlined text-base text-ink">
									groups
								</span>
								<span className="tabular-nums">
									{tournament.participantsCount
										? t("detail.teamCount", {
												count: tournament.participantsCount,
											})
										: t("browse.noDates")}
								</span>
							</div>
						</div>
					</div>

					<div className="mt-auto pt-1">
						<Link
							to={linkTo("/tournaments/$slug")}
							params={{ slug: tournament.slug }}
							className={clsx(
								"flex w-full items-center justify-center gap-2 border-[3px] border-black px-4 py-3 font-black font-display text-sm uppercase tracking-wider shadow-comic-md transition-all duration-200 group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-comic-press",
								ctaSurface,
							)}
						>
							{ctaLabel}
							<span
								className={clsx(
									"material-symbols-outlined text-xl",
									isFinished && "text-electric-lime",
								)}
							>
								arrow_forward
							</span>
						</Link>
					</div>
				</div>
			</div>
		</article>
	);
}

function EmptyState({
	filter,
	hasSearch,
}: {
	filter: "active" | "upcoming" | "finished";
	hasSearch: boolean;
}) {
	const { t } = useTranslation("tournament");
	return (
		<div className="flex flex-col items-center justify-center border-[3px] border-black border-dashed bg-white/80 px-6 py-16 text-center text-ink shadow-comic-sm">
			<div className="mb-4 flex h-16 w-16 items-center justify-center border-[3px] border-black bg-tape shadow-comic-sm">
				<span className="material-symbols-outlined text-4xl text-ink">
					{hasSearch ? "search_off" : "trophy"}
				</span>
			</div>
			<h2 className="mb-2 font-black font-display text-ink text-xl uppercase italic leading-[1.1]">
				{hasSearch ? t("browse.noResults") : t("browse.empty")}
			</h2>
			<p className="mx-auto max-w-md font-display text-gray-600 text-sm">
				{hasSearch
					? t("browse.searchHint")
					: filter === "active"
						? t("browse.noActive")
						: filter === "upcoming"
							? t("browse.noScheduled")
							: t("browse.noFinished")}
			</p>
		</div>
	);
}

function formatDateRange(
	startDate: Date | string | null,
	endDate: Date | string | null,
	locale: string,
	fallback: string,
): string {
	if (!startDate) return fallback;

	const options: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	};

	const startStr = new Date(startDate).toLocaleDateString(locale, options);

	if (!endDate) return startStr;

	const endStr = new Date(endDate).toLocaleDateString(locale, options);

	if (startStr === endStr) return startStr;

	return `${startStr}-${endStr}`;
}

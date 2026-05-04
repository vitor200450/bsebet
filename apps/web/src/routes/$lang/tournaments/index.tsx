import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	ArrowRight,
	Calendar,
	MapPin,
	Search,
	Trophy,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { i18next } from "@/i18n";
import { useLangLink } from "@/i18n/useLangLink";
import { getTournaments } from "@/server/tournaments";

// Schema for URL search params (filter state)
const searchSchema = z.object({
	filter: z.enum(["active", "upcoming", "finished"]).catch("active"),
});

export const Route = createFileRoute("/$lang/tournaments/")({
	validateSearch: searchSchema,
	loader: () => getTournaments(),
	component: TournamentsPage,
});

function TournamentsPage() {
	const { t } = useTranslation("tournament");
	const tournaments = Route.useLoaderData();
	const { filter } = Route.useSearch();
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");

	// Filter tournaments by status and search query
	const filteredTournaments = useMemo(() => {
		return tournaments.filter((t) => {
			const matchesStatus = t.status === filter;
			const matchesSearch = t.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			return matchesStatus && matchesSearch;
		});
	}, [tournaments, filter, searchQuery]);

	const filterTabs = [
		{ key: "active" as const, label: t("browse.tabs.active") },
		{ key: "upcoming" as const, label: t("browse.tabs.scheduled") },
		{ key: "finished" as const, label: t("browse.tabs.finished") },
	];

	return (
		<div className="relative min-h-screen bg-[#f0f0f0] pb-12">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			<div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				{/* Clean Header */}
				<header className="mb-10 md:mb-12">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl lg:text-6xl">
								{t("browse.title")}
							</h1>
							<p className="mt-2 font-bold text-gray-600 text-lg">
								{t("browse.description")}
							</p>
						</div>
						<div className="flex items-center gap-2 text-gray-500">
							<Trophy className="h-5 w-5" strokeWidth={2} />
							<span className="font-bold text-sm uppercase tracking-wider">
								{t("browse.totalCount", { count: tournaments.length })}
							</span>
						</div>
					</div>
				</header>

				{/* Controls Section: Search & Filters */}
				<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
					{/* Search Bar - Clean */}
					<div className="relative w-full md:w-80">
						<div className="flex items-center gap-3 rounded-lg border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0_0_#000] transition-all focus-within:shadow-[4px_4px_0_0_#000]">
							<Search className="h-5 w-5 text-gray-400" strokeWidth={2.5} />
							<input
								type="text"
								placeholder={t("browse.searchPlaceholder")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full bg-transparent font-bold text-[#121212] placeholder:text-gray-400 focus:outline-none"
							/>
						</div>
					</div>

					{/* Filter Tabs - Clean Segmented Control */}
					<div className="flex items-center gap-1 rounded-lg border-2 border-black bg-white p-1 shadow-[3px_3px_0_0_#000]">
						{filterTabs.map((tab) => (
							<button
								type="button"
								key={tab.key}
								onClick={() => navigate({ search: { filter: tab.key } })}
								className={clsx(
									"rounded-md px-4 py-2 font-bold text-sm uppercase tracking-wider transition-all",
									filter === tab.key
										? "bg-[#121212] text-white"
										: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-[#121212]",
								)}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* Tournament Grid */}
				{filteredTournaments.length === 0 ? (
					<EmptyState filter={filter} hasSearch={!!searchQuery} />
				) : (
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{filteredTournaments.map((tournament) => (
							<TournamentCard key={tournament.id} tournament={tournament} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function TournamentCard({
	tournament,
}: {
	tournament: {
		id: number;
		name: string;
		slug: string;
		logoUrl: string | null;
		format: string | null;
		region: string | null;
		participantsCount: number | null;
		startDate: Date | null;
		endDate: Date | null;
		status: "upcoming" | "active" | "finished";
	};
}) {
	const { t } = useTranslation("tournament");
	const { linkTo } = useLangLink();
	const isActive = tournament.status === "active";
	const isFinished = tournament.status === "finished";

	// Status config
	const statusConfig = isActive
		? {
				label: t("common:matchStatus.live"),
				color: "bg-[#ff2e2e] text-white",
				dot: true,
			}
		: isFinished
			? {
					label: t("common:matchStatus.finished"),
					color: "bg-gray-200 text-gray-700",
					dot: false,
				}
			: {
					label: t("common:matchStatus.scheduled"),
					color: "bg-[#ffc700] text-black",
					dot: false,
				};

	return (
		<article className="group">
			<div className="relative overflow-hidden rounded-xl border-2 border-black bg-white shadow-[4px_4px_0_0_#000] transition-all hover:shadow-[5px_5px_0_0_#000]">
				{/* Header with gradient */}
				<div
					className={clsx(
						"relative h-24 overflow-hidden",
						isActive && "bg-gradient-to-r from-[#ff2e2e]/20 to-[#ffc700]/20",
						isFinished && "bg-gradient-to-r from-gray-100 to-gray-50",
						!isActive &&
							!isFinished &&
							"bg-gradient-to-r from-[#ffc700]/20 to-[#ccff00]/10",
					)}
				>
					{/* Pattern overlay */}
					<div
						className="absolute inset-0 opacity-5"
						style={{
							backgroundImage:
								"radial-gradient(circle at 2px 2px, black 1px, transparent 0)",
							backgroundSize: "20px 20px",
						}}
					/>

					{/* Status badge */}
					<div
						className={clsx(
							"absolute top-3 right-3 flex items-center gap-1.5 rounded-md px-2 py-1 font-black text-[10px] uppercase tracking-wider",
							statusConfig.color,
						)}
					>
						{statusConfig.dot && (
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
						)}
						{statusConfig.label}
					</div>

					{/* Region */}
					{tournament.region && (
						<div className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 shadow-sm">
							<MapPin className="h-3 w-3 text-gray-600" strokeWidth={2} />
							<span className="font-bold text-[10px] text-gray-700 uppercase">
								{tournament.region}
							</span>
						</div>
					)}
				</div>

				{/* Logo - Floating */}
				<div className="relative px-4">
					<div className="absolute -top-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-white shadow-[3px_3px_0_0_#000]">
						{tournament.logoUrl ? (
							<img
								src={tournament.logoUrl}
								alt={tournament.name}
								className="h-full w-full object-contain p-2"
							/>
						) : (
							<Trophy className="h-8 w-8 text-gray-300" strokeWidth={2} />
						)}
					</div>
				</div>

				{/* Content */}
				<div className="px-4 pt-12 pb-4">
					{/* Meta */}
					<div className="mb-3 flex flex-wrap items-center gap-2">
						<span className="flex items-center gap-1 rounded bg-[#f0f0f0] px-2 py-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
							<Calendar className="h-3 w-3" strokeWidth={2} />
							{formatDateRange(tournament.startDate, tournament.endDate)}
						</span>
						{tournament.participantsCount && (
							<span className="flex items-center gap-1 rounded bg-[#f0f0f0] px-2 py-1 font-bold text-[10px] text-gray-600 uppercase tracking-wider">
								<Users className="h-3 w-3" strokeWidth={2} />
								{tournament.participantsCount} {t("browse.teams")}
							</span>
						)}
					</div>

					{/* Title */}
					<h2 className="mb-2 line-clamp-2 font-black text-[#121212] text-xl uppercase tracking-tight transition-colors group-hover:text-[#2e5cff]">
						{tournament.name}
					</h2>

					{tournament.format && (
						<p className="mb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">
							{tournament.format}
						</p>
					)}

					{/* Action */}
					<Link
						to={linkTo("/tournaments/$slug")}
						params={{ slug: tournament.slug }}
						className={clsx(
							"flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black py-3 font-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none",
							isActive && "bg-[#ff2e2e] text-white",
							isFinished && "bg-[#f0f0f0] text-[#121212]",
							!isActive && !isFinished && "bg-[#ffc700] text-black",
						)}
					>
						{isActive
							? t("browse.follow")
							: isFinished
								? t("browse.viewResults")
								: t("browse.viewDetails")}
						<ArrowRight className="h-4 w-4" strokeWidth={2.5} />
					</Link>
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
		<div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f0f0]">
				<Search className="h-8 w-8 text-gray-400" strokeWidth={2} />
			</div>
			<h2 className="mb-2 font-black text-[#121212] text-xl uppercase">
				{hasSearch ? t("browse.noResults") : t("browse.empty")}
			</h2>
			<p className="mx-auto max-w-md text-gray-600 text-sm">
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
): string {
	if (!startDate) return i18next.t("tournament:browse.noDates");

	const start = new Date(startDate);
	const options: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "short",
	};
	const dateLocale = i18next.language === "pt" ? "pt-BR" : "en-US";
	const startStr = start
		.toLocaleDateString(dateLocale, { ...options, timeZone: "UTC" })
		.toUpperCase()
		.replace(".", "");

	if (!endDate) return startStr;

	const end = new Date(endDate);
	const endStr = end
		.toLocaleDateString(dateLocale, { ...options, timeZone: "UTC" })
		.toUpperCase()
		.replace(".", "");

	return `${startStr} - ${endStr}`;
}

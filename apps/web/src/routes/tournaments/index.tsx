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
import { z } from "zod";
import { getTournaments } from "@/server/tournaments";

// Schema for URL search params (filter state)
const searchSchema = z.object({
	filter: z.enum(["active", "upcoming", "finished"]).catch("active"),
});

export const Route = createFileRoute("/tournaments/")({
	validateSearch: searchSchema,
	loader: () => getTournaments(),
	component: TournamentsPage,
});

function TournamentsPage() {
	const tournaments = Route.useLoaderData();
	const { filter } = Route.useSearch();
	const navigate = useNavigate({ from: "/tournaments/" });
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
		{ key: "active" as const, label: "ATIVOS" },
		{ key: "upcoming" as const, label: "EM BREVE" },
		{ key: "finished" as const, label: "FINALIZADOS" },
	];

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans text-ink">
			<div className="mx-auto w-full max-w-7xl px-4 py-8 md:py-12">
				{/* Header Section */}
				<header className="relative mb-12 text-center md:text-left">
					{/* Decorative Background Elements */}
					<div className="absolute top-0 right-10 -z-10 hidden h-64 w-64 rounded-full bg-[#ccff00]/10 blur-3xl md:block" />
					<div className="absolute -top-10 -left-10 -z-10 hidden h-48 w-48 rounded-full bg-brawl-blue/10 blur-2xl md:block" />

					{/* Tape Decoration */}
					<div className="absolute top-[-25px] left-[50%] z-20 hidden -translate-x-1/2 -rotate-2 transform border border-black/10 bg-tape px-4 py-1 shadow-sm md:left-[20px] md:block md:translate-x-0">
						<span className="font-marker text-gray-500 text-xs tracking-widest">
							OFFICIAL BROADCAST
						</span>
					</div>

					<div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
						<div>
							<h1 className="mb-2 font-black text-6xl text-black uppercase italic leading-[0.85] tracking-tighter drop-shadow-sm md:-skew-x-6 md:transform md:text-8xl">
								TORNEIOS
							</h1>
							<p className="pl-1 font-bold text-gray-500 uppercase tracking-[0.2em]">
								COMPETIÇÃO DE ALTO NÍVEL
							</p>
						</div>

						{/* Header Decoration (Abstract Shapes) */}
						<div className="relative hidden h-32 w-32 md:block">
							<div className="absolute top-0 right-0 h-16 w-16 rotate-12 border-4 border-black bg-brawl-red shadow-comic" />
							<div className="absolute right-8 bottom-4 h-12 w-12 -rotate-6 border-4 border-black bg-brawl-blue shadow-comic" />
							<div className="absolute right-0 bottom-0 h-8 w-8 rotate-45 border-4 border-black bg-brawl-yellow shadow-comic" />
						</div>
					</div>
				</header>

				{/* Controls Section: Search & Filters */}
				<div className="mb-10 flex flex-col items-start gap-6 md:flex-row md:items-center">
					{/* Search Bar */}
					<div className="group relative w-full md:w-96">
						<div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg bg-black transition-transform group-focus-within:translate-x-2 group-focus-within:translate-y-2" />
						<div className="relative flex items-center overflow-hidden rounded-lg border-4 border-black bg-white transition-transform group-focus-within:-translate-x-0.5 group-focus-within:-translate-y-0.5">
							<div className="pr-3 pl-4 text-black">
								<Search className="h-6 w-6" strokeWidth={3} />
							</div>
							<input
								type="text"
								placeholder="BUSCAR TORNEIO..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full bg-transparent py-3 pr-4 font-bold text-black uppercase tracking-wide placeholder:text-gray-300 focus:outline-none"
							/>
						</div>
					</div>

					{/* Filter Tabs */}
					<div className="hide-scrollbar flex w-full space-x-4 overflow-x-auto px-1 pt-4 pb-4 md:w-auto md:overflow-visible md:p-0">
						{filterTabs.map((tab) => (
							<button
								key={tab.key}
								onClick={() => navigate({ search: { filter: tab.key } })}
								className="group relative min-w-max outline-none"
							>
								<div
									className={clsx(
										"absolute inset-0 rounded-lg bg-black transition-all duration-200",
										filter === tab.key
											? "translate-x-1.5 translate-y-1.5 opacity-100"
											: "translate-x-1 translate-y-1 opacity-0 group-hover:opacity-100",
									)}
								/>
								<div
									className={clsx(
										"relative transform rounded-lg border-4 border-black px-6 py-3 font-black text-sm uppercase italic tracking-wider transition-all duration-200",
										filter === tab.key
											? "-translate-x-0.5 -translate-y-0.5 skew-x-[-6deg] bg-brawl-yellow text-black"
											: "skew-x-[-6deg] bg-white text-gray-400 hover:-translate-x-1 hover:-translate-y-1 hover:skew-x-[-4deg] hover:text-black",
									)}
								>
									<span className={clsx("block skew-x-[6deg] transform")}>
										{tab.label}
									</span>
								</div>
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
	const isActive = tournament.status === "active";
	const isFinished = tournament.status === "finished";

	return (
		<article className="group relative h-full">
			{/* Hard Shadow */}
			<div className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-2xl bg-black transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5" />

			{/* Card Body */}
			<div className="relative flex h-full flex-col overflow-hidden rounded-2xl border-4 border-black bg-white p-0 transition-transform group-hover:translate-x-1 group-hover:translate-y-1">
				{/* Card Header Illustration / Gradient */}
				<div className="relative h-28 overflow-hidden border-black border-b-4 bg-gray-50 bg-paper-pattern">
					{/* Abstract Header Decoration */}
					<div
						className="absolute inset-0 opacity-10"
						style={{
							backgroundImage:
								"radial-gradient(circle at 2px 2px, black 1px, transparent 0)",
							backgroundSize: "16px 16px",
						}}
					/>

					<div
						className={`absolute inset-0 opacity-20 ${isActive ? "bg-gradient-to-br from-brawl-red to-transparent" : "bg-gradient-to-br from-gray-200 to-transparent"}`}
					/>

					{/* Region Tag */}
					{tournament.region && (
						<div className="absolute top-3 right-3 z-10 rotate-2 transform rounded-md border-2 border-black bg-white px-2 py-0.5 shadow-sm">
							<span className="flex items-center gap-1 font-black text-[10px] uppercase">
								<MapPin className="h-3 w-3 text-black" />
								{tournament.region}
							</span>
						</div>
					)}
				</div>

				{/* Logo & Main Content */}
				<div className="relative flex flex-1 flex-col px-5">
					{/* Floating Logo */}
					<div className="absolute -top-12 left-5">
						<div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-4 border-black bg-white shadow-comic transition-transform duration-300 group-hover:scale-105">
							{tournament.logoUrl ? (
								<img
									src={tournament.logoUrl}
									alt={tournament.name}
									className="h-full w-full object-contain p-2"
								/>
							) : (
								<Trophy className="h-8 w-8 text-gray-300" />
							)}
						</div>
						{/* Live Badge */}
						{isActive && (
							<div className="absolute -right-6 -bottom-3 z-20 flex -rotate-6 transform animate-bounce-slight items-center rounded border-2 border-[#ccff00] bg-black px-2 py-0.5 font-black text-[10px] text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
								<span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-[#ccff00]" />
								AO VIVO
							</div>
						)}
					</div>

					<div className="mt-12 mb-6 pt-2">
						{/* Date */}
						<div className="mb-3 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center rounded border border-black/10 bg-gray-100 px-2 py-1 font-bold font-mono text-[10px] text-gray-500 uppercase">
								<Calendar className="mr-1.5 h-3 w-3" />
								{formatDateRange(tournament.startDate, tournament.endDate)}
							</span>
							{tournament.participantsCount && (
								<span className="flex items-center gap-1 rounded border border-black/10 bg-gray-100 px-2 py-1 font-bold font-mono text-[10px] text-gray-500 uppercase">
									<Users className="h-3 w-3" />
									{tournament.participantsCount}
								</span>
							)}
						</div>

						{/* Title */}
						<h2 className="mb-1 line-clamp-2 font-black text-2xl uppercase italic leading-[0.9] transition-colors group-hover:text-brawl-blue">
							{tournament.name}
						</h2>
						{tournament.format && (
							<p className="mt-1 font-bold text-gray-400 text-xs uppercase tracking-widest">
								{tournament.format}
							</p>
						)}
					</div>

					{/* Spacer */}
					<div className="min-h-[10px] flex-1" />

					{/* Action Area */}
					<div className="pt-2 pb-5">
						{isActive ? (
							<Link
								to="/tournaments/$slug"
								params={{ slug: tournament.slug }}
								className="flex w-full items-center justify-center gap-2 rounded-lg border-4 border-black bg-brawl-red py-3 font-black text-sm text-white uppercase italic shadow-comic transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-hover md:text-base"
							>
								ACOMPANHAR
							</Link>
						) : isFinished ? (
							<Link
								to="/tournaments/$slug"
								params={{ slug: tournament.slug }}
								className="group/btn flex w-full items-center justify-center gap-2 rounded-lg border-4 border-black bg-gray-100 py-3 font-black text-black text-sm uppercase italic shadow-comic transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-hover md:text-base"
							>
								VER RESULTADOS
								<ArrowRight
									className="h-5 w-5 transition-transform group-hover/btn:translate-x-1"
									strokeWidth={3}
								/>
							</Link>
						) : (
							<Link
								to="/tournaments/$slug"
								params={{ slug: tournament.slug }}
								className="group/btn flex w-full items-center justify-center gap-2 rounded-lg border-4 border-black bg-brawl-yellow py-3 font-black text-black text-sm uppercase italic shadow-comic transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-comic-hover md:text-base"
							>
								VER DETALHES
								<ArrowRight
									className="h-5 w-5 transition-transform group-hover/btn:translate-x-1"
									strokeWidth={3}
								/>
							</Link>
						)}
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
	return (
		<div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
			<div className="relative mb-6">
				<div className="absolute inset-0 translate-x-2 translate-y-2 rounded-full bg-black opacity-10" />
				<div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-black bg-white">
					<Search className="h-12 w-12 text-gray-300" strokeWidth={3} />
				</div>
			</div>
			<h2 className="mb-2 -skew-x-3 transform font-black text-3xl uppercase italic">
				{hasSearch ? "NENHUM RESULTADO" : "NADA POR AQUI"}
			</h2>
			<p className="mx-auto max-w-md font-bold text-gray-500 text-sm uppercase">
				{hasSearch
					? "Tente ajustar sua busca ou mudar os filtros."
					: `Não há torneios ${filter === "active" ? "ativos" : filter === "upcoming" ? "programados" : "finalizados"} no momento.`}
			</p>
		</div>
	);
}

function formatDateRange(
	startDate: Date | string | null,
	endDate: Date | string | null,
): string {
	if (!startDate) return "TBA";

	const start = new Date(startDate);
	const options: Intl.DateTimeFormatOptions = {
		day: "2-digit",
		month: "short",
	};
	const startStr = start
		.toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" })
		.toUpperCase()
		.replace(".", "");

	if (!endDate) return startStr;

	const end = new Date(endDate);
	const endStr = end
		.toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" })
		.toUpperCase()
		.replace(".", "");

	return `${startStr} - ${endStr}`;
}

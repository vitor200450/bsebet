import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	Pencil,
	Plus,
	Radio,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { MatchOrdering } from "@/components/admin/MatchOrdering";
import { useLangLink } from "@/i18n/useLangLink";
import { getMatchDays } from "@/server/match-days";
import {
	deleteMatch,
	getMatches,
	recalculateTournamentPoints,
	resetTournamentResults,
} from "@/server/matches";
import { getTeams } from "@/server/teams"; // Global teams
import {
	addTeamToTournament,
	getTournamentTeams,
	removeTeamFromTournament,
} from "@/server/tournament-teams";
import { getTournament } from "@/server/tournaments";
import { BracketEditor } from "../../../../../components/admin/BracketEditor";
import { DeleteModal } from "../../../../../components/admin/DeleteModal";
import { MatchDaysManager } from "../../../../../components/admin/MatchDaysManager";
import { MatchModal } from "../../../../../components/admin/MatchModal";
import { TournamentSeedingManager } from "../../../../../components/admin/TournamentSeedingManager";
import { TournamentTeamsManager } from "../../../../../components/admin/TournamentTeamsManager";
import { useSetHeader } from "../../../../../components/HeaderContext";

export const Route = createFileRoute(
	"/$lang/admin/tournaments/$tournamentId/matches",
)({
	component: TournamentMatchesPage,
	loader: async ({ params }) => {
		// Check if tournamentId is a number or a slug
		const tournamentParam = params.tournamentId;
		const isNumeric = !isNaN(Number(tournamentParam));

		let tournament;
		if (isNumeric) {
			// It's a numeric ID
			const tournamentId = Number(tournamentParam);
			tournament = await getTournament({ data: tournamentId });
		} else {
			// It's a slug - need to get tournament by slug first
			const { getTournamentBySlug } = await import("@/server/tournaments");
			const result = await getTournamentBySlug({ data: tournamentParam });
			tournament = result.tournament;
		}

		if (!tournament) {
			throw new Error("Tournament not found");
		}

		const [tournamentTeams, allTeams, matches, matchDays] = await Promise.all([
			getTournamentTeams({ data: tournament.id }),
			getTeams(),
			getMatches({ data: { tournamentId: tournament.id } }),
			getMatchDays({ data: { tournamentId: tournament.id } }),
		]);
		return { tournament, tournamentTeams, allTeams, matches, matchDays };
	},
});

interface MatchSegment {
	date: string;
	items: any[];
}

function TournamentMatchesPage() {
	const { t } = useTranslation("admin-matches");
	const { linkTo } = useLangLink();
	const { tournament, tournamentTeams, allTeams, matches, matchDays } =
		Route.useLoaderData();
	const isTournamentUpcoming = tournament.status === "upcoming";
	const router = useRouter();
	const queryClient = useQueryClient();
	const stages = (tournament.stages as any[]) || [];
	const hasGroups = stages.some((s) => s.type === "Groups");
	const hasBracket = stages.some(
		(s) => s.type === "Single Elimination" || s.type === "Double Elimination",
	);
	const hasSwiss = stages.some((s) => s.type === "Swiss");
	const swissStage = stages.find((s: any) => s.type === "Swiss");
	const swissMatches = matches.filter(
		(match: any) => match.stageId === swissStage?.id,
	);

	type TabType =
		| "matches"
		| "teams"
		| "schedule"
		| "bracket"
		| "groups"
		| "swiss"
		| "ordering"
		| "seeding";

	const [activeTab, setActiveTab] = useState<TabType>(
		hasBracket ? "bracket" : hasSwiss ? "swiss" : hasGroups ? "groups" : "matches",
	);

	const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
	const [editingMatch, setEditingMatch] = useState<any>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [matchToDelete, setMatchToDelete] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [selectedStageFilter, setSelectedStageFilter] = useState("all");

	const handleAddTeam = async (teamId: number) => {
		try {
			await addTeamToTournament({
				data: { tournamentId: tournament.id, teamId },
			});
			toast.success(t("teams.addSuccess"));
			router.invalidate();
		} catch (e) {
			toast.error(t("teams.addError"));
		}
	};

	const handleDeleteMatch = async () => {
		if (!matchToDelete) return;
		setIsDeleting(true);
		try {
			await deleteMatch({ data: matchToDelete });
			toast.success(t("matches.deleteSuccess"));
			setIsDeleteModalOpen(false);
			setMatchToDelete(null);
			router.invalidate();
		} catch (e) {
			toast.error(t("matches.deleteError"));
		} finally {
			setIsDeleting(false);
		}
	};

	const handleRemoveTeam = async (teamId: number) => {
		try {
			await removeTeamFromTournament({
				data: { tournamentId: tournament.id, teamId },
			});
			toast.success(t("teams.removeSuccess"));
			router.invalidate();
		} catch (e) {
			toast.error(t("teams.removeError"));
		}
	};

	// Reset Match State
	const [isResetModalOpen, setIsResetModalOpen] = useState(false);
	const [matchToReset, setMatchToReset] = useState<number | null>(null);
	const [isResetting, setIsResetting] = useState(false);

	// Reset Tournament State
	const [isResetTournamentModalOpen, setIsResetTournamentModalOpen] =
		useState(false);
	const [isResettingTournament, setIsResettingTournament] = useState(false);
	const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState(false);
	const [isRecalculatingTournament, setIsRecalculatingTournament] =
		useState(false);

	const handleResetMatch = async () => {
		if (!matchToReset) return;
		setIsResetting(true);
		try {
			const { resetScores } = await import("@/server/matches");
			await resetScores({
				data: { matchId: matchToReset },
			});
			toast.success(t("reset.scoreReset"));
			setIsResetModalOpen(false);
			setMatchToReset(null);
			// Invalidate user points cache when match is reset
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			router.invalidate();
		} catch (e) {
			toast.error(t("reset.scoreResetError"));
		} finally {
			setIsResetting(false);
		}
	};

	const handleResetTournament = async () => {
		setIsResettingTournament(true);
		try {
			const result = await resetTournamentResults({
				data: { tournamentId: tournament.id },
			});
			toast.success(t("reset.tournamentReset", { count: result.resetCount }));
			setIsResetTournamentModalOpen(false);
			// Invalidate user points cache when tournament results are reset
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			router.invalidate();
		} catch (e) {
			toast.error(t("reset.tournamentResetError"));
		} finally {
			setIsResettingTournament(false);
		}
	};

	const handleRecalculateTournamentPoints = async () => {
		setIsRecalculatingTournament(true);
		try {
			const result = await recalculateTournamentPoints({
				data: { tournamentId: tournament.id },
			});
			toast.success(
				t("recalc.success", {
					matchCount: result.totalMatches,
					betCount: result.betsReset,
				}),
			);
			if (
				result.adjustmentsSkippedNoMatch > 0 ||
				result.adjustmentsSkippedOutOfTournament > 0
			) {
				toast.warning(
					t("recalc.skippedAdjustments", {
						noMatch: result.adjustmentsSkippedNoMatch,
						outOfTournament: result.adjustmentsSkippedOutOfTournament,
					}),
				);
			}
			setIsRecalculateModalOpen(false);
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			router.invalidate();
		} catch (e) {
			toast.error(t("recalc.error"));
		} finally {
			setIsRecalculatingTournament(false);
		}
	};

	// Generation Modal State
	const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
	const [pendingGeneration, setPendingGeneration] = useState<
		"groups" | "bracket" | null
	>(null);
	const [isGenerating, setIsGenerating] = useState(false);

	const handleConfirmGeneration = async () => {
		if (!pendingGeneration) return;
		setIsGenerating(true);

		try {
			if (pendingGeneration === "groups") {
				const { generateFullBracket } = await import("@/server/matches");
				await generateFullBracket({
					data: {
						tournamentId: tournament.id,
						stageId: (tournament.stages as any[])?.find(
							(s: any) => s.type === "Groups",
						)?.id,
					},
				});
				toast.success(t("matches.groupGenerateSuccess"));
			} else if (pendingGeneration === "bracket") {
				// For Swiss tournaments, generate playoff from qualified teams
				const swissStageEl = stages.find((s: any) => s.type === "Swiss");
				if (swissStageEl) {
					const playoffStageEl = stages.find(
						(s: any) =>
							s.type === "Single Elimination" ||
							s.type === "Double Elimination",
					);
					if (swissStageEl && playoffStageEl) {
						const { generatePlayoffDraftServer } = await import(
							"@/server/matches"
						);
						await generatePlayoffDraftServer({
							data: {
								tournamentId: tournament.id,
								swissStageId: swissStageEl.id,
								playoffStageId: playoffStageEl.id,
							},
						});
					}
				} else {
					const { generateFullBracket } = await import("@/server/matches");
					await generateFullBracket({
						data: {
							tournamentId: tournament.id,
							stageId:
								selectedStageFilter !== "all" ? selectedStageFilter : undefined,
						},
					});
				}
				toast.success(t("matches.bracketGenerateSuccess"));
			}

			router.invalidate();
			setIsGenerateModalOpen(false);
			setPendingGeneration(null);
		} catch (e) {
			toast.error(t("matches.generateError"));
		} finally {
			setIsGenerating(false);
		}
	};

	// Sequential Groups by date (Preserves displayOrder)
	const matchesBySequentialDate = useMemo(
		() =>
			[...matches]
				.sort(
					(a: any, b: any) =>
						new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
				)
				.reduce((acc: MatchSegment[], match: any) => {
					const date = new Date(match.startTime).toLocaleDateString("pt-BR", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
					});
					const lastSegment = acc[acc.length - 1];

					if (lastSegment && lastSegment.date === date) {
						lastSegment.items.push(match);
					} else {
						acc.push({ date, items: [match] });
					}
					return acc;
				}, []),
		[matches],
	);

	// Filter matches within segments
	const filteredMatchSegments = useMemo(
		() =>
			matchesBySequentialDate
				.map((segment: MatchSegment) => ({
					...segment,
					items: segment.items.filter((match: any) => {
						const matchStage = stages.find(
							(s) => s.id === match.stageId || s.id === match.label,
						);
						if (
							selectedStageFilter !== "all" &&
							String(match.label) !== String(selectedStageFilter) &&
							match.stageId !== selectedStageFilter &&
							matchStage?.id !== selectedStageFilter
						) {
							return false;
						}
						return true;
					}),
				}))
				.filter((segment: MatchSegment) => segment.items.length > 0),
		[matchesBySequentialDate, selectedStageFilter, stages],
	);

	const headerConfig = useMemo(
		() => ({
			title: tournament.name.toUpperCase(),
			actions: (
				<div className="flex items-center gap-3">
					<div className="mr-4 hidden gap-1 lg:flex">
						{/* 1. Teams - Add teams first */}
						<button
							onClick={() => setActiveTab("teams")}
							className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
								activeTab === "teams"
									? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
									: "bg-white hover:bg-gray-50"
							}`}
						>
							{t("matches.tabTeams")}
						</button>

						{/* 2. Schedule - Define match days */}
						<button
							onClick={() => setActiveTab("schedule")}
							className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
								activeTab === "schedule"
									? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
									: "bg-white hover:bg-gray-50"
							}`}
						>
							{t("matches.tabSchedule")}
						</button>

						{/* 3. Seeding - Distribute teams into groups (if applicable) */}
						{hasGroups && (
							<button
								onClick={() => setActiveTab("seeding")}
								className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
									activeTab === "seeding"
										? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
										: "bg-white hover:bg-gray-50"
								}`}
							>
								{t("matches.tabSeeding")}
							</button>
						)}

						{/* 4. Groups - View and generate group matches */}
						{hasGroups && (
							<button
								onClick={() => setActiveTab("groups")}
								className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
									activeTab === "groups"
										? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
										: "bg-white hover:bg-gray-50"
								}`}
							>
								{t("matches.tabGroups")}
							</button>
						)}

						{/* 5. Swiss Stage - Manage swiss rounds */}
						{hasSwiss && (
							<button
								onClick={() => setActiveTab("swiss")}
								className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
									activeTab === "swiss"
										? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
										: "bg-white hover:bg-gray-50"
								}`}
							>
								{t("matches.tabSwiss")}
							</button>
						)}

						{/* 6. Bracket - View and generate playoff bracket */}
						{hasBracket && (
							<button
								onClick={() => setActiveTab("bracket")}
								className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
									activeTab === "bracket"
										? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
										: "bg-white hover:bg-gray-50"
								}`}
							>
								{t("matches.tabBracket")}
							</button>
						)}

						{/* 6. Matches - Manage individual matches */}
						<button
							onClick={() => setActiveTab("matches")}
							className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
								activeTab === "matches"
									? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
									: "bg-white hover:bg-gray-50"
							}`}
						>
							{t("matches.tabMatches")}
						</button>

						{/* 7. Order - Fine-tune display order */}
						<button
							onClick={() => setActiveTab("ordering")}
							className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
								activeTab === "ordering"
									? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
									: "bg-white hover:bg-gray-50"
							}`}
						>
							{t("matches.tabOrder")}
						</button>
					</div>

					<button
						onClick={() => setIsRecalculateModalOpen(true)}
						className="flex items-center gap-2 border-[2px] border-black bg-black px-4 py-1.5 font-black text-[#ccff00] text-[10px] uppercase transition-all hover:bg-[#ccff00] hover:text-black"
					>
						<CheckCircle2 size={12} strokeWidth={3} />
						{t("recalc.button")}
					</button>

					<button
						onClick={() => setIsResetTournamentModalOpen(true)}
						className="flex items-center gap-2 border-[2px] border-black bg-white px-4 py-1.5 font-black text-[#ff2e2e] text-[10px] uppercase transition-all hover:bg-[#ff2e2e] hover:text-white"
					>
						<RotateCcw size={12} strokeWidth={3} />
						{t("reset.button")}
					</button>

					<Link
						to={linkTo("/admin/tournaments")}
						className="border-[3px] border-black bg-black p-2 text-white transition-colors hover:bg-[#ccff00] hover:text-black"
					>
						<ArrowLeft className="h-4 w-4" strokeWidth={3} />
					</Link>
				</div>
			),
		}),
		[tournament.name, hasBracket, hasGroups, activeTab],
	);

	useSetHeader(headerConfig);

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans">
			{/* MOBILE TABS */}
			<div className="sticky top-20 z-30 flex gap-2 overflow-x-auto border-black border-b-2 bg-white p-2 lg:hidden">
				<button
					onClick={() => setActiveTab("teams")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "teams" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					{t("matches.tabTeams")}
				</button>
				<button
					onClick={() => setActiveTab("schedule")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "schedule" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					{t("matches.tabDays")}
				</button>
				{hasGroups && (
					<button
						onClick={() => setActiveTab("seeding")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "seeding" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						{t("matches.tabSeeding")}
					</button>
				)}
				{hasGroups && (
					<button
						onClick={() => setActiveTab("groups")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "groups" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						{t("matches.tabGroups")}
					</button>
				)}
				{hasSwiss && (
					<button
						onClick={() => setActiveTab("swiss")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "swiss" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						{t("matches.tabSwiss")}
					</button>
				)}
				{hasBracket && (
					<button
						onClick={() => setActiveTab("bracket")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "bracket" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						{t("matches.tabBracket")}
					</button>
				)}
				<button
					onClick={() => setActiveTab("matches")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "matches" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					{t("matches.tabMatches")}
				</button>
				<button
					onClick={() => setActiveTab("ordering")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "ordering" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					{t("matches.tabOrder")}
				</button>
			</div>

			<div className="mx-auto max-w-[1600px] px-6 py-8">
				{activeTab === "teams" && (
					<TournamentTeamsManager
						teams={tournamentTeams}
						allTeams={allTeams}
						onAddTeam={handleAddTeam}
						onRemoveTeam={handleRemoveTeam}
						tournamentRegion={tournament.region}
					/>
				)}
				{activeTab === "seeding" && (
					<TournamentSeedingManager
						teams={tournamentTeams as any[]}
						tournamentId={tournament.id}
						groupsCount={
							(tournament.stages as any[])?.find(
								(s: any) => s.type === "Groups",
							)?.settings?.groupsCount || 4
						}
						maxTeamsPerGroup={
							(tournament.stages as any[])?.find(
								(s: any) => s.type === "Groups",
							)?.settings?.teamsPerGroup || 4
						}
					/>
				)}
				{activeTab === "schedule" && (
					<MatchDaysManager
						tournamentId={tournament.id}
						matchDays={(matchDays || []) as any[]}
						tournamentStartDate={tournament.startDate}
						tournamentEndDate={tournament.endDate}
					/>
				)}

				{activeTab === "groups" && (
					<div className="space-y-6">
						<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
							<h2 className="font-black text-2xl text-black uppercase italic">
								{t("matches.groupStage")}
							</h2>
							<p className="font-bold text-gray-500 text-sm">
								{t("matchBuilder.groupStageDescription")}
							</p>
						</div>
						<BracketEditor
							matches={
								matches.filter((m: any) => m.bracketSide === "groups") as any
							}
							onCreateMatch={(data) => {
								setEditingMatch({
									roundIndex: data.roundIndex,
									bracketSide: "groups",
									label: data.label,
									startTime: new Date().toISOString(),
								});
								setIsMatchModalOpen(true);
							}}
							onEditMatch={(match) => {
								setEditingMatch(match);
								setIsMatchModalOpen(true);
							}}
							onGenerateFullBracket={async () => {
								// Check if matches already exist
								const existingMatches = matches.filter(
									(m: any) => m.bracketSide === "groups",
								);
								if (existingMatches.length > 0) {
									setPendingGeneration("groups");
									setIsGenerateModalOpen(true);
									return;
								}

								// Proceed directly if no matches exist
								try {
									const { generateFullBracket } = await import(
										"@/server/matches"
									);
									await generateFullBracket({
										data: {
											tournamentId: tournament.id,
											stageId: (tournament.stages as any[])?.find(
												(s: any) => s.type === "Groups",
											)?.id,
										},
									});
									toast.success(t("matches.groupGenerateSuccess"));
									router.invalidate();
								} catch (e) {
									toast.error(t("matches.groupGenerateError"));
								}
							}}
						/>
					</div>
				)}

				{activeTab === "swiss" && (
					<div className="space-y-6">
						<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
							<h2 className="font-black text-2xl text-black uppercase italic">
								{t("matches.swissStage")}
							</h2>
							<p className="font-bold text-gray-500 text-sm">
								{t("matches.swissStageDescription")}
							</p>
						</div>
						<div className="flex flex-wrap gap-4">
							<button
								onClick={async () => {
									try {
										const { generateFullBracket } = await import(
											"@/server/matches"
										);
										await generateFullBracket({
											data: {
												tournamentId: tournament.id,
												stageId: swissStage?.id,
											},
										});
										toast.success(t("matches.generateSwissRoundOneSuccess"));
										router.invalidate();
									} catch (e) {
										toast.error(t("matches.generateSwissRoundOneError"));
									}
								}}
								className="border-[3px] border-black bg-white px-4 py-2 font-black text-xs text-black uppercase shadow-[3px_3px_0_0_#000] hover:bg-[#ccff00]"
							>
								{t("matches.generateSwissRoundOne")}
							</button>
							<button
								onClick={async () => {
									try {
										const swissStageEl = stages.find(
											(s: any) => s.type === "Swiss",
										);
										if (!swissStageEl) return;
										const { suggestSwissRoundServer } = await import(
											"@/server/matches"
										);
										await suggestSwissRoundServer({
											data: {
												tournamentId: tournament.id,
												stageId: swissStageEl.id,
											},
										});
										toast.success(t("matches.suggestSwissNextRoundSuccess"));
										router.invalidate();
									} catch (e: any) {
										toast.error(
											e?.message ||
												t("matches.suggestSwissNextRoundError"),
										);
									}
								}}
								className="border-[3px] border-black bg-white px-4 py-2 font-black text-xs text-black uppercase shadow-[3px_3px_0_0_#000] hover:bg-[#ccff00]"
							>
								{t("matches.suggestSwissNextRound")}
							</button>
							<button
								onClick={async () => {
									try {
										const swissStageEl = stages.find(
											(s: any) => s.type === "Swiss",
										);
										const playoffStageEl = stages.find(
											(s: any) =>
												s.type === "Single Elimination" ||
												s.type === "Double Elimination",
										);
										if (!swissStageEl || !playoffStageEl) return;
										const { generatePlayoffDraftServer } = await import(
											"@/server/matches"
										);
										await generatePlayoffDraftServer({
											data: {
												tournamentId: tournament.id,
												swissStageId: swissStageEl.id,
												playoffStageId: playoffStageEl.id,
											},
										});
										toast.success(
											t("matches.generateSwissPlayoffDraftSuccess"),
										);
										router.invalidate();
									} catch (e) {
										toast.error(
											t("matches.generateSwissPlayoffDraftError"),
										);
									}
								}}
								className="border-[3px] border-black bg-white px-4 py-2 font-black text-xs text-black uppercase shadow-[3px_3px_0_0_#000] hover:bg-[#ccff00]"
							>
								{t("matches.generateSwissPlayoffDraft")}
							</button>
						</div>
						{(() => {
							if (swissMatches.length === 0) return null;
							const rounds = swissMatches.reduce(
								(acc: Record<number, any[]>, m: any) => {
									const r = m.roundIndex ?? 0;
									if (!acc[r]) acc[r] = [];
									acc[r].push(m);
									return acc;
								},
								{} as Record<number, any[]>,
							);
							const sortedRounds = Object.keys(rounds)
								.map(Number)
								.sort((a, b) => a - b);

							return (
								<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
									<h3 className="mb-4 font-black text-xl text-black uppercase italic">
										{t("matches.swissMatches")}
									</h3>
									{sortedRounds.map((roundIdx) => (
										<div key={roundIdx} className="mb-8 last:mb-0">
											<div className="mb-3 flex items-center gap-3">
												<div className="-skew-x-6 inline-block border-2 border-black bg-black px-3 py-1">
													<span className="block skew-x-6 font-black text-[#ccff00] text-xs uppercase tracking-widest">
														Rodada {roundIdx + 1}
													</span>
												</div>
												<div className="h-0.5 flex-1 bg-black/10" />
												<span className="font-bold text-[10px] text-gray-400 uppercase">
													{rounds[roundIdx].filter((m: any) => m.status === "finished").length}/{rounds[roundIdx].length} finalizados
												</span>
											</div>
											<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
												{rounds[roundIdx].map((match: any) => {
													const isLive = match.status === "live";
													const isFinished = match.status === "finished";
													const teamAWon = isFinished && match.winnerId === match.teamAId;
													const teamBWon = isFinished && match.winnerId === match.teamBId;

													return (
														<div
															key={match.id}
															onClick={() => {
																setEditingMatch(match);
																setIsMatchModalOpen(true);
															}}
															className="group relative flex cursor-pointer flex-col border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
														>
															{isLive && (
																<div className="absolute -top-2 -right-1 z-20 animate-pulse border-2 border-black bg-brawl-red px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
																	AO VIVO
																</div>
															)}
															{isFinished && (
																<div className="absolute -top-2 -right-1 z-20 border-2 border-black bg-black px-1.5 py-0.5 font-black text-[7px] text-white uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
																	FINAL
																</div>
															)}
															<div className="relative -mx-0 -mt-0 box-border flex min-h-7 flex-shrink-0 flex-col justify-center gap-0.5 border-black border-b-2 bg-gray-50/50 px-1.5 py-0.5">
																<div className="flex w-full items-center justify-between">
																	<div className="min-w-0 flex-grow pr-1">
																		<span className="line-clamp-2 block text-left font-black text-[10px] text-black uppercase italic leading-tight antialiased">
																			{match.name || `Match #${match.id}`}
																		</span>
																	</div>
																	<span className="flex-shrink-0 font-bold font-mono text-[9px] text-gray-400">
																		#{match.displayOrder ?? "-"}
																	</span>
																</div>
																{match.startTime && (
																	<div className="font-bold text-[7px] text-gray-600">
																		{new Date(match.startTime).toLocaleDateString("pt-BR", {
																			day: "2-digit",
																			month: "2-digit",
																			year: "numeric",
																		})}{" "}
																		•{" "}
																		{new Date(match.startTime).toLocaleTimeString("pt-BR", {
																			hour: "2-digit",
																			minute: "2-digit",
																		})}
																	</div>
																)}
															</div>
															<div className="flex flex-grow flex-col justify-center gap-1 p-1">
																<div className="grid h-9 grid-cols-[2rem_1fr_1.75rem] items-center overflow-hidden border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
																	<div className="flex h-full items-center justify-center border-black border-r-2 bg-gray-100 p-0.5">
																		{match.teamA?.logoUrl ? (
																			<img src={match.teamA.logoUrl} alt="" className="h-6 w-6 object-contain" />
																		) : (
																			<div className="h-5 w-5 rounded-full border border-black/5 bg-black/5" />
																		)}
																	</div>
																	<div className="flex h-full items-center overflow-hidden px-1.5">
																		<span className="block w-full truncate text-left font-black text-[10px] text-black uppercase leading-none tracking-tighter">
																			{match.teamA?.name || match.labelTeamA || "TBD"}
																		</span>
																	</div>
																	<div className={`flex h-full items-center justify-center border-black border-l-2 font-black text-[11px] italic ${teamAWon ? "bg-black text-[#ccff00]" : isFinished ? "bg-gray-200 text-gray-400" : "bg-gray-100 text-gray-300"}`}>
																		{match.scoreA ?? "-"}
																	</div>
																</div>
																<div className="grid h-9 grid-cols-[2rem_1fr_1.75rem] items-center overflow-hidden border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
																	<div className="flex h-full items-center justify-center border-black border-r-2 bg-gray-100 p-0.5">
																		{match.teamB?.logoUrl ? (
																			<img src={match.teamB.logoUrl} alt="" className="h-6 w-6 object-contain" />
																		) : (
																			<div className="h-5 w-5 rounded-full border border-black/5 bg-black/5" />
																		)}
																	</div>
																	<div className="flex h-full items-center overflow-hidden px-1.5">
																		<span className="block w-full truncate text-left font-black text-[10px] text-black uppercase leading-none tracking-tighter">
																			{match.teamB?.name || match.labelTeamB || "TBD"}
																		</span>
																	</div>
																	<div className={`flex h-full items-center justify-center border-black border-l-2 font-black text-[11px] italic ${teamBWon ? "bg-black text-[#ccff00]" : isFinished ? "bg-gray-200 text-gray-400" : "bg-gray-100 text-gray-300"}`}>
																		{match.scoreB ?? "-"}
																	</div>
																</div>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									))}
								</div>
							);
						})()}
					</div>
				)}

				{activeTab === "bracket" && (
					<div className="space-y-6">
						<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
							<h2 className="font-black text-2xl text-black uppercase italic">
								{t("matches.playoffs")}
							</h2>
							<p className="font-bold text-gray-500 text-sm">
								{t("matchBuilder.description")}
							</p>
						</div>
						<BracketEditor
							stageType={
								stages.find(
									(s: any) =>
										s.id === selectedStageFilter ||
										(selectedStageFilter === "all" &&
											(s.type === "Single Elimination" ||
												s.type === "Double Elimination")),
								)?.type
							}
							matches={
								matches.filter((m: any) => {
									const isBracketMatch = m.bracketSide !== "groups";
									if (!isBracketMatch) return false;
									if (swissStage && m.stageId === swissStage.id) return false;
									if (selectedStageFilter === "all") return true;
									return m.stageId === selectedStageFilter;
								}) as any
							}
							onCreateMatch={(data) => {
								setEditingMatch({
									roundIndex: data.roundIndex,
									bracketSide: data.bracketSide,
									label: data.label,
									startTime: new Date().toISOString(),
								});
								setIsMatchModalOpen(true);
							}}
							onEditMatch={(match) => {
								setEditingMatch(match);
								setIsMatchModalOpen(true);
							}}
							onGenerateNextRound={async (roundIndex, side) => {
								try {
									const { generateNextRound } = await import(
										"@/server/matches"
									);
									await generateNextRound({
										data: {
											tournamentId: tournament.id,
											roundIndex,
											bracketSide: side as any,
										},
									});
									toast.success(t("matches.nextRoundSuccess"));
									router.invalidate();
								} catch (e) {
									toast.error(t("matches.nextRoundError"));
								}
							}}
							onGenerateFullBracket={async (_roundIndex, _side) => {
								// Check if matches already exist
								const existingMatches = matches.filter(
									(m: any) =>
										m.bracketSide !== "groups" &&
										!(swissStage && m.stageId === swissStage.id),
								);
								if (existingMatches.length > 0) {
									setPendingGeneration("bracket");
									setIsGenerateModalOpen(true);
									return;
								}

								try {
									// For Swiss tournaments, generate playoff from qualified teams
									if (swissStage) {
										const playoffStage = stages.find(
											(s: any) =>
												s.type === "Single Elimination" ||
												s.type === "Double Elimination",
										);
										if (playoffStage) {
											const { generatePlayoffDraftServer } = await import(
												"@/server/matches"
											);
											await generatePlayoffDraftServer({
												data: {
													tournamentId: tournament.id,
													swissStageId: swissStage.id,
													playoffStageId: playoffStage.id,
												},
											});
										}
									} else {
										const { generateFullBracket } = await import(
											"@/server/matches"
										);
										const playoffStage = stages.find(
											(s: any) =>
												s.type === "Single Elimination" ||
												s.type === "Double Elimination",
										);
										await generateFullBracket({
											data: {
												tournamentId: tournament.id,
												stageId:
													selectedStageFilter !== "all"
														? selectedStageFilter
														: playoffStage?.id,
											},
										});
									}
									toast.success(t("matches.bracketGenerateSuccess"));
									router.invalidate();
								} catch (e) {
									toast.error(t("matches.bracketGenerateError"));
								}
							}}
						/>
					</div>
				)}

				{activeTab === "ordering" && (
					<div className="mx-auto max-w-4xl">
						<MatchOrdering
							matches={matches as any}
							tournamentId={tournament.id}
						/>
					</div>
				)}

				{activeTab === "matches" && (
					<div className="space-y-8">
						{/* Matches Toolbar */}
						<div className="flex items-end justify-between border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
							<div className="w-64">
								<CustomSelect
									label={t("matches.filterStage")}
									value={selectedStageFilter}
									onChange={setSelectedStageFilter}
									options={[
										{ value: "all", label: t("matches.allStages") },
										...stages.map((s) => ({ value: s.id, label: s.name })),
									]}
								/>
							</div>
							<button
								onClick={() => setIsMatchModalOpen(true)}
								className="flex items-center gap-2 border-[3px] border-black bg-black px-6 py-3 font-black text-sm text-white uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#ccff00] hover:text-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
							>
								<Plus className="h-5 w-5" strokeWidth={3} />
								{t("matches.addMatch")}
							</button>
						</div>

						{/* Matches Grid */}
						<div className="space-y-8">
							{filteredMatchSegments.length === 0 ? (
								<div className="border-4 border-gray-300 border-dashed py-12 text-center">
									<p className="font-bold text-gray-400 text-xl uppercase">
										{t("matches.noMatches")}
									</p>
								</div>
							) : (
								filteredMatchSegments.map(
									(segment: MatchSegment, segmentIndex: number) => (
										<div key={`${segment.date}-${segmentIndex}`}>
											<div className="mb-4 flex items-center gap-4">
												<div className="skew-x-[-10deg] transform bg-black px-4 py-1 font-black text-white text-xl uppercase italic">
													{segment.date}
												</div>
												<div className="h-[2px] flex-1 bg-black opacity-20" />
											</div>

											<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
												{segment.items.map((match: any) => (
													<div
														key={match.id}
														className="flex flex-col border-[3px] border-black bg-white p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
													>
														<div className="flex items-center justify-between border-black border-b-2 bg-gray-100 px-3 py-2 text-black">
															<div className="flex items-center gap-2">
																<span className="font-black text-gray-500 text-xs uppercase">
																	{new Date(match.startTime).toLocaleTimeString(
																		[],
																		{ hour: "2-digit", minute: "2-digit" },
																	)}
																</span>
																<div className="flex flex-col">
																	<span className="w-fit rounded-full bg-black px-2 font-bold text-[10px] text-white uppercase">
																		{stages.find(
																			(s) =>
																				s.id === match.stageId ||
																				s.id === match.label,
																		)?.name ||
																			match.label ||
																			t("matches.unknownStage")}
																	</span>
																	{match.name && (
																		<span className="mt-1 font-black text-[10px] text-black uppercase">
																			{match.name}
																		</span>
																	)}
																	{match.startTime ? (
																		<div className="mt-1 font-bold text-[9px] text-gray-600">
																			📅{" "}
																			{new Date(
																				match.startTime,
																			).toLocaleDateString("pt-BR", {
																				day: "2-digit",
																				month: "2-digit",
																				year: "numeric",
																			})}{" "}
																			•{" "}
																			{new Date(
																				match.startTime,
																			).toLocaleTimeString("pt-BR", {
																				hour: "2-digit",
																				minute: "2-digit",
																			})}
																		</div>
																	) : (
																		<div className="mt-1 font-bold text-[9px] text-red-500">
																			⚠️ {t("matches.noDateSet")}
																		</div>
																	)}
																	<div className="mt-1">
																		{match.resultType === "wo" &&
																			match.status === "finished" && (
																				<span className="mr-1 border border-black bg-[#ff2e2e] px-1.5 py-0.5 font-black text-[9px] text-white uppercase shadow-[1px_1px_0px_0px_#000]">
																					W.O.
																				</span>
																			)}
																		{match.isBettingEnabled ? (
																			<span className="border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0px_0px_#000]">
																				{t("matches.betsOpen")}
																			</span>
																		) : (
																			<span className="border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-black text-[9px] text-gray-400 uppercase">
																				{t("matches.betsClosed")}
																			</span>
																		)}
																	</div>
																</div>
															</div>
															<div className="flex items-center gap-1">
																<button
																	onClick={() => {
																		setEditingMatch(match);
																		setIsMatchModalOpen(true);
																	}}
																	className="border-2 border-transparent p-1 transition-colors hover:border-black hover:bg-[#ccff00]"
																>
																	<Pencil className="h-3.5 w-3.5" />
																</button>
																<button
																	onClick={() => {
																		setMatchToDelete(match.id);
																		setIsDeleteModalOpen(true);
																	}}
																	className="border-2 border-transparent p-1 transition-colors hover:border-black hover:bg-[#ff2e2e] hover:text-white"
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</button>
															</div>
														</div>
														<div className="flex flex-col gap-3 p-4">
															<div className="flex items-center justify-between gap-4">
																<div className="flex flex-1 flex-col items-center gap-2 text-center">
																	<div className="flex h-16 w-16 items-center justify-center p-1">
																		{match.teamA ? (
																			<img
																				src={match.teamA.logoUrl || ""}
																				className="h-full w-full object-contain"
																			/>
																		) : (
																			<span className="font-black text-gray-400 text-xs">
																				?
																			</span>
																		)}
																	</div>
																	<span className="font-black text-black text-sm uppercase leading-none">
																		{match.teamA
																			? match.teamA.name
																			: match.labelTeamA}
																	</span>
																</div>

																{match.status === "live" ||
																match.status === "finished" ? (
																	<div className="flex -skew-x-12 items-center gap-2 border-[2px] border-white bg-black px-3 py-1 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
																		<span className="skew-x-12 font-black text-2xl text-brawl-blue">
																			{match.resultType === "wo"
																				? (match.teamA?.id ?? match.teamAId) ===
																					match.winnerId
																					? "W"
																					: !match.winnerId &&
																							!(
																								match.teamA?.id ?? match.teamAId
																							) &&
																							(match.teamB?.id ?? match.teamBId)
																						? "W"
																						: "FF"
																				: (match.scoreA ?? 0)}
																		</span>
																		<span className="skew-x-12 font-bold text-gray-500 text-sm">
																			-
																		</span>
																		<span className="skew-x-12 font-black text-2xl text-brawl-red">
																			{match.resultType === "wo"
																				? (match.teamB?.id ?? match.teamBId) ===
																					match.winnerId
																					? "W"
																					: !match.winnerId &&
																							!(
																								match.teamB?.id ?? match.teamBId
																							) &&
																							(match.teamA?.id ?? match.teamAId)
																						? "W"
																						: "FF"
																				: (match.scoreB ?? 0)}
																		</span>
																	</div>
																) : (
																	<div className="font-black text-gray-300 text-xl italic">
																		VS
																	</div>
																)}

																<div className="flex flex-1 flex-col items-center gap-2 text-center">
																	<div className="flex h-16 w-16 items-center justify-center p-1">
																		{match.teamB ? (
																			<img
																				src={match.teamB.logoUrl || ""}
																				className="h-full w-full object-contain"
																			/>
																		) : (
																			<span className="font-black text-gray-400 text-xs">
																				?
																			</span>
																		)}
																	</div>
																	<span className="font-black text-black text-sm uppercase leading-none">
																		{match.teamB
																			? match.teamB.name
																			: match.labelTeamB}
																	</span>
																</div>
															</div>

															{match.teamA &&
																match.teamB &&
																match.status === "live" &&
																!isTournamentUpcoming && (
																	<Link
																		to={linkTo("/admin/live/$matchId")}
																		params={{ matchId: String(match.id) }}
																		className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-brawl-red px-3 py-2 font-black text-white text-xs uppercase shadow-[3px_3px_0px_0px_#000] transition-all hover:bg-[#d41d1d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
																	>
																		<Radio className="h-4 w-4" />
																		{t("live.control")}
																	</Link>
																)}

															{match.status === "scheduled" &&
																match.teamA &&
																match.teamB && (
																	<button
																		disabled={isTournamentUpcoming}
																		title={
																			isTournamentUpcoming
																				? t("live.tournamentUpcomingHint")
																				: undefined
																		}
																		onClick={() => {
																			setEditingMatch({
																				...match,
																				status: "finished",
																			});
																			setIsMatchModalOpen(true);
																		}}
																		className={
																			"flex w-full items-center justify-center gap-2 border-[3px] border-black px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000]" +
																			(isTournamentUpcoming
																				? "cursor-not-allowed bg-gray-200 text-gray-500 opacity-70"
																				: "bg-[#ccff00] text-black transition-all hover:bg-black hover:text-[#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none")
																		}
																	>
																		<CheckCircle2 className="h-4 w-4" />
																		{t("live.setResult")}
																	</button>
																)}

															{match.status === "finished" && (
																<button
																	onClick={() => {
																		setMatchToReset(match.id);
																		setIsResetModalOpen(true);
																	}}
																	className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-gray-600 px-3 py-2 font-black text-white text-xs uppercase shadow-[3px_3px_0px_0px_#000] transition-all hover:bg-gray-500 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
																>
																	<RotateCcw className="h-4 w-4" />
																	{t("live.resetMatch")}
																</button>
															)}
														</div>
													</div>
												))}
											</div>
										</div>
									),
								)
							)}
						</div>
					</div>
				)}
			</div>

			<MatchModal
				key={isMatchModalOpen ? editingMatch?.id || "new" : "closed"}
				isOpen={isMatchModalOpen}
				onClose={() => {
					setIsMatchModalOpen(false);
					setEditingMatch(null);
				}}
				tournamentId={tournament.id}
				stages={stages}
				teams={tournamentTeams}
				matches={matches}
				matchToEdit={editingMatch}
				matchDays={(matchDays || []) as any[]}
				onSuccess={async () => {
					await router.invalidate();
				}}
				groupsCount={
					stages.find((s) => s.type === "Groups")?.settings?.groupsCount || 4
				}
				advancingPerGroup={
					stages.find((s) => (s as any).type === "Single Elimination")?.settings
						?.advancingPerGroup || 2
				}
			/>

			<DeleteModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setMatchToDelete(null);
				}}
				onConfirm={handleDeleteMatch}
				isDeleting={isDeleting}
				title={t("matches.deleteTitle")}
				description={t("matches.deleteDescription")}
			/>

			<ConfirmationModal
				isOpen={isResetModalOpen}
				onClose={() => {
					setIsResetModalOpen(false);
					setMatchToReset(null);
				}}
				onConfirm={handleResetMatch}
				isLoading={isResetting}
				title={t("reset.title")}
				description={t("reset.confirm")}
				confirmLabel={t("reset.confirmLabel")}
				cancelLabel={t("reset.cancelLabel")}
				variant="warning"
			/>

			<ConfirmationModal
				isOpen={isGenerateModalOpen}
				onClose={() => {
					setIsGenerateModalOpen(false);
					setPendingGeneration(null);
				}}
				onConfirm={handleConfirmGeneration}
				isLoading={isGenerating}
				title={t("matchBuilder.regenerateTitle")}
				description={
					pendingGeneration === "groups"
						? t("matchBuilder.existingMatchesWarning")
						: t("matchBuilder.playoffWarning")
				}
				confirmLabel={t("matchBuilder.regenerateConfirm")}
				cancelLabel={t("matchBuilder.cancel")}
				variant="danger"
			/>

			<ConfirmationModal
				isOpen={isRecalculateModalOpen}
				onClose={() => setIsRecalculateModalOpen(false)}
				onConfirm={handleRecalculateTournamentPoints}
				isLoading={isRecalculatingTournament}
				title={t("recalc.title")}
				description={t("recalc.description")}
				confirmLabel={t("recalc.confirmLabel")}
				cancelLabel={t("recalc.cancelLabel")}
				variant="warning"
			/>

			<ConfirmationModal
				isOpen={isResetTournamentModalOpen}
				onClose={() => setIsResetTournamentModalOpen(false)}
				onConfirm={handleResetTournament}
				isLoading={isResettingTournament}
				title={t("reset.tournamentTitle")}
				description={t("reset.tournamentDescription")}
				confirmLabel={t("reset.tournamentConfirm")}
				cancelLabel={t("reset.cancelLabel")}
				variant="danger"
			/>
		</div>
	);
}

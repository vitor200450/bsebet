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
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { MatchOrdering } from "@/components/admin/MatchOrdering";
import { getMatchDays } from "@/server/match-days";
import {
	deleteMatch,
	getMatches,
	resetTournamentResults,
} from "@/server/matches";
import { getTeams } from "@/server/teams"; // Global teams
import {
	addTeamToTournament,
	getTournamentTeams,
	removeTeamFromTournament,
} from "@/server/tournament-teams";
import { getTournament } from "@/server/tournaments";
import { BracketEditor } from "../../../../components/admin/BracketEditor";
import { DeleteModal } from "../../../../components/admin/DeleteModal";
import { MatchDaysManager } from "../../../../components/admin/MatchDaysManager";
import { MatchModal } from "../../../../components/admin/MatchModal";
import { TournamentSeedingManager } from "../../../../components/admin/TournamentSeedingManager";
import { TournamentTeamsManager } from "../../../../components/admin/TournamentTeamsManager";
import { useSetHeader } from "../../../../components/HeaderContext";

export const Route = createFileRoute(
	"/admin/tournaments/$tournamentId/matches",
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
	const { tournament, tournamentTeams, allTeams, matches, matchDays } =
		Route.useLoaderData();
	const router = useRouter();
	const queryClient = useQueryClient();
	const stages = (tournament.stages as any[]) || [];
	const hasGroups = stages.some((s) => s.type === "Groups");
	const hasBracket = stages.some(
		(s) => s.type === "Single Elimination" || s.type === "Double Elimination",
	);

	type TabType =
		| "matches"
		| "teams"
		| "schedule"
		| "bracket"
		| "groups"
		| "ordering"
		| "seeding";

	const [activeTab, setActiveTab] = useState<TabType>(
		hasBracket ? "bracket" : hasGroups ? "groups" : "matches",
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
			toast.success("Team added!");
			router.invalidate();
		} catch (e) {
			toast.error("Failed to add team");
		}
	};

	const handleDeleteMatch = async () => {
		if (!matchToDelete) return;
		setIsDeleting(true);
		try {
			await deleteMatch({ data: matchToDelete });
			toast.success("Match deleted!");
			setIsDeleteModalOpen(false);
			setMatchToDelete(null);
			router.invalidate();
		} catch (e) {
			toast.error("Failed to delete match");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleRemoveTeam = async (teamId: number) => {
		try {
			await removeTeamFromTournament({
				data: { tournamentId: tournament.id, teamId },
			});
			toast.success("Team removed!");
			router.invalidate();
		} catch (e) {
			toast.error("Failed to remove team");
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

	const handleResetMatch = async () => {
		if (!matchToReset) return;
		setIsResetting(true);
		try {
			const { resetScores } = await import("@/server/matches");
			await resetScores({
				data: { matchId: matchToReset },
			});
			toast.success("Placar resetado!");
			setIsResetModalOpen(false);
			setMatchToReset(null);
			// Invalidate user points cache when match is reset
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			router.invalidate();
		} catch (e) {
			toast.error("Erro ao resetar placar");
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
			toast.success(`${result.resetCount} partidas resetadas com sucesso!`);
			setIsResetTournamentModalOpen(false);
			// Invalidate user points cache when tournament results are reset
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			router.invalidate();
		} catch (e) {
			toast.error("Erro ao resetar resultados do torneio");
		} finally {
			setIsResettingTournament(false);
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
				toast.success("Group matches generated!");
			} else if (pendingGeneration === "bracket") {
				const { generateFullBracket } = await import("@/server/matches");
				await generateFullBracket({
					data: {
						tournamentId: tournament.id,
						stageId:
							selectedStageFilter !== "all" ? selectedStageFilter : undefined,
					},
				});
				toast.success("Full bracket generated recursively!");
			}

			router.invalidate();
			setIsGenerateModalOpen(false);
			setPendingGeneration(null);
		} catch (e) {
			toast.error("Failed to generate matches");
		} finally {
			setIsGenerating(false);
		}
	};

	// Sequential Groups by date (Preserves displayOrder)
	const matchesBySequentialDate = useMemo(
		() =>
			matches.reduce((acc: MatchSegment[], match: any) => {
				const date = new Date(match.startTime).toLocaleDateString();
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
							Teams
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
							Schedule
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
								Seeding
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
								Groups
							</button>
						)}

						{/* 5. Bracket - View and generate playoff bracket */}
						{hasBracket && (
							<button
								onClick={() => setActiveTab("bracket")}
								className={`flex items-center gap-2 border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase transition-all ${
									activeTab === "bracket"
										? "-translate-y-0.5 bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
										: "bg-white hover:bg-gray-50"
								}`}
							>
								Bracket
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
							Matches
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
							Order
						</button>
					</div>

					<button
						onClick={() => setIsResetTournamentModalOpen(true)}
						className="flex items-center gap-2 border-[2px] border-black bg-white px-4 py-1.5 font-black text-[#ff2e2e] text-[10px] uppercase transition-all hover:bg-[#ff2e2e] hover:text-white"
					>
						<RotateCcw size={12} strokeWidth={3} />
						Reset Resultados
					</button>

					<Link
						to="/admin/tournaments"
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
					Teams
				</button>
				<button
					onClick={() => setActiveTab("schedule")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "schedule" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					Days
				</button>
				{hasGroups && (
					<button
						onClick={() => setActiveTab("seeding")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "seeding" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						Seeding
					</button>
				)}
				{hasGroups && (
					<button
						onClick={() => setActiveTab("groups")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "groups" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						Groups
					</button>
				)}
				{hasBracket && (
					<button
						onClick={() => setActiveTab("bracket")}
						className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "bracket" ? "bg-[#ccff00]" : "bg-white"}`}
					>
						Bracket
					</button>
				)}
				<button
					onClick={() => setActiveTab("matches")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "matches" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					Matches
				</button>
				<button
					onClick={() => setActiveTab("ordering")}
					className={`shrink-0 border-2 border-black px-4 py-2 font-black text-[10px] text-black uppercase ${activeTab === "ordering" ? "bg-[#ccff00]" : "bg-white"}`}
				>
					Order
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
								Group Stage
							</h2>
							<p className="font-bold text-gray-500 text-sm">
								Gerencie as partidas e resultados da fase de grupos.
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
									toast.success("Group matches generated!");
									router.invalidate();
								} catch (e) {
									toast.error("Failed to generate group matches");
								}
							}}
						/>
					</div>
				)}

				{activeTab === "bracket" && (
					<div className="space-y-6">
						<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
							<h2 className="font-black text-2xl text-black uppercase italic">
								Playoffs Bracket
							</h2>
							<p className="font-bold text-gray-500 text-sm">
								Crie e organize as partidas visualmente para ficarem idênticas à
								Liquipedia.
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
									toast.success("Next round generated!");
									router.invalidate();
								} catch (e) {
									toast.error("Failed to generate next round");
								}
							}}
							onGenerateFullBracket={async (_roundIndex, _side) => {
								// Check if matches already exist
								const existingMatches = matches.filter(
									(m: any) => m.bracketSide !== "groups",
								);
								if (existingMatches.length > 0) {
									setPendingGeneration("bracket");
									setIsGenerateModalOpen(true);
									return;
								}

								try {
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
									toast.success("Full bracket generated recursively!");
									router.invalidate();
								} catch (e) {
									toast.error("Failed to generate bracket");
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
									label="Filter Stage"
									value={selectedStageFilter}
									onChange={setSelectedStageFilter}
									options={[
										{ value: "all", label: "All Stages" },
										...stages.map((s) => ({ value: s.id, label: s.name })),
									]}
								/>
							</div>
							<button
								onClick={() => setIsMatchModalOpen(true)}
								className="flex items-center gap-2 border-[3px] border-black bg-black px-6 py-3 font-black text-sm text-white uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#ccff00] hover:text-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
							>
								<Plus className="h-5 w-5" strokeWidth={3} />
								Add Match
							</button>
						</div>

						{/* Matches Grid */}
						<div className="space-y-8">
							{filteredMatchSegments.length === 0 ? (
								<div className="border-4 border-gray-300 border-dashed py-12 text-center">
									<p className="font-bold text-gray-400 text-xl uppercase">
										No matches found
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
																			"Unknown Stage"}
																	</span>
																	{match.name && (
																		<span className="mt-1 font-black text-[10px] text-black uppercase">
																			{match.name}
																		</span>
																	)}
																	{match.startTime ? (
																		<div className="mt-1 font-bold text-[9px] text-gray-600">
																			📅{" "}
																			{String(match.startTime)
																				.substring(0, 16)
																				.replace("T", " ")}
																		</div>
																	) : (
																		<div className="mt-1 font-bold text-[9px] text-red-500">
																			⚠️ No date set
																		</div>
																	)}
																	<div className="mt-1">
																		{match.isBettingEnabled ? (
																			<span className="border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0px_0px_#000]">
																				BETS OPEN
																			</span>
																		) : (
																			<span className="border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-black text-[9px] text-gray-400 uppercase">
																				BETS CLOSED
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
																			{match.scoreA ?? 0}
																		</span>
																		<span className="skew-x-12 font-bold text-gray-500 text-sm">
																			-
																		</span>
																		<span className="skew-x-12 font-black text-2xl text-brawl-red">
																			{match.scoreB ?? 0}
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
																match.status === "live" && (
																	<Link
																		to="/admin/live/$matchId"
																		params={{ matchId: String(match.id) }}
																		className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-brawl-red px-3 py-2 font-black text-white text-xs uppercase shadow-[3px_3px_0px_0px_#000] transition-all hover:bg-[#d41d1d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
																	>
																		<Radio className="h-4 w-4" />
																		CONTROLAR AO VIVO
																	</Link>
																)}

															{match.status === "scheduled" &&
																match.teamA &&
																match.teamB && (
																	<button
																		onClick={() => {
																			setEditingMatch({
																				...match,
																				status: "finished",
																			});
																			setIsMatchModalOpen(true);
																		}}
																		className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#ccff00] px-3 py-2 font-black text-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] transition-all hover:bg-black hover:text-[#ccff00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
																	>
																		<CheckCircle2 className="h-4 w-4" />
																		DEFINIR RESULTADO
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
																	RESETAR PARTIDA
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
				onSuccess={() => router.invalidate()}
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
				title="Delete Match"
				description="Are you sure you want to delete this match? All related data will be lost."
			/>

			<ConfirmationModal
				isOpen={isResetModalOpen}
				onClose={() => {
					setIsResetModalOpen(false);
					setMatchToReset(null);
				}}
				onConfirm={handleResetMatch}
				isLoading={isResetting}
				title="Resetar Partida"
				description="Tem certeza que deseja resetar esta partida? O placar voltará a 0-0, todas as apostas serão reabertas e o status voltará para 'AO VIVO'."
				confirmLabel="Sim, Resetar"
				cancelLabel="Cancelar"
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
				title="Regenerar Partidas"
				description={
					pendingGeneration === "groups"
						? "ATENÇÃO: Já existem partidas de grupo geradas. Gerar novamente irá APAGAR todas as partidas e resultados existentes desta fase. Deseja continuar?"
						: "ATENÇÃO: Já existem partidas de playoffs geradas. Gerar novamente poderá duplicar ou resetar progresso. Deseja continuar?"
				}
				confirmLabel="Sim, Regenerar"
				cancelLabel="Cancelar"
				variant="danger"
			/>

			<ConfirmationModal
				isOpen={isResetTournamentModalOpen}
				onClose={() => setIsResetTournamentModalOpen(false)}
				onConfirm={handleResetTournament}
				isLoading={isResettingTournament}
				title="Resetar Todos os Resultados"
				description="ATENÇÃO: Isso irá zerar scores, winners e status de TODAS as partidas do torneio, e limpar as equipes auto-propagadas pelo bracket. As apostas dos usuários NÃO serão afetadas. Esta ação não pode ser desfeita."
				confirmLabel="Sim, Resetar Tudo"
				cancelLabel="Cancelar"
				variant="danger"
			/>
		</div>
	);
}

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getTournament } from "@/server/tournaments";
import {
  addTeamToTournament,
  getTournamentTeams,
  removeTeamFromTournament,
} from "@/server/tournament-teams";
import { getMatches, deleteMatch } from "@/server/matches";
import { getTeams } from "@/server/teams"; // Global teams
import { getMatchDays } from "@/server/match-days";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Radio,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TournamentTeamsManager } from "../../../../components/admin/TournamentTeamsManager";
import { MatchDaysManager } from "../../../../components/admin/MatchDaysManager";
import { MatchModal } from "../../../../components/admin/MatchModal";
import { DeleteModal } from "../../../../components/admin/DeleteModal";
import { BracketEditor } from "../../../../components/admin/BracketEditor";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import { MatchOrdering } from "@/components/admin/MatchOrdering";
import { toast } from "sonner";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { useSetHeader } from "../../../../components/HeaderContext";
import { TournamentSeedingManager } from "../../../../components/admin/TournamentSeedingManager";

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
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao resetar placar");
    } finally {
      setIsResetting(false);
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
          <div className="hidden lg:flex gap-1 mr-4">
            {/* 1. Teams - Add teams first */}
            <button
              onClick={() => setActiveTab("teams")}
              className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                activeTab === "teams"
                  ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Teams
            </button>

            {/* 2. Schedule - Define match days */}
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                activeTab === "schedule"
                  ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Schedule
            </button>

            {/* 3. Seeding - Distribute teams into groups (if applicable) */}
            {hasGroups && (
              <button
                onClick={() => setActiveTab("seeding")}
                className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                  activeTab === "seeding"
                    ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
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
                className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                  activeTab === "groups"
                    ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
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
                className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                  activeTab === "bracket"
                    ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                Bracket
              </button>
            )}

            {/* 6. Matches - Manage individual matches */}
            <button
              onClick={() => setActiveTab("matches")}
              className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                activeTab === "matches"
                  ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Matches
            </button>

            {/* 7. Order - Fine-tune display order */}
            <button
              onClick={() => setActiveTab("ordering")}
              className={`px-4 py-1.5 font-black uppercase text-[10px] border-[2px] border-black transition-all flex items-center gap-2 ${
                activeTab === "ordering"
                  ? "bg-[#ccff00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Order
            </button>
          </div>

          <Link
            to="/admin/tournaments"
            className="bg-black text-white p-2 hover:bg-[#ccff00] hover:text-black transition-colors border-[3px] border-black"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={3} />
          </Link>
        </div>
      ),
    }),
    [tournament.name, hasBracket, hasGroups, activeTab],
  );

  useSetHeader(headerConfig);

  return (
    <div className="min-h-screen bg-paper bg-paper-texture font-sans pb-20">
      {/* MOBILE TABS */}
      <div className="lg:hidden bg-white border-b-2 border-black p-2 flex gap-2 overflow-x-auto sticky top-20 z-30">
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "teams" ? "bg-[#ccff00]" : "bg-white"}`}
        >
          Teams
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "schedule" ? "bg-[#ccff00]" : "bg-white"}`}
        >
          Days
        </button>
        {hasGroups && (
          <button
            onClick={() => setActiveTab("seeding")}
            className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "seeding" ? "bg-[#ccff00]" : "bg-white"}`}
          >
            Seeding
          </button>
        )}
        {hasGroups && (
          <button
            onClick={() => setActiveTab("groups")}
            className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "groups" ? "bg-[#ccff00]" : "bg-white"}`}
          >
            Groups
          </button>
        )}
        {hasBracket && (
          <button
            onClick={() => setActiveTab("bracket")}
            className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "bracket" ? "bg-[#ccff00]" : "bg-white"}`}
          >
            Bracket
          </button>
        )}
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "matches" ? "bg-[#ccff00]" : "bg-white"}`}
        >
          Matches
        </button>
        <button
          onClick={() => setActiveTab("ordering")}
          className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black shrink-0 ${activeTab === "ordering" ? "bg-[#ccff00]" : "bg-white"}`}
        >
          Order
        </button>
      </div>

      <div className="px-6 py-8 max-w-[1600px] mx-auto">
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
            <div className="bg-white border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <h2 className="font-black text-black italic uppercase text-2xl">
                Group Stage
              </h2>
              <p className="text-gray-500 text-sm font-bold">
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
                  const { generateFullBracket } =
                    await import("@/server/matches");
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
            <div className="bg-white border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <h2 className="font-black text-black italic uppercase text-2xl">
                Playoffs Bracket
              </h2>
              <p className="text-gray-500 text-sm font-bold">
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
                  const { generateNextRound } =
                    await import("@/server/matches");
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
                  const { generateFullBracket } =
                    await import("@/server/matches");
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
          <div className="max-w-4xl mx-auto">
            <MatchOrdering
              matches={matches as any}
              tournamentId={tournament.id}
            />
          </div>
        )}

        {activeTab === "matches" && (
          <div className="space-y-8">
            {/* Matches Toolbar */}
            <div className="flex items-end justify-between bg-white border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
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
                className="bg-black hover:bg-[#ccff00] hover:text-black text-white px-6 py-3 font-black uppercase text-sm border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
                Add Match
              </button>
            </div>

            {/* Matches Grid */}
            <div className="space-y-8">
              {filteredMatchSegments.length === 0 ? (
                <div className="text-center py-12 border-4 border-dashed border-gray-300">
                  <p className="text-gray-400 font-bold uppercase text-xl">
                    No matches found
                  </p>
                </div>
              ) : (
                filteredMatchSegments.map(
                  (segment: MatchSegment, segmentIndex: number) => (
                    <div key={`${segment.date}-${segmentIndex}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-black text-white px-4 py-1 font-black uppercase italic text-xl transform skew-x-[-10deg]">
                          {segment.date}
                        </div>
                        <div className="h-[2px] bg-black flex-1 opacity-20"></div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {segment.items.map((match: any) => (
                          <div
                            key={match.id}
                            className="bg-white border-[3px] border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col"
                          >
                            <div className="bg-gray-100 border-b-2 border-black px-3 py-2 flex justify-between items-center text-black">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-gray-500">
                                  {new Date(match.startTime).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase bg-black text-white px-2 rounded-full w-fit">
                                    {stages.find(
                                      (s) =>
                                        s.id === match.stageId ||
                                        s.id === match.label,
                                    )?.name ||
                                      match.label ||
                                      "Unknown Stage"}
                                  </span>
                                  {match.name && (
                                    <span className="text-[10px] font-black uppercase text-black mt-1">
                                      {match.name}
                                    </span>
                                  )}
                                  {match.startTime ? (
                                    <div className="text-[9px] font-bold text-gray-600 mt-1">
                                      📅{" "}
                                      {String(match.startTime)
                                        .substring(0, 16)
                                        .replace("T", " ")}
                                    </div>
                                  ) : (
                                    <div className="text-[9px] font-bold text-red-500 mt-1">
                                      ⚠️ No date set
                                    </div>
                                  )}
                                  <div className="mt-1">
                                    {match.isBettingEnabled ? (
                                      <span className="text-[9px] font-black uppercase text-black bg-[#ccff00] border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_0px_#000]">
                                        BETS OPEN
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 border border-gray-300 px-1.5 py-0.5">
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
                                  className="p-1 hover:bg-[#ccff00] transition-colors border-2 border-transparent hover:border-black"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setMatchToDelete(match.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1 hover:bg-[#ff2e2e] hover:text-white transition-colors border-2 border-transparent hover:border-black"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="p-4 flex flex-col gap-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 flex flex-col items-center gap-2 text-center">
                                  <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center p-1 bg-white overflow-hidden">
                                    {match.teamA ? (
                                      <img
                                        src={match.teamA.logoUrl || ""}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <span className="text-xs font-black text-gray-400">
                                        ?
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-black uppercase text-sm leading-none text-black">
                                    {match.teamA
                                      ? match.teamA.name
                                      : match.labelTeamA}
                                  </span>
                                </div>

                                {match.status === "live" ||
                                match.status === "finished" ? (
                                  <div className="flex items-center gap-2 bg-black text-white px-3 py-1 -skew-x-12 border-[2px] border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                                    <span className="text-2xl font-black skew-x-12 text-brawl-blue">
                                      {match.scoreA ?? 0}
                                    </span>
                                    <span className="text-gray-500 text-sm font-bold skew-x-12">
                                      -
                                    </span>
                                    <span className="text-2xl font-black skew-x-12 text-brawl-red">
                                      {match.scoreB ?? 0}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="font-black italic text-gray-300 text-xl">
                                    VS
                                  </div>
                                )}

                                <div className="flex-1 flex flex-col items-center gap-2 text-center">
                                  <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center p-1 bg-white overflow-hidden">
                                    {match.teamB ? (
                                      <img
                                        src={match.teamB.logoUrl || ""}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <span className="text-xs font-black text-gray-400">
                                        ?
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-black uppercase text-sm leading-none text-black">
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
                                    className="w-full bg-brawl-red hover:bg-[#d41d1d] text-white py-2 px-3 font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                                  >
                                    <Radio className="w-4 h-4" />
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
                                    className="w-full bg-[#ccff00] hover:bg-black hover:text-[#ccff00] text-black py-2 px-3 font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    DEFINIR RESULTADO
                                  </button>
                                )}

                              {match.status === "finished" && (
                                <button
                                  onClick={() => {
                                    setMatchToReset(match.id);
                                    setIsResetModalOpen(true);
                                  }}
                                  className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                                >
                                  <RotateCcw className="w-4 h-4" />
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
    </div>
  );
}

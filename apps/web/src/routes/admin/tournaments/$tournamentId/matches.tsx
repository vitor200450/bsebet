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
import { useState } from "react";
import {
  Calendar,
  Users,
  ArrowLeft,
  Plus,
  Clock,
  Pencil,
  Trash2,
  Zap,
  Radio,
  RotateCcw,
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

export const Route = createFileRoute(
  "/admin/tournaments/$tournamentId/matches",
)({
  component: TournamentMatchesPage,
  loader: async ({ params }) => {
    const tournamentId = Number(params.tournamentId);
    const [tournament, tournamentTeams, allTeams, matches, matchDays] =
      await Promise.all([
        getTournament({ data: tournamentId }),
        getTournamentTeams({ data: tournamentId }),
        getTeams(),
        getMatches({ data: { tournamentId } }),
        getMatchDays({ data: { tournamentId } }),
      ]);
    return { tournament, tournamentTeams, allTeams, matches, matchDays };
  },
});

function TournamentMatchesPage() {
  const { tournament, tournamentTeams, allTeams, matches, matchDays } =
    Route.useLoaderData();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "matches" | "teams" | "schedule" | "bracket" | "ordering"
  >("bracket");
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

  // Sequential Groups by date (Preserves displayOrder)
  const matchesBySequentialDate = matches.reduce(
    (
      acc: { date: string; items: typeof matches }[],
      match: (typeof matches)[0],
    ) => {
      const date = new Date(match.startTime).toLocaleDateString();
      const lastSegment = acc[acc.length - 1];

      if (lastSegment && lastSegment.date === date) {
        lastSegment.items.push(match);
      } else {
        acc.push({ date, items: [match] });
      }
      return acc;
    },
    [],
  );

  const stages = (tournament.stages as any[]) || [];

  // Filter matches within segments
  const filteredMatchSegments = matchesBySequentialDate
    .map((segment) => ({
      ...segment,
      items: segment.items.filter((match) => {
        const matchStage = stages.find((s) => s.id === match.label);
        if (
          selectedStageFilter !== "all" &&
          String(match.label) !== String(selectedStageFilter) &&
          matchStage?.id !== selectedStageFilter
        ) {
          return false;
        }
        return true;
      }),
    }))
    .filter((segment) => segment.items.length > 0);

  return (
    <div className="min-h-screen bg-[#e6e6e6] font-sans pb-20">
      {/* Header */}
      <div className="bg-white border-b-4 border-black px-8 py-6 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/tournaments"
              className="bg-black text-white p-2 hover:bg-[#ccff00] hover:text-black transition-colors"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            </Link>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-black">
                {tournament.name}
              </h1>
              <span className="text-xs font-bold uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Match Scheduler
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-6 py-2 font-black uppercase text-sm border-[3px] border-black transition-all flex items-center gap-2 text-black ${
                activeTab === "schedule"
                  ? "bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <Clock className="w-4 h-4" /> Schedule (Days)
            </button>
            <button
              onClick={() => setActiveTab("matches")}
              className={`px-6 py-2 font-black uppercase text-sm border-[3px] border-black transition-all flex items-center gap-2 text-black ${
                activeTab === "matches"
                  ? "bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <Calendar className="w-4 h-4" /> Matches
            </button>
            <button
              onClick={() => setActiveTab("bracket")}
              className={`px-6 py-2 font-black uppercase text-sm border-[3px] border-black transition-all flex items-center gap-2 text-black ${
                activeTab === "bracket"
                  ? "bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <Zap className="w-4 h-4" /> Bracket Builder
            </button>
            <button
              onClick={() => setActiveTab("ordering")}
              className={`px-6 py-2 font-black uppercase text-sm border-[3px] border-black transition-all flex items-center gap-2 text-black ${
                activeTab === "ordering"
                  ? "bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <RotateCcw className="w-4 h-4" /> Ordenação
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`px-6 py-2 font-black uppercase text-sm border-[3px] border-black transition-all flex items-center gap-2 text-black ${
                activeTab === "teams"
                  ? "bg-[#ccff00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <Users className="w-4 h-4" /> Teams
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto">
        {activeTab === "teams" && (
          <TournamentTeamsManager
            teams={tournamentTeams}
            allTeams={allTeams}
            onAddTeam={handleAddTeam}
            onRemoveTeam={handleRemoveTeam}
          />
        )}
        {activeTab === "schedule" && (
          <MatchDaysManager
            tournamentId={tournament.id}
            matchDays={(matchDays || []) as any[]}
          />
        )}
        {activeTab === "bracket" && (
          <div className="space-y-6">
            <div className="bg-white border-[4px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <h2 className="font-black text-black italic uppercase text-2xl">
                Visual Bracket Builder
              </h2>
              <p className="text-gray-500 text-sm font-bold">
                Crie e organize as partidas visualmente para ficarem idênticas à
                Liquipedia.
              </p>
            </div>
            <BracketEditor
              matches={matches as any}
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
              onGenerateFullBracket={async (roundIndex, side) => {
                try {
                  const { generateFullBracket } =
                    await import("@/server/matches");
                  await generateFullBracket({
                    data: {
                      tournamentId: tournament.id,
                      roundIndex,
                      bracketSide: side as any,
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
                filteredMatchSegments.map((segment, segmentIndex) => (
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
                                  {stages.find((s) => s.id === match.label)
                                    ?.name || match.label}
                                </span>
                                {match.name && (
                                  <span className="text-[10px] font-black uppercase text-black mt-1">
                                    {match.name}
                                  </span>
                                )}
                                {/* Betting Status Badge */}
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
                              {/* Team A */}
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

                              {/* Team B */}
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

                            {/* Live Control Button - Only show if match is scheduled/live and both teams are defined */}
                            {match.teamA &&
                              match.teamB &&
                              (match.status === "scheduled" ||
                                match.status === "live") && (
                                <Link
                                  to="/admin/live/$matchId"
                                  params={{ matchId: String(match.id) }}
                                  className="w-full bg-brawl-red hover:bg-[#d41d1d] text-white py-2 px-3 font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                                >
                                  <Radio className="w-4 h-4" />
                                  {match.status === "live"
                                    ? "AO VIVO"
                                    : "CONTROLAR AO VIVO"}
                                </Link>
                              )}

                            {/* Reset Button - Only show if match is finished */}
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
                ))
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
    </div>
  );
}

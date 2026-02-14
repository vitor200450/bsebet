import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, X, Check, AlertCircle } from "lucide-react";
import {
  CustomSelect,
  CustomDatePicker,
  CustomTimePicker,
} from "./CustomInputs";
import { toast } from "sonner";
import { createMatch, updateMatch } from "@/server/matches";
import clsx from "clsx";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Team {
  id: number;
  name: string;
}

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: number;
  stages: { id: string; name: string; type?: string }[];
  teams: Team[]; // Available teams in tournament
  matchDays: { id: number; label: string; date: string }[]; // Keep simple matchDays structure
  matches: any[]; // Matches for dependency selection
  matchToEdit?: any; // Optional match to edit
  onSuccess: () => void;
  groupsCount?: number;
  advancingPerGroup?: number;
}

export function MatchModal({
  isOpen,
  onClose,
  tournamentId,
  stages,
  teams,
  matchDays,
  matches,
  matchToEdit,
  onSuccess,
  groupsCount = 8,
  advancingPerGroup = 4,
}: MatchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const lastSavedData = useRef<string>("");

  // Helper to determine initial state from editing match
  const getInitialState = () => {
    if (!matchToEdit) {
      return {
        stageId: stages[0]?.id || "",
        label: "",
        date: "",
        time: "",
        name: "",

        teamAType: "team" as const,
        teamA: "",
        labelTeamA: "",
        teamAPreviousMatchId: null,
        teamAPreviousMatchResult: "winner" as const,
        teamAGroup: "A",
        teamAPlacement: "1",

        teamBType: "team" as const,
        teamB: "",
        labelTeamB: "",
        teamBPreviousMatchId: null,
        teamBPreviousMatchResult: "winner" as const,
        teamBGroup: "A",
        teamBPlacement: "1",

        matchDayId: null,
        isBettingEnabled: true,

        // Bracket Info
        roundIndex: 0,
        bracketSide: "upper" as const,
        displayOrder: 0,

        status: "scheduled" as "scheduled" | "live" | "finished",
        scoreA: 0,
        scoreB: 0,
        winnerId: null as number | null,
      };
    }

    const start = new Date(matchToEdit.startTime);
    return {
      stageId: matchToEdit.stageId || matchToEdit.label || stages[0]?.id || "",
      label: matchToEdit.label || "", // Keep label for reference
      date: start.toISOString().split("T")[0],
      time: start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      name: matchToEdit.name || "",

      // Team A
      teamAType: (matchToEdit.labelTeamA?.includes("Group")
        ? "group"
        : matchToEdit.teamAPreviousMatchId
          ? "match"
          : "team") as "team" | "match" | "group",
      teamA: matchToEdit.teamAId ? String(matchToEdit.teamAId) : "",
      labelTeamA: matchToEdit.labelTeamA || "",
      teamAPreviousMatchId: matchToEdit.teamAPreviousMatchId,
      teamAPreviousMatchResult: (matchToEdit.teamAPreviousMatchResult ||
        "winner") as "winner" | "loser",
      teamAGroup: matchToEdit.labelTeamA?.match(/Group ([A-Z])/)?.[1] || "A",
      teamAPlacement:
        matchToEdit.labelTeamA?.match(/(\d)(?:st|nd|rd|th)/)?.[1] || "1",

      // Team B
      teamBType: (matchToEdit.labelTeamB?.includes("Group")
        ? "group"
        : matchToEdit.teamBPreviousMatchId
          ? "match"
          : "team") as "team" | "match" | "group",
      teamB: matchToEdit.teamBId ? String(matchToEdit.teamBId) : "",
      labelTeamB: matchToEdit.labelTeamB || "",
      teamBPreviousMatchId: matchToEdit.teamBPreviousMatchId,
      teamBPreviousMatchResult: (matchToEdit.teamBPreviousMatchResult ||
        "winner") as "winner" | "loser",
      teamBGroup: matchToEdit.labelTeamB?.match(/Group ([A-Z])/)?.[1] || "A",
      teamBPlacement:
        matchToEdit.labelTeamB?.match(/(\d)(?:st|nd|rd|th)/)?.[1] || "1",

      matchDayId: matchToEdit.matchDayId,
      isBettingEnabled: matchToEdit.isBettingEnabled ?? true,

      // Bracket Info
      roundIndex: matchToEdit.roundIndex ?? 0,
      bracketSide: matchToEdit.bracketSide ?? "upper",
      displayOrder: matchToEdit.displayOrder ?? 0,

      status:
        (matchToEdit.status as "scheduled" | "live" | "finished") ||
        "scheduled",
      scoreA: matchToEdit.scoreA ?? 0,
      scoreB: matchToEdit.scoreB ?? 0,
      winnerId: matchToEdit.winnerId ?? null,
    };
  };

  const [formData, setFormData] = useState(getInitialState());

  // Important: Reset form when matchToEdit changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const initialState = getInitialState();
      setFormData(initialState);
      lastSavedData.current = JSON.stringify(initialState);
      isFirstRender.current = true;
      setSaveStatus("idle");
    }
  }, [matchToEdit, isOpen]);

  // Sync bracketSide with selected stage type
  useEffect(() => {
    const selectedStage = stages.find((s) => s.id === formData.stageId);
    if (selectedStage?.type === "Groups" && formData.bracketSide !== "groups") {
      setFormData((prev) => ({ ...prev, bracketSide: "groups" }));
    } else if (
      selectedStage?.type !== "Groups" &&
      formData.bracketSide === "groups"
    ) {
      // Fallback to upper for non-group stages if transitioning from groups
      setFormData((prev) => ({ ...prev, bracketSide: "upper" }));
    }
  }, [formData.stageId, stages]);

  // Auto-determine winner based on score and validate max score
  useEffect(() => {
    if (!matchToEdit) return;

    // Determine format from tournament or default to BO5
    const matchFormat = matchToEdit.tournament?.format?.toLowerCase() || "bo5";
    let bestOf = 5;
    if (matchFormat.includes("bo3")) bestOf = 3;
    else if (matchFormat.includes("bo5")) bestOf = 5;
    else if (matchFormat.includes("bo7")) bestOf = 7;

    const winsNeeded = Math.ceil(bestOf / 2);
    const { scoreA, scoreB } = formData;

    // Validate scores don't exceed max wins
    let updatedScoreA = scoreA;
    let updatedScoreB = scoreB;
    let needsUpdate = false;

    if (scoreA > winsNeeded) {
      updatedScoreA = winsNeeded;
      needsUpdate = true;
    }
    if (scoreB > winsNeeded) {
      updatedScoreB = winsNeeded;
      needsUpdate = true;
    }

    // Auto-determine winner based on higher score
    let autoWinnerId = formData.winnerId;

    if (updatedScoreA > updatedScoreB && updatedScoreA >= winsNeeded && matchToEdit.teamAId) {
      // Team A wins if they have more points and reached winning threshold
      autoWinnerId = matchToEdit.teamAId;
      needsUpdate = true;
    } else if (updatedScoreB > updatedScoreA && updatedScoreB >= winsNeeded && matchToEdit.teamBId) {
      // Team B wins if they have more points and reached winning threshold
      autoWinnerId = matchToEdit.teamBId;
      needsUpdate = true;
    } else if (updatedScoreA < winsNeeded && updatedScoreB < winsNeeded) {
      // Clear winner if neither team reached winning threshold
      if (formData.winnerId) {
        autoWinnerId = null;
        needsUpdate = true;
      }
    } else if (updatedScoreA === updatedScoreB && updatedScoreA < winsNeeded) {
      // Clear winner if scores are tied below winning threshold
      if (formData.winnerId) {
        autoWinnerId = null;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      setFormData((prev) => ({
        ...prev,
        scoreA: updatedScoreA,
        scoreB: updatedScoreB,
        winnerId: autoWinnerId,
      }));
    }
  }, [
    formData.scoreA,
    formData.scoreB,
    matchToEdit?.teamAId,
    matchToEdit?.teamBId,
    matchToEdit?.tournament?.format,
  ]);

  // Build payload helper
  const buildPayload = useCallback(() => {
    if (!formData.date || !formData.time) return null;

    const dateTime = new Date(`${formData.date}T${formData.time}:00`);

    const getSourceLabel = (
      type: "team" | "match" | "group",
      matchId: number | null,
      result: "winner" | "loser",
      group: string = "A",
      placement: string = "1",
    ) => {
      if (type === "team") return null;
      if (type === "group") {
        const ordinals: Record<string, string> = {
          "1": "1st",
          "2": "2nd",
          "3": "3rd",
          "4": "4th",
        };
        return `${ordinals[placement] || placement + "th"} Place Group ${group}`;
      }
      const sourceMatch = matches.find((m) => m.id === matchId);
      if (!sourceMatch) return "TBD";

      const prefix = result === "winner" ? "Winner" : "Loser";
      const matchIdentifier =
        sourceMatch.name ||
        (sourceMatch.teamA && sourceMatch.teamB
          ? `${sourceMatch.teamA.name} vs ${sourceMatch.teamB.name}`
          : sourceMatch.label || "Match");

      return `${prefix} of ${matchIdentifier}`;
    };

    return {
      tournamentId,
      startTime: dateTime.toISOString(),
      label: formData.label || null,
      stageId: formData.stageId || null,
      name: formData.name || null,
      teamAId:
        formData.teamAType === "team" && formData.teamA
          ? Number(formData.teamA)
          : formData.teamAType === "match" &&
              matchToEdit &&
              formData.teamAPreviousMatchId === matchToEdit.teamAPreviousMatchId
            ? matchToEdit.teamAId // Keep existing resolved team if dependency hasn't changed
            : null,
      labelTeamA:
        formData.teamAType === "match"
          ? // If editing and dependency hasn't changed, keep original label
            matchToEdit &&
            formData.teamAPreviousMatchId ===
              matchToEdit.teamAPreviousMatchId &&
            formData.teamAPreviousMatchResult ===
              matchToEdit.teamAPreviousMatchResult
            ? matchToEdit.labelTeamA // Preserve original label
            : getSourceLabel(
                "match",
                formData.teamAPreviousMatchId,
                formData.teamAPreviousMatchResult,
              )
          : formData.teamAType === "group"
            ? getSourceLabel(
                "group",
                null,
                "winner",
                formData.teamAGroup,
                formData.teamAPlacement,
              )
            : null,
      teamAPreviousMatchId:
        formData.teamAType === "match"
          ? formData.teamAPreviousMatchId
          : formData.teamAType === "group" && matchToEdit?.teamAPreviousMatchId
            ? matchToEdit.teamAPreviousMatchId // Preserve auto-progression for groups
            : null,
      teamAPreviousMatchResult:
        formData.teamAType === "match"
          ? formData.teamAPreviousMatchResult
          : formData.teamAType === "group" && matchToEdit?.teamAPreviousMatchResult
            ? matchToEdit.teamAPreviousMatchResult // Preserve auto-progression for groups
            : null,
      teamBId:
        formData.teamBType === "team" && formData.teamB
          ? Number(formData.teamB)
          : formData.teamBType === "match" &&
              matchToEdit &&
              formData.teamBPreviousMatchId === matchToEdit.teamBPreviousMatchId
            ? matchToEdit.teamBId // Keep existing resolved team if dependency hasn't changed
            : null,
      labelTeamB:
        formData.teamBType === "match"
          ? // If editing and dependency hasn't changed, keep original label
            matchToEdit &&
            formData.teamBPreviousMatchId ===
              matchToEdit.teamBPreviousMatchId &&
            formData.teamBPreviousMatchResult ===
              matchToEdit.teamBPreviousMatchResult
            ? matchToEdit.labelTeamB // Preserve original label
            : getSourceLabel(
                "match",
                formData.teamBPreviousMatchId,
                formData.teamBPreviousMatchResult,
              )
          : formData.teamBType === "group"
            ? getSourceLabel(
                "group",
                null,
                "winner",
                formData.teamBGroup,
                formData.teamBPlacement,
              )
            : null,
      teamBPreviousMatchId:
        formData.teamBType === "match"
          ? formData.teamBPreviousMatchId
          : formData.teamBType === "group" && matchToEdit?.teamBPreviousMatchId
            ? matchToEdit.teamBPreviousMatchId // Preserve auto-progression for groups
            : null,
      teamBPreviousMatchResult:
        formData.teamBType === "match"
          ? formData.teamBPreviousMatchResult
          : formData.teamBType === "group" && matchToEdit?.teamBPreviousMatchResult
            ? matchToEdit.teamBPreviousMatchResult // Preserve auto-progression for groups
            : null,
      matchDayId: formData.matchDayId || null,
      isBettingEnabled: formData.isBettingEnabled,
      roundIndex: Number(formData.roundIndex),
      bracketSide:
        stages.find((s) => s.id === formData.stageId)?.type === "Groups"
          ? "groups"
          : formData.bracketSide,
      displayOrder: Number(formData.displayOrder),
      status: formData.status,
      scoreA: Number(formData.scoreA),
      scoreB: Number(formData.scoreB),
      winnerId: formData.winnerId ? Number(formData.winnerId) : null,
    };
  }, [formData, matches, tournamentId, stages]);

  // Validation: Prevent saving "finished" status without a winner
  const canSaveAsFinished = formData.status === "finished" ? formData.winnerId !== null : true;

  // Auto-save effect (only for editing mode)
  useEffect(() => {
    if (!matchToEdit || !isOpen) return;

    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Check if data actually changed
    const currentData = JSON.stringify(formData);
    if (currentData === lastSavedData.current) return;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setSaveStatus("saving");

    // Debounce save
    debounceRef.current = setTimeout(async () => {
      // Prevent auto-saving finished status without a winner
      if (formData.status === "finished" && !formData.winnerId) {
        setSaveStatus("error");
        toast.error("Cannot finish match without a winner!");
        return;
      }

      const payload = buildPayload();
      if (!payload) {
        setSaveStatus("idle");
        return;
      }

      try {
        await updateMatch({
          data: {
            matchId: matchToEdit.id,
            ...payload,
          },
        });
        lastSavedData.current = currentData;
        setSaveStatus("saved");
        onSuccess();

        // Reset to idle after 2s
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus("error");
      }
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [formData, matchToEdit, isOpen, buildPayload, onSuccess]);

  const handleSave = async () => {
    if (!matchToEdit) return;

    // Prevent saving finished status without a winner
    if (formData.status === "finished" && !formData.winnerId) {
      toast.error("Cannot finish match without a winner!");
      setSaveStatus("error");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const currentData = JSON.stringify(formData);
    if (currentData !== lastSavedData.current) {
      setIsSubmitting(true);
      setSaveStatus("saving");
      try {
        const payload = buildPayload();
        if (payload) {
          await updateMatch({
            data: {
              matchId: matchToEdit.id,
              ...payload,
            },
          });
          lastSavedData.current = currentData;
          setSaveStatus("saved");
          onSuccess();
        }
      } catch (error) {
        console.error("Save failed:", error);
        setSaveStatus("error");
        toast.error("Failed to save changes");
        setIsSubmitting(false);
        throw error;
      }
    }
    setIsSubmitting(false);
  };

  const handleClose = async () => {
    if (matchToEdit) {
      try {
        await handleSave();
      } catch (e) {
        // Errors already toasted in handleSave
      }
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For editing, ensure we save if there are pending changes
    if (matchToEdit) {
      await handleClose();
      return;
    }

    // For creating new match
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (!payload) {
        toast.error("Please select both date and time");
        setIsSubmitting(false);
        return;
      }

      await createMatch({ data: payload });
      toast.success("Match created successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create match.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_#000] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
        <div className="bg-[#ccff00] p-3 flex justify-between items-center border-b-[4px] border-black sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-black font-black italic uppercase text-lg">
              {matchToEdit ? "Edit Match" : "Create Match"}
            </h2>
            {/* Auto-save status indicator */}
            {matchToEdit && (
              <div className="flex items-center gap-1.5">
                {saveStatus === "saving" && (
                  <div className="flex items-center gap-1 text-black/60 text-xs font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {saveStatus === "saved" && (
                  <div className="flex items-center gap-1 text-green-700 text-xs font-bold">
                    <Check className="w-3 h-3" />
                    <span>Saved</span>
                  </div>
                )}
                {saveStatus === "error" && (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
                    <AlertCircle className="w-3 h-3" />
                    <span>Error</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting || saveStatus === "saving"}
            className="bg-black hover:bg-[#ff2e2e] text-white p-1 transition-colors disabled:opacity-50"
          >
            {isSubmitting || saveStatus === "saving" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" strokeWidth={3} />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 pb-10">
          {/* 1. RESULTS & SCORES - MOVED TO TOP FOR VISIBILITY */}
          {matchToEdit && (
            <div className="p-5 bg-[#ccff00]/5 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase text-sm flex items-center gap-2 text-black italic">
                  <span className="w-2.5 h-2.5 bg-black rounded-full animate-pulse" />{" "}
                  Result & Scores
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-black">
                    Status:
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const status = e.target.value as
                        | "scheduled"
                        | "live"
                        | "finished";
                      setFormData({
                        ...formData,
                        status,
                        isBettingEnabled:
                          status === "live" || status === "finished"
                            ? false
                            : formData.isBettingEnabled,
                      });
                    }}
                    className="bg-black text-[#ccff00] text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black focus:outline-none"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="live">LIVE</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Score A */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-brawl-blue rounded-full border border-black shadow-[1px_1px_0px_0px_#000]" />
                    <label className="text-[10px] font-black uppercase text-black">
                      {matchToEdit?.teamA?.name || "Team A"}
                    </label>
                    {formData.winnerId === matchToEdit?.teamAId && (
                      <span className="text-[9px] font-black uppercase text-green-600 ml-auto">
                        ✓ WINNER
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.scoreA}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scoreA: Number(e.target.value),
                      })
                    }
                    className="w-full border-[3px] border-black p-3 text-3xl font-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#ccff00] tabular-nums shadow-[2px_2px_0px_0px_#000]"
                  />
                  {matchToEdit?.tournament?.format && (
                    <p className="text-[9px] font-bold text-gray-500 uppercase">
                      Max:{" "}
                      {Math.ceil(
                        (matchToEdit.tournament.format
                          .toLowerCase()
                          .includes("bo3")
                          ? 3
                          : matchToEdit.tournament.format
                                .toLowerCase()
                                .includes("bo7")
                            ? 7
                            : 5) / 2,
                      )}{" "}
                      wins
                    </p>
                  )}
                </div>

                {/* Score B */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 bg-brawl-red rounded-full border border-black shadow-[1px_1px_0px_0px_#000]" />
                    <label className="text-[10px] font-black uppercase text-black">
                      {matchToEdit?.teamB?.name || "Team B"}
                    </label>
                    {formData.winnerId === matchToEdit?.teamBId && (
                      <span className="text-[9px] font-black uppercase text-green-600 ml-auto">
                        ✓ WINNER
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.scoreB}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scoreB: Number(e.target.value),
                      })
                    }
                    className="w-full border-[3px] border-black p-3 text-3xl font-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#ccff00] tabular-nums shadow-[2px_2px_0px_0px_#000]"
                  />
                  {matchToEdit?.tournament?.format && (
                    <p className="text-[9px] font-bold text-gray-500 uppercase">
                      Max:{" "}
                      {Math.ceil(
                        (matchToEdit.tournament.format
                          .toLowerCase()
                          .includes("bo3")
                          ? 3
                          : matchToEdit.tournament.format
                                .toLowerCase()
                                .includes("bo7")
                            ? 7
                            : 5) / 2,
                      )}{" "}
                      wins
                    </p>
                  )}
                </div>
              </div>

              {formData.status === "finished" && (
                <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black uppercase ml-1 mb-2 text-black italic">
                    Winner (Auto-detected from score)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          winnerId: matchToEdit?.teamAId || null,
                        })
                      }
                      className={clsx(
                        "py-3 border-[3px] border-black font-black uppercase text-xs transition-all flex items-center justify-center gap-2",
                        formData.winnerId === matchToEdit?.teamAId
                          ? "bg-brawl-blue text-white shadow-[4px_4px_0px_0px_#000] -translate-y-1"
                          : "bg-white text-black hover:bg-gray-50",
                      )}
                    >
                      {formData.winnerId === matchToEdit?.teamAId && (
                        <Check className="w-4 h-4" />
                      )}
                      {matchToEdit?.teamA?.name || "Team A"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          winnerId: matchToEdit?.teamBId || null,
                        })
                      }
                      className={clsx(
                        "py-3 border-[3px] border-black font-black uppercase text-xs transition-all flex items-center justify-center gap-2",
                        formData.winnerId === matchToEdit?.teamBId
                          ? "bg-brawl-red text-white shadow-[4px_4px_0px_0px_#000] -translate-y-1"
                          : "bg-white text-black hover:bg-gray-50",
                      )}
                    >
                      {formData.winnerId === matchToEdit?.teamBId && (
                        <Check className="w-4 h-4" />
                      )}
                      {matchToEdit?.teamB?.name || "Team B"}
                    </button>
                  </div>
                  {!formData.winnerId ? (
                    <div className="bg-red-500/10 border-[3px] border-red-500 p-3 mt-3 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-[10px] font-black text-red-600 uppercase flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ERROR: Cannot finish match without a winner!
                      </p>
                      <p className="text-[9px] text-red-600 mt-1">
                        Please select a winner above or ensure one team has enough wins.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[9px] font-bold text-red-500 uppercase mt-3 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Warning: Finalizing will settle user points immediately.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="h-[2px] bg-black/10 w-full" />
          {/* Bracket Configuration (Added) - Only for Non-Group Matches */}
          {formData.bracketSide !== "groups" && (
            <div className="p-4 bg-gray-100 border-2 border-black space-y-3">
              <h3 className="font-bold uppercase text-xs flex items-center gap-2 text-black">
                <span className="w-2 h-2 bg-black rounded-full" /> Bracket
                Placement
              </h3>
              <div
                className={clsx(
                  "grid gap-3",
                  stages.find((s) => s.id === formData.stageId)?.type ===
                    "Double Elimination"
                    ? "grid-cols-3"
                    : "grid-cols-2",
                )}
              >
                {stages.find((s) => s.id === formData.stageId)?.type ===
                  "Double Elimination" && (
                  <CustomSelect
                    label="Side"
                    value={formData.bracketSide}
                    onChange={(val) =>
                      setFormData({ ...formData, bracketSide: val })
                    }
                    options={[
                      { value: "upper", label: "Upper Bracket" },
                      { value: "lower", label: "Lower Bracket" },
                      { value: "grand_final", label: "Grand Final" },
                    ]}
                  />
                )}
                <div>
                  <label className="block text-xs font-black uppercase ml-1 mb-1 text-black">
                    Round # (Column)
                  </label>
                  <input
                    type="number"
                    value={formData.roundIndex}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roundIndex: Number(e.target.value),
                      })
                    }
                    className="w-full border-[3px] border-black p-2 text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                  />
                  <p className="text-[9px] font-bold text-gray-500 mt-1 leading-tight">
                    0=Start, 1=Semis, 2=Final
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase ml-1 mb-1 text-black">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayOrder: Number(e.target.value),
                      })
                    }
                    className="w-full border-[3px] border-black p-2 text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                  />
                  <p className="text-[9px] font-bold text-gray-500 mt-1 leading-tight">
                    Vertical Pos. (1=Top)
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {/* Stage Selection */}
            <CustomSelect
              label="Stage"
              value={formData.stageId}
              onChange={(val) =>
                setFormData({ ...formData, stageId: val, label: val })
              }
              options={stages.map((s) => ({ value: s.id, label: s.name }))}
            />

            {/* Match Day Selection - Optional but recommended */}
            <CustomSelect
              label="Match Day (Optional)"
              value={formData.matchDayId ? String(formData.matchDayId) : ""}
              onChange={(val) => {
                const dayId = Number(val);
                const day = matchDays.find((d) => d.id === dayId);
                let dateStr = "";
                if (day) {
                  dateStr = new Date(day.date).toISOString();
                }
                setFormData({
                  ...formData,
                  matchDayId: val ? dayId : null,
                  date: day ? dateStr.split("T")[0] : formData.date,
                });
              }}
              options={[
                { value: "", label: "Select a Day..." },
                ...matchDays.map((day) => ({
                  value: String(day.id),
                  label: `${day.label} (${new Date(day.date).toLocaleDateString(
                    [],
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase ml-1 mb-1 text-black">
              Match Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Opening Match"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border-[3px] border-black p-2 text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 border-2 border-black">
            <div className="flex flex-col">
              <label className="text-xs font-black uppercase text-black">
                Enable Betting
              </label>
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                Show this match in the public betting carousel
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  isBettingEnabled: !formData.isBettingEnabled,
                })
              }
              className={clsx(
                "w-12 h-6 border-2 border-black relative transition-colors duration-200",
                formData.isBettingEnabled ? "bg-[#ccff00]" : "bg-gray-300",
              )}
            >
              <div
                className={clsx(
                  "absolute top-0.5 w-4 h-4 bg-black transition-all duration-200",
                  formData.isBettingEnabled ? "left-[24px]" : "left-0.5",
                )}
              />
            </button>
          </div>

          {/* Date Time */}
          <div className="grid grid-cols-2 gap-4">
            <CustomDatePicker
              label="Date"
              value={formData.date}
              onChange={(val) => setFormData({ ...formData, date: val })}
            />
            <CustomTimePicker
              label="Time"
              value={formData.time}
              onChange={(val) => setFormData({ ...formData, time: val })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Team A */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase ml-1 text-black">
                Team A Source
              </label>
              <div className="flex gap-2 mb-2">
                {(["team", "match", "group"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, teamAType: type })
                    }
                    className={`flex-1 text-[10px] font-bold uppercase py-1 border-2 border-black ${
                      formData.teamAType === type
                        ? "bg-black text-white"
                        : "bg-white text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {formData.teamAType === "team" && (
                <CustomSelect
                  label=""
                  value={formData.teamA}
                  onChange={(val) => setFormData({ ...formData, teamA: val })}
                  options={teams.map((t) => ({
                    value: String(t.id),
                    label: t.name,
                  }))}
                />
              )}

              {formData.teamAType === "match" && (
                <div className="space-y-2">
                  <CustomSelect
                    label="Source Match"
                    value={
                      formData.teamAPreviousMatchId
                        ? String(formData.teamAPreviousMatchId)
                        : ""
                    }
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        teamAPreviousMatchId: val ? Number(val) : null,
                      })
                    }
                    options={matches.map((m) => ({
                      value: String(m.id),
                      label: `${m.name || m.label || "Match"} - ${
                        m.teamA?.name || m.labelTeamA
                      } vs ${m.teamB?.name || m.labelTeamB}`,
                    }))}
                  />
                  <div className="flex bg-gray-100 p-1 border-2 border-black">
                    {(["winner", "loser"] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            teamAPreviousMatchResult: res,
                          })
                        }
                        className={`flex-1 text-xs font-bold uppercase py-1 ${
                          formData.teamAPreviousMatchResult === res
                            ? res === "winner"
                              ? "bg-[#ccff00] text-black border-2 border-black"
                              : "bg-[#ff2e2e] text-white border-2 border-black"
                            : "text-gray-400"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.teamAType === "group" && (
                <div className="grid grid-cols-2 gap-2">
                  <CustomSelect
                    label="Group"
                    value={formData.teamAGroup}
                    onChange={(val) =>
                      setFormData({ ...formData, teamAGroup: val })
                    }
                    options={Array.from({ length: groupsCount }, (_, i) =>
                      String.fromCharCode(65 + i),
                    ).map((g) => ({
                      value: g,
                      label: `Group ${g}`,
                    }))}
                  />
                  <CustomSelect
                    label="Placement"
                    value={formData.teamAPlacement}
                    onChange={(val) =>
                      setFormData({ ...formData, teamAPlacement: val })
                    }
                    options={Array.from(
                      { length: advancingPerGroup },
                      (_, i) => ({
                        value: String(i + 1),
                        label: `${
                          [
                            "1st",
                            "2nd",
                            "3rd",
                            "4th",
                            "5th",
                            "6th",
                            "7th",
                            "8th",
                          ][i] || i + 1 + "th"
                        } Place`,
                      }),
                    )}
                  />
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase ml-1 text-black">
                Team B Source
              </label>
              <div className="flex gap-2 mb-2">
                {(["team", "match", "group"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, teamBType: type })
                    }
                    className={`flex-1 text-[10px] font-bold uppercase py-1 border-2 border-black ${
                      formData.teamBType === type
                        ? "bg-black text-white"
                        : "bg-white text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {formData.teamBType === "team" && (
                <CustomSelect
                  label=""
                  value={formData.teamB}
                  onChange={(val) => setFormData({ ...formData, teamB: val })}
                  options={teams.map((t) => ({
                    value: String(t.id),
                    label: t.name,
                  }))}
                />
              )}

              {formData.teamBType === "match" && (
                <div className="space-y-2">
                  <CustomSelect
                    label="Source Match"
                    value={
                      formData.teamBPreviousMatchId
                        ? String(formData.teamBPreviousMatchId)
                        : ""
                    }
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        teamBPreviousMatchId: val ? Number(val) : null,
                      })
                    }
                    options={matches.map((m) => ({
                      value: String(m.id),
                      label: `${m.name || m.label || "Match"} - ${
                        m.teamA?.name || m.labelTeamA
                      } vs ${m.teamB?.name || m.labelTeamB}`,
                    }))}
                  />
                  <div className="flex bg-gray-100 p-1 border-2 border-black">
                    {(["winner", "loser"] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            teamBPreviousMatchResult: res,
                          })
                        }
                        className={`flex-1 text-xs font-bold uppercase py-1 ${
                          formData.teamBPreviousMatchResult === res
                            ? res === "winner"
                              ? "bg-[#ccff00] text-black border-2 border-black"
                              : "bg-[#ff2e2e] text-white border-2 border-black"
                            : "text-gray-400"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.teamBType === "group" && (
                <div className="grid grid-cols-2 gap-2">
                  <CustomSelect
                    label="Group"
                    value={formData.teamBGroup}
                    onChange={(val) =>
                      setFormData({ ...formData, teamBGroup: val })
                    }
                    options={Array.from({ length: groupsCount }, (_, i) =>
                      String.fromCharCode(65 + i),
                    ).map((g) => ({
                      value: g,
                      label: `Group ${g}`,
                    }))}
                  />
                  <CustomSelect
                    label="Placement"
                    value={formData.teamBPlacement}
                    onChange={(val) =>
                      setFormData({ ...formData, teamBPlacement: val })
                    }
                    options={Array.from(
                      { length: advancingPerGroup },
                      (_, i) => ({
                        value: String(i + 1),
                        label: `${
                          [
                            "1st",
                            "2nd",
                            "3rd",
                            "4th",
                            "5th",
                            "6th",
                            "7th",
                            "8th",
                          ][i] || i + 1 + "th"
                        } Place`,
                      }),
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || saveStatus === "saving"}
            className={clsx(
              "w-full py-3 font-black italic uppercase border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 mt-4",
              matchToEdit
                ? "bg-white hover:bg-gray-100 text-black"
                : "bg-black hover:bg-[#ccff00] hover:text-black text-white",
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : matchToEdit ? (
              <>
                <Check className="w-5 h-5" />
                Done
              </>
            ) : (
              "Create Match"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

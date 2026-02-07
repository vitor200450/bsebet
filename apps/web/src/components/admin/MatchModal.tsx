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
  stages: { id: string; name: string }[];
  teams: Team[]; // Available teams in tournament
  matchDays: { id: number; label: string; date: string }[]; // Keep simple matchDays structure
  matches: any[]; // Matches for dependency selection
  matchToEdit?: any; // Optional match to edit
  onSuccess: () => void;
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
        label: stages[0]?.id || "",
        date: "",
        time: "",
        name: "",

        teamAType: "team" as const,
        teamA: "",
        labelTeamA: "",
        teamAPreviousMatchId: null,
        teamAPreviousMatchResult: "winner" as const,

        teamBType: "team" as const,
        teamB: "",
        labelTeamB: "",
        teamBPreviousMatchId: null,
        teamBPreviousMatchResult: "winner" as const,

        matchDayId: null,
        isBettingEnabled: true,
      };
    }

    const start = new Date(matchToEdit.startTime);
    return {
      label: matchToEdit.label || stages[0]?.id || "",
      date: start.toISOString().split("T")[0],
      time: start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      name: matchToEdit.name || "",

      // Team A
      teamAType: (matchToEdit.teamAPreviousMatchId ? "match" : "team") as
        | "team"
        | "match",
      teamA: matchToEdit.teamAId ? String(matchToEdit.teamAId) : "",
      labelTeamA: matchToEdit.labelTeamA || "",
      teamAPreviousMatchId: matchToEdit.teamAPreviousMatchId,
      teamAPreviousMatchResult: (matchToEdit.teamAPreviousMatchResult ||
        "winner") as "winner" | "loser",

      // Team B
      teamBType: (matchToEdit.teamBPreviousMatchId ? "match" : "team") as
        | "team"
        | "match",
      teamB: matchToEdit.teamBId ? String(matchToEdit.teamBId) : "",
      labelTeamB: matchToEdit.labelTeamB || "",
      teamBPreviousMatchId: matchToEdit.teamBPreviousMatchId,
      teamBPreviousMatchResult: (matchToEdit.teamBPreviousMatchResult ||
        "winner") as "winner" | "loser",

      matchDayId: matchToEdit.matchDayId,
      isBettingEnabled: matchToEdit.isBettingEnabled ?? true,

      // Bracket Info
      roundIndex: matchToEdit.roundIndex ?? 0,
      bracketSide: matchToEdit.bracketSide ?? "upper",
      displayOrder: matchToEdit.displayOrder ?? 0,
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

  // Build payload helper
  const buildPayload = useCallback(() => {
    if (!formData.date || !formData.time) return null;

    const dateTime = new Date(`${formData.date}T${formData.time}:00`);

    const getSourceLabel = (
      type: "team" | "match",
      matchId: number | null,
      result: "winner" | "loser",
    ) => {
      if (type === "team") return null;
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
          ? getSourceLabel(
              "match",
              formData.teamAPreviousMatchId,
              formData.teamAPreviousMatchResult,
            )
          : null,
      teamAPreviousMatchId:
        formData.teamAType === "match" ? formData.teamAPreviousMatchId : null,
      teamAPreviousMatchResult:
        formData.teamAType === "match"
          ? formData.teamAPreviousMatchResult
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
          ? getSourceLabel(
              "match",
              formData.teamBPreviousMatchId,
              formData.teamBPreviousMatchResult,
            )
          : null,
      teamBPreviousMatchId:
        formData.teamBType === "match" ? formData.teamBPreviousMatchId : null,
      teamBPreviousMatchResult:
        formData.teamBType === "match"
          ? formData.teamBPreviousMatchResult
          : null,
      matchDayId: formData.matchDayId || null,
      isBettingEnabled: formData.isBettingEnabled,
      roundIndex: Number(formData.roundIndex),
      bracketSide: formData.bracketSide,
      displayOrder: Number(formData.displayOrder),
    };
  }, [formData, matches, tournamentId]);

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
      const payload = buildPayload();
      if (!payload) {
        setSaveStatus("idle");
        return;
      }

      try {
        await updateMatch({
          data: {
            id: matchToEdit.id,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For editing, auto-save handles it
    if (matchToEdit) {
      onClose();
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
            onClick={onClose}
            className="bg-black hover:bg-[#ff2e2e] text-white p-1 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 pb-10">
          {/* Bracket Configuration (Added) */}
          <div className="p-4 bg-gray-100 border-2 border-black space-y-3">
            <h3 className="font-bold uppercase text-xs flex items-center gap-2 text-black">
              <span className="w-2 h-2 bg-black rounded-full" /> Bracket
              Placement
            </h3>
            <div className="grid grid-cols-3 gap-3">
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
          <div className="grid grid-cols-2 gap-4">
            {/* Stage Selection */}
            <CustomSelect
              label="Stage"
              value={formData.label}
              onChange={(val) => setFormData({ ...formData, label: val })}
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
                {(["team", "match"] as const).map((type) => (
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
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase ml-1 text-black">
                Team B Source
              </label>
              <div className="flex gap-2 mb-2">
                {(["team", "match"] as const).map((type) => (
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

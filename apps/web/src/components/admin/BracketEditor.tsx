import { useMemo } from "react";
import { Plus, Zap } from "lucide-react";
import { clsx } from "clsx";
import type { Match } from "../bracket/types";
import { GSLGroupView } from "../bracket/GSLGroupView";
import { StandardGroupView } from "../bracket/StandardGroupView";

const MATCH_HEIGHT = 125;

// Abbreviate long team labels for bracket display
function abbreviateLabel(label: string | null | undefined): string {
  if (!label) return "TBD";

  // Light abbreviations - keep it readable
  const abbreviations: Record<string, string> = {
    Bracket: "",
    Upper: "UB",
    Lower: "LB",
  };

  let result = label;
  for (const [full, abbr] of Object.entries(abbreviations)) {
    result = result.replace(new RegExp(full, "gi"), abbr);
  }

  // Clean up extra spaces
  result = result.replace(/\s+/g, " ").trim();

  // If still too long (>20 chars), truncate
  if (result.length > 20) {
    result = result.slice(0, 18) + "…";
  }

  return result;
}

interface BracketEditorProps {
  matches: Match[];
  onEditMatch?: (match: Match) => void;
  onUpdateMatch?: (
    matchId: number,
    data: { roundIndex: number; bracketSide: string },
  ) => void;
  onCreateMatch: (data: {
    roundIndex: number;
    bracketSide: string;
    label: string;
  }) => void;
  onGenerateNextRound?: (roundIndex: number, side: string) => void;
  onGenerateFullBracket?: (roundIndex: number, side: string) => void;
  stageType?: string;
}

export function BracketEditor({
  matches,
  onEditMatch,
  onCreateMatch,
  onGenerateFullBracket,
  stageType = "Double Elimination",
}: BracketEditorProps) {
  // Group matches by Side > Round
  const { upper, lower, final, bracketType } = useMemo(() => {
    const upp: Record<number, Match[]> = {};
    const low: Record<number, Match[]> = {};
    const fin: Match[] = [];

    matches.forEach((m) => {
      // Use the explicit DB fields if available, otherwise fallback (or ignore)
      const side = (m as any).bracketSide || "upper";
      const round = (m as any).roundIndex ?? 0;

      if (side === "grand_final") {
        fin.push(m);
      } else if (side === "lower") {
        if (!low[round]) low[round] = [];
        low[round].push(m);
      } else if (side === "groups") {
        // Do nothing, handled separately in the Groups column
      } else {
        if (!upp[round]) upp[round] = [];
        upp[round].push(m);
      }
    });

    // Sort matches in each round by displayOrder
    const sortMatches = (a: Match, b: Match) => {
      const orderA = (a as any).displayOrder ?? 999;
      const orderB = (b as any).displayOrder ?? 999;
      return orderA - orderB || a.id - b.id;
    };

    Object.values(upp).forEach((roundMatches) =>
      roundMatches.sort(sortMatches),
    );
    Object.values(low).forEach((roundMatches) =>
      roundMatches.sort(sortMatches),
    );
    fin.sort(sortMatches);

    return {
      upper: upp,
      lower: low,
      final: fin,
      bracketType: matches.some((m) => m.bracketSide === "groups")
        ? "groups"
        : "elimination",
    };
  }, [matches]);

  const getRoundTitle = (side: "upper" | "lower", idx: number): string => {
    const isDouble = stageType === "Double Elimination";

    if (side === "upper") {
      if (!isDouble) {
        return (
          ["Quarter-Finals", "Semi-Finals", "Final"][idx] || `Round ${idx + 1}`
        );
      }
      return (
        ["Quarter-Finals", "Semi-Finals", "UB Final"][idx] || `UB R${idx + 1}`
      );
    }
    return ["LB R1", "LB R2", "LB Semi", "LB Final"][idx] || `LB R${idx + 1}`;
  };

  // Extract round indices
  const upperRounds = Object.keys(upper)
    .map(Number)
    .sort((a, b) => a - b);
  const lowerRounds = Object.keys(lower)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto overflow-y-visible min-h-[600px]">
      {/* GLOBAL ACTIONS BAR */}
      <div className="flex justify-between items-center mb-8 bg-white/50 p-4 border-2 border-dashed border-black/10 rounded-lg">
        <div className="flex flex-col">
          <h2 className="font-black italic uppercase text-3xl text-black">
            Bracket Editor
          </h2>
          <p className="text-[10px] font-bold uppercase text-black/40">
            Tournament Structure Management
          </p>
        </div>

        <div className="flex gap-4 items-center">
          {onGenerateFullBracket && (
            <button
              onClick={() => onGenerateFullBracket(0, "upper")}
              className="px-6 py-2 border-4 border-black bg-[#ccff00] flex items-center gap-2 hover:bg-black hover:text-[#ccff00] transition-colors relative shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none font-black uppercase italic text-sm text-black group"
            >
              <Zap className="w-5 h-5 group-hover:animate-pulse" />
              {bracketType === "groups"
                ? "Generate Group Matches"
                : "Generate Entire Bracket"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-16 min-w-max px-4 items-center">
        {/* GROUPS COLUMN */}
        {bracketType === "groups" && (
          <div className="w-full flex flex-col gap-12">
            {Object.entries(
              matches.reduce(
                (acc, m) => {
                  // Group by Label (e.g. "Group A")
                  const groupName = m.label || "Unknown Group";
                  if (!acc[groupName]) acc[groupName] = [];
                  acc[groupName].push(m);
                  return acc;
                },
                {} as Record<string, Match[]>,
              ),
            )
              .sort(([groupNameA], [groupNameB]) =>
                groupNameA.localeCompare(groupNameB),
              )
              .map(([groupName, groupMatches]) => {
                // DETECT FORMAT: GSL vs Round Robin
                const isGSL =
                  groupMatches.length === 5 &&
                  groupMatches.some((m) => m.name?.includes("Opening"));

                if (isGSL) {
                  return (
                    <GSLGroupView
                      key={groupName}
                      groupName={groupName}
                      matches={groupMatches}
                      predictions={{}}
                      onUpdatePrediction={() => {}}
                      renderMatchCard={(m) => (
                        <EditorMatchCard
                          match={m}
                          onClick={() => onEditMatch?.(m)}
                        />
                      )}
                    />
                  );
                }

                return (
                  <StandardGroupView
                    key={groupName}
                    groupName={groupName}
                    matches={groupMatches}
                    predictions={{}}
                    onUpdatePrediction={() => {}}
                    renderMatchCard={(m) => (
                      <EditorMatchCard
                        match={m}
                        onClick={() => onEditMatch?.(m)}
                      />
                    )}
                  />
                );
              })}
          </div>
        )}

        {/* LEFT COLUMN (UPPER + LOWER) */}
        {(Object.keys(upper).length > 0 ||
          Object.keys(lower).length > 0 ||
          final.length > 0) && (
          <div className="flex flex-col gap-12">
            {/* UPPER BRACKET + GRAND FINAL */}
            <div className="flex flex-col gap-4">
              {stageType === "Double Elimination" && (
                <div className="relative h-8 mb-4">
                  <div className="text-xs font-black uppercase italic tracking-widest text-white bg-black px-4 py-1.5 transform -skew-x-12 border-2 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] absolute top-0 left-0 z-10">
                    UPPER BRACKET
                  </div>
                </div>
              )}
              <div className="flex gap-6 items-stretch text-black">
                {upperRounds.map((roundIdx) => (
                  <div
                    key={`upper-${roundIdx}`}
                    className="flex flex-col gap-2"
                  >
                    <div className="text-center text-[9px] font-bold uppercase text-gray-500 tracking-wider h-4">
                      {getRoundTitle("upper", roundIdx)}
                    </div>
                    <div className="flex flex-col gap-4 justify-around h-full">
                      {/* Render matches for this round */}
                      {(upper[roundIdx] || []).map((match) => (
                        <div key={match.id} className="w-64">
                          <EditorMatchCard
                            match={match}
                            onClick={() => onEditMatch?.(match)}
                          />
                        </div>
                      ))}
                      {/* Add Match Button if empty (optional, keeping minimal as per request) */}
                      {(upper[roundIdx] || []).length === 0 && (
                        <div className="w-64">
                          <AddMatchButton
                            onClick={() =>
                              onCreateMatch({
                                roundIndex: roundIdx,
                                bracketSide: "upper",
                                label: "New Match",
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* GRAND FINAL Appended */}
                {(stageType === "Double Elimination" || final.length > 0) && (
                  <div className="flex flex-col gap-2">
                    <div className="text-center text-[9px] font-bold uppercase text-gray-500 tracking-wider h-4">
                      GRAND FINAL
                    </div>
                    <div className="flex flex-col gap-4 justify-around h-full">
                      {(final || []).map((match) => (
                        <div key={match.id} className="w-64">
                          <EditorMatchCard
                            match={match}
                            onClick={() => onEditMatch?.(match)}
                          />
                        </div>
                      ))}
                      {final.length === 0 && (
                        <div className="w-64">
                          <AddMatchButton
                            onClick={() =>
                              onCreateMatch({
                                roundIndex: 0,
                                bracketSide: "grand_final",
                                label: "Grand Final",
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* LOWER BRACKET */}
            {lowerRounds.length > 0 && (
              <div className="pt-8 border-t-[3px] border-dashed border-black/10 relative">
                <div className="absolute top-0 left-0 -translate-y-1/2 bg-paper pr-4">
                  <div className="text-xs font-black uppercase italic tracking-widest text-white bg-black px-4 py-1.5 transform -skew-x-12 border-2 border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]">
                    LOWER BRACKET
                  </div>
                </div>
                <div className="flex gap-6 items-stretch">
                  {lowerRounds.map((roundIdx) => (
                    <div
                      key={`lower-${roundIdx}`}
                      className="flex flex-col gap-2"
                    >
                      <div className="text-center text-[9px] font-bold uppercase text-gray-500 tracking-wider">
                        {getRoundTitle("lower", roundIdx)}
                      </div>
                      <div className="flex flex-col gap-4 justify-around h-full">
                        {(lower[roundIdx] || []).map((match) => (
                          <div key={match.id} className="w-64">
                            <EditorMatchCard
                              match={match}
                              onClick={() => onEditMatch?.(match)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddMatchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-10 border-2 border-dashed border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all group rounded bg-gray-50/10"
    >
      <div className="flex items-center gap-2 text-black/20 group-hover:text-black font-bold uppercase text-[9px]">
        <Plus className="w-3 h-3" /> Add Match
      </div>
    </button>
  );
}

function EditorMatchCard({
  match,
  onClick,
}: {
  match: Match;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ minHeight: MATCH_HEIGHT }}
      className={clsx(
        "w-full bg-white border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-1.5 relative group hover:-translate-y-0.5 transition-transform cursor-pointer flex flex-col pt-1.5",
      )}
    >
      {/* Status Badges */}
      {match.status === "live" && (
        <div className="absolute -top-2 -right-1 bg-red-500 text-white text-[7px] font-black uppercase px-1.5 py-0.5 border-2 border-black z-20 animate-pulse shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          LIVE
        </div>
      )}
      {match.status === "finished" && (
        <div className="absolute -top-2 -right-1 bg-black text-white text-[7px] font-black uppercase px-1.5 py-0.5 border-2 border-black z-20 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          FINAL
        </div>
      )}

      {/* HEADER - Strict top-alignment for baseline consistency */}
      <div className="border-b-2 border-black min-h-7 mb-1 flex-shrink-0 relative box-border bg-gray-50/50 -mx-1.5 -mt-1.5 px-1.5 pr-10 flex flex-col justify-center py-0.5 gap-0.5">
        <div className="flex items-center justify-between w-full">
          <div className="flex-grow pr-1 min-w-0">
            <span className="text-[10px] font-black uppercase text-black leading-tight line-clamp-2 text-left block antialiased italic">
              {match.name || match.label}
            </span>
          </div>
          <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 font-bold">
            #{match.displayOrder ?? "-"}
          </span>
        </div>
        {match.startTime && (
          <div className="text-[7px] font-bold text-gray-600">
            📅{" "}
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

      {/* TEAMS AREA - Proportional grid for better breathing room */}
      <div className="flex flex-col gap-1 flex-grow justify-center pb-0.5">
        {/* TEAM A */}
        <div className="grid grid-cols-[2rem_1fr_1.75rem] items-center bg-white border-2 border-black overflow-hidden h-9 shadow-[1px_1px_0px_0px_#000]">
          <div className="flex items-center justify-center h-full border-r-2 border-black bg-gray-100 p-0.5">
            {match.teamA?.logoUrl ? (
              <img
                src={match.teamA.logoUrl}
                alt=""
                className="w-6 h-6 object-contain"
              />
            ) : (
              <div className="w-5 h-5 bg-black/5 rounded-full border border-black/5" />
            )}
          </div>
          <div className="px-1.5 overflow-hidden flex items-center h-full">
            <span className="text-black truncate uppercase tracking-tighter block font-black text-[10px] leading-none text-left w-full">
              {match.teamA?.name || abbreviateLabel(match.labelTeamA)}
            </span>
          </div>
          <div className="h-full flex items-center justify-center bg-black text-[#ccff00] font-black border-l-2 border-black text-[11px] italic">
            {(match as any).scoreA ?? match.stats?.pointsA ?? "0"}
          </div>
        </div>

        {/* TEAM B */}
        <div className="grid grid-cols-[2rem_1fr_1.75rem] items-center bg-white border-2 border-black overflow-hidden h-9 shadow-[1px_1px_0px_0px_#000]">
          <div className="flex items-center justify-center h-full border-r-2 border-black bg-gray-100 p-0.5">
            {match.teamB?.logoUrl ? (
              <img
                src={match.teamB.logoUrl}
                alt=""
                className="w-6 h-6 object-contain"
              />
            ) : (
              <div className="w-5 h-5 bg-black/5 rounded-full border border-black/5" />
            )}
          </div>
          <div className="px-1.5 overflow-hidden flex items-center h-full">
            <span className="text-black truncate uppercase tracking-tighter block font-black text-[10px] leading-none text-left w-full">
              {match.teamB?.name || abbreviateLabel(match.labelTeamB)}
            </span>
          </div>
          <div className="h-full flex items-center justify-center bg-black text-[#ccff00] font-black border-l-2 border-black text-[11px] italic">
            {(match as any).scoreB ?? match.stats?.pointsB ?? "0"}
          </div>
        </div>
      </div>

      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit actions could go here */}
      </div>
    </div>
  );
}

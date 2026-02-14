import { useMemo } from "react";
import { MatchCard as BracketMatchCard } from "./bracket/MatchCard";
import type { Match as BracketMatch } from "./bracket/types";
import { StandingsTable, useStandings } from "./bracket/StandingsTable";

// Define local types to bridge the gap or just reuse bracket types if possible
// We need to map our main app Match/Team types to these for the Standings logic.

export interface GSLResultViewProps {
  groupName: string;
  matches: any[]; // Accepting the main app matches (we'll cast/map them)
  userBets?: any[]; // For initialBet prop
  showPredictionScore?: boolean;
}

export function GSLResultView({
  groupName,
  matches,
  userBets,
}: GSLResultViewProps) {
  // Map main app matches to BracketMatch for logic compatibility
  const bracketMatches: BracketMatch[] = useMemo(() => {
    return matches.map(
      (m) =>
        ({
          id: m.id,
          label: m.label || "",
          name: m.name || m.label || "", // Use name if available, fallback to label
          displayOrder: m.displayOrder ?? 0,
          teamA: {
            id: m.teamA?.id ?? 0,
            name: m.teamA?.name ?? "TBD",
            logoUrl: m.teamA?.logoUrl,
            color: "blue", // Mock
          },
          teamB: {
            id: m.teamB?.id ?? 0,
            name: m.teamB?.name ?? "TBD",
            logoUrl: m.teamB?.logoUrl,
            color: "red", // Mock
          },
          format: m.format ?? "bo3",
          stats: {
            // Mock stats
            regionA: "",
            regionB: "",
            pointsA: 0,
            pointsB: 0,
            winRateA: "",
            winRateB: "",
          },
          status: m.status,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          winnerId: m.winnerId,
          startTime: m.startTime,
        }) as BracketMatch,
    );
  }, [matches]);

  // Calculate Standings (using real results, no predictions)
  const standings = useStandings(bracketMatches, {});

  // Identify GSL Links
  // Logic:
  // - Opening Matches (2 matches)
  // - Winners Match (Winner of openings)
  // - Elimination Match (Loser of openings)
  // - Decider Match (Loser of Winner vs Winner of Elim)

  // We rely on string matching "Opening", "Winners", "Elimination", "Decider"
  // just like GSLGroupView.

  const findMatch = (patterns: string[]) =>
    matches.find((m) => {
      const text = (m.name || m.label || "").toLowerCase();
      return patterns.some((p) => text.includes(p.toLowerCase()));
    });

  const openingMatches = matches.filter((m) => {
    const text = (m.name || m.label || "").toLowerCase();
    return (
      text.includes("opening") ||
      text.includes("abertura") ||
      text.includes("rodada 1") ||
      text.includes("round 1")
    );
  });

  const winnersMatch = findMatch(["winners", "vencedores", "winner"]);
  const elimMatch = findMatch([
    "elimination",
    "eliminação",
    "loser",
    "elimination",
  ]);
  const deciderMatch = findMatch(["decider", "decisiva", "decisivo"]);

  // Custom Card Wrapper for Layout
  // Since our cards are huge, we might need to scale them down or use a scrolling container.
  // For GSL, layout is tree-like.
  const CardWrapper = ({ match }: { match?: any }) => {
    if (!match)
      return (
        <div className="w-80 h-40 opacity-20 border-2 border-dashed border-black/10 rounded flex items-center justify-center text-xs font-bold uppercase text-gray-300">
          TBD
        </div>
      );

    // We render the REAL MatchCard here (The one from Bracket system for consistent layout)
    const initialBet = userBets?.find((b) => b.matchId === match.id);

    return (
      <div className="w-72 p-4 transform transition-all hover:scale-[1.02] hover:z-10 origin-center">
        <BracketMatchCard
          match={{
            ...match,
            teamA: match.teamA || {
              id: 0,
              name: match.labelTeamA || "TBD",
              color: "blue",
            },
            teamB: match.teamB || {
              id: 0,
              name: match.labelTeamB || "TBD",
              color: "red",
            },
          }}
          prediction={
            initialBet
              ? {
                  winnerId: initialBet.predictedWinnerId,
                  score: `${initialBet.predictedScoreA} - ${initialBet.predictedScoreB}`,
                }
              : undefined
          }
          onUpdatePrediction={() => {}}
          isReadOnly={true}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 bg-white/40 p-4 md:p-6 rounded-3xl border-4 border-black/5 shadow-inner backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b-4 border-black/10 pb-6 gap-4">
        <h3 className="text-4xl font-black italic uppercase text-black drop-shadow-sm">
          {groupName}
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-xs font-black uppercase tracking-widest bg-black text-[#ccff00] px-4 py-1.5 rotate-2 shadow-sm border border-transparent">
            GSL Format
          </div>
          <div className="text-xs font-black uppercase tracking-widest bg-white text-black px-4 py-1.5 -rotate-2 border-2 border-black shadow-sm">
            Top 2 Advance
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* STANDINGS TABLE - Left Side */}
        <div className="xl:min-w-[400px]">
          <h4 className="text-xl font-black uppercase italic mb-4 text-black/80">
            Standings
          </h4>
          <StandingsTable standings={standings} />
        </div>

        {/* BRACKET VIEW - Right Side (Scrollable) */}
        <div className="flex-1 overflow-x-auto pb-8">
          <div className="flex gap-16 min-w-max items-center pt-8">
            {/* Round 1: Opening */}
            <div className="flex flex-col gap-8 justify-center">
              <div className="text-center relative">
                <span className="text-sm font-black uppercase bg-black text-white px-3 py-1 -skew-x-12 inline-block mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                  Opening Matches
                </span>
              </div>
              {openingMatches.map((m) => (
                <CardWrapper key={m.id} match={m} />
              ))}
            </div>

            {/* Connector 1 */}
            <div className="flex flex-col justify-around h-full py-20 opacity-30">
              <span className="material-symbols-outlined text-4xl">
                chevron_right
              </span>
            </div>

            {/* Round 2: Winners & Elimination */}
            <div className="flex flex-col gap-16 justify-center">
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <span className="text-xs font-black uppercase bg-[#ccff00] text-black px-3 py-1 border-2 border-black inline-block shadow-sm">
                    Winners Match
                  </span>
                </div>
                <CardWrapper match={winnersMatch} />
              </div>

              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <span className="text-xs font-black uppercase bg-brawl-red text-white px-3 py-1 border-2 border-black inline-block shadow-sm">
                    Elimination Match
                  </span>
                </div>
                <CardWrapper match={elimMatch} />
              </div>
            </div>

            {/* Connector 2 */}
            <div className="flex flex-col justify-center h-full opacity-30">
              <span className="material-symbols-outlined text-4xl">
                chevron_right
              </span>
            </div>

            {/* Round 3: Decider */}
            <div className="flex flex-col gap-4 justify-center">
              <div className="text-center">
                <span className="text-xs font-black uppercase bg-gray-200 text-black px-3 py-1 border-2 border-black inline-block shadow-sm">
                  Decider Match
                </span>
              </div>
              <CardWrapper match={deciderMatch} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

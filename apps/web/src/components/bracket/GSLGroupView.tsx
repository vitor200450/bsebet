import { useMemo } from "react";
import { MatchCard } from "./MatchCard";
import type { Match, Prediction } from "./types";
import { StandingsTable, useStandings } from "./StandingsTable";

interface GSLGroupViewProps {
  groupName: string;
  matches: Match[];
  predictions: Record<number, Prediction>;
  onUpdatePrediction: (
    matchId: number,
    winnerId: number,
    score?: string,
  ) => void;
  onRemovePrediction?: (matchId: number) => void;
  renderMatchCard?: (match: Match) => React.ReactNode;
  // Optional custom renderer for Editor vs Public view
}

export function GSLGroupView({
  groupName,
  matches,
  predictions,
  onUpdatePrediction,
  onRemovePrediction,
  renderMatchCard,
}: GSLGroupViewProps) {
  // Sort matches by displayOrder (1-5)
  const sortedMatches = useMemo(() => {
    return [...matches].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );
  }, [matches]);

  // Calculate Standings
  const standings = useStandings(matches, predictions);

  // Layout:
  // Left: Standings
  // Right: Match Bracket (Opening col, Winners/Elim col, Decider col)

  const openingMatches = sortedMatches.filter((m) =>
    m.name?.toLowerCase().includes("opening match"),
  );
  const winnersMatch = sortedMatches.find((m) =>
    m.name?.toLowerCase().includes("winners match"),
  );
  const elimMatch = sortedMatches.find((m) =>
    m.name?.toLowerCase().includes("elimination match"),
  );
  const deciderMatch = sortedMatches.find((m) =>
    m.name?.toLowerCase().includes("decider match"),
  );

  const DefaultCard = (m: Match) => (
    <MatchCard
      key={m.id}
      match={m}
      prediction={predictions[m.id]}
      onUpdatePrediction={onUpdatePrediction}
      onRemovePrediction={onRemovePrediction}
    />
  );

  const renderCard = (m?: Match) => {
    if (!m) return <div className="w-72 h-28 opacity-0"></div>;
    return renderMatchCard ? renderMatchCard(m) : DefaultCard(m);
  };

  return (
    <div className="flex flex-col gap-6 bg-white/50 p-6 rounded-xl border-2 border-black/5 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black/10 pb-4">
        <h3 className="text-2xl font-black italic uppercase text-black">
          {groupName} -- GSL Format
        </h3>
        <div className="text-[10px] font-bold uppercase tracking-widest bg-black text-[#ccff00] px-3 py-1">
          Top 2 Advance
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* STANDINGS TABLE */}
        <StandingsTable standings={standings} />

        {/* BRACKET VIEW */}
        <div className="flex gap-8 overflow-x-auto pb-4 items-center">
          {/* Round 1: Opening */}
          <div className="flex flex-col gap-6 justify-center w-64 shrink-0">
            <div className="text-center text-[9px] font-bold uppercase text-gray-400 mb-1">
              Opening Matches
            </div>
            {openingMatches.map((m) => (
              <div key={m.id}>{renderCard(m)}</div>
            ))}
          </div>

          {/* Connector */}
          <div className="w-4 h-full border-r-2 border-dashed border-black/20 shrink-0" />

          {/* Round 2: Winners & Elimination */}
          <div className="flex flex-col gap-12 justify-center w-64 shrink-0">
            <div className="flex flex-col gap-2">
              <div className="text-center text-[9px] font-bold uppercase text-[#ccff00] bg-black px-2 py-0.5 mx-auto w-max mb-1">
                Winners Match
              </div>
              {renderCard(winnersMatch)}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-center text-[9px] font-bold uppercase text-red-500 bg-black/5 px-2 py-0.5 mx-auto w-max mb-1">
                Elimination Match
              </div>
              {renderCard(elimMatch)}
            </div>
          </div>

          {/* Connector */}
          <div className="w-4 h-full border-r-2 border-dashed border-black/20 shrink-0" />

          {/* Round 3: Decider */}
          <div className="flex flex-col gap-2 justify-center w-64 shrink-0">
            <div className="text-center text-[9px] font-bold uppercase text-black bg-gray-200 px-2 py-0.5 mx-auto w-max mb-1">
              Decider Match
            </div>
            {renderCard(deciderMatch)}
          </div>
        </div>
      </div>
    </div>
  );
}

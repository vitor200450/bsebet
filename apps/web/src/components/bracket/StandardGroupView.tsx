import { MatchCard } from "./MatchCard";
import type { Match, Prediction } from "./types";
import { StandingsTable, useStandings } from "./StandingsTable";

interface StandardGroupViewProps {
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
  isReadOnly?: boolean;
}

export function StandardGroupView({
  groupName,
  matches,
  predictions,
  onUpdatePrediction,
  onRemovePrediction,
  renderMatchCard,
  isReadOnly = false,
}: StandardGroupViewProps) {
  const standings = useStandings(matches, predictions);

  const DefaultCard = (m: Match) => (
    <MatchCard
      key={m.id}
      match={m}
      prediction={predictions[m.id]}
      onUpdatePrediction={onUpdatePrediction}
      onRemovePrediction={onRemovePrediction}
      isReadOnly={isReadOnly}
    />
  );

  const renderCard = (m: Match) => {
    return renderMatchCard ? renderMatchCard(m) : DefaultCard(m);
  };

  return (
    <div className="flex flex-col gap-6 bg-white/50 p-6 rounded-xl border-2 border-black/5 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black/10 pb-4">
        <h3 className="text-2xl font-black italic uppercase text-black">
          {groupName} -- Round Robin
        </h3>
        <div className="text-[10px] font-bold uppercase tracking-widest bg-black text-[#ccff00] px-3 py-1">
          Top 2 Advance
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* STANDINGS TABLE */}
        <StandingsTable standings={standings} />

        {/* MATCH LIST */}
        <div className="flex flex-col gap-4 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matches.map((m) => (
              <div key={m.id} className="w-full">
                {renderCard(m)}
              </div>
            ))}
          </div>
          {matches.length === 0 && (
            <div className="text-center p-8 text-gray-400 italic text-sm">
              No matches scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

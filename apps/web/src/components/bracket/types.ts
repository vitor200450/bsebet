export type Team = {
  id: number;
  name: string;
  logoUrl?: string;
  slug?: string;
  color: "blue" | "red";
};

export type Match = {
  id: number;
  label: string;
  name?: string | null;
  displayOrder?: number | null;
  teamA: Team | null;
  teamB: Team | null;
  format: "bo3" | "bo5" | "bo7";
  stats: {
    regionA: string;
    regionB: string;
    pointsA: number;
    pointsB: number;
    winRateA: string;
    winRateB: string;
  };
  nextMatchWinnerId?: number | null;
  nextMatchWinnerSlot?: string | null;
  nextMatchLoserId?: number | null;
  nextMatchLoserSlot?: string | null;
  teamAPreviousMatchId?: number | null;
  teamBPreviousMatchId?: number | null;
  isLockedDependency?: boolean;
  winnerId?: number | null;
  labelTeamA?: string | null;
  labelTeamB?: string | null;
  isGhost?: boolean;
  isBettingEnabled?: boolean;
  roundIndex?: number | null;
  bracketSide?: string | null;
  status?: "scheduled" | "live" | "finished";
  scoreA?: number | null;
  scoreB?: number | null;
  startTime: string | Date;
  tournamentName?: string | null;
  tournamentLogoUrl?: string | null;
  scoringRules?: {
    winner: number;
    exact: number;
    underdog_25: number;
    underdog_50: number;
  };
  matchDayId?: number | null;
  matchDayLabel?: string | null;
  matchDayStatus?: string | null;
};

export type Prediction = {
  winnerId: number;
  score: string;
  pointsEarned?: number; // Points earned from this bet (only set after match is finished)
  isCorrect?: boolean; // Whether the prediction was correct (only set after match is finished)
  isUnderdogPick?: boolean; // Whether this was an underdog pick that earned bonus points
  isPerfectPick?: boolean; // Whether this was an exact score prediction
};

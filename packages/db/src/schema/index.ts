import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export * from "./auth";

// --- ENUMS ---
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "upcoming",
  "active",
  "finished",
]);

// --- 1. NOVA TABELA: TIMES ---
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Ex: "LOUD"
  slug: text("slug").unique().notNull(), // Ex: "loud-gg" (para URLs)
  logoUrl: text("logo_url"), // URL da imagem do escudo
  region: text("region"), // Ex: "SA", "NA", "EMEA"
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 2. NOVA TABELA: TIMES NO TORNEIO (Many-to-Many) ---
// Serve para listar os "Participantes" antes de criar os jogos
export const tournamentTeams = pgTable(
  "tournament_teams",
  {
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tournamentId, t.teamId] }), // Chave composta
  }),
);

// --- 3. TABELAS EXISTENTES (ATUALIZADAS) ---

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  format: text("format"), // Ex: "Group Stage + Playoffs"
  region: text("region"), // Ex: "Global"
  participantsCount: integer("participants_count"),
  // Stages: Complex JSON structure for groups, playoffs, formats
  stages: jsonb("stages").$type<
    {
      id: string;
      name: string; // e.g., "Group Stage"
      type: "Single Elimination" | "Double Elimination" | "Groups";
      settings: {
        groupsCount?: number;
        teamsPerGroup?: number;
        advancingCount?: number;
        matchType?: "Bo1" | "Bo3" | "Bo5";
      };
      startDate?: string;
      endDate?: string;
    }[]
  >(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: tournamentStatusEnum("status").default("upcoming").notNull(),
  isActive: boolean("is_active").default(true),
  scoringRules: jsonb("scoring_rules")
    .$type<{
      winner: number;
      exact: number;
      underdog_25: number;
    }>()
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matchDayStatusEnum = pgEnum("match_day_status", [
  "draft", // Admin only visibility
  "open", // Visible + Betting allowed
  "locked", // No more bets
  "finished", // All matches done
]);

export const matchDays = pgTable("match_days", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id),
  date: timestamp("date").notNull(),
  label: text("label").notNull(), // Ex: "Day 1" or "Groups Day 1"
  status: matchDayStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id").references(() => tournaments.id),
    matchDayId: integer("match_day_id").references(() => matchDays.id), // New relation
    label: text("label"), // Stage name (ex: "Upper Bracket Quarterfinals")
    name: text("name"), // Specific match name (ex: "Opening Match")

    // REFATORADO: Agora apontamos para IDs, não strings
    // É "nullable" porque o time pode não estar definido ainda (ex: "Vencedor Jogo 1")
    teamAId: integer("team_a_id").references(() => teams.id),
    teamBId: integer("team_b_id").references(() => teams.id),

    // Mantemos os labels para mostrar na UI quando o ID for null
    // Ex: teamAId é null, então mostramos labelTeamA ("Vencedor UQ1")
    labelTeamA: text("label_team_a"),
    labelTeamB: text("label_team_b"),

    startTime: timestamp("start_time").notNull(),
    status: matchStatusEnum("status").default("scheduled"),

    // Resultado Final
    winnerId: integer("winner_id").references(() => teams.id), // Quem ganhou?
    scoreA: integer("score_a"),
    scoreB: integer("score_b"),

    // Lógica de Bracket
    nextMatchWinnerId: integer("next_match_winner_id"),
    nextMatchWinnerSlot: text("next_match_winner_slot"), // "A" ou "B"
    nextMatchLoserId: integer("next_match_loser_id"),
    nextMatchLoserSlot: text("next_match_loser_slot"), // "A" ou "B"

    // Explicit Bracket Structure (Liquipedia Style)
    roundIndex: integer("round_index"), // 0 = Round 1 (or Start), Increases towards Final
    bracketSide: text("bracket_side"), // 'upper', 'lower', 'grand_final'
    displayOrder: integer("display_order"), // Vertical sort order within the round

    isBettingEnabled: boolean("is_betting_enabled").default(true).notNull(),

    // Backward Relations (For easier bracket tracking)
    teamAPreviousMatchId: integer("team_a_previous_match_id"), // Not a strict foreign key to avoid circular deps during insert, or use alter table later. But self-ref is fine in Postgres.
    teamAPreviousMatchResult: text("team_a_previous_match_result"), // 'winner' | 'loser'
    teamBPreviousMatchId: integer("team_b_previous_match_id"),
    teamBPreviousMatchResult: text("team_b_previous_match_result"),
  },
  (t) => ({
    uniqueMatch: uniqueIndex("unique_match_idx").on(
      t.tournamentId,
      t.teamAId,
      t.teamBId,
      t.labelTeamA,
      t.labelTeamB,
      t.startTime,
    ),
  }),
);

export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  matchId: integer("match_id")
    .references(() => matches.id)
    .notNull(),

  // A aposta agora também aponta para o ID do time
  predictedWinnerId: integer("predicted_winner_id").references(() => teams.id),

  predictedScoreA: integer("predicted_score_a").notNull(),
  predictedScoreB: integer("predicted_score_b").notNull(),

  pointsEarned: integer("points_earned").default(0),
  isPerfectPick: boolean("is_perfect_pick").default(false),
  isUnderdogPick: boolean("is_underdog_pick").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- RELATIONS (Atualizado) ---

export const teamsRelations = relations(teams, ({ many }) => ({
  tournaments: many(tournamentTeams), // Um time joga vários torneios
  matchesAsA: many(matches, { relationName: "teamA" }),
  matchesAsB: many(matches, { relationName: "teamB" }),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  matches: many(matches),
  teams: many(tournamentTeams), // Acesso fácil aos times do torneio
  matchDays: many(matchDays),
}));

export const tournamentTeamsRelations = relations(
  tournamentTeams,
  ({ one }) => ({
    tournament: one(tournaments, {
      fields: [tournamentTeams.tournamentId],
      references: [tournaments.id],
    }),
    team: one(teams, {
      fields: [tournamentTeams.teamId],
      references: [teams.id],
    }),
  }),
);

export const matchDaysRelations = relations(matchDays, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matchDays.tournamentId],
    references: [tournaments.id],
  }),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  matchDay: one(matchDays, {
    fields: [matches.matchDayId],
    references: [matchDays.id],
  }),
  // Relacionamentos com a tabela Teams
  teamA: one(teams, {
    fields: [matches.teamAId],
    references: [teams.id],
    relationName: "teamA",
  }),
  teamB: one(teams, {
    fields: [matches.teamBId],
    references: [teams.id],
    relationName: "teamB",
  }),
  winner: one(teams, {
    fields: [matches.winnerId],
    references: [teams.id],
  }),
  bets: many(bets),
  nextMatchWinner: one(matches, {
    fields: [matches.nextMatchWinnerId],
    references: [matches.id],
    relationName: "winnerPath",
  }),
  nextMatchLoser: one(matches, {
    fields: [matches.nextMatchLoserId],
    references: [matches.id],
    relationName: "loserPath",
  }),
}));

import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const matchDayStatus = pgEnum("match_day_status", [
	"draft",
	"open",
	"locked",
	"finished",
]);
export const matchStatus = pgEnum("match_status", [
	"scheduled",
	"live",
	"finished",
]);
export const tournamentStatus = pgEnum("tournament_status", [
	"upcoming",
	"active",
	"finished",
]);

export const user = pgTable(
	"user",
	{
		id: text().primaryKey().notNull(),
		name: text().notNull(),
		email: text().notNull(),
		emailVerified: boolean("email_verified").default(false).notNull(),
		image: text(),
		nickname: text(),
		role: text().default("user").notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		banned: boolean(),
		banReason: text("ban_reason"),
		banExpires: timestamp("ban_expires", { mode: "string" }),
	},
	(table) => [unique("user_email_unique").on(table.email)],
);

export const verification = pgTable(
	"verification",
	{
		id: text().primaryKey().notNull(),
		identifier: text().notNull(),
		value: text().notNull(),
		expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("verification_identifier_idx").using(
			"btree",
			table.identifier.asc().nullsLast().op("text_ops"),
		),
	],
);

export const bets = pgTable(
	"bets",
	{
		id: serial().primaryKey().notNull(),
		userId: text("user_id").notNull(),
		matchId: integer("match_id").notNull(),
		predictedWinnerId: integer("predicted_winner_id"),
		predictedScoreA: integer("predicted_score_a").notNull(),
		predictedScoreB: integer("predicted_score_b").notNull(),
		pointsEarned: integer("points_earned").default(0),
		isPerfectPick: boolean("is_perfect_pick").default(false),
		isUnderdogPick: boolean("is_underdog_pick").default(false),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
		isRecovery: boolean("is_recovery").default(false).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "bets_match_id_matches_id_fk",
		}),
		foreignKey({
			columns: [table.predictedWinnerId],
			foreignColumns: [teams.id],
			name: "bets_predicted_winner_id_teams_id_fk",
		}),
	],
);

export const account = pgTable(
	"account",
	{
		id: text().primaryKey().notNull(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			mode: "string",
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			mode: "string",
		}),
		scope: text(),
		password: text(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
	},
	(table) => [
		index("account_userId_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk",
		}).onDelete("cascade"),
	],
);

export const session = pgTable(
	"session",
	{
		id: text().primaryKey().notNull(),
		expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
		token: text().notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("session_userId_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk",
		}).onDelete("cascade"),
		unique("session_token_unique").on(table.token),
	],
);

export const matches = pgTable(
	"matches",
	{
		id: serial().primaryKey().notNull(),
		tournamentId: integer("tournament_id"),
		matchDayId: integer("match_day_id"),
		label: text(),
		stageId: text("stage_id"),
		name: text(),
		teamAId: integer("team_a_id"),
		teamBId: integer("team_b_id"),
		labelTeamA: text("label_team_a"),
		labelTeamB: text("label_team_b"),
		startTime: timestamp("start_time", { mode: "string" }).notNull(),
		status: matchStatus().default("scheduled"),
		winnerId: integer("winner_id"),
		scoreA: integer("score_a"),
		scoreB: integer("score_b"),
		nextMatchWinnerId: integer("next_match_winner_id"),
		nextMatchWinnerSlot: text("next_match_winner_slot"),
		nextMatchLoserId: integer("next_match_loser_id"),
		nextMatchLoserSlot: text("next_match_loser_slot"),
		roundIndex: integer("round_index"),
		bracketSide: text("bracket_side"),
		displayOrder: integer("display_order"),
		isBettingEnabled: boolean("is_betting_enabled").default(true).notNull(),
		teamAPreviousMatchId: integer("team_a_previous_match_id"),
		teamAPreviousMatchResult: text("team_a_previous_match_result"),
		teamBPreviousMatchId: integer("team_b_previous_match_id"),
		teamBPreviousMatchResult: text("team_b_previous_match_result"),
		underdogTeamId: integer("underdog_team_id"),
	},
	(table) => [
		uniqueIndex("unique_match_idx").using(
			"btree",
			table.tournamentId.asc().nullsLast().op("int4_ops"),
			table.teamAId.asc().nullsLast().op("int4_ops"),
			table.teamBId.asc().nullsLast().op("int4_ops"),
			table.labelTeamA.asc().nullsLast().op("int4_ops"),
			table.labelTeamB.asc().nullsLast().op("int4_ops"),
			table.startTime.asc().nullsLast().op("int4_ops"),
		),
		foreignKey({
			columns: [table.matchDayId],
			foreignColumns: [matchDays.id],
			name: "matches_match_day_id_match_days_id_fk",
		}),
		foreignKey({
			columns: [table.teamAId],
			foreignColumns: [teams.id],
			name: "matches_team_a_id_teams_id_fk",
		}),
		foreignKey({
			columns: [table.teamBId],
			foreignColumns: [teams.id],
			name: "matches_team_b_id_teams_id_fk",
		}),
		foreignKey({
			columns: [table.tournamentId],
			foreignColumns: [tournaments.id],
			name: "matches_tournament_id_tournaments_id_fk",
		}),
		foreignKey({
			columns: [table.underdogTeamId],
			foreignColumns: [teams.id],
			name: "matches_underdog_team_id_teams_id_fk",
		}),
		foreignKey({
			columns: [table.winnerId],
			foreignColumns: [teams.id],
			name: "matches_winner_id_teams_id_fk",
		}),
	],
);

export const teams = pgTable(
	"teams",
	{
		id: serial().primaryKey().notNull(),
		name: text().notNull(),
		slug: text().notNull(),
		logoUrl: text("logo_url"),
		region: text(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [unique("teams_slug_unique").on(table.slug)],
);

export const tournaments = pgTable(
	"tournaments",
	{
		id: serial().primaryKey().notNull(),
		name: text().notNull(),
		slug: text().notNull(),
		logoUrl: text("logo_url"),
		format: text(),
		region: text(),
		participantsCount: integer("participants_count"),
		stages: jsonb(),
		startDate: timestamp("start_date", { mode: "string" }),
		endDate: timestamp("end_date", { mode: "string" }),
		status: tournamentStatus().default("upcoming").notNull(),
		isActive: boolean("is_active").default(true),
		scoringRules: jsonb("scoring_rules").notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [unique("tournaments_slug_unique").on(table.slug)],
);

export const matchDays = pgTable(
	"match_days",
	{
		id: serial().primaryKey().notNull(),
		tournamentId: integer("tournament_id").notNull(),
		date: timestamp({ mode: "string" }).notNull(),
		label: text().notNull(),
		status: matchDayStatus().default("draft").notNull(),
		createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
	},
	(table) => [
		foreignKey({
			columns: [table.tournamentId],
			foreignColumns: [tournaments.id],
			name: "match_days_tournament_id_tournaments_id_fk",
		}),
	],
);

export const tournamentTeams = pgTable(
	"tournament_teams",
	{
		tournamentId: integer("tournament_id").notNull(),
		teamId: integer("team_id").notNull(),
		group: text(),
		seed: integer(),
	},
	(table) => [
		foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "tournament_teams_team_id_teams_id_fk",
		}),
		foreignKey({
			columns: [table.tournamentId],
			foreignColumns: [tournaments.id],
			name: "tournament_teams_tournament_id_tournaments_id_fk",
		}),
		primaryKey({
			columns: [table.tournamentId, table.teamId],
			name: "tournament_teams_tournament_id_team_id_pk",
		}),
	],
);

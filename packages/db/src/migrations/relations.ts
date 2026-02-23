import { relations } from "drizzle-orm/relations";
import {
	account,
	bets,
	matchDays,
	matches,
	session,
	teams,
	tournaments,
	tournamentTeams,
	user,
} from "./schema";

export const betsRelations = relations(bets, ({ one }) => ({
	match: one(matches, {
		fields: [bets.matchId],
		references: [matches.id],
	}),
	team: one(teams, {
		fields: [bets.predictedWinnerId],
		references: [teams.id],
	}),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
	bets: many(bets),
	matchDay: one(matchDays, {
		fields: [matches.matchDayId],
		references: [matchDays.id],
	}),
	team_teamAId: one(teams, {
		fields: [matches.teamAId],
		references: [teams.id],
		relationName: "matches_teamAId_teams_id",
	}),
	team_teamBId: one(teams, {
		fields: [matches.teamBId],
		references: [teams.id],
		relationName: "matches_teamBId_teams_id",
	}),
	tournament: one(tournaments, {
		fields: [matches.tournamentId],
		references: [tournaments.id],
	}),
	team_underdogTeamId: one(teams, {
		fields: [matches.underdogTeamId],
		references: [teams.id],
		relationName: "matches_underdogTeamId_teams_id",
	}),
	team_winnerId: one(teams, {
		fields: [matches.winnerId],
		references: [teams.id],
		relationName: "matches_winnerId_teams_id",
	}),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
	bets: many(bets),
	matches_teamAId: many(matches, {
		relationName: "matches_teamAId_teams_id",
	}),
	matches_teamBId: many(matches, {
		relationName: "matches_teamBId_teams_id",
	}),
	matches_underdogTeamId: many(matches, {
		relationName: "matches_underdogTeamId_teams_id",
	}),
	matches_winnerId: many(matches, {
		relationName: "matches_winnerId_teams_id",
	}),
	tournamentTeams: many(tournamentTeams),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const matchDaysRelations = relations(matchDays, ({ one, many }) => ({
	matches: many(matches),
	tournament: one(tournaments, {
		fields: [matchDays.tournamentId],
		references: [tournaments.id],
	}),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
	matches: many(matches),
	matchDays: many(matchDays),
	tournamentTeams: many(tournamentTeams),
}));

export const tournamentTeamsRelations = relations(
	tournamentTeams,
	({ one }) => ({
		team: one(teams, {
			fields: [tournamentTeams.teamId],
			references: [teams.id],
		}),
		tournament: one(tournaments, {
			fields: [tournamentTeams.tournamentId],
			references: [tournaments.id],
		}),
	}),
);

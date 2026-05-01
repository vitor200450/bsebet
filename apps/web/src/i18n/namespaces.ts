export const NAMESPACES = [
	"common",
	"betting",
	"dashboard",
	"my-bets",
	"leaderboard",
	"profile",
	"tournament",
	"team",
	"user",
	"landing",
	"admin",
	"admin-matches",
	"errors",
	"validation",
] as const;

export type AppNamespace = (typeof NAMESPACES)[number];

export const DEFAULT_NAMESPACE: AppNamespace = "common";

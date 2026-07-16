import { teams } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";

export type LandingTeam = {
	id: number;
	name: string;
	logoUrl: string | null;
	region: string | null;
};

export type LandingMatchup = {
	teamA: LandingTeam;
	teamB: LandingTeam;
};

/**
 * Real BSC 2026: Brawl Cup matchups for the Pick Arena rotator.
 * Each team appears in at most one pair so the carousel stays diverse.
 */
const FEATURED_PAIR_IDS: [number, number][] = [
	[15, 17], // HMBLE vs FUT Esports — Grand Final
	[21, 3], // Crazy Raccoon vs Eternal Esports — Group C
	[12, 34], // ZETA DIVISION vs Bounty Hunters — Quarterfinal
	[9, 19], // Tribe Gaming vs Revenant XSpark — Quarterfinal
];

function toLandingTeam(row: {
	id: number;
	name: string;
	logoUrl: string | null;
	region: string | null;
}): LandingTeam {
	return {
		id: row.id,
		name: row.name,
		logoUrl: row.logoUrl,
		region: row.region,
	};
}

/**
 * Featured matchup pairs for the landing Pick Arena rotator.
 */
export const getLandingMatchups = createServerFn({
	method: "GET",
}).handler(async (): Promise<LandingMatchup[]> => {
	const { db } = await import("@bsebet/db");
	const ids = [...new Set(FEATURED_PAIR_IDS.flat())];
	const rows = await db.select().from(teams).where(inArray(teams.id, ids));
	const byId = new Map(rows.map((row) => [row.id, row]));

	const seen = new Set<number>();
	const matchups: LandingMatchup[] = [];

	for (const [aId, bId] of FEATURED_PAIR_IDS) {
		if (seen.has(aId) || seen.has(bId)) continue;
		const a = byId.get(aId);
		const b = byId.get(bId);
		if (!a || !b) continue;
		seen.add(aId);
		seen.add(bId);
		matchups.push({ teamA: toLandingTeam(a), teamB: toLandingTeam(b) });
	}

	return matchups;
});

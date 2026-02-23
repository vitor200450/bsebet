import { sql } from "drizzle-orm";
import { db } from "./index";

async function fixSequences() {
	console.log("Fixing sequences...");

	// Fix 'bets' sequence
	await db.execute(
		sql`SELECT setval('bets_id_seq', (SELECT MAX(id) FROM bets));`,
	);
	console.log("Fixed 'bets_id_seq'");

	// Fix 'teams' sequence
	await db.execute(
		sql`SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));`,
	);
	console.log("Fixed 'teams_id_seq'");

	// Fix 'tournaments' sequence
	await db.execute(
		sql`SELECT setval('tournaments_id_seq', (SELECT MAX(id) FROM tournaments));`,
	);
	console.log("Fixed 'tournaments_id_seq'");

	// Fix 'matches' sequence
	await db.execute(
		sql`SELECT setval('matches_id_seq', (SELECT MAX(id) FROM matches));`,
	);
	console.log("Fixed 'matches_id_seq'");

	// Fix 'match_days' sequence
	await db.execute(
		sql`SELECT setval('match_days_id_seq', (SELECT MAX(id) FROM match_days));`,
	);
	console.log("Fixed 'match_days_id_seq'");

	console.log("Done!");
	process.exit(0);
}

fixSequences().catch((err) => {
	console.error(err);
	process.exit(1);
});

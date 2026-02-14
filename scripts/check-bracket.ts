import { db, matches, tournaments } from "@bsebet/db";
import { eq, asc } from "drizzle-orm";

async function check() {
  // Find a tournament with single elimination
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, 2),
  });

  if (!tournament) {
    console.log("Tournament 2 not found");
    return;
  }

  console.log(`Tournament: ${tournament.name}`);
  console.log(`Stages:`, tournament.stages);
  console.log("");

  // Get all matches
  const allMatches = await db.query.matches.findMany({
    where: eq(matches.tournamentId, 2),
    orderBy: [asc(matches.id)],
  });

  console.log("=== All Matches ===");
  for (const m of allMatches) {
    console.log(`Match ${m.id}: ${m.name || m.label}`);
    console.log(`  bracketSide: "${m.bracketSide}"`);
    console.log(`  nextMatchWinnerId: ${m.nextMatchWinnerId}`);
    console.log(`  nextMatchLoserId: ${m.nextMatchLoserId}`);
    console.log(`  roundIndex: ${m.roundIndex}`);
    console.log(`  matchDayId: ${m.matchDayId}`);
    console.log("");
  }
}

check()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });

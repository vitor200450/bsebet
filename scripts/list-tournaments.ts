import { db } from "@bsebet/db";

async function main() {
  const tournaments = await db.query.tournaments.findMany();
  console.log("Tournaments:");
  tournaments.forEach((t) => {
    console.log(`${t.id}: ${t.name} (Status: ${t.status})`);
  });
}

main().catch(console.error);

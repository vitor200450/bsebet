import { db } from "./index";
import { sql } from "drizzle-orm";

async function diagnose() {
  const dbUrl = process.env.DATABASE_URL;
  console.log("Connecting to DB:", dbUrl?.split("@")[1]); // Log host only for safety
  console.log("Diagnosing 'bets' table...");

  const maxIdResult = await db.execute(sql`SELECT MAX(id) as max_id FROM bets`);
  const maxId = maxIdResult[0]?.max_id;
  console.log("MAX(id) in bets:", maxId);

  try {
    const seqResult = await db.execute(sql`SELECT last_value FROM bets_id_seq`);
    console.log(
      "Current sequence value (bets_id_seq):",
      seqResult[0]?.last_value,
    );
  } catch (e) {
    console.log("Could not read sequence directly:", e.message);
  }

  // Force update to a very high number to be sure
  const safeStart = Number(maxId || 0) + 1000;
  console.log(`Forcing sequence to: ${safeStart}`);

  await db.execute(sql`SELECT setval('bets_id_seq', ${safeStart})`);
  console.log("Sequence updated.");

  const verifySeq = await db.execute(sql`SELECT last_value FROM bets_id_seq`);
  console.log("Verified sequence value:", verifySeq[0]?.last_value);

  process.exit(0);
}

diagnose().catch((err) => {
  console.error(err);
  process.exit(1);
});

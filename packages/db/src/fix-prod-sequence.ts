import { sql } from "drizzle-orm";

async function fixSequence() {
	const dbUrl =
		"postgres://u4ngttudsajt11:p85380de3ddc6e95e88141e7cf446b73c292ae58f92b74c990cceac0e45b85fe2@c55vaqijj0vpoi.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddouvjq60jrdba";

	// CRITICAL: Set Env Var BEFORE importing the DB instance
	process.env.DATABASE_URL = dbUrl;

	console.log("Fixing Production Sequence for 'bets'...");

	// DYNAMIC IMPORT to ensure it reads the new process.env.DATABASE_URL
	const { db } = await import("./index");

	// 0. Verify Connection
	const connInfo = await db.execute(
		sql`SELECT inet_server_addr(), inet_server_port(), current_database(), current_user, current_schema()`,
	);
	console.log("Connection Info:", JSON.stringify(connInfo, null, 2));

	// 1. Get Max ID
	const result = await db.execute(sql`SELECT MAX(id) as max_id FROM bets`);
	const maxId = Number(result[0].max_id) || 0;
	console.log(`Current MAX(id): ${maxId}`);

	// 2. Get Current Sequence Value
	const seqResult = await db.execute(sql`SELECT last_value FROM bets_id_seq`);
	console.log(`Current Sequence Value: ${seqResult[0].last_value}`);

	// 3. FORCE Reset Sequence to 20000 (Safe High Number)
	const safeStart = 20000;
	console.log(`Forcing sequence reset to: ${safeStart}`);

	// setval(seq, val, true) -> nextval will be val + 1 = 20001
	await db.execute(sql`SELECT setval('bets_id_seq', ${safeStart}, true)`);

	// 4. Verify with Test Insert (USING VALID MATCH ID 17 and TEAM ID 1)
	console.log("Attempting Test Insert with Valid FKs...");
	try {
		const inserted = await db.execute(sql`
        INSERT INTO bets (user_id, match_id, predicted_winner_id, predicted_score_a, predicted_score_b)
        VALUES ('diagnostic_test_user_seq', 17, 1, 0, 0)
        RETURNING id
      `);
		console.log("Test Insert SUCCESS. Generated ID:", inserted[0].id);

		// Cleanup
		await db.execute(sql`DELETE FROM bets WHERE id = ${inserted[0].id}`);
		console.log("Test Insert Deleted.");
	} catch (e) {
		console.error("Test Insert FAILED:", e);
	}

	// Final Sequence Check
	const newSeq = await db.execute(sql`SELECT last_value FROM bets_id_seq`);
	console.log(`Final Sequence Value: ${newSeq[0].last_value}`);

	process.exit(0);
}

fixSequence().catch(console.error);

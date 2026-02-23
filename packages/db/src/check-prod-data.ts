import { sql } from "drizzle-orm";
import { db } from "./index";

async function checkData() {
	// Production DB URL
	const dbUrl =
		"postgres://u4ngttudsajt11:p85380de3ddc6e95e88141e7cf446b73c292ae58f92b74c990cceac0e45b85fe2@c55vaqijj0vpoi.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddouvjq60jrdba";
	process.env.DATABASE_URL = dbUrl;

	console.log("Checking Production Data...");

	// Check Teams 1, 2, 3 (from user params)
	const teams = await db.execute(
		sql`SELECT id, name, slug FROM teams WHERE id IN (1, 2, 3)`,
	);
	console.log("Teams found:", JSON.stringify(teams, null, 2));

	// Check Connection Info
	const connInfo = await db.execute(
		sql`SELECT inet_server_addr(), inet_server_port(), current_database(), current_user, current_schema()`,
	);
	console.log("Connection Info:", JSON.stringify(connInfo, null, 2));

	// List first 50 matches in DB, only ID and Name
	const matches = await db.execute(
		sql`SELECT id, name FROM matches ORDER BY id ASC LIMIT 50`,
	);
	console.log("Matches found (LIMIT 50):");
	matches.forEach((m) => console.log(`${m.id}: ${m.name}`));

	process.exit(0);
}

checkData().catch(console.error);

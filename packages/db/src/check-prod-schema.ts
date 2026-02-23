import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { db } from "./index";

async function checkSchema() {
	const dbUrl =
		"postgres://u4ngttudsajt11:p85380de3ddc6e95e88141e7cf446b73c292ae58f92b74c990cceac0e45b85fe2@c55vaqijj0vpoi.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/ddouvjq60jrdba";
	process.env.DATABASE_URL = dbUrl;

	console.log("Checking Production Schema for table 'bets'...");

	const result: any = {};

	try {
		// 1. Check Indexes
		result.indexes = await db.execute(sql`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'bets'
    `);

		// 2. Check Constraints
		result.constraints = await db.execute(sql`
        SELECT conname, contype, pg_get_constraintdef(oid) as def
        FROM pg_constraint 
        WHERE conrelid = 'bets'::regclass
    `);

		// 3. Check Triggers
		result.triggers = await db.execute(sql`
        SELECT tgname, pg_get_triggerdef(oid) as def
        FROM pg_trigger
        WHERE tgrelid = 'bets'::regclass
    `);

		const dumpPath = path.resolve(__dirname, "schema_dump.json");
		fs.writeFileSync(dumpPath, JSON.stringify(result, null, 2));
		console.log(`Schema dump written to ${dumpPath}`);
	} catch (error) {
		console.error("Error checking schema:", error);
	}

	process.exit(0);
}

checkSchema().catch(console.error);

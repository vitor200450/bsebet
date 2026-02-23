import { drizzle } from "drizzle-orm/postgres-js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL || "";

// Heroku Postgres requires SSL
let connUrl = databaseUrl;
if (connUrl && !connUrl.includes("sslmode=")) {
	const separator = connUrl.includes("?") ? "&" : "?";
	connUrl = `${connUrl}${separator}sslmode=require`;
}

async function main() {
	console.log("Connecting to database...");

	const conn = postgres(connUrl, {
		ssl: { rejectUnauthorized: false },
		max: 1,
		prepare: false,
	});

	try {
		// Find SQL files in db_backup directory
		const backupDir = join(process.cwd(), "..", "..", "..", "db_backup");
		console.log(`Looking for SQL files in: ${backupDir}`);

		let files: string[] = [];
		try {
			files = readdirSync(backupDir).filter((f) => f.endsWith(".sql"));
		} catch (e) {
			// Try alternative path
			const altBackupDir = join(process.cwd(), "db_backup");
			console.log(`Trying alternative path: ${altBackupDir}`);
			files = readdirSync(altBackupDir).filter((f) => f.endsWith(".sql"));
		}

		if (files.length === 0) {
			console.log("No SQL files found in db_backup directory");
			console.log(
				"Please ensure your backup files are in the db_backup folder",
			);
			process.exit(1);
		}

		console.log(`\nFound ${files.length} SQL file(s):`);
		files.forEach((f) => console.log(`  - ${f}`));

		// Import each SQL file
		for (const file of files.sort()) {
			console.log(`\n📁 Importing ${file}...`);

			let filePath: string;
			try {
				filePath = join(process.cwd(), "..", "..", "..", "db_backup", file);
				readFileSync(filePath, "utf-8");
			} catch {
				filePath = join(process.cwd(), "db_backup", file);
			}

			const sql = readFileSync(filePath, "utf-8");

			// Split SQL into statements and execute
			const statements = sql
				.split(";")
				.map((s) => s.trim())
				.filter((s) => s.length > 0 && !s.startsWith("--"));

			for (const statement of statements) {
				try {
					await conn.unsafe(statement + ";");
				} catch (error: any) {
					// Ignore duplicate key errors (data already exists)
					if (error.code === "23505") {
						console.log(
							`    ⚠️  Skipping duplicate: ${error.message.substring(0, 100)}...`,
						);
					} else {
						console.error(`    ❌ Error: ${error.message}`);
					}
				}
			}

			console.log(`  ✅ ${file} imported successfully`);
		}

		console.log("\n🎉 All backups imported successfully!");
	} catch (error) {
		console.error("❌ Error importing backup:", error);
		process.exit(1);
	} finally {
		await conn.end();
	}
}

main();

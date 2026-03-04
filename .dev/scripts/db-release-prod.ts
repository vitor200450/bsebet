import { exec } from "child_process";
import postgres from "postgres";
import { promisify } from "util";

const execAsync = promisify(exec);

type Options = {
	app?: string;
	skipGenerate: boolean;
	skipBackup: boolean;
	skipPreflight: boolean;
};

function printHelp(): void {
	console.log(
		"\nProd DB release helper\n\nUsage:\n  bun run db:release:prod -- [options]\n\nOptions:\n  --app <name>         Heroku app name (optional)\n  --skip-generate      Skip drizzle migration generation\n  --skip-backup        Skip Heroku backup capture\n  --skip-preflight     Skip production schema preflight\n  --help               Show this help\n\nExamples:\n  bun run db:release:prod -- --app my-heroku-app\n  bun run db:release:prod -- --skip-generate\n",
	);
}

function parseArgs(argv: string[]): Options {
	const opts: Options = {
		skipGenerate: false,
		skipBackup: false,
		skipPreflight: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}

		if (arg === "--skip-generate") {
			opts.skipGenerate = true;
			continue;
		}

		if (arg === "--skip-backup") {
			opts.skipBackup = true;
			continue;
		}

		if (arg === "--skip-preflight") {
			opts.skipPreflight = true;
			continue;
		}

		if (arg === "--app") {
			const value = argv[i + 1];
			if (!value || value.startsWith("--")) {
				throw new Error("Missing value for --app");
			}
			opts.app = value;
			i += 1;
		}
	}

	return opts;
}

async function run(command: string): Promise<void> {
	console.log(`\n$ ${command}`);
	const { stdout, stderr } = await execAsync(command, {
		maxBuffer: 1024 * 1024 * 10,
	});
	if (stdout.trim().length > 0) {
		console.log(stdout.trim());
	}
	if (stderr.trim().length > 0) {
		console.log(stderr.trim());
	}
}

async function capture(command: string): Promise<string> {
	const { stdout } = await execAsync(command, {
		maxBuffer: 1024 * 1024 * 10,
	});
	return stdout.trim();
}

async function getProductionDatabaseUrl(app?: string): Promise<string> {
	const appFlag = app ? ` -a ${app}` : "";
	const command = `heroku config:get DATABASE_URL${appFlag}`;
	const value = await capture(command);

	if (!value) {
		throw new Error(
			"DATABASE_URL is empty in Heroku config. Check app name and authentication.",
		);
	}

	return value;
}

async function runSchemaPreflight(databaseUrl: string): Promise<void> {
	console.log("\n🔎 Running production schema preflight...");

	const sql = postgres(databaseUrl, {
		max: 1,
		prepare: false,
		idle_timeout: 5,
		connect_timeout: 10,
	});

	try {
		await sql`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1
					FROM pg_type t
					JOIN pg_namespace n ON n.oid = t.typnamespace
					WHERE t.typname = 'match_result_type'
						AND n.nspname = 'public'
				) THEN
					CREATE TYPE "public"."match_result_type" AS ENUM('normal', 'wo');
				END IF;
			END
			$$;
		`;

		await sql`
			ALTER TABLE "public"."matches"
			ADD COLUMN IF NOT EXISTS "result_type" "public"."match_result_type"
			DEFAULT 'normal' NOT NULL;
		`;

		console.log("✅ Preflight completed (enum + column guards).");
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const appFlag = opts.app ? ` -a ${opts.app}` : "";

	console.log("🚀 Starting production DB release flow...");
	console.log(
		`Configuration: generate=${!opts.skipGenerate}, backup=${!opts.skipBackup}, preflight=${!opts.skipPreflight}, app=${opts.app ?? "(default Heroku app context)"}`,
	);

	if (!opts.skipGenerate) {
		await run("bun run db:generate");
	}

	if (!opts.skipBackup) {
		await run(`heroku pg:backups:capture${appFlag}`);
	}

	if (!opts.skipPreflight) {
		const databaseUrl = await getProductionDatabaseUrl(opts.app);
		await runSchemaPreflight(databaseUrl);
	}

	await run("bun run db:migrate:prod");

	console.log("\n✅ Production DB release completed.");
}

main().catch((error) => {
	console.error("\n❌ Production DB release failed.");
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});

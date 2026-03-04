import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type Options = {
	app?: string;
	skipGenerate: boolean;
	skipBackup: boolean;
};

function printHelp(): void {
	console.log(
		"\nProd DB release helper\n\nUsage:\n  bun run db:release:prod -- [options]\n\nOptions:\n  --app <name>         Heroku app name (optional)\n  --skip-generate      Skip drizzle migration generation\n  --skip-backup        Skip Heroku backup capture\n  --help               Show this help\n\nExamples:\n  bun run db:release:prod -- --app my-heroku-app\n  bun run db:release:prod -- --skip-generate\n",
	);
}

function parseArgs(argv: string[]): Options {
	const opts: Options = {
		skipGenerate: false,
		skipBackup: false,
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

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));
	const appFlag = opts.app ? ` -a ${opts.app}` : "";

	console.log("🚀 Starting production DB release flow...");
	console.log(
		`Configuration: generate=${!opts.skipGenerate}, backup=${!opts.skipBackup}, app=${opts.app ?? "(default Heroku app context)"}`,
	);

	if (!opts.skipGenerate) {
		await run("bun run db:generate");
	}

	if (!opts.skipBackup) {
		await run(`heroku pg:backups:capture${appFlag}`);
	}

	await run("bun run db:migrate:prod");

	console.log("\n✅ Production DB release completed.");
}

main().catch((error) => {
	console.error("\n❌ Production DB release failed.");
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});

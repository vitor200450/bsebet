/**
 * Script para migrar dados do banco local para Heroku Postgres
 *
 * Uso: bun run scripts/migrate-to-heroku.ts
 *
 * Este script:
 * 1. Verifica conexão com banco local
 * 2. Faz dump do schema e dados
 * 3. Importa para o Heroku
 * 4. Verifica integridade
 */

import { spawn } from "child_process";
import { config } from "dotenv";
import { unlink, writeFile } from "fs/promises";

config({ path: ".env.local" });

const HEROKU_APP = "bsebet-prod";
const DUMP_FILE = "heroku_migration_dump.sql";
const HEROKU_CMD = "C:\\Program Files\\Heroku\\bin\\heroku.cmd";

function execCommand(command: string, args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, { shell: true });
		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (data) => {
			stdout += data.toString();
			process.stdout.write(data);
		});

		proc.stderr.on("data", (data) => {
			stderr += data.toString();
			process.stderr.write(data);
		});

		proc.on("close", (code) => {
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`Command failed: ${stderr}`));
			}
		});
	});
}

async function checkLocalDatabase(): Promise<boolean> {
	console.log("🔍 Verificando banco local...");

	try {
		const dbUrl = process.env.DATABASE_URL;
		if (!dbUrl) {
			throw new Error("DATABASE_URL não encontrada no .env.local");
		}

		const { db } = await import("../packages/db/src/index");

		// Test query
		const result = await db.query.teams.findMany({ limit: 1 });
		console.log(
			`✅ Banco local conectado (${result.length} time(s) encontrado)`,
		);

		return true;
	} catch (error) {
		console.error("❌ Erro ao conectar no banco local:", error);
		return false;
	}
}

async function createDump(): Promise<boolean> {
	console.log("\n💾 Criando dump do banco local...");

	try {
		// Usa pg_dump para criar dump completo
		await execCommand("pg_dump", [
			"-h",
			"localhost",
			"-p",
			"5432",
			"-U",
			"postgres",
			"-d",
			"bsebet",
			"-f",
			DUMP_FILE,
			"--no-owner", // Remove owner para evitar conflitos
			"--no-privileges", // Remove privileges
		]);

		console.log(`✅ Dump criado: ${DUMP_FILE}`);
		return true;
	} catch (error) {
		console.error("❌ Erro ao criar dump:", error);
		return false;
	}
}

async function migrateToHeroku(): Promise<boolean> {
	console.log("\n🚀 Migrando para Heroku...");

	try {
		// Verifica se app existe
		await execCommand(HEROKU_CMD, ["apps:info", "-a", HEROKU_APP]);

		// Reseta o banco do Heroku (limpa tudo)
		console.log("⚠️  Limpando banco do Heroku...");
		await execCommand(HEROKU_CMD, [
			"pg:reset",
			"DATABASE_URL",
			"-a",
			HEROKU_APP,
			"--confirm",
			HEROKU_APP,
		]);

		// Importa o dump
		console.log("📤 Importando dados...");
		await execCommand(HEROKU_CMD, [
			"pg:psql",
			"-a",
			HEROKU_APP,
			"-f",
			DUMP_FILE,
		]);

		console.log("✅ Migração concluída!");
		return true;
	} catch (error) {
		console.error("❌ Erro na migração:", error);
		return false;
	}
}

async function verifyMigration(): Promise<boolean> {
	console.log("\n✅ Verificando migração...");

	try {
		// Lista tabelas no Heroku
		const result = await execCommand(HEROKU_CMD, [
			"pg:psql",
			"-a",
			HEROKU_APP,
			"-c",
			"\\dt",
		]);

		console.log("📊 Tabelas migradas:", result);

		// Conta registros
		const counts = await execCommand(HEROKU_CMD, [
			"pg:psql",
			"-a",
			HEROKU_APP,
			"-c",
			"SELECT 'Teams' as tabela, COUNT(*) as total FROM teams UNION ALL SELECT 'Tournaments', COUNT(*) FROM tournaments UNION ALL SELECT 'Matches', COUNT(*) FROM matches UNION ALL SELECT 'Users', COUNT(*) FROM \"user\";",
		]);

		console.log("\n📈 Contagem de registros:");
		console.log(counts);

		return true;
	} catch (error) {
		console.error("❌ Erro na verificação:", error);
		return false;
	}
}

async function cleanup(): Promise<void> {
	try {
		await unlink(DUMP_FILE);
		console.log("\n🧹 Arquivo temporário removido");
	} catch {
		// Ignora erro se arquivo não existe
	}
}

async function main() {
	console.log("========================================");
	console.log("  MIGRAÇÃO PARA HEROKU POSTGRES");
	console.log("========================================\n");

	try {
		// Passo 1: Verifica banco local
		if (!(await checkLocalDatabase())) {
			process.exit(1);
		}

		// Passo 2: Cria dump
		if (!(await createDump())) {
			process.exit(1);
		}

		// Passo 3: Migra para Heroku
		if (!(await migrateToHeroku())) {
			process.exit(1);
		}

		// Passo 4: Verifica migração
		if (!(await verifyMigration())) {
			process.exit(1);
		}

		console.log("\n========================================");
		console.log("  ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
		console.log("========================================");
		console.log("\nPróximos passos:");
		console.log("1. Configure as variáveis de ambiente no Heroku");
		console.log("2. Faça o deploy do app");
		console.log("3. Teste a aplicação");
	} catch (error) {
		console.error("\n❌ Erro fatal:", error);
		process.exit(1);
	} finally {
		await cleanup();
	}
}

main();

/**
 * Script para migrar logos Base64 do banco para Cloudflare R2
 *
 * Uso: bun run scripts/migrate-logos-to-r2.ts
 *
 * Este script:
 * 1. Busca todas as logos em Base64 no banco
 * 2. Faz upload para o R2
 * 3. Atualiza o banco com a URL pública do R2
 */

import { config } from "dotenv";

// Usar banco local + credenciais R2
config({ path: ".env.local" });

// Carregar apenas variáveis R2 do .env.production (não sobrescrever DATABASE_URL)
const r2Env = config({ path: ".env.production", processEnv: {} });
if (r2Env.parsed) {
	process.env.R2_ENDPOINT = r2Env.parsed.R2_ENDPOINT;
	process.env.R2_ACCESS_KEY_ID = r2Env.parsed.R2_ACCESS_KEY_ID;
	process.env.R2_SECRET_ACCESS_KEY = r2Env.parsed.R2_SECRET_ACCESS_KEY;
	process.env.R2_BUCKET_NAME = r2Env.parsed.R2_BUCKET_NAME;
	process.env.R2_PUBLIC_URL = r2Env.parsed.R2_PUBLIC_URL;
}

import { eq, isNotNull, like } from "drizzle-orm";
import {
	base64ToBuffer,
	getTeamLogoKey,
	getTournamentLogoKey,
	isBase64DataUrl,
	uploadLogoToR2,
} from "../apps/web/src/server/r2";
import { db } from "../packages/db/src/index";
import { teams, tournaments } from "../packages/db/src/schema/index";

// Configurações
const BATCH_SIZE = 10; // Processa 10 logos por vez para não sobrecarregar
const DELAY_BETWEEN_BATCHES = 1000; // 1 segundo entre batches

interface MigrationResult {
	success: number;
	failed: number;
	skipped: number;
	errors: string[];
}

async function migrateTeamLogos(): Promise<MigrationResult> {
	console.log("🏁 Iniciando migração de logos dos times...\n");

	const result: MigrationResult = {
		success: 0,
		failed: 0,
		skipped: 0,
		errors: [],
	};

	// Busca times com logos em Base64
	const teamsWithLogos = await db.query.teams.findMany({
		where: isNotNull(teams.logoUrl),
	});

	console.log(`📊 Encontrados ${teamsWithLogos.length} times com logos`);

	for (let i = 0; i < teamsWithLogos.length; i += BATCH_SIZE) {
		const batch = teamsWithLogos.slice(i, i + BATCH_SIZE);

		console.log(
			`\n🔄 Processando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(teamsWithLogos.length / BATCH_SIZE)}...`,
		);

		for (const team of batch) {
			try {
				// Pula se não tiver logo
				if (!team.logoUrl) {
					result.skipped++;
					continue;
				}

				// Pula se já for URL externa (já migrada)
				if (team.logoUrl.startsWith("http")) {
					console.log(`  ⏭️  Time ${team.id} (${team.name}): Já é URL externa`);
					result.skipped++;
					continue;
				}

				// Verifica se é Base64 válido
				if (!isBase64DataUrl(team.logoUrl)) {
					console.log(
						`  ⚠️  Time ${team.id} (${team.name}): Formato inválido, pulando`,
					);
					result.skipped++;
					continue;
				}

				// Converte Base64 para Buffer
				const { buffer, contentType } = base64ToBuffer(team.logoUrl);

				// Determina extensão do arquivo
				const extension = contentType.split("/")[1] || "png";

				// Gera a chave do R2
				const key = getTeamLogoKey(team.id, extension);

				// Faz upload para o R2
				const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

				// Atualiza o banco com a nova URL
				await db
					.update(teams)
					.set({ logoUrl: publicUrl })
					.where(eq(teams.id, team.id));

				console.log(`  ✅ Time ${team.id} (${team.name}): Migrado com sucesso`);
				console.log(`     URL: ${publicUrl}`);
				result.success++;
			} catch (error) {
				const errorMsg = `Time ${team.id} (${team.name}): ${error instanceof Error ? error.message : "Unknown error"}`;
				console.error(`  ❌ ${errorMsg}`);
				result.errors.push(errorMsg);
				result.failed++;
			}
		}

		// Delay entre batches para não sobrecarregar a API
		if (i + BATCH_SIZE < teamsWithLogos.length) {
			console.log(
				`   ⏳ Aguardando ${DELAY_BETWEEN_BATCHES}ms antes do próximo batch...`,
			);
			await new Promise((resolve) =>
				setTimeout(resolve, DELAY_BETWEEN_BATCHES),
			);
		}
	}

	return result;
}

async function migrateTournamentLogos(): Promise<MigrationResult> {
	console.log("\n🏁 Iniciando migração de logos dos torneios...\n");

	const result: MigrationResult = {
		success: 0,
		failed: 0,
		skipped: 0,
		errors: [],
	};

	// Busca torneios com logos em Base64
	const tournamentsWithLogos = await db.query.tournaments.findMany({
		where: isNotNull(tournaments.logoUrl),
	});

	console.log(
		`📊 Encontrados ${tournamentsWithLogos.length} torneios com logos`,
	);

	for (let i = 0; i < tournamentsWithLogos.length; i += BATCH_SIZE) {
		const batch = tournamentsWithLogos.slice(i, i + BATCH_SIZE);

		console.log(
			`\n🔄 Processando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tournamentsWithLogos.length / BATCH_SIZE)}...`,
		);

		for (const tournament of batch) {
			try {
				// Pula se não tiver logo
				if (!tournament.logoUrl) {
					result.skipped++;
					continue;
				}

				// Pula se já for URL externa (já migrada)
				if (tournament.logoUrl.startsWith("http")) {
					console.log(
						`  ⏭️  Torneio ${tournament.id} (${tournament.name}): Já é URL externa`,
					);
					result.skipped++;
					continue;
				}

				// Verifica se é Base64 válido
				if (!isBase64DataUrl(tournament.logoUrl)) {
					console.log(
						`  ⚠️  Torneio ${tournament.id} (${tournament.name}): Formato inválido, pulando`,
					);
					result.skipped++;
					continue;
				}

				// Converte Base64 para Buffer
				const { buffer, contentType } = base64ToBuffer(tournament.logoUrl);

				// Determina extensão do arquivo
				const extension = contentType.split("/")[1] || "png";

				// Gera a chave do R2
				const key = getTournamentLogoKey(tournament.id, extension);

				// Faz upload para o R2
				const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

				// Atualiza o banco com a nova URL
				await db
					.update(tournaments)
					.set({ logoUrl: publicUrl })
					.where(eq(tournaments.id, tournament.id));

				console.log(
					`  ✅ Torneio ${tournament.id} (${tournament.name}): Migrado com sucesso`,
				);
				console.log(`     URL: ${publicUrl}`);
				result.success++;
			} catch (error) {
				const errorMsg = `Torneio ${tournament.id} (${tournament.name}): ${error instanceof Error ? error.message : "Unknown error"}`;
				console.error(`  ❌ ${errorMsg}`);
				result.errors.push(errorMsg);
				result.failed++;
			}
		}

		// Delay entre batches
		if (i + BATCH_SIZE < tournamentsWithLogos.length) {
			console.log(
				`   ⏳ Aguardando ${DELAY_BETWEEN_BATCHES}ms antes do próximo batch...`,
			);
			await new Promise((resolve) =>
				setTimeout(resolve, DELAY_BETWEEN_BATCHES),
			);
		}
	}

	return result;
}

async function main() {
	console.log("=".repeat(60));
	console.log("  MIGRAÇÃO DE LOGOS PARA CLOUDFLARE R2");
	console.log("=".repeat(60));
	console.log();

	// Verifica variáveis de ambiente
	const requiredEnvVars = [
		"R2_ENDPOINT",
		"R2_ACCESS_KEY_ID",
		"R2_SECRET_ACCESS_KEY",
		"R2_BUCKET_NAME",
		"R2_PUBLIC_URL",
	];

	const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

	if (missingVars.length > 0) {
		console.error("❌ Erro: Variáveis de ambiente necessárias:");
		missingVars.forEach((v) => console.error(`   - ${v}`));
		console.error("\nConfigure-as no arquivo .env antes de continuar.");
		process.exit(1);
	}

	console.log("✅ Variáveis de ambiente configuradas\n");

	try {
		// Migra logos dos times
		const teamsResult = await migrateTeamLogos();

		// Migra logos dos torneios
		const tournamentsResult = await migrateTournamentLogos();

		// Resumo
		console.log("\n" + "=".repeat(60));
		console.log("  RESUMO DA MIGRAÇÃO");
		console.log("=".repeat(60));
		console.log();
		console.log("Times:");
		console.log(`  ✅ Sucesso: ${teamsResult.success}`);
		console.log(`  ❌ Falhas: ${teamsResult.failed}`);
		console.log(`  ⏭️  Pulados: ${teamsResult.skipped}`);
		console.log();
		console.log("Torneios:");
		console.log(`  ✅ Sucesso: ${tournamentsResult.success}`);
		console.log(`  ❌ Falhas: ${tournamentsResult.failed}`);
		console.log(`  ⏭️  Pulados: ${tournamentsResult.skipped}`);
		console.log();

		if (teamsResult.errors.length > 0 || tournamentsResult.errors.length > 0) {
			console.log("⚠️  Erros encontrados:");
			[...teamsResult.errors, ...tournamentsResult.errors].forEach((e) => {
				console.log(`   - ${e}`);
			});
		}

		console.log();
		console.log("=".repeat(60));
		console.log("  MIGRAÇÃO CONCLUÍDA!");
		console.log("=".repeat(60));
	} catch (error) {
		console.error("\n❌ Erro fatal durante a migração:", error);
		process.exit(1);
	}
}

main();

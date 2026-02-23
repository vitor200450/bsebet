/**
 * Server Function para migrar logos do banco para R2
 */

import { createServerFn } from "@tanstack/react-start";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "../../../../packages/db/src/index";
import { teams, tournaments } from "../../../../packages/db/src/schema/index";
import {
	base64ToBuffer,
	getTeamLogoKey,
	getTournamentLogoKey,
	isBase64DataUrl,
	uploadLogoToR2,
} from "./r2";

// Configurações
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES = 500;

interface MigrationResult {
	success: number;
	failed: number;
	skipped: number;
	errors: string[];
}

interface FullMigrationResult {
	success: boolean;
	timestamp: string;
	teams: MigrationResult;
	tournaments: MigrationResult;
	errors: string[];
}

async function migrateTeamLogos(): Promise<MigrationResult> {
	const result: MigrationResult = {
		success: 0,
		failed: 0,
		skipped: 0,
		errors: [],
	};

	const teamsWithLogos = await db.query.teams.findMany({
		where: isNotNull(teams.logoUrl),
	});

	for (let i = 0; i < teamsWithLogos.length; i += BATCH_SIZE) {
		const batch = teamsWithLogos.slice(i, i + BATCH_SIZE);

		for (const team of batch) {
			try {
				if (!team.logoUrl) {
					result.skipped++;
					continue;
				}

				if (team.logoUrl.startsWith("http")) {
					result.skipped++;
					continue;
				}

				if (!isBase64DataUrl(team.logoUrl)) {
					result.skipped++;
					continue;
				}

				const { buffer, contentType } = base64ToBuffer(team.logoUrl);
				const extension = contentType.split("/")[1] || "png";
				const key = getTeamLogoKey(team.id, extension);

				const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

				await db
					.update(teams)
					.set({ logoUrl: publicUrl })
					.where(eq(teams.id, team.id));

				result.success++;
			} catch (error) {
				const errorMsg = `Time ${team.id} (${team.name}): ${error instanceof Error ? error.message : "Unknown error"}`;
				result.errors.push(errorMsg);
				result.failed++;
			}
		}

		if (i + BATCH_SIZE < teamsWithLogos.length) {
			await new Promise((resolve) =>
				setTimeout(resolve, DELAY_BETWEEN_BATCHES),
			);
		}
	}

	return result;
}

async function migrateTournamentLogos(): Promise<MigrationResult> {
	const result: MigrationResult = {
		success: 0,
		failed: 0,
		skipped: 0,
		errors: [],
	};

	const tournamentsWithLogos = await db.query.tournaments.findMany({
		where: isNotNull(tournaments.logoUrl),
	});

	for (let i = 0; i < tournamentsWithLogos.length; i += BATCH_SIZE) {
		const batch = tournamentsWithLogos.slice(i, i + BATCH_SIZE);

		for (const tournament of batch) {
			try {
				if (!tournament.logoUrl) {
					result.skipped++;
					continue;
				}

				if (tournament.logoUrl.startsWith("http")) {
					result.skipped++;
					continue;
				}

				if (!isBase64DataUrl(tournament.logoUrl)) {
					result.skipped++;
					continue;
				}

				const { buffer, contentType } = base64ToBuffer(tournament.logoUrl);
				const extension = contentType.split("/")[1] || "png";
				const key = getTournamentLogoKey(tournament.id, extension);

				const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

				await db
					.update(tournaments)
					.set({ logoUrl: publicUrl })
					.where(eq(tournaments.id, tournament.id));

				result.success++;
			} catch (error) {
				const errorMsg = `Torneio ${tournament.id} (${tournament.name}): ${error instanceof Error ? error.message : "Unknown error"}`;
				result.errors.push(errorMsg);
				result.failed++;
			}
		}

		if (i + BATCH_SIZE < tournamentsWithLogos.length) {
			await new Promise((resolve) =>
				setTimeout(resolve, DELAY_BETWEEN_BATCHES),
			);
		}
	}

	return result;
}

export const migrateLogosToR2 = createServerFn({ method: "POST" }).handler(
	async (): Promise<FullMigrationResult> => {
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
			throw new Error(
				`Variáveis de ambiente necessárias: ${missingVars.join(", ")}`,
			);
		}

		// Migra logos dos times
		const teamsResult = await migrateTeamLogos();

		// Migra logos dos torneios
		const tournamentsResult = await migrateTournamentLogos();

		return {
			success: true,
			timestamp: new Date().toISOString(),
			teams: teamsResult,
			tournaments: tournamentsResult,
			errors: [...teamsResult.errors, ...tournamentsResult.errors],
		};
	},
);

import { auth } from "@bsebet/auth";
import { bets, matches } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

// Schema for Bet Submission
const betSubmissionSchema = z.object({
	matchId: z.number().int().positive("Match ID deve ser um número positivo"),
	predictedWinnerId: z
		.number()
		.int()
		.positive("Winner ID deve ser um número positivo"),
	predictedScoreA: z
		.number()
		.int()
		.min(0, "Score A deve ser >= 0")
		.max(10, "Score A deve ser <= 10"),
	predictedScoreB: z
		.number()
		.int()
		.min(0, "Score B deve ser >= 0")
		.max(10, "Score B deve ser <= 10"),
});

// Schema for Multiple Bets Submission
const multipleBetsSchema = z.object({
	bets: z.array(betSubmissionSchema).min(1, "Deve haver pelo menos uma aposta"),
});

type BetSubmission = z.infer<typeof betSubmissionSchema>;
type MultipleBetsInput = z.infer<typeof multipleBetsSchema>;

/**
 * Submit a single bet
 * Validates:
 * - User is authenticated
 * - Match exists and betting is enabled
 * - Match hasn't started yet (startTime > now)
 */
const submitBetFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");

	// 1. Check authentication
	const session = await auth.api.getSession({
		headers: ctx.request.headers,
	});

	if (!session?.user) {
		throw new Error("Usuário não autenticado");
	}

	const userId = session.user.id;
	const data = ctx.data as BetSubmission;

	// 2. Validate input
	const validData = betSubmissionSchema.parse(data);

	// 3. Fetch match and validate
	const match = await db.query.matches.findFirst({
		where: eq(matches.id, validData.matchId),
		with: {
			tournament: true,
		},
	});

	if (!match) {
		throw new Error("Partida não encontrada");
	}

	// 4. Check if betting is enabled
	if (!match.isBettingEnabled) {
		throw new Error("Apostas desabilitadas para esta partida");
	}

	// 5. Check if match hasn't started yet
	// RELAXED CHECK: Allow betting if status is 'scheduled', even if time passed.
	// Only block if explicitly live or finished.
	const isStarted = match.status === "live" || match.status === "finished";

	if (isStarted) {
		throw new Error("Apostas encerradas - a partida já começou");
	}

	// 6. Validate predicted winner is one of the teams
	// Only validate if both teams are defined (not TBD)
	if (match.teamAId && match.teamBId) {
		if (
			validData.predictedWinnerId !== match.teamAId &&
			validData.predictedWinnerId !== match.teamBId
		) {
			throw new Error("Vencedor previsto deve ser um dos times da partida");
		}
	}

	// 7. Validate score consistency
	let winnerScore: number;
	let loserScore: number;

	if (match.teamAId && match.teamBId) {
		const winnerIsTeamA = validData.predictedWinnerId === match.teamAId;
		winnerScore = winnerIsTeamA
			? validData.predictedScoreA
			: validData.predictedScoreB;
		loserScore = winnerIsTeamA
			? validData.predictedScoreB
			: validData.predictedScoreA;
	} else {
		// TBD Match: We don't know who is A or B, so we assume winner has high score
		winnerScore = Math.max(
			validData.predictedScoreA,
			validData.predictedScoreB,
		);
		loserScore = Math.min(validData.predictedScoreA, validData.predictedScoreB);
	}

	if (winnerScore <= loserScore) {
		throw new Error("O vencedor deve ter mais pontos que o perdedor");
	}

	// Determine Best Of X (default to Bo5)
	let bestOf = 5;
	const format = match.tournament?.format?.toLowerCase() || "";
	if (format.includes("bo1")) bestOf = 1;
	else if (format.includes("bo3")) bestOf = 3;
	else if (format.includes("bo5")) bestOf = 5;
	else if (format.includes("bo7")) bestOf = 7;

	const winsNeeded = Math.ceil(bestOf / 2);

	if (winnerScore !== winsNeeded) {
		throw new Error(
			`Para uma partida Bo${bestOf}, o vencedor deve ter exatamente ${winsNeeded} pontos`,
		);
	}

	// 8. Check if user already has a bet for this match (upsert logic)
	const existingBet = await db.query.bets.findFirst({
		where: and(eq(bets.userId, userId), eq(bets.matchId, validData.matchId)),
	});

	let savedBet;

	if (existingBet) {
		// Update existing bet
		const updated = await db
			.update(bets)
			.set({
				predictedWinnerId: validData.predictedWinnerId,
				predictedScoreA: validData.predictedScoreA,
				predictedScoreB: validData.predictedScoreB,
			})
			.where(eq(bets.id, existingBet.id))
			.returning();
		savedBet = updated[0];
	} else {
		// Insert new bet
		const inserted = await db
			.insert(bets)
			.values({
				userId,
				matchId: validData.matchId,
				predictedWinnerId: validData.predictedWinnerId,
				predictedScoreA: validData.predictedScoreA,
				predictedScoreB: validData.predictedScoreB,
			})
			.returning();
		savedBet = inserted[0];
	}

	return {
		success: true,
		bet: savedBet,
		message: existingBet
			? "Aposta atualizada com sucesso"
			: "Aposta registrada com sucesso",
	};
});

export const submitBet = submitBetFn as unknown as (opts: {
	data: BetSubmission;
}) => Promise<{
	success: boolean;
	bet: typeof bets.$inferSelect;
	message: string;
}>;

/**
 * Submit multiple bets at once
 * Validates all bets and saves them in a transaction
 */
const submitMultipleBetsFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");

	// 1. Check authentication
	const session = await auth.api.getSession({
		headers: ctx.request.headers,
	});

	if (!session?.user) {
		throw new Error("Usuário não autenticado");
	}

	const userId = session.user.id;
	const data = ctx.data as MultipleBetsInput;

	// 2. Validate input
	const validData = multipleBetsSchema.parse(data);

	// 3. Validate all matches exist and are open for betting
	const matchIds = validData.bets.map((bet) => bet.matchId);
	const matchesData = await db.query.matches.findMany({
		where: (matches, { inArray }) => inArray(matches.id, matchIds),
		with: {
			tournament: true,
		},
	});

	const errors: string[] = [];
	// Track which matchIds are being submitted as first-time recovery bets
	const recoveryMatchIds = new Set<number>();

	// Validate each bet
	for (const betData of validData.bets) {
		const match = matchesData.find((m) => m.id === betData.matchId);

		if (!match) {
			errors.push(`Partida ${betData.matchId} não encontrada`);
			continue;
		}

		// Allow recovery bets if user already has a bet for this match
		let existingBet = null;
		if (!match.isBettingEnabled) {
			// Check if user has an existing bet (recovery mode)
			existingBet = await db.query.bets.findFirst({
				where: and(eq(bets.userId, userId), eq(bets.matchId, betData.matchId)),
			});

			// If no existing bet, reject
			if (!existingBet) {
				errors.push(`Apostas desabilitadas para partida ${betData.matchId}`);
				continue;
			}

			// Block re-submission if user already has a recovery bet AND the matchup hasn't changed
			if (existingBet.isRecovery) {
				const matchupChanged =
					(match.teamAId &&
						existingBet.predictedWinnerId !== match.teamAId &&
						existingBet.predictedWinnerId !== match.teamBId) ||
					!match.teamAId ||
					!match.teamBId;

				if (!matchupChanged) {
					// Matchup is the same - block re-submission
					errors.push(
						`Aposta de recuperação para partida ${betData.matchId} já foi realizada e não pode ser alterada.`,
					);
					continue;
				}
				// Matchup changed - allow re-submission
			}

			// Mark as recovery bet (for new recovery submissions or re-submissions when matchup changed)
			recoveryMatchIds.add(betData.matchId);
		}

		// RELAXED CHECK: Allow betting if status is 'scheduled', even if time passed.
		// Only block if explicitly live or finished.
		const isStarted = match.status === "live" || match.status === "finished";

		if (isStarted) {
			errors.push(`Partida ${betData.matchId} já começou`);
			continue;
		}

		if (match.teamAId && match.teamBId) {
			if (
				betData.predictedWinnerId !== match.teamAId &&
				betData.predictedWinnerId !== match.teamBId
			) {
				errors.push(`Vencedor inválido para partida ${betData.matchId}`);
				continue;
			}
		}

		let winnerScore: number;
		let loserScore: number;

		if (match.teamAId && match.teamBId) {
			const winnerIsTeamA = betData.predictedWinnerId === match.teamAId;
			winnerScore = winnerIsTeamA
				? betData.predictedScoreA
				: betData.predictedScoreB;
			loserScore = winnerIsTeamA
				? betData.predictedScoreB
				: betData.predictedScoreA;
		} else {
			// TBD Match: We don't know who is A or B, so we assume winner has high score
			winnerScore = Math.max(betData.predictedScoreA, betData.predictedScoreB);
			loserScore = Math.min(betData.predictedScoreA, betData.predictedScoreB);
		}

		if (winnerScore <= loserScore) {
			errors.push(
				`Placar inconsistente para partida ${betData.matchId}: Vencedor deve ter mais pontos`,
			);
			continue;
		}

		// Determine Best Of X (default to Bo5)
		let bestOf = 5;
		const format = match.tournament?.format?.toLowerCase() || "";
		if (format.includes("bo1")) bestOf = 1;
		else if (format.includes("bo3")) bestOf = 3;
		else if (format.includes("bo5")) bestOf = 5;
		else if (format.includes("bo7")) bestOf = 7;

		const winsNeeded = Math.ceil(bestOf / 2);

		if (winnerScore !== winsNeeded) {
			errors.push(
				`Para partida ${betData.matchId} (Bo${bestOf}), o vencedor deve ter ${winsNeeded} pontos`,
			);
		}
	}
	// isRecoveryBet was only used to populate recoveryMatchIds (set per-bet above)

	if (errors.length > 0) {
		throw new Error(`Erros de validação:\n${errors.join("\n")}`);
	}

	// 4. Safe "Upsert" Strategy: Transactional Delete + Insert
	// This guarantees atomicity: no other request can see the "deleted" state or insert in between.
	// Filter out duplicates (keep last one wins strategy or first one? usually last one)
	const uniqueBets = new Map();
	validData.bets.forEach((bet) => {
		uniqueBets.set(bet.matchId, bet);
	});
	const finalBets = Array.from(uniqueBets.values());

	// 4. Safe "Upsert" Strategy: Transactional Delete + Insert
	// This guarantees atomicity: no other request can see the "deleted" state or insert in between.
	const inserted = await db.transaction(async (tx) => {
		// Execute DELETE within transaction
		await tx
			.delete(bets)
			.where(and(eq(bets.userId, userId), inArray(bets.matchId, matchIds)));

		// Execute INSERT within transaction
		if (finalBets.length === 0) return [];

		const newBets = await tx
			.insert(bets)
			.values(
				finalBets.map((bet) => ({
					userId,
					matchId: bet.matchId,
					predictedWinnerId: bet.predictedWinnerId,
					predictedScoreA: bet.predictedScoreA,
					predictedScoreB: bet.predictedScoreB,
					// Mark as recovery if this is the first-time submission in recovery mode
					isRecovery: recoveryMatchIds.has(bet.matchId),
				})),
			)
			.returning();

		return newBets;
	});

	return {
		success: true,
		bets: inserted,
		message: `${inserted.length} aposta(s) salva(s) com sucesso`,
	};
});

export const submitMultipleBets = submitMultipleBetsFn as unknown as (opts: {
	data: MultipleBetsInput;
}) => Promise<{
	success: boolean;
	bets: (typeof bets.$inferSelect)[];
	message: string;
}>;

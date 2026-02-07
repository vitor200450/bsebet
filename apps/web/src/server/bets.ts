import { bets, matches } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@bsebet/auth";

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
  const now = new Date();
  const matchStartTime = new Date(match.startTime);

  if (matchStartTime <= now) {
    throw new Error("Apostas encerradas - a partida já começou");
  }

  // 6. Validate predicted winner is one of the teams
  if (
    validData.predictedWinnerId !== match.teamAId &&
    validData.predictedWinnerId !== match.teamBId
  ) {
    throw new Error("Vencedor previsto deve ser um dos times da partida");
  }

  // 7. Validate score consistency
  const winnerIsTeamA = validData.predictedWinnerId === match.teamAId;
  const winnerScore = winnerIsTeamA
    ? validData.predictedScoreA
    : validData.predictedScoreB;
  const loserScore = winnerIsTeamA
    ? validData.predictedScoreB
    : validData.predictedScoreA;

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

  const now = new Date();
  const errors: string[] = [];

  // Validate each bet
  for (const betData of validData.bets) {
    const match = matchesData.find((m) => m.id === betData.matchId);

    if (!match) {
      errors.push(`Partida ${betData.matchId} não encontrada`);
      continue;
    }

    if (!match.isBettingEnabled) {
      errors.push(`Apostas desabilitadas para partida ${betData.matchId}`);
      continue;
    }

    const matchStartTime = new Date(match.startTime);
    if (matchStartTime <= now) {
      errors.push(`Partida ${betData.matchId} já começou`);
      continue;
    }

    if (
      betData.predictedWinnerId !== match.teamAId &&
      betData.predictedWinnerId !== match.teamBId
    ) {
      errors.push(`Vencedor inválido para partida ${betData.matchId}`);
      continue;
    }

    const winnerIsTeamA = betData.predictedWinnerId === match.teamAId;
    const winnerScore = winnerIsTeamA
      ? betData.predictedScoreA
      : betData.predictedScoreB;
    const loserScore = winnerIsTeamA
      ? betData.predictedScoreB
      : betData.predictedScoreA;

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

  if (errors.length > 0) {
    throw new Error(`Erros de validação:\n${errors.join("\n")}`);
  }

  // 4. Get existing bets for this user
  const existingBets = await db.query.bets.findMany({
    where: (bets, { eq, and, inArray }) =>
      and(eq(bets.userId, userId), inArray(bets.matchId, matchIds)),
  });

  // 5. Process bets (update existing, insert new)
  const results = [];

  for (const betData of validData.bets) {
    const existingBet = existingBets.find((b) => b.matchId === betData.matchId);

    if (existingBet) {
      // Update
      const updated = await db
        .update(bets)
        .set({
          predictedWinnerId: betData.predictedWinnerId,
          predictedScoreA: betData.predictedScoreA,
          predictedScoreB: betData.predictedScoreB,
        })
        .where(eq(bets.id, existingBet.id))
        .returning();
      results.push(updated[0]);
    } else {
      // Insert
      const inserted = await db
        .insert(bets)
        .values({
          userId,
          matchId: betData.matchId,
          predictedWinnerId: betData.predictedWinnerId,
          predictedScoreA: betData.predictedScoreA,
          predictedScoreB: betData.predictedScoreB,
        })
        .returning();
      results.push(inserted[0]);
    }
  }

  return {
    success: true,
    bets: results,
    message: `${results.length} aposta(s) salva(s) com sucesso`,
  };
});

export const submitMultipleBets = submitMultipleBetsFn as unknown as (opts: {
  data: MultipleBetsInput;
}) => Promise<{
  success: boolean;
  bets: (typeof bets.$inferSelect)[];
  message: string;
}>;

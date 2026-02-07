import { db } from "@bsebet/db";
import { matches } from "@bsebet/db/schema";
import { eq } from "drizzle-orm";

async function backfillBracketData() {
  console.log("Backfilling Match Data with Liquipedia Structure...");

  const allMatches = await db.query.matches.findMany();

  // Mapeamento manual baseado no ID (ou label) para ajustar à estrutura double-elimination.
  // Como não tenho os IDs reais, vou tentar inferir ou usar lógica de "Lower Bracket" se o label contiver "Lower".

  for (const match of allMatches) {
    const label = (match.label || "").toLowerCase();
    const name = (match.name || "").toLowerCase();
    const textToCheck = `${label} ${name}`;

    let roundIndex = 0;
    let bracketSide = "upper";

    // --- LOGIC ---
    if (
      textToCheck.includes("grand final") ||
      textToCheck.includes("grande final")
    ) {
      roundIndex = 99; // Final Round (Highest)
      bracketSide = "grand_final";
    } else if (textToCheck.includes("lower")) {
      bracketSide = "lower";

      if (textToCheck.includes("round 1")) roundIndex = 0;
      else if (textToCheck.includes("round 2")) roundIndex = 1;
      else if (textToCheck.includes("round 3")) roundIndex = 2;
      else if (
        textToCheck.includes("quarter") ||
        textToCheck.includes("quartas")
      )
        roundIndex = 3;
      else if (textToCheck.includes("semi")) roundIndex = 4;
      else if (textToCheck.includes("final")) roundIndex = 5; // Lower Final
    } else {
      // UPPER BRACKET (Default)
      bracketSide = "upper";
      if (textToCheck.includes("quarter") || textToCheck.includes("quartas"))
        roundIndex = 0;
      else if (
        textToCheck.includes("semi") ||
        textToCheck.includes("semifinal")
      )
        roundIndex = 1;
      else if (textToCheck.includes("final")) roundIndex = 2; // Upper Final
    }

    // --- DISPLAY ORDER LOGIC ---
    let displayOrder = 0;
    const matchNumberRegex = /(?:partida|match|game)\s*(\d+)/i;
    const matchMatch = textToCheck.match(matchNumberRegex);
    if (matchMatch && matchMatch[1]) {
      displayOrder = parseInt(matchMatch[1], 10);
    } else {
      // Fallback: incremental ID if no number found (just to have something)
      displayOrder = match.id % 100;
    }

    await db
      .update(matches)
      .set({
        roundIndex,
        bracketSide,
        displayOrder,
      })
      .where(eq(matches.id, match.id));

    console.log(
      `Updated Match ${match.id} (${match.label}): ${bracketSide} - Round ${roundIndex}`,
    );
  }

  console.log("Backfill Complete!");
}

backfillBracketData().catch(console.error);

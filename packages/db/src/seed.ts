import { db } from "./index";
import { tournaments, teams, tournamentTeams, matches } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Iniciando Seed (Estratégia: Bracket Progression)...");

  // 1. Criar Times
  const teamsData = [
    { name: "LOUD", slug: "loud", region: "SA" },
    { name: "Bolibas Prime", slug: "bolibas-prime", region: "SA" },
    { name: "Eternal", slug: "eternal", region: "SA" },
    { name: "Creche Brawl", slug: "creche-brawl", region: "SA" },
    { name: "SKCalalas", slug: "skcalalas", region: "SA" },
    { name: "KaioPerro", slug: "kaioperro", region: "SA" },
    { name: "New Heights Gaming", slug: "nhg", region: "SA" },
    { name: "Alguém Segura", slug: "alguem-segura", region: "SA" },
  ];

  for (const team of teamsData) {
    await db.insert(teams).values(team).onConflictDoNothing();
  }

  const allTeams = await db.select().from(teams);

  const getTeamId = (name: string) => {
    const team = allTeams.find((t) => t.name === name);
    if (!team) throw new Error(`Time não encontrado: ${name}`);
    return team.id;
  };

  // 2. Criar Torneio
  await db
    .insert(tournaments)
    .values({
      name: "Supremacy League (Playoffs)",
      slug: "supremacy-league-2026",
      scoringRules: { winner: 1, exact: 3, underdog_25: 1 },
      isActive: true,
    })
    .onConflictDoNothing();

  const finalTournament = await db.query.tournaments.findFirst({
    where: (t, { eq }) => eq(t.slug, "supremacy-league-2026"),
  });

  if (!finalTournament) throw new Error("Falha ao encontrar torneio");

  // 3. Inscrever times no torneio
  await db
    .insert(tournamentTeams)
    .values(
      allTeams.map((t) => ({
        tournamentId: finalTournament.id,
        teamId: t.id,
      })),
    )
    .onConflictDoNothing();

  // 4. Limpar jogos antigos
  await db.delete(matches).where(eq(matches.tournamentId, finalTournament.id));

  // 5. Criar Jogos - LOWER BRACKET (Primeiro, para termos os IDs)
  const lowerBracketMatches = await db
    .insert(matches)
    .values([
      {
        tournamentId: finalTournament.id,
        label: "DAY 1 - LOWER BRACKET ROUND 1",
        labelTeamA: "Perdedor UQ1",
        labelTeamB: "Perdedor UQ2",
        startTime: new Date("2026-02-10T18:00:00"),
        status: "scheduled",
      },
      {
        tournamentId: finalTournament.id,
        label: "DAY 1 - LOWER BRACKET ROUND 1",
        labelTeamA: "Perdedor UQ3",
        labelTeamB: "Perdedor UQ4",
        startTime: new Date("2026-02-10T19:00:00"),
        status: "scheduled",
      },
    ])
    .returning();

  // 6. Criar Jogos - UPPER BRACKET (Com links para o Lower)
  await db.insert(matches).values([
    {
      tournamentId: finalTournament.id,
      label: "DAY 1 - UPPER BRACKET QUARTERFINALS",
      teamAId: getTeamId("LOUD"),
      teamBId: getTeamId("Bolibas Prime"),
      startTime: new Date("2026-02-10T14:00:00"),
      status: "scheduled",
      labelTeamA: "LOUD",
      labelTeamB: "Bolibas Prime",
      nextMatchLoserId: lowerBracketMatches[0]!.id,
      nextMatchLoserSlot: "A",
    },
    {
      tournamentId: finalTournament.id,
      label: "DAY 1 - UPPER BRACKET QUARTERFINALS",
      teamAId: getTeamId("Eternal"),
      teamBId: getTeamId("Creche Brawl"),
      startTime: new Date("2026-02-10T15:00:00"),
      status: "scheduled",
      labelTeamA: "Eternal",
      labelTeamB: "Creche Brawl",
      nextMatchLoserId: lowerBracketMatches[0]!.id,
      nextMatchLoserSlot: "B",
    },
    {
      tournamentId: finalTournament.id,
      label: "DAY 1 - UPPER BRACKET QUARTERFINALS",
      teamAId: getTeamId("SKCalalas"),
      teamBId: getTeamId("KaioPerro"),
      startTime: new Date("2026-02-10T16:00:00"),
      status: "scheduled",
      labelTeamA: "SKCalalas",
      labelTeamB: "KaioPerro",
      nextMatchLoserId: lowerBracketMatches[1]!.id,
      nextMatchLoserSlot: "A",
    },
    {
      tournamentId: finalTournament.id,
      label: "DAY 1 - UPPER BRACKET QUARTERFINALS",
      teamAId: getTeamId("New Heights Gaming"),
      teamBId: getTeamId("Alguém Segura"),
      startTime: new Date("2026-02-10T17:00:00"),
      status: "scheduled",
      labelTeamA: "New Heights Gaming",
      labelTeamB: "Alguém Segura",
      nextMatchLoserId: lowerBracketMatches[1]!.id,
      nextMatchLoserSlot: "B",
    },
  ]);

  console.log("✅ Seed concluído com sucesso!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

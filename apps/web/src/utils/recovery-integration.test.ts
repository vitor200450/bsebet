// @ts-nocheck
import { describe, expect, it } from "bun:test";

/**
 * Teste de integração simulando o cenário completo do bug.
 *
 * Cenário: Torneio com 2 Match Days
 * - Match Day 1 (locked): Quartas de Final
 *   * QF1: A vs B → Resultado: B ganhou (usuário apostou em A)
 *   * QF2: C vs D → Resultado: D ganhou (usuário apostou em C)
 *
 * - Match Day 2 (locked): Semi Finais
 *   * SF1: B vs D → Times definidos via bracket progression
 *
 * Problema: O usuário deve poder apostar na SF1 como recovery,
 * mas o sistema pode estar bloqueando por causa da filtragem por match day.
 */
describe("BUG: Recovery em torneio com múltiplos match days", () => {
	const teams = {
		A: { id: 1, name: "Time A" },
		B: { id: 2, name: "Time B" },
		C: { id: 3, name: "Time C" },
		D: { id: 4, name: "Time D" },
	};

	const matchDays = [
		{ id: 1, label: "Quartas de Final", status: "locked" },
		{ id: 2, label: "Semi Finais", status: "locked" },
	];

	const allBracketMatches = [
		// Match Day 1: Quartas
		{
			id: 1,
			matchDayId: 1,
			status: "finished",
			resultType: "normal",
			winnerId: teams.B.id,
			teamAId: teams.A.id,
			teamBId: teams.B.id,
			teamA: teams.A,
			teamB: teams.B,
			teamAPreviousMatchId: null,
			teamBPreviousMatchId: null,
			bracketSide: "upper",
			roundIndex: 0,
			label: "Quarter-Final #1",
		},
		{
			id: 2,
			matchDayId: 1,
			status: "finished",
			resultType: "normal",
			winnerId: teams.D.id,
			teamAId: teams.C.id,
			teamBId: teams.D.id,
			teamA: teams.C,
			teamB: teams.D,
			teamAPreviousMatchId: null,
			teamBPreviousMatchId: null,
			bracketSide: "upper",
			roundIndex: 0,
			label: "Quarter-Final #2",
		},
		// Match Day 2: Semi Final
		// Times já definidos via bracket progression (nextMatchWinnerId)
		{
			id: 3,
			matchDayId: 2,
			status: "scheduled",
			resultType: "normal",
			winnerId: null,
			teamAId: teams.B.id, // Vencedor de QF1
			teamBId: teams.D.id, // Vencedor de QF2
			teamA: teams.B,
			teamB: teams.D,
			teamAPreviousMatchId: 1,
			teamBPreviousMatchId: 2,
			bracketSide: "upper",
			roundIndex: 1,
			label: "Semi-Final #1",
		},
	];

	const userBets = [
		{ matchId: 1, predictedWinnerId: teams.A.id, isRecovery: false }, // Errou!
		{ matchId: 2, predictedWinnerId: teams.C.id, isRecovery: false }, // Errou!
	];

	function calculateEditableRecoveryMatchIds(
		matches: any[],
		bets: any[],
		selectedMatchDayId: number | null,
		matchDaysList: any[],
	) {
		const editableIds = new Set<number>();

		// Verificar se algum match day está locked
		const isTournamentInRecovery = matchDaysList.some(
			(md: any) => md.status === "locked",
		);
		if (!isTournamentInRecovery) {
			return editableIds;
		}

		// Encontrar partidas "erradas" (finished com aposta errada ou sem aposta)
		const wrongMatchIds = new Set<number>();
		matches.forEach((match) => {
			if (match.status !== "finished" || !match.winnerId) return;
			if (match.resultType === "wo") return;

			const mId = Number(match.id);
			const serverBet = bets.find((b: any) => Number(b.matchId) === mId);

			if (
				!serverBet ||
				Number(serverBet.predictedWinnerId) !== Number(match.winnerId)
			) {
				wrongMatchIds.add(mId);
			}
		});

		console.log("wrongMatchIds:", Array.from(wrongMatchIds));

		// Encontrar todos os descendentes das partidas erradas
		const findAllDependents = (sourceIds: Set<number>): Set<number> => {
			const result = new Set<number>();
			const toProcess = Array.from(sourceIds);

			while (toProcess.length > 0) {
				const matchId = Number(toProcess.shift());

				matches.forEach((m: any) => {
					if (m.status !== "scheduled") return;

					const dependsOnCurrent =
						(m.teamAPreviousMatchId &&
							Number(m.teamAPreviousMatchId) === matchId) ||
						(m.teamBPreviousMatchId &&
							Number(m.teamBPreviousMatchId) === matchId);

					if (dependsOnCurrent) {
						const descendantId = Number(m.id);
						if (!result.has(descendantId)) {
							result.add(descendantId);
							toProcess.push(descendantId);
						}
					}
				});
			}

			return result;
		};

		const dependentMatchIds = findAllDependents(wrongMatchIds);
		console.log("dependentMatchIds:", Array.from(dependentMatchIds));

		// Lógica de decisão para cada match
		matches.forEach((match: any) => {
			const matchId = Number(match.id);
			if (match.status !== "scheduled") return;
			if (match.resultType === "wo") return;

			const serverBet = bets.find((b: any) => Number(b.matchId) === matchId);

			// CASE 1: Match é descendente de partida errada
			if (dependentMatchIds.has(matchId)) {
				const recoveryBet = bets.find(
					(b: any) => Number(b.matchId) === matchId && b.isRecovery,
				);

				if (recoveryBet) {
					// Verificar se matchup mudou
					const currentTeamAId = match.teamA?.id
						? Number(match.teamA.id)
						: null;
					const currentTeamBId = match.teamB?.id
						? Number(match.teamB.id)
						: null;

					const matchupChanged =
						!currentTeamAId ||
						!currentTeamBId ||
						(recoveryBet.predictedWinnerId !== currentTeamAId &&
							recoveryBet.predictedWinnerId !== currentTeamBId);

					if (!matchupChanged) {
						return; // Matchup igual, já apostou
					}
				}
				editableIds.add(matchId);
				return;
			}

			// CASE 2: Bracket match sem aposta
			const isBracketMatch =
				match.teamAPreviousMatchId ||
				match.teamBPreviousMatchId ||
				(match.roundIndex ?? 0) >= 100 ||
				match.bracketSide ||
				(match.label?.toLowerCase().includes("semi") ?? false) ||
				(match.label?.toLowerCase().includes("final") ?? false);

			if (isBracketMatch && !serverBet && match.teamA?.id && match.teamB?.id) {
				editableIds.add(matchId);
				return;
			}

			// CASE 3: Usuário tem aposta mas times mudaram
			if (serverBet && match.teamA?.id && match.teamB?.id) {
				const predicted = Number(serverBet.predictedWinnerId);
				const teamAId = Number(match.teamA?.id);
				const teamBId = Number(match.teamB?.id);
				if (predicted !== teamAId && predicted !== teamBId) {
					editableIds.add(matchId);
				}
			}
		});

		// IMPORTANTE: Filtrar por match day selecionado
		// Este é o possível BUG!
		if (selectedMatchDayId) {
			const allowedIds = new Set(
				matches
					.filter(
						(m: any) => Number(m.matchDayId) === Number(selectedMatchDayId),
					)
					.map((m: any) => Number(m.id)),
			);

			console.log("selectedMatchDayId:", selectedMatchDayId);
			console.log("allowedIds for selected day:", Array.from(allowedIds));
			console.log("editableIds before filter:", Array.from(editableIds));

			const filtered = new Set(
				Array.from(editableIds).filter((id) => allowedIds.has(Number(id))),
			);

			console.log("editableIds after filter:", Array.from(filtered));
			return filtered;
		}

		return editableIds;
	}

	it("usuário deve ver SF como editable quando seleciona MD das semis", () => {
		// Quando o usuário está no Match Day 2 (Semi Finais)
		const editableIds = calculateEditableRecoveryMatchIds(
			allBracketMatches,
			userBets,
			2, // Selecionando Match Day das Semis
			matchDays,
		);

		console.log("Resultado (MD2 selecionado):", Array.from(editableIds));

		// A SF (id 3) deve estar disponível
		expect(editableIds.has(3)).toBeTrue();
	});

	it("usuário NÃO vê SF quando está no MD das quartas - ISSO PODE SER O BUG!", () => {
		// Quando o usuário está no Match Day 1 (Quartas)
		const editableIds = calculateEditableRecoveryMatchIds(
			allBracketMatches,
			userBets,
			1, // Selecionando Match Day das Quartas
			matchDays,
		);

		console.log("Resultado (MD1 selecionado):", Array.from(editableIds));

		// A SF (id 3) NÃO está no MD1, então não aparece!
		// Isso pode confundir o usuário
		expect(editableIds.has(3)).toBeFalse();
	});

	it("quando nenhum MD selecionado, todas as partidas recovery devem aparecer", () => {
		const editableIds = calculateEditableRecoveryMatchIds(
			allBracketMatches,
			userBets,
			null, // Nenhum match day selecionado
			matchDays,
		);

		console.log("Resultado (nenhum MD selecionado):", Array.from(editableIds));

		// Todas as partidas recovery devem aparecer
		expect(editableIds.has(3)).toBeTrue();
	});
});

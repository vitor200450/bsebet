// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
	buildRecoveryDependencySet,
	isRecoverySubmissionAllowed,
} from "./recovery";

/**
 * Teste reproduzindo o bug relatado:
 *
 * Cenário: Final mensal com quartas de final
 * - QF1: Time A vs Time B
 * - QF2: Time C vs Time D
 * - SF1: Vencedor QF1 vs Vencedor QF2
 *
 * O usuário aposta nas quartas:
 * - QF1: Apostou que A ganha (mas resultado real foi B)
 * - QF2: Apostou que C ganha (mas resultado real foi D)
 *
 * Resultado real:
 * - QF1: B ganhou (finished, winnerId = B)
 * - QF2: D ganhou (finished, winnerId = D)
 *
 * Agora na SF1: B vs D
 * O usuário DEVE poder apostar na SF1 (recovery), já que errou as previsões anteriores.
 *
 * BUG: O usuário NÃO consegue apostar na SF1!
 */
describe("BUG: Recovery betting quando usuário erra todas as apostas das quartas", () => {
	const teams = {
		A: { id: 1, name: "Time A" },
		B: { id: 2, name: "Time B" },
		C: { id: 3, name: "Time C" },
		D: { id: 4, name: "Time D" },
	};

	it("deve permitir recovery na semifinal quando usuário erra ambas as quartas", () => {
		const matches = [
			// Quartas de Final - Já finalizadas
			{
				id: 1, // QF1: A vs B
				status: "finished",
				resultType: "normal",
				winnerId: teams.B.id, // B ganhou (usuário apostou em A)
				teamAId: teams.A.id,
				teamBId: teams.B.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
				label: "Quarter-Final #1",
			},
			{
				id: 2, // QF2: C vs D
				status: "finished",
				resultType: "normal",
				winnerId: teams.D.id, // D ganhou (usuário apostou em C)
				teamAId: teams.C.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
				label: "Quarter-Final #2",
			},
			// Semi-Final - Ainda scheduled, times já definidos (B vs D)
			{
				id: 3, // SF1: B vs D
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: teams.B.id, // B veio de QF1
				teamBId: teams.D.id, // D veio de QF2
				teamAPreviousMatchId: 1, // Depende de QF1
				teamBPreviousMatchId: 2, // Depende de QF2
				bracketSide: "upper",
				roundIndex: 1,
				label: "Semi-Final #1",
			},
		];

		const userBets = [
			{ matchId: 1, predictedWinnerId: teams.A.id }, // Errou! Apostou em A, ganhou B
			{ matchId: 2, predictedWinnerId: teams.C.id }, // Errou! Apostou em C, ganhou D
		];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		// A semifinal (id 3) deve estar no dependencySet
		// porque depende de partidas onde o usuário errou
		console.log("dependencySet:", Array.from(dependencySet));
		console.log(
			"Esperado: [3] (semi-final deve estar disponível para recovery)",
		);

		expect(dependencySet.has(3)).toBeTrue();

		// Verificar se a SF está disponível para recovery submission
		const sfMatch = matches.find((m) => m.id === 3);
		const isAllowed = isRecoverySubmissionAllowed({
			match: sfMatch,
			hasExistingBet: false,
			dependencyEligible: dependencySet.has(3),
		});

		console.log("isRecoverySubmissionAllowed:", isAllowed);
		console.log("Esperado: true");

		expect(isAllowed).toBeTrue();
	});

	it("deve permitir recovery na final quando usuário erra uma das semis", () => {
		const matches = [
			// Quartas
			{
				id: 1,
				status: "finished",
				resultType: "normal",
				winnerId: teams.A.id,
				teamAId: teams.A.id,
				teamBId: teams.B.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			{
				id: 2,
				status: "finished",
				resultType: "normal",
				winnerId: teams.C.id,
				teamAId: teams.C.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			// Semi 1: A vs C - usuário acertou!
			{
				id: 3,
				status: "finished",
				resultType: "normal",
				winnerId: teams.A.id,
				teamAId: teams.A.id,
				teamBId: teams.C.id,
				teamAPreviousMatchId: 1,
				teamBPreviousMatchId: 2,
				bracketSide: "upper",
				roundIndex: 1,
			},
			// Semi 2: B vs D - usuário errou!
			{
				id: 4,
				status: "finished",
				resultType: "normal",
				winnerId: teams.D.id, // D ganhou, mas usuário apostou em B
				teamAId: teams.B.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 1,
			},
			// Final: A vs D
			{
				id: 5,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: teams.A.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: 3,
				teamBPreviousMatchId: 4,
				bracketSide: "upper",
				roundIndex: 2,
				label: "Final",
			},
		];

		const userBets = [
			{ matchId: 1, predictedWinnerId: teams.A.id }, // Acertou
			{ matchId: 2, predictedWinnerId: teams.C.id }, // Acertou
			{ matchId: 3, predictedWinnerId: teams.A.id }, // Acertou
			{ matchId: 4, predictedWinnerId: teams.B.id }, // Errou! Apostou em B, ganhou D
		];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		console.log("dependencySet (final):", Array.from(dependencySet));
		console.log("Esperado: [5] (final deve estar disponível para recovery)");

		// A final deve estar no dependencySet porque depende da Semi 2 onde o usuário errou
		expect(dependencySet.has(5)).toBeTrue();

		const finalMatch = matches.find((m) => m.id === 5);
		const isAllowed = isRecoverySubmissionAllowed({
			match: finalMatch,
			hasExistingBet: false,
			dependencyEligible: dependencySet.has(5),
		});

		expect(isAllowed).toBeTrue();
	});

	/**
	 * Cenário adicional: Usuário não fez NENHUMA aposta nas quartas
	 * Deve poder apostar na semifinal como recovery?
	 */
	it("deve permitir recovery quando usuário não apostou nas quartas", () => {
		const matches = [
			{
				id: 1,
				status: "finished",
				resultType: "normal",
				winnerId: teams.B.id,
				teamAId: teams.A.id,
				teamBId: teams.B.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			{
				id: 2,
				status: "finished",
				resultType: "normal",
				winnerId: teams.D.id,
				teamAId: teams.C.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: null,
				teamBPreviousMatchId: null,
				bracketSide: "upper",
				roundIndex: 0,
			},
			{
				id: 3,
				status: "scheduled",
				resultType: "normal",
				winnerId: null,
				teamAId: teams.B.id,
				teamBId: teams.D.id,
				teamAPreviousMatchId: 1,
				teamBPreviousMatchId: 2,
				bracketSide: "upper",
				roundIndex: 1,
				label: "Semi-Final #1",
			},
		];

		// Usuário NÃO fez apostas nas quartas
		const userBets: { matchId: number; predictedWinnerId: number }[] = [];

		const dependencySet = buildRecoveryDependencySet(matches, userBets);

		console.log("dependencySet (sem apostas):", Array.from(dependencySet));

		// Quando não há apostas, considera-se "wrong" (falta de aposta = erro)
		// Então a semifinal deve estar no dependencySet
		expect(dependencySet.size).toBe(1);
		expect(dependencySet.has(3)).toBeTrue();
	});
});

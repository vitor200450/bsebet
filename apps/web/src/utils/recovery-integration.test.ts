// @ts-nocheck
import { describe, expect, it } from "bun:test";

/**
 * Integration test simulating the full bug scenario.
 *
 * Scenario: Tournament with 2 Match Days
 * - Match Day 1 (locked): Quarterfinals
 *   * QF1: A vs B → Result: B won (user bet on A)
 *   * QF2: C vs D → Result: D won (user bet on C)
 *
 * - Match Day 2 (locked): Semifinals
 *   * SF1: B vs D → Teams defined via bracket progression
 *
 * Problem: User should be able to bet on SF1 as recovery,
 * but the system may be blocking it due to match day filtering.
 */
describe("BUG: Recovery in tournament with multiple match days", () => {
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
		// Match Day 1: Quarterfinals
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
		// Match Day 2: Semifinal
		// Teams already defined via bracket progression (nextMatchWinnerId)
		{
			id: 3,
			matchDayId: 2,
			status: "scheduled",
			resultType: "normal",
			winnerId: null,
			teamAId: teams.B.id, // Winner of QF1
			teamBId: teams.D.id, // Winner of QF2
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
		{ matchId: 1, predictedWinnerId: teams.A.id, isRecovery: false }, // Wrong!
		{ matchId: 2, predictedWinnerId: teams.C.id, isRecovery: false }, // Wrong!
	];

	function calculateEditableRecoveryMatchIds(
		matches: any[],
		bets: any[],
		selectedMatchDayId: number | null,
		matchDaysList: any[],
	) {
		const editableIds = new Set<number>();

		// Check if any match day is locked
		const isTournamentInRecovery = matchDaysList.some(
			(md: any) => md.status === "locked",
		);
		if (!isTournamentInRecovery) {
			return editableIds;
		}

		// Find "wrong" matches (finished with wrong bet or no bet)
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

		// Find all descendants of wrong matches
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

		// Decision logic for each match
		matches.forEach((match: any) => {
			const matchId = Number(match.id);
			if (match.status !== "scheduled") return;
			if (match.resultType === "wo") return;

			const serverBet = bets.find((b: any) => Number(b.matchId) === matchId);

			// CASE 1: Match is descendant of a wrong match
			if (dependentMatchIds.has(matchId)) {
				const recoveryBet = bets.find(
					(b: any) => Number(b.matchId) === matchId && b.isRecovery,
				);

				if (recoveryBet) {
					// Check if matchup changed
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
						return; // Same matchup, already bet
					}
				}
				editableIds.add(matchId);
				return;
			}

			// CASE 2: Bracket match without bet
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

			// CASE 3: User has bet but teams changed
			if (serverBet && match.teamA?.id && match.teamB?.id) {
				const predicted = Number(serverBet.predictedWinnerId);
				const teamAId = Number(match.teamA?.id);
				const teamBId = Number(match.teamB?.id);
				if (predicted !== teamAId && predicted !== teamBId) {
					editableIds.add(matchId);
				}
			}
		});

		// IMPORTANT: Filter by selected match day
		// This is the possible BUG!
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

	it("user should see SF as editable when selecting semifinal MD", () => {
		// When user is on Match Day 2 (Semifinals)
		const editableIds = calculateEditableRecoveryMatchIds(
			allBracketMatches,
			userBets,
			2, // Selecting Semifinal Match Day
			matchDays,
		);

		console.log("Result (MD2 selected):", Array.from(editableIds));

		// SF (id 3) should be available
		expect(editableIds.has(3)).toBeTrue();
	});

	it("user does NOT see SF when on quarterfinal MD - THIS COULD BE THE BUG!", () => {
		// When user is on Match Day 1 (Quarterfinals)
		const editableIds = calculateEditableRecoveryMatchIds(
			allBracketMatches,
			userBets,
			1, // Selecting Quarterfinal Match Day
			matchDays,
		);

		console.log("Result (MD1 selected):", Array.from(editableIds));

		// SF (id 3) is NOT in MD1, so it doesn't appear!
		// This can confuse the user
		expect(editableIds.has(3)).toBeFalse();
	});

	it("when no MD selected, all recovery matches should appear", () => {
		const editableIds = calculateEditableRecoveryMatchIds(
			allBracketMatches,
			userBets,
			null, // No match day selected
			matchDays,
		);

		console.log("Result (no MD selected):", Array.from(editableIds));

		// All recovery matches should appear
		expect(editableIds.has(3)).toBeTrue();
	});
});

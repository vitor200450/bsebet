type CanEditExistingOpenBetInput = {
	existingPredictedWinnerId: number | null;
	teamAId: number | null;
	teamBId: number | null;
};

export function canEditExistingOpenBet({
	existingPredictedWinnerId,
	teamAId,
	teamBId,
}: CanEditExistingOpenBetInput): boolean {
	if (existingPredictedWinnerId === null) {
		return false;
	}

	if (teamAId === null || teamBId === null) {
		return false;
	}

	return (
		existingPredictedWinnerId !== teamAId &&
		existingPredictedWinnerId !== teamBId
	);
}

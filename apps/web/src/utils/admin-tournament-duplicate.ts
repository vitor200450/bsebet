/**
 * Runs a tournament mutation and only refreshes route loaders after it completes.
 */
export async function runTournamentListRefreshAfterMutation<T>({
	mutate,
	invalidate,
}: {
	mutate: () => Promise<T>;
	invalidate: () => Promise<void>;
}): Promise<T> {
	const result = await mutate();
	await invalidate();
	return result;
}

type QueryErrorToastParams = {
	queryKey: readonly unknown[];
	error: Error;
};

export function shouldShowGlobalQueryErrorToast({
	queryKey,
}: QueryErrorToastParams): boolean {
	return queryKey[0] !== "liveStatus";
}

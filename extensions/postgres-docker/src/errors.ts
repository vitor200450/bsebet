export type NormalizedDbError = {
	kind:
		| "ConnectionError"
		| "AuthError"
		| "QueryError"
		| "TimeoutError"
		| "DiscoveryError";
	message: string;
	operation: string;
	code?: string;
};

export function normalizeDbError(
	error: any,
	operation: string,
): NormalizedDbError {
	const code = error?.code as string | undefined;
	if (code === "28P01")
		return { kind: "AuthError", message: error.message, operation, code };
	if (code === "57014")
		return { kind: "TimeoutError", message: error.message, operation, code };
	if (code?.startsWith("08"))
		return { kind: "ConnectionError", message: error.message, operation, code };
	return {
		kind: "QueryError",
		message: error?.message ?? "Unknown DB error",
		operation,
		code,
	};
}

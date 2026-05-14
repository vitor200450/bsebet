import { describe, expect, it } from "bun:test";
import { normalizeDbError } from "../src/errors";

describe("normalizeDbError", () => {
	it("maps auth errors", () => {
		const err = normalizeDbError(
			{ code: "28P01", message: "bad password" } as Error,
			"query",
		);
		expect(err.kind).toBe("AuthError");
	});

	it("maps connection errors", () => {
		const err = normalizeDbError(
			{ code: "08001", message: "connection refused" } as Error,
			"connect",
		);
		expect(err.kind).toBe("ConnectionError");
	});

	it("maps query errors", () => {
		const err = normalizeDbError({ message: "syntax error" } as Error, "query");
		expect(err.kind).toBe("QueryError");
	});
});

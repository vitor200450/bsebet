import { describe, expect, it } from "bun:test";
import { shouldShowGlobalQueryErrorToast } from "./query-errors";

describe("global query error handling", () => {
	it("suppresses live status polling errors", () => {
		expect(
			shouldShowGlobalQueryErrorToast({
				queryKey: ["liveStatus"],
				error: new Error(
					'Failed query: select count(*) from "matches" where "matches"."status" = $1 params: live',
				),
			}),
		).toBeFalse();
	});

	it("keeps toasts enabled for normal query errors", () => {
		expect(
			shouldShowGlobalQueryErrorToast({
				queryKey: ["dashboard"],
				error: new Error("Dashboard failed"),
			}),
		).toBeTrue();
	});
});

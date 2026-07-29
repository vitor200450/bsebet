import { describe, expect, test } from "bun:test";
import { extractGroupIdentifier } from "./extract-group-identifier";

describe("extractGroupIdentifier", () => {
	test("parses English and Portuguese group labels", () => {
		expect(extractGroupIdentifier("Group A")).toBe("A");
		expect(extractGroupIdentifier("Grupo B")).toBe("B");
		expect(extractGroupIdentifier("Group A - Match 1")).toBe("A");
		expect(extractGroupIdentifier("grupo c")).toBe("C");
	});

	test("returns null for non-group labels", () => {
		expect(extractGroupIdentifier("Quarter-Final #1")).toBeNull();
		expect(extractGroupIdentifier(null)).toBeNull();
		expect(extractGroupIdentifier("")).toBeNull();
	});
});

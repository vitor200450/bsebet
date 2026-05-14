import { describe, expect, it } from "bun:test";
import { EXTENSION_NAME } from "../src/types";

describe("smoke", () => {
	it("exports extension name", () => {
		expect(EXTENSION_NAME).toBe("postgres-docker");
	});
});

import { describe, expect, it } from "bun:test";
import { parseEnvText } from "../src/discovery/env";

describe("parseEnvText", () => {
	it("parses key-value pairs", () => {
		const env = parseEnvText("PGHOST=localhost\nPGPORT=5432\n");
		expect(env.PGHOST).toBe("localhost");
		expect(env.PGPORT).toBe("5432");
	});
});

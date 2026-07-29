import { describe, expect, test } from "bun:test";
import {
	formatScoreDisplay,
	normalizeScoreDisplay,
	scoresEqual,
} from "./score-format";

describe("score-format", () => {
	test("normalizeScoreDisplay adds spaces around dash", () => {
		expect(normalizeScoreDisplay("3-1")).toBe("3 - 1");
		expect(normalizeScoreDisplay("3 - 1")).toBe("3 - 1");
	});

	test("scoresEqual treats compact and spaced scores as equal", () => {
		expect(scoresEqual("3-1", "3 - 1")).toBe(true);
		expect(scoresEqual("2-0", "2 - 0")).toBe(true);
		expect(scoresEqual("3-1", "3 - 2")).toBe(false);
	});

	test("formatScoreDisplay matches carousel option labels", () => {
		expect(formatScoreDisplay(3, 1)).toBe("3 - 1");
	});
});

import { describe, expect, it } from "bun:test";
import {
	getCalendarFocusDate,
	getStageEndDateBounds,
	getStageStartDateBounds,
	isDateInRange,
} from "./date-range";

describe("date-range", () => {
	it("detects out-of-range dates", () => {
		expect(isDateInRange("2026-02-01", "2026-03-01", "2026-03-31")).toBe(false);
		expect(isDateInRange("2026-03-15", "2026-03-01", "2026-03-31")).toBe(true);
	});

	it("ignores invalid stage end when bounding stage start", () => {
		const bounds = getStageStartDateBounds(
			{ startDate: "2026-01-01", endDate: "2026-01-15" },
			"2026-03-01",
			"2026-03-31",
		);

		expect(bounds).toEqual({
			minDate: "2026-03-01",
			maxDate: "2026-03-31",
		});
	});

	it("ignores invalid stage start when bounding stage end", () => {
		const bounds = getStageEndDateBounds(
			{ startDate: "2026-05-01", endDate: "2026-05-15" },
			"2026-03-01",
			"2026-03-31",
		);

		expect(bounds).toEqual({
			minDate: "2026-03-01",
			maxDate: "2026-03-31",
		});
	});

	it("focuses calendar on tournament start when current value is invalid", () => {
		const focus = getCalendarFocusDate(
			"2026-01-01",
			"2026-03-01",
			"2026-03-31",
		);

		expect(focus.getFullYear()).toBe(2026);
		expect(focus.getMonth()).toBe(2);
		expect(focus.getDate()).toBe(1);
	});
});

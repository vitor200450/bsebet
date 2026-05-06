import { beforeAll, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { selectPublicSwissMatches } from "@/server/swiss";

beforeAll(() => {
	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
		url: "http://localhost",
	});
	(global as any).document = dom.window.document;
	(global as any).window = dom.window;
});

describe("SwissStageView", () => {
	it("selectPublicSwissMatches filters out draft and disabled matches", () => {
		const matches = [
			{
				id: 1,
				isBettingEnabled: false,
				matchDayStatus: "draft",
			},
			{
				id: 2,
				isBettingEnabled: true,
				matchDayStatus: "open",
			},
			{
				id: 3,
				isBettingEnabled: true,
				matchDayStatus: "draft",
			},
		];

		const visible = selectPublicSwissMatches(matches);

		expect(visible.map((m) => m.id)).toEqual([2]);
	});
});

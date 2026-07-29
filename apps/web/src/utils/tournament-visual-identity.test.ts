import { describe, expect, test } from "bun:test";
import {
	getRegionPalette,
	normalizeTournamentRegion,
	resolveTournamentVisualIdentity,
} from "./tournament-visual-identity";

describe("normalizeTournamentRegion", () => {
	test("maps known region codes", () => {
		expect(normalizeTournamentRegion("ea")).toBe("EA");
		expect(normalizeTournamentRegion("GLOBAL")).toBe("GLOBAL");
	});

	test("falls back to UNKNOWN", () => {
		expect(normalizeTournamentRegion(null)).toBe("UNKNOWN");
		expect(normalizeTournamentRegion("mars")).toBe("UNKNOWN");
	});
});

describe("getRegionPalette", () => {
	test("returns East Asia magenta palette", () => {
		const palette = getRegionPalette("EA");
		expect(palette.accent).toBe("#EC00AC");
		expect(palette.lightText).toBe(true);
	});
});

describe("resolveTournamentVisualIdentity", () => {
	test("monthly finals + East Asia uses region accent on stage bar", () => {
		const identity = resolveTournamentVisualIdentity({
			presentationTheme: "monthly_finals",
			region: "EA",
			venueMode: "online",
		});

		expect(identity.theme).toBe("monthly_finals");
		expect(identity.region.code).toBe("EA");
		expect(identity.region.accent).toBe("#EC00AC");
		expect(identity.cardFrameClass).toBe("");
		expect(identity.decorDensity).toBe("standard");
	});

	test("major + global gets premium framing", () => {
		const identity = resolveTournamentVisualIdentity({
			eventKind: { presentationTheme: "major" },
			region: "Global",
			venueMode: "lan",
		});

		expect(identity.decorDensity).toBe("premium");
		expect(identity.venueMode).toBe("lan");
		expect(identity.cardFrameClass).toContain("border-[4px]");
	});

	test("qualifier stays minimal", () => {
		const identity = resolveTournamentVisualIdentity({
			presentationTheme: "qualifier",
			region: "NA",
		});

		expect(identity.decorDensity).toBe("minimal");
		expect(identity.region.code).toBe("NA");
	});
});

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const localeRoot = join(import.meta.dir, "..", "locales");

const publicLocaleFiles = [
	"common.json",
	"betting.json",
	"dashboard.json",
	"errors.json",
	"landing.json",
	"leaderboard.json",
	"my-bets.json",
	"profile.json",
	"team.json",
	"tournament.json",
	"user.json",
];

const publicComponentFiles = [
	join(import.meta.dir, "..", "components", "BettingCarousel.tsx"),
	join(import.meta.dir, "..", "components", "GlobalHeader.tsx"),
	join(import.meta.dir, "..", "components", "TournamentBracket.tsx"),
	join(import.meta.dir, "..", "components", "SwissStageView.tsx"),
	join(import.meta.dir, "..", "components", "TournamentSelector.tsx"),
	join(import.meta.dir, "..", "routes", "__root.tsx"),
	join(import.meta.dir, "..", "routes", "$lang", "login.tsx"),
	join(import.meta.dir, "..", "routes", "$lang", "my-bets.tsx"),
	join(import.meta.dir, "..", "routes", "$lang", "users", "$userId.tsx"),
	join(import.meta.dir, "..", "routes", "$lang", "tournaments", "$slug.tsx"),
];

const forbiddenPublicCopy = [
	/\bbet\b/i,
	/\bbets\b/i,
	/\bbetting\b/i,
	/\bbettors\b/i,
	/\baposta\b/i,
	/\bapostas\b/i,
];

const forbiddenPublicBrandCopy = /\bBSEBET\b/;

function flattenValues(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(flattenValues);
	if (value && typeof value === "object") {
		return Object.values(value).flatMap(flattenValues);
	}
	return [];
}

function collectLocaleViolations(): string[] {
	const violations: string[] = [];
	for (const lang of readdirSync(localeRoot)) {
		const langDir = join(localeRoot, lang);
		if (!statSync(langDir).isDirectory()) continue;
		for (const fileName of publicLocaleFiles) {
			const path = join(langDir, fileName);
			const values = flattenValues(JSON.parse(readFileSync(path, "utf8")));
			for (const value of values) {
				for (const pattern of forbiddenPublicCopy) {
					if (pattern.test(value)) {
						violations.push(`${path}: ${value}`);
						break;
					}
				}
			}
		}
	}
	return violations;
}

function collectBrandLocaleViolations(): string[] {
	const violations: string[] = [];
	for (const lang of readdirSync(localeRoot)) {
		const langDir = join(localeRoot, lang);
		if (!statSync(langDir).isDirectory()) continue;
		for (const fileName of publicLocaleFiles) {
			const path = join(langDir, fileName);
			const values = flattenValues(JSON.parse(readFileSync(path, "utf8")));
			for (const value of values) {
				if (forbiddenPublicBrandCopy.test(value)) {
					violations.push(`${path}: ${value}`);
				}
			}
		}
	}
	return violations;
}

function collectHardcodedViolations(): string[] {
	const violations: string[] = [];
	const jsxTextPattern = />\s*([^<{}`\n]*(?:Bet|Bets|Betting|Aposta|Apostas|BSEBET)[^<{}`\n]*)\s*</;
	const simpleStringPattern = /["']([^"'{}$]*(?:Bet|Bets|Betting|Aposta|Apostas|BSEBET|logo-new\.png)[^"'{}$]*)["']/;

	for (const path of publicComponentFiles) {
		const lines = readFileSync(path, "utf8").split("\n");
		lines.forEach((line, index) => {
			const text =
				line.match(jsxTextPattern)?.[1]?.trim() ??
				line.match(simpleStringPattern)?.[1]?.trim();
			if (!text) return;
			if (
				/^[\w.:-]+$/.test(text) ||
				text.startsWith("@/") ||
				text.includes("betting:") ||
				text.includes("my-bets") ||
				text.includes("BettingCarousel")
			) {
				return;
			}
			violations.push(`${path}:${index + 1}: ${text}`);
		});
	}
	return violations;
}

describe("public copy guard", () => {
	test("public locale values avoid gambling-coded copy", () => {
		expect(collectLocaleViolations()).toEqual([]);
	});

	test("public locale values use BSEN Pickems brand", () => {
		expect(collectBrandLocaleViolations()).toEqual([]);
	});

	test("selected public components avoid hardcoded gambling-coded copy and old assets", () => {
		expect(collectHardcodedViolations()).toEqual([]);
	});
});

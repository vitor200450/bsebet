import { describe, expect, test } from "bun:test";
import { getSiteFooterConfig } from "./site-footer-config";

describe("getSiteFooterConfig", () => {
	test("hides footer on admin routes", () => {
		expect(getSiteFooterConfig("/pt/admin/tournaments")).toEqual({
			show: false,
		});
		expect(getSiteFooterConfig("/en/admin/teams")).toEqual({ show: false });
	});

	test("uses marketing variant on landing, login, and index", () => {
		expect(getSiteFooterConfig("/pt/landing")).toEqual({
			show: true,
			variant: "marketing",
		});
		expect(getSiteFooterConfig("/en/login")).toEqual({
			show: true,
			variant: "marketing",
		});
		expect(getSiteFooterConfig("/pt")).toEqual({
			show: true,
			variant: "marketing",
		});
	});

	test("uses app variant on user surfaces", () => {
		expect(getSiteFooterConfig("/pt/dashboard")).toEqual({
			show: true,
			variant: "app",
		});
		expect(getSiteFooterConfig("/en/leaderboard")).toEqual({
			show: true,
			variant: "app",
		});
		expect(getSiteFooterConfig("/pt/terms")).toEqual({
			show: true,
			variant: "app",
		});
	});

	test("hides footer outside language routes", () => {
		expect(getSiteFooterConfig("/api/health")).toEqual({ show: false });
	});
});

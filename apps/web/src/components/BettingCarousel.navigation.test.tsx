import { beforeAll, describe, expect, mock, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import i18n from "i18next";
import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import type { Match, Prediction } from "@/components/bracket/types";
import bettingPt from "@/locales/pt/betting.json";
import commonPt from "@/locales/pt/common.json";

mock.module("@tanstack/react-router", () => ({
	Link: ({ children, ...props }: { children: ReactNode }) => (
		<a {...props}>{children}</a>
	),
}));

mock.module("@/i18n/useLangLink", () => ({
	useLangLink: () => ({
		lang: "pt",
		linkTo: () => "/pt",
		routeTo: () => ({ to: "/pt/teams/$teamId" }),
	}),
}));

mock.module("framer-motion", () => ({
	AnimatePresence: ({ children }: { children: ReactNode }) => children,
	motion: {
		div: ({
			children,
			...props
		}: { children?: ReactNode } & Record<string, unknown>) => (
			<div {...props}>{children}</div>
		),
	},
	useReducedMotion: () => true,
}));

function emptyStats() {
	return {
		regionA: "EA",
		regionB: "EA",
		pointsA: 0,
		pointsB: 0,
		formA: "0-0",
		formB: "0-0",
		winRateA: "50%",
		winRateB: "50%",
		seedA: null,
		seedB: null,
		groupA: null,
		groupB: null,
		betCountA: 0,
		betCountB: 0,
		streakA: 0,
		streakB: 0,
	};
}

function makeMatch(id: number, label: string): Match {
	return {
		id,
		label,
		format: "bo3",
		teamA: {
			id: id * 10 + 1,
			name: `Team A${id}`,
			slug: `team-a-${id}`,
			color: "blue",
		},
		teamB: {
			id: id * 10 + 2,
			name: `Team B${id}`,
			slug: `team-b-${id}`,
			color: "red",
		},
		stats: emptyStats(),
		startTime: "2026-07-16T12:00:00.000Z",
		tournamentName: "Test Cup",
		status: "scheduled",
	};
}

describe("BettingCarousel navigation requires complete pick", () => {
	beforeAll(async () => {
		const dom = new JSDOM("<!doctype html><html><body></body></html>");
		globalThis.window = dom.window as never;
		globalThis.document = dom.window.document;
		globalThis.navigator = dom.window.navigator as never;
		globalThis.HTMLElement = dom.window.HTMLElement as never;

		if (!i18n.isInitialized) {
			await i18n.use(initReactI18next).init({
				lng: "pt",
				fallbackLng: "pt",
				resources: {
					pt: { betting: bettingPt, common: commonPt },
				},
				interpolation: { escapeValue: false },
			});
		}
	});

	test("pagination dots must not jump ahead when current match has no score", async () => {
		const { BettingCarousel } = await import("@/components/BettingCarousel");
		const matches = [makeMatch(1, "QF 1"), makeMatch(2, "QF 2")];
		const predictions: Record<number, Prediction> = {};

		const view = render(
			<I18nextProvider i18n={i18n}>
				<BettingCarousel
					matches={matches}
					predictions={predictions}
					onUpdatePrediction={() => {}}
				/>
			</I18nextProvider>,
		);

		expect(view.getAllByText("QF 1").length).toBeGreaterThan(0);
		expect(view.queryAllByText("QF 2")).toHaveLength(0);

		const dotMatch2 = view.getByRole("button", {
			name: "Partida 2 de 2",
		});
		expect((dotMatch2 as HTMLButtonElement).disabled).toBe(true);
		fireEvent.click(dotMatch2);

		// Symptom: user can advance without picking a score.
		// Expected: stay on match 1 until winner + score are set.
		expect(view.queryAllByText("QF 2")).toHaveLength(0);
		expect(view.getAllByText("QF 1").length).toBeGreaterThan(0);
	});

	test("pagination dots can advance after winner and score are set", async () => {
		const { BettingCarousel } = await import("@/components/BettingCarousel");
		const matches = [makeMatch(1, "QF 1"), makeMatch(2, "QF 2")];

		const view = render(
			<I18nextProvider i18n={i18n}>
				<BettingCarousel
					matches={matches}
					predictions={{
						1: { winnerId: 11, score: "2 - 0" },
					}}
					onUpdatePrediction={() => {}}
				/>
			</I18nextProvider>,
		);

		const dotMatch2 = view.getByRole("button", {
			name: "Partida 2 de 2",
		});
		expect((dotMatch2 as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(dotMatch2);

		expect(view.getAllByText("QF 2").length).toBeGreaterThan(0);
	});

	test("next button stays disabled without score even if winner is picked", async () => {
		const { BettingCarousel } = await import("@/components/BettingCarousel");
		const matches = [makeMatch(1, "QF 1"), makeMatch(2, "QF 2")];

		const view = render(
			<I18nextProvider i18n={i18n}>
				<BettingCarousel
					matches={matches}
					predictions={{
						1: { winnerId: 11, score: "" },
					}}
					onUpdatePrediction={() => {}}
				/>
			</I18nextProvider>,
		);

		const next = view.getByRole("button", { name: /Próximo Jogo/i });
		expect((next as HTMLButtonElement).disabled).toBe(true);
	});

	test("highlights score option when stored score uses compact format", async () => {
		const { BettingCarousel } = await import("@/components/BettingCarousel");
		const matches = [makeMatch(1, "QF 1")];

		const view = render(
			<I18nextProvider i18n={i18n}>
				<BettingCarousel
					matches={matches}
					predictions={{
						1: { winnerId: 11, score: "2-0" },
					}}
					onUpdatePrediction={() => {}}
				/>
			</I18nextProvider>,
		);

		const dominantScore = view.getByRole("button", { name: /2 - 0/i });
		expect(dominantScore.className).toContain("border-black");
		expect(dominantScore.className).toContain("shadow-comic");
	});
});

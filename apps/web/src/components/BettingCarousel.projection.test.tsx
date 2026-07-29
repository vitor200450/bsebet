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

function emptyStats(regionA = "SA", regionB = "SA") {
	return {
		regionA,
		regionB,
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

describe("BettingCarousel bracket projection", () => {
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

	test("semifinal shows projected winner region from quarterfinal pick", async () => {
		const { BettingCarousel } = await import("@/components/BettingCarousel");

		const quarterfinal: Match = {
			id: 1,
			label: "Quartas 1",
			format: "bo3",
			teamA: {
				id: 101,
				name: "EA Winner",
				color: "blue",
				region: "EA",
			},
			teamB: {
				id: 102,
				name: "SA Loser",
				color: "red",
				region: "SA",
			},
			stats: emptyStats("EA", "SA"),
			startTime: "2026-07-16T12:00:00.000Z",
			nextMatchWinnerId: 2,
			nextMatchWinnerSlot: "A",
		};

		const semifinal: Match = {
			id: 2,
			label: "Semifinal 1",
			format: "bo3",
			teamA: null,
			teamB: {
				id: 201,
				name: "Other EA",
				color: "red",
				region: "EA",
			},
			stats: emptyStats("SA", "EA"),
			startTime: "2026-07-16T14:00:00.000Z",
		};

		const predictions: Record<number, Prediction> = {
			1: { winnerId: 101, score: "2 - 0" },
		};

		const view = render(
			<I18nextProvider i18n={i18n}>
				<BettingCarousel
					matches={[quarterfinal, semifinal]}
					predictions={predictions}
					onUpdatePrediction={() => {}}
				/>
			</I18nextProvider>,
		);

		const dotMatch2 = view.getByRole("button", {
			name: "Partida 2 de 2",
		});
		expect((dotMatch2 as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(dotMatch2);

		expect(view.getAllByText("Semifinal 1").length).toBeGreaterThan(0);

		// Symptom: projected slot A still shows default SA instead of EA.
		expect(view.getAllByText("EA").length).toBeGreaterThanOrEqual(2);
		expect(view.queryAllByText("SA")).toHaveLength(0);
	});
});

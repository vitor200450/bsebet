import type { InitOptions } from "i18next";
import adminEn from "../locales/en/admin.json";
import adminMatchesEn from "../locales/en/admin-matches.json";
import bettingEn from "../locales/en/betting.json";
import commonEn from "../locales/en/common.json";
import dashboardEn from "../locales/en/dashboard.json";
import errorsEn from "../locales/en/errors.json";
import landingEn from "../locales/en/landing.json";
import leaderboardEn from "../locales/en/leaderboard.json";
import myBetsEn from "../locales/en/my-bets.json";
import profileEn from "../locales/en/profile.json";
import teamEn from "../locales/en/team.json";
import tournamentEn from "../locales/en/tournament.json";
import userEn from "../locales/en/user.json";
import validationEn from "../locales/en/validation.json";
import adminPt from "../locales/pt/admin.json";
import adminMatchesPt from "../locales/pt/admin-matches.json";
import bettingPt from "../locales/pt/betting.json";
import commonPt from "../locales/pt/common.json";
import dashboardPt from "../locales/pt/dashboard.json";
import errorsPt from "../locales/pt/errors.json";
import landingPt from "../locales/pt/landing.json";
import leaderboardPt from "../locales/pt/leaderboard.json";
import myBetsPt from "../locales/pt/my-bets.json";
import profilePt from "../locales/pt/profile.json";
import teamPt from "../locales/pt/team.json";
import tournamentPt from "../locales/pt/tournament.json";
import userPt from "../locales/pt/user.json";
import validationPt from "../locales/pt/validation.json";
import { NAMESPACES } from "./namespaces";

export const SUPPORTED_LANGS = ["pt", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = "pt";

export const resources = {
	pt: {
		common: commonPt,
		betting: bettingPt,
		dashboard: dashboardPt,
		"my-bets": myBetsPt,
		leaderboard: leaderboardPt,
		profile: profilePt,
		tournament: tournamentPt,
		team: teamPt,
		user: userPt,
		landing: landingPt,
		admin: adminPt,
		"admin-matches": adminMatchesPt,
		errors: errorsPt,
		validation: validationPt,
	},
	en: {
		common: commonEn,
		betting: bettingEn,
		dashboard: dashboardEn,
		"my-bets": myBetsEn,
		leaderboard: leaderboardEn,
		profile: profileEn,
		tournament: tournamentEn,
		team: teamEn,
		user: userEn,
		landing: landingEn,
		admin: adminEn,
		"admin-matches": adminMatchesEn,
		errors: errorsEn,
		validation: validationEn,
	},
} as const;

export const i18nOptions: InitOptions = {
	lng: DEFAULT_LANG,
	fallbackLng: DEFAULT_LANG,
	supportedLngs: ["pt", "en"],
	ns: NAMESPACES as unknown as string[],
	defaultNS: "common",
	resources: resources as unknown as InitOptions["resources"],
	interpolation: { escapeValue: false },
	returnNull: false,
	returnEmptyString: false,
};

export function locale(lang: SupportedLang): string {
	return lang === "pt" ? "pt-BR" : "en-US";
}

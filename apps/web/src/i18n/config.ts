import type { InitOptions } from "i18next";
import adminEn from "../../public/locales/en/admin.json";
import adminMatchesEn from "../../public/locales/en/admin-matches.json";
import bettingEn from "../../public/locales/en/betting.json";
import commonEn from "../../public/locales/en/common.json";
import dashboardEn from "../../public/locales/en/dashboard.json";
import errorsEn from "../../public/locales/en/errors.json";
import landingEn from "../../public/locales/en/landing.json";
import leaderboardEn from "../../public/locales/en/leaderboard.json";
import myBetsEn from "../../public/locales/en/my-bets.json";
import profileEn from "../../public/locales/en/profile.json";
import teamEn from "../../public/locales/en/team.json";
import tournamentEn from "../../public/locales/en/tournament.json";
import userEn from "../../public/locales/en/user.json";
import validationEn from "../../public/locales/en/validation.json";
import adminPt from "../../public/locales/pt/admin.json";
import adminMatchesPt from "../../public/locales/pt/admin-matches.json";
import bettingPt from "../../public/locales/pt/betting.json";
import commonPt from "../../public/locales/pt/common.json";
import dashboardPt from "../../public/locales/pt/dashboard.json";
import errorsPt from "../../public/locales/pt/errors.json";
import landingPt from "../../public/locales/pt/landing.json";
import leaderboardPt from "../../public/locales/pt/leaderboard.json";
import myBetsPt from "../../public/locales/pt/my-bets.json";
import profilePt from "../../public/locales/pt/profile.json";
import teamPt from "../../public/locales/pt/team.json";
import tournamentPt from "../../public/locales/pt/tournament.json";
import userPt from "../../public/locales/pt/user.json";
import validationPt from "../../public/locales/pt/validation.json";
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

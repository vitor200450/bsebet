import i18next from "i18next";
import type { SupportedLang } from "./config";
import { i18nOptions } from "./config";

// Initialize i18next for server-side use (no React plugin needed).
// Client-side initialization happens in I18nRootProvider with initReactI18next.
if (typeof window === "undefined") {
	i18next.init(i18nOptions);
}

export async function changeLanguage(lang: SupportedLang) {
	if (i18next.language !== lang) {
		await i18next.changeLanguage(lang);
	}
}

export function createServerT(lang: SupportedLang) {
	return i18next.getFixedT(lang);
}

export { i18next };

import i18next from "i18next";
import type { SupportedLang } from "./config";

export async function changeLanguage(lang: SupportedLang) {
	if (i18next.language !== lang) {
		await i18next.changeLanguage(lang);
	}
}

export function createServerT(lang: SupportedLang) {
	return i18next.getFixedT(lang);
}

export { i18next };

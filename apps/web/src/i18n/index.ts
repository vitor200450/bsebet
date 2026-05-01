import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { SupportedLang } from "./config";
import { i18nOptions } from "./config";

i18next.use(initReactI18next);

i18next.init({
	...i18nOptions,
	lng: "pt",
});

export async function changeLanguage(lang: SupportedLang) {
	if (i18next.language !== lang) {
		await i18next.changeLanguage(lang);
	}
}

export function createServerT(lang: SupportedLang) {
	return i18next.getFixedT(lang);
}

export { i18next };

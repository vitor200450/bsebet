import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { i18nOptions } from "./config";
import type { SupportedLang } from "./config";

let initialized = false;

export async function initI18n(lang: SupportedLang = "pt") {
	if (initialized) {
		if (i18next.language !== lang) {
			await i18next.changeLanguage(lang);
		}
		return i18next;
	}

	await i18next.use(initReactI18next).init({
		...i18nOptions,
		lng: lang,
	});

	initialized = true;
	return i18next;
}

export function changeLanguage(lang: SupportedLang) {
	return i18next.changeLanguage(lang);
}

export function createServerT(lang: SupportedLang) {
	const instance = i18next.cloneInstance();
	instance.init({
		...i18nOptions,
		lng: lang,
	});
	return instance.getFixedT(lang, null);
}

export { i18next };

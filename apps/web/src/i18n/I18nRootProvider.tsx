import { type ReactNode, useEffect, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { i18nOptions, DEFAULT_LANG } from "./config";
import type { SupportedLang } from "./config";
import { i18next } from "./index";

let initialized = false;

function ensureInit(lang: SupportedLang) {
	if (initialized) {
		if (i18next.language !== lang) {
			i18next.changeLanguage(lang);
		}
		return;
	}
	i18next.use(initReactI18next);
	i18next.init({ ...i18nOptions, lng: lang });
	initialized = true;
}

export function I18nRootProvider({
	children,
	lang,
}: {
	children: ReactNode;
	lang?: SupportedLang;
}) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		ensureInit(lang ?? DEFAULT_LANG);
		setReady(true);
	}, [lang]);

	if (!ready) return null;

	return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

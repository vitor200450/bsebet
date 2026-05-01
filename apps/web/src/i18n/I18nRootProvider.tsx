import { type ReactNode, useEffect, useState } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { i18next } from "./index";
import { i18nOptions } from "./config";

let initialized = false;

function ensureInit() {
	if (initialized) return;
	i18next.use(initReactI18next);
	i18next.init(i18nOptions);
	initialized = true;
}

export function I18nRootProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		ensureInit();
		setReady(true);
	}, []);

	if (!ready) return null;

	return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

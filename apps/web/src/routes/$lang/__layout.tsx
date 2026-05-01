import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { i18next, changeLanguage } from "@/i18n";
import type { SupportedLang } from "@/i18n/config";
import { SUPPORTED_LANGS } from "@/i18n/config";

export const Route = createFileRoute("/$lang/__layout")({
	loader: ({ params }) => {
		const { lang } = params;
		if (!SUPPORTED_LANGS.includes(lang as SupportedLang)) {
			throw redirect({ to: "/pt" });
		}
		return { lang: lang as SupportedLang };
	},
	component: LangLayout,
});

function LangLayout() {
	const { lang } = Route.useLoaderData();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		changeLanguage(lang).then(() => setReady(true));
	}, [lang]);

	if (!ready) return null;

	return (
		<I18nextProvider i18n={i18next}>
			<Outlet />
		</I18nextProvider>
	)
}

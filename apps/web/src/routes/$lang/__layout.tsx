import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { changeLanguage } from "@/i18n";
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

	useEffect(() => {
		changeLanguage(lang);
	}, [lang]);

	return <Outlet />;
}

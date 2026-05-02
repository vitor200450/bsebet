import { useTranslation } from "react-i18next";

export function useLangLink() {
	const { i18n } = useTranslation();
	const lang = i18n.language;

	function linkTo(path: string) {
		const cleanPath = path.startsWith("/") ? path : `/${path}`;
		return `/${lang}${cleanPath}`;
	}

	function routeTo(path: string) {
		const cleanPath = path.startsWith("/") ? path : `/${path}`;
		return { to: `/${"$lang"}${cleanPath}`, params: { lang } };
	}

	return { lang, linkTo, routeTo };
}

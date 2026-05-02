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
		const trailingSlash = cleanPath.endsWith("/") ? "/" : "";
		const basePath = trailingSlash ? cleanPath.slice(0, -1) : cleanPath;
		return {
			to: `/${"$lang"}${basePath}${trailingSlash}`,
			params: { lang },
		} as const;
	}

	return { lang, linkTo, routeTo };
}

export type SiteFooterVariant = "marketing" | "app";

export type SiteFooterConfig =
	| { show: false }
	| { show: true; variant: SiteFooterVariant };

const MARKETING_PATHS = new Set(["/", "/landing", "/login"]);

export function getSiteFooterConfig(pathname: string): SiteFooterConfig {
	const segments = pathname.split("/").filter(Boolean);
	const lang = segments[0];

	if (lang !== "pt" && lang !== "en") {
		return { show: false };
	}

	if (pathname.includes("/admin")) {
		return { show: false };
	}

	const routePath = `/${segments.slice(1).join("/")}`;
	const variant = MARKETING_PATHS.has(routePath) ? "marketing" : "app";

	return { show: true, variant };
}

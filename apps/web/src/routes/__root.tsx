import type { AppRouter } from "@bsebet/api/routers/index";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { HeaderProvider } from "@/components/HeaderContext";
import { SiteFooter } from "@/components/SiteFooter";
import { getSiteFooterConfig } from "@/components/site-footer-config";
import { Toaster } from "@/components/ui/sonner";
import { I18nRootProvider } from "@/i18n/I18nRootProvider";

import "../index.css";

export interface RouterAppContext {
	trpc: TRPCOptionsProxy<AppRouter>;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "BSEN Pickems",
			},
		],
		links: [
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	const location = useLocation();
	const lang = location.pathname.split("/")[1] === "en" ? "en" : "pt";
	const footerConfig = getSiteFooterConfig(location.pathname);
	return (
		<html lang={lang} className="dark" suppressHydrationWarning>
			<head suppressHydrationWarning>
				<HeadContent />
			</head>
			<body suppressHydrationWarning>
				<I18nRootProvider lang={lang}>
					<HeaderProvider>
						<div className="flex min-h-screen w-full flex-col overflow-x-hidden font-sans">
							<GlobalHeader />
							<main className="flex flex-1 flex-col">
								<Outlet />
							</main>
							{footerConfig.show ? (
								<SiteFooter variant={footerConfig.variant} />
							) : null}
						</div>
						<Toaster />
					</HeaderProvider>
				</I18nRootProvider>
				<Scripts />
				<SpeedInsights route={location.pathname} />
			</body>
		</html>
	);
}

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";
import { authClient } from "@/lib/auth-client";
import type { SiteFooterVariant } from "./site-footer-config";

const SUPERCELL_FAN_CONTENT_URL =
	"https://www.supercell.com/fan-content-policy";
const BSEN_NEWS_URL = "https://www.bsen.news";

const FOOTER_LINK_CLASS =
	"font-black text-[#717070] text-xs uppercase tracking-[0.12em] underline decoration-[#717070]/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60";

type SiteFooterProps = {
	variant: SiteFooterVariant;
};

function ExternalFooterLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={FOOTER_LINK_CLASS}
		>
			{children}
		</a>
	);
}

export function SiteFooter({ variant }: SiteFooterProps) {
	const { t } = useTranslation("legal");
	const { routeTo } = useLangLink();
	const [mounted, setMounted] = useState(false);
	const { data: session } = authClient.useSession();

	useEffect(() => {
		setMounted(true);
	}, []);

	const isAuthenticated = mounted && !!session;
	const authTarget = isAuthenticated ? "/dashboard" : "/login";

	return (
		<footer
			className="relative mt-auto overflow-hidden"
			style={{ background: "var(--color-charcoal)" }}
		>
			<div className="absolute top-0 left-0 flex h-[3px] w-full">
				<div className="w-1/2 bg-brawl-blue" />
				<div className="w-1/2 bg-bsen-red" />
			</div>

			<div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-8 lg:px-12">
				<div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
					<div className="flex flex-col gap-4">
						<img
							src="/logo-white.png"
							alt={t("common:appName")}
							className="h-10 w-auto object-contain md:h-12"
						/>
						{variant === "marketing" && (
							<>
								<p
									className="font-black text-[#717070] text-xs uppercase tracking-[0.2em]"
									style={{ fontFamily: "var(--font-body)" }}
								>
									{t("footer.tagline")}
								</p>
								<Link
									{...routeTo(authTarget)}
									className="inline-flex min-h-12 w-fit items-center justify-center bg-electric-lime px-4 font-black text-black text-sm uppercase shadow-[var(--shadow-broadcast)] transition-all hover:brightness-105 sm:px-6 sm:text-base"
									style={{ fontFamily: "var(--font-body)" }}
								>
									{t("landing:hero.cta")}
								</Link>
							</>
						)}
					</div>

					<div className="flex flex-col gap-4 md:max-w-md md:text-right">
						<nav
							aria-label={t("footer.legalNav")}
							className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end"
						>
							<Link {...routeTo("/terms")} className={FOOTER_LINK_CLASS}>
								{t("footer.links.terms")}
							</Link>
							<Link {...routeTo("/privacy")} className={FOOTER_LINK_CLASS}>
								{t("footer.links.privacy")}
							</Link>
							<ExternalFooterLink href={SUPERCELL_FAN_CONTENT_URL}>
								{t("footer.links.fanContent")}
							</ExternalFooterLink>
							<ExternalFooterLink href={BSEN_NEWS_URL}>
								{t("footer.links.bsen")}
							</ExternalFooterLink>
						</nav>

						<p
							className="font-black text-[#717070] text-xs leading-relaxed"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("footer.disclaimer")}{" "}
							<a
								href={SUPERCELL_FAN_CONTENT_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[#a8a8a8] underline decoration-[#717070]/40 underline-offset-4 transition-colors hover:text-white"
							>
								{t("footer.disclaimerLink")}
							</a>
						</p>
						<p
							className="font-black text-panel-gray text-xs"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("footer.copyright")}
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
}

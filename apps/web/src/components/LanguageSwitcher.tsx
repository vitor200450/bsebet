import { useRouterState } from "@tanstack/react-router";
import { clsx } from "clsx";
import BRFlag from "country-flag-icons/react/3x2/BR";
import USFlag from "country-flag-icons/react/3x2/US";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";

const LANGUAGES = [
	{ code: "pt" as const, Flag: BRFlag },
	{ code: "en" as const, Flag: USFlag },
] as const;

type LanguageSwitcherProps = {
	variant?: "light" | "dark";
	compact?: boolean;
};

export function LanguageSwitcher({
	variant = "light",
	compact = false,
}: LanguageSwitcherProps) {
	const { t } = useTranslation("common");
	const { lang } = useLangLink();
	const router = useRouterState();

	const switchLangTo = useCallback(
		(targetLang: string) => {
			if (targetLang === lang) return;
			const path = router.location.pathname.replace(
				/^\/[^/]+/,
				`/${targetLang}`,
			);
			window.location.href = path;
		},
		[lang, router.location.pathname],
	);

	return (
		<div
			role="group"
			aria-label={t("language.label")}
			className={clsx(
				"flex -skew-x-6 transform overflow-hidden border-[2px] md:border-[3px]",
				variant === "dark"
					? "border-white/30 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]"
					: "border-black shadow-comic-sm",
			)}
		>
			{LANGUAGES.map(({ code, Flag }) => {
				const isActive = lang === code;
				return (
					<button
						key={code}
						type="button"
						onClick={() => switchLangTo(code)}
						aria-current={isActive ? "true" : undefined}
						aria-label={t("language.switchTo", {
							language: t(`language.${code}`),
						})}
						className={clsx(
							"flex skew-x-6 transform items-center gap-1.5 px-2 py-1.5 font-black text-[10px] uppercase tracking-wider transition-all active:translate-y-[1px] md:px-3 md:py-2 md:text-xs",
							isActive
								? "bg-electric-lime text-black"
								: variant === "dark"
									? "bg-black text-gray-500 hover:bg-white/10 hover:text-white"
									: "bg-white text-gray-400 hover:bg-gray-50 hover:text-black",
						)}
					>
						<Flag className="h-4 w-4 shrink-0 rounded-sm md:h-[18px] md:w-[18px]" />
						{!compact && (
							<span className="hidden sm:inline">{code.toUpperCase()}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

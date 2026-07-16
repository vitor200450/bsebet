import { useTranslation } from "react-i18next";
import { BroadcastBars } from "./inline-loader";
import { PublicPageShell } from "./PublicPageShell";

export default function Loader() {
	const { t } = useTranslation("common");

	return (
		<PublicPageShell className="flex min-h-[80dvh] w-full items-center justify-center p-6">
			<div
				className="relative z-10 flex flex-col items-center gap-5"
				role="status"
				aria-live="polite"
				aria-label={t("actions.loading")}
			>
				<div className="border-[4px] border-black bg-white px-8 py-6 shadow-comic-md">
					<BroadcastBars size="xl" aria-hidden={false} />
				</div>

				<div className="-skew-x-6 border-[3px] border-black bg-ink px-6 py-2.5 shadow-comic-md">
					<span className="block skew-x-6 font-black font-display text-electric-lime text-xs uppercase italic tracking-[0.18em]">
						{t("actions.loading")}
					</span>
				</div>
			</div>
		</PublicPageShell>
	);
}

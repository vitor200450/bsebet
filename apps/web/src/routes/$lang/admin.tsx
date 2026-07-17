import {
	createFileRoute,
	Navigate,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AdminNav } from "@/components/admin/AdminNav";
import { useHeader } from "@/components/HeaderContext";
import { useLangLink } from "@/i18n/useLangLink";

export const Route = createFileRoute("/$lang/admin")({
	component: AdminLayout,
});

function AdminLayout() {
	const { t } = useTranslation("common");
	const { lang, routeTo } = useLangLink();
	const { setConfig } = useHeader();
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	const normalized = pathname.replace(/\/$/, "") || "/";
	const isAdminRoot = normalized === `/${lang}/admin`;
	const isLiveScoring = normalized.includes(`/${lang}/admin/live/`);

	useEffect(() => {
		return () => setConfig(null);
	}, [setConfig]);

	if (isAdminRoot) {
		return <Navigate {...(routeTo("/admin/tournaments") as any)} />;
	}

	if (isLiveScoring) {
		return <Outlet />;
	}

	return (
		<div className="min-h-[100dvh] bg-paper bg-paper-texture">
			<div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
				{/* Desktop sidebar — process-grouped admin IA */}
				<aside className="surface-white sticky top-24 hidden h-[calc(100dvh-7rem)] w-56 shrink-0 flex-col border-[3px] border-black p-4 shadow-comic lg:flex xl:w-64">
					<p className="mb-1 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
						{t("nav.admin")}
					</p>
					<p className="mb-4 font-black font-display text-ink text-lg uppercase italic leading-[1.1] tracking-tighter">
						{t("nav.adminPanel")}
					</p>
					<AdminNav variant="sidebar" showExit={false} />
				</aside>

				{/* Mobile / tablet process rail */}
				<div className="surface-white sticky top-20 z-20 border-black border-b-2 px-3 py-2 lg:hidden">
					<AdminNav variant="rail" showExit={false} />
				</div>

				<main className="min-w-0 flex-1">
					<Outlet />
				</main>
			</div>
		</div>
	);
}

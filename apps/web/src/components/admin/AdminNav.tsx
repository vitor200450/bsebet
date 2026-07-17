import { Link, useRouterState } from "@tanstack/react-router";
import { clsx } from "clsx";
import { LogOut, Scale, Trophy, UserCog, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";

type AdminNavItem = {
	id: string;
	labelKey: string;
	to: string;
	icon: typeof Trophy;
	matchExtra?: string[];
};

type AdminNavGroup = {
	id: string;
	labelKey: string;
	items: AdminNavItem[];
};

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		id: "setup",
		labelKey: "nav.adminGroupSetup",
		items: [
			{
				id: "teams",
				labelKey: "nav.adminTeams",
				to: "/admin/teams",
				icon: UsersRound,
				matchExtra: ["/admin/migrate-logos"],
			},
			{
				id: "tournaments",
				labelKey: "nav.adminTournaments",
				to: "/admin/tournaments",
				icon: Trophy,
				matchExtra: ["/admin/live"],
			},
		],
	},
	{
		id: "manage",
		labelKey: "nav.adminGroupManage",
		items: [
			{
				id: "users",
				labelKey: "nav.adminUsers",
				to: "/admin/users",
				icon: UserCog,
			},
			{
				id: "compensations",
				labelKey: "nav.adminCompensations",
				to: "/admin/compensations",
				icon: Scale,
			},
		],
	},
];

function normalizePath(path: string) {
	return path.replace(/\/$/, "") || "/";
}

function isAdminItemActive(
	item: AdminNavItem,
	pathname: string,
	lang: string,
): boolean {
	const path = normalizePath(pathname);
	const candidates = [item.to, ...(item.matchExtra ?? [])];

	return candidates.some((to) => {
		const dest = normalizePath(`/${lang}${to}`);
		return path === dest || path.startsWith(`${dest}/`);
	});
}

type AdminNavProps = {
	variant?: "sidebar" | "mobile" | "rail";
	onNavigate?: () => void;
	showExit?: boolean;
};

export function AdminNav({
	variant = "sidebar",
	onNavigate,
	showExit = false,
}: AdminNavProps) {
	const { t } = useTranslation("common");
	const { lang, routeTo } = useLangLink();
	const router = useRouterState();
	const pathname = router.location.pathname;

	if (variant === "rail" || variant === "mobile") {
		return (
			<nav
				aria-label={t("nav.admin")}
				className={clsx(
					"flex gap-3",
					variant === "mobile" ? "flex-col" : "items-stretch overflow-x-auto",
				)}
			>
				{ADMIN_NAV_GROUPS.map((group, groupIndex) => (
					<div
						key={group.id}
						className={clsx(
							"flex gap-2",
							variant === "mobile" ? "flex-col" : "shrink-0 items-center",
						)}
					>
						{variant === "mobile" && (
							<p className="px-1 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t(group.labelKey)}
							</p>
						)}
						{variant === "rail" && groupIndex > 0 && (
							<div
								aria-hidden
								className="mx-1 h-8 w-[2px] shrink-0 -skew-x-12 bg-black/15"
							/>
						)}
						{variant === "rail" && (
							<span className="mr-1 shrink-0 font-body font-bold text-[9px] text-gray-400 uppercase tracking-widest">
								{t(group.labelKey)}
							</span>
						)}
						<div
							className={clsx(
								"flex gap-2",
								variant === "mobile" ? "flex-col" : "items-center",
							)}
						>
							{group.items.map((item) => {
								const Icon = item.icon;
								const active = isAdminItemActive(item, pathname, lang);
								return (
									<Link
										key={item.id}
										{...(routeTo(item.to) as any)}
										onClick={onNavigate}
										className={clsx(
											"admin-nav-item flex items-center gap-2 border-[2px] border-black px-3 py-2 font-black font-display text-xs uppercase italic tracking-tight md:border-[3px]",
											variant === "mobile" && "w-full justify-start",
											active
												? "bg-electric-lime text-ink shadow-comic-sm"
												: "admin-nav-item-idle surface-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.12)]",
										)}
									>
										<Icon size={14} strokeWidth={3} className="shrink-0" />
										<span className="pr-1.5 leading-[1.1]">
											{t(item.labelKey)}
										</span>
									</Link>
								);
							})}
						</div>
					</div>
				))}

				{showExit && (
					<Link
						{...(routeTo("/") as any)}
						onClick={onNavigate}
						className={clsx(
							"admin-nav-item flex items-center gap-2 border-[2px] border-black bg-ink px-3 py-2 font-black font-display text-white text-xs uppercase italic tracking-tight shadow-comic md:border-[3px]",
							variant === "mobile"
								? "mt-2 w-full justify-center"
								: "ml-auto shrink-0",
						)}
					>
						<LogOut size={14} strokeWidth={3} />
						<span className="pr-1 leading-[1.1]">{t("nav.exitAdmin")}</span>
					</Link>
				)}
			</nav>
		);
	}

	return (
		<nav aria-label={t("nav.admin")} className="flex h-full flex-col gap-6">
			{ADMIN_NAV_GROUPS.map((group) => (
				<div key={group.id} className="flex flex-col gap-2">
					<p className="px-1 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
						{t(group.labelKey)}
					</p>
					<ul className="flex flex-col gap-2">
						{group.items.map((item) => {
							const Icon = item.icon;
							const active = isAdminItemActive(item, pathname, lang);
							return (
								<li key={item.id}>
									<Link
										{...(routeTo(item.to) as any)}
										onClick={onNavigate}
										className={clsx(
											"admin-nav-item flex w-full items-center gap-3 overflow-visible border-[3px] border-black px-3 py-2.5 font-black font-display text-sm uppercase italic leading-[1.1] tracking-tight",
											active
												? "bg-electric-lime text-ink shadow-comic"
												: "admin-nav-item-idle surface-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
										)}
									>
										<span
											className={clsx(
												"flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-black",
												active ? "bg-ink text-white" : "bg-paper text-ink",
											)}
										>
											<Icon size={16} strokeWidth={3} />
										</span>
										<span className="pr-1.5">{t(item.labelKey)}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}

			{showExit && (
				<div className="mt-auto border-black border-t-2 pt-4">
					<Link
						{...(routeTo("/") as any)}
						onClick={onNavigate}
						className="admin-nav-item flex w-full items-center justify-center gap-2 overflow-visible border-[3px] border-black bg-ink px-3 py-2.5 font-black font-display text-white text-xs uppercase italic leading-[1.1] tracking-wider shadow-comic"
					>
						<LogOut size={14} strokeWidth={3} />
						<span className="pr-1.5">{t("nav.exitAdmin")}</span>
					</Link>
				</div>
			)}
		</nav>
	);
}

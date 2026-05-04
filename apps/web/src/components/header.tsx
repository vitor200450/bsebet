import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";

import UserMenu from "./user-menu";

export default function Header() {
	const { t } = useTranslation("common");
	const { routeTo } = useLangLink();
	const links = [
		{ to: "/", label: t("nav.home") },
		{ to: "/dashboard", label: t("nav.dashboard") },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} {...routeTo(to)}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}

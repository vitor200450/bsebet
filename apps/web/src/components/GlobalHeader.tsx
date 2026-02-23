import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight, LogOut, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { getLiveStatus } from "@/functions/get-live-status";
import { authClient } from "@/lib/auth-client";
import { useHeader } from "./HeaderContext";
import UserMenu from "./user-menu";

export function GlobalHeader() {
	const router = useRouterState();
	const { config } = useHeader();
	const [mounted, setMounted] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const { data: session } = authClient.useSession();

	const { data: liveStatus } = useQuery({
		queryKey: ["liveStatus"],
		queryFn: () => getLiveStatus(),
		refetchInterval: 30000,
	});

	useEffect(() => {
		setMounted(true);
	}, []);

	// Close mobile menu on route change
	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [router.location.pathname]);

	// Dynamic navigation based on authentication
	const isAuthenticated = mounted && !!session;

	const navItems = [
		{ label: "Home", to: isAuthenticated ? "/dashboard" : "/landing" },
		{ label: "Apostar", to: "/" },
		{ label: "Torneios", to: "/tournaments" },
		{ label: "Leaderboard", to: "/leaderboard" },
		...(isAuthenticated ? [{ label: "Minhas Apostas", to: "/my-bets" }] : []),
	];

	const isAdmin = session?.user?.role === "admin";
	const isInsideAdmin = router.location.pathname.startsWith("/admin");
	const variant = config?.variant || (isInsideAdmin ? "light" : "light");

	if (config?.hideHeader) return null;

	return (
		<header
			className={clsx(
				"sticky top-0 z-50 flex select-none flex-col shadow-sm transition-colors duration-300",
				variant === "dark" ? "bg-black text-white" : "bg-white text-black",
			)}
		>
			{/* MAIN ROW (Logo, Title, UserMenu) */}
			<div className="relative mx-auto flex h-16 w-full max-w-[1600px] shrink-0 items-center justify-between gap-4 px-4 md:h-20 md:gap-6 md:px-6">
				<div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
					{/* LOGO AREA - Dynamic link based on auth */}
					<Link
						to={isAuthenticated ? "/dashboard" : "/landing"}
						className="group relative flex shrink-0 items-center"
					>
						<div
							className={clsx(
								"-skew-x-12 transform border-[2px] px-2 py-1 shadow-comic transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none group-hover:scale-105 md:border-[3px] md:px-4 md:py-2",
								variant === "dark"
									? "border-white bg-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] md:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
									: "border-black bg-white shadow-comic",
							)}
						>
							<div className="flex skew-x-12 transform items-center gap-2">
								<img
									src="/logo-new.png"
									alt="BSEBET"
									className={clsx(
										"h-6 object-contain md:h-8",
										variant === "dark" ? "brightness-200 grayscale-0" : "",
									)}
								/>
							</div>
						</div>
					</Link>

					{/* BREADCRUMBS & TITLE */}
					{isInsideAdmin && (
						<div className="hidden min-w-0 items-center gap-2 overflow-hidden md:flex">
							<div
								className={clsx(
									"mx-2 h-8 w-[2px] shrink-0 -skew-x-12 transform",
									variant === "dark" ? "bg-gray-800" : "bg-gray-200",
								)}
							/>
							<span
								className={clsx(
									"shrink-0 font-black text-2xl uppercase italic tracking-tighter",
									variant === "dark" ? "text-gray-700" : "text-gray-300",
								)}
							>
								ADMIN
							</span>
							<ChevronRight
								className={clsx(
									"h-5 w-5 shrink-0",
									variant === "dark" ? "text-gray-700" : "text-gray-300",
								)}
							/>
							<h1
								className={clsx(
									"truncate pr-2 font-black text-2xl uppercase italic tracking-tighter",
									variant === "dark" ? "text-white" : "text-black",
								)}
							>
								{config?.title || "DASHBOARD"}
							</h1>
						</div>
					)}
				</div>

				{/* RIGHT SIDE (Nav, UserMenu) - Desktop */}
				<div className="hidden shrink-0 items-center gap-6 xl:flex">
					<nav className="flex items-center gap-10">
						{!isInsideAdmin && (
							<div className="flex items-center gap-8">
								{navItems.map((item) => {
									// For "Home", consider both /landing and /dashboard as active
									const isActive =
										item.label === "Home"
											? router.location.pathname === "/landing" ||
												router.location.pathname === "/dashboard"
											: router.location.pathname === item.to;

									return (
										<Link
											key={item.label}
											to={item.to}
											className={clsx(
												"group relative font-black text-xl uppercase italic tracking-tighter transition-all",
												isActive
													? variant === "dark"
														? "text-white"
														: "text-black"
													: variant === "dark"
														? "text-gray-600 hover:text-white"
														: "text-gray-300 hover:text-black",
											)}
										>
											{item.label}
											{isActive && (
												<div className="absolute right-0 -bottom-2 left-0 h-[4px] -skew-x-12 transform bg-[#ff2e2e]" />
											)}
										</Link>
									);
								})}
							</div>
						)}
					</nav>

					{liveStatus?.isLive && !isInsideAdmin && (
						<div className="flex -skew-x-6 transform items-center gap-2 rounded-full border-[2px] border-black bg-black px-3 py-1.5 text-white">
							<span className="h-2 w-2 animate-pulse rounded-full bg-[#00ff55] shadow-[0_0_8px_rgba(0,255,85,0.6)]" />
							<span className="mt-0.5 skew-x-6 transform font-black text-[10px] uppercase tracking-widest">
								LIVE
							</span>
						</div>
					)}

					{isAdmin && !isInsideAdmin && (
						<Link
							to="/admin/tournaments"
							className="group flex -skew-x-12 transform items-center gap-2 border-[3px] border-black bg-black px-5 py-2 font-black text-white text-xs uppercase italic tracking-wider shadow-comic transition-all hover:shadow-comic-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						>
							<Shield
								size={16}
								strokeWidth={3}
								className="skew-x-12 transform"
							/>
							<span className="skew-x-12 transform whitespace-nowrap">
								Admin Panel
							</span>
						</Link>
					)}

					<UserMenu variant={variant} />
				</div>

				{/* MOBILE MENU TOGGLE & USER MENU - Mobile */}
				<div className="flex items-center gap-4 xl:hidden">
					{liveStatus?.isLive && !isInsideAdmin && (
						<div className="flex -skew-x-6 transform items-center gap-1.5 rounded-full border-[2px] border-black bg-black px-2 py-1 text-white">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff55] shadow-[0_0_8px_rgba(0,255,85,0.6)]" />
							<span className="mt-0.5 skew-x-6 transform font-black text-[9px] uppercase tracking-widest">
								LIVE
							</span>
						</div>
					)}

					<UserMenu variant={variant} />

					<button
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						className={clsx(
							"-skew-x-6 transform border-[2px] border-black p-2 transition-transform active:scale-95",
							variant === "dark"
								? "border-gray-600 bg-gray-800 text-white"
								: "bg-white text-black",
						)}
					>
						<div className="skew-x-6 transform">
							{isMobileMenuOpen ? (
								<span className="material-symbols-outlined">close</span>
							) : (
								<span className="material-symbols-outlined">menu</span>
							)}
						</div>
					</button>
				</div>
			</div>

			{/* MOBILE MENU DROPDOWN */}
			{isMobileMenuOpen && (
				<div className="slide-in-from-top-2 absolute top-full right-0 left-0 z-50 flex animate-in flex-col border-black border-b-[4px] bg-white p-4 shadow-[0px_10px_20px_rgba(0,0,0,0.2)] xl:hidden">
					{!isInsideAdmin && (
						<nav className="mb-6 flex flex-col gap-4">
							{navItems.map((item) => {
								// For "Home", consider both /landing and /dashboard as active
								const isActive =
									item.label === "Home"
										? router.location.pathname === "/landing" ||
											router.location.pathname === "/dashboard"
										: router.location.pathname === item.to;

								return (
									<Link
										key={item.label}
										to={item.to}
										className={clsx(
											"border-l-[6px] px-4 py-2 font-black text-3xl uppercase italic tracking-tighter transition-all",
											isActive
												? "border-[#ff2e2e] bg-gray-50 text-black"
												: "border-transparent text-gray-400 hover:border-gray-200 hover:text-black",
										)}
									>
										{item.label}
									</Link>
								);
							})}
						</nav>
					)}

					{isAdmin && !isInsideAdmin && (
						<Link
							to="/admin/tournaments"
							className="mb-4 flex items-center justify-center gap-2 border-[3px] border-black bg-black px-6 py-4 font-black text-sm text-white uppercase italic tracking-wider shadow-comic transition-all active:translate-y-1 active:shadow-none"
						>
							<Shield size={20} strokeWidth={3} />
							<span>Admin Panel</span>
						</Link>
					)}
				</div>
			)}

			{/* SUB-HEADER ROW (Admin Actions) */}
			{isInsideAdmin && (
				<div
					className={clsx(
						"relative w-full border-t",
						variant === "dark"
							? "border-white/10 bg-black/50"
							: "border-black/5 bg-gray-50",
					)}
				>
					<div className="mx-auto flex min-h-[50px] max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 md:h-[68px] md:px-6 md:py-0">
						{/* Admin Navigation Tabs */}
						<div className="flex items-center gap-2 md:gap-3">
							{[
								{ label: "Torneios", to: "/admin/tournaments" },
								{ label: "Times", to: "/admin/teams" },
								{ label: "Usuários", to: "/admin/users" },
								{ label: "Compensação", to: "/admin/compensations" },
							].map((tab) => {
								const isActive = router.location.pathname.startsWith(tab.to);
								return (
									<Link
										key={tab.to}
										to={tab.to}
										className={clsx(
											"relative -skew-x-6 transform border-[2px] border-black px-3 py-1.5 font-black text-xs uppercase italic tracking-tight transition-all md:border-[3px] md:px-4 md:py-2 md:text-sm",
											isActive
												? "bg-[#ccff00] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
												: "bg-white text-gray-500 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] hover:bg-gray-100 hover:text-black md:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]",
										)}
									>
										<span className="skew-x-6 transform">{tab.label}</span>
										{isActive && (
											<div className="absolute right-0 -bottom-[2px] left-0 h-[2px] bg-[#ff2e2e] md:-bottom-[3px] md:h-[3px]" />
										)}
									</Link>
								);
							})}
						</div>

						{/* Actions & Exit Button Wrapper */}
						<div className="flex w-full items-start justify-end gap-4 md:w-auto md:flex-1 md:items-center">
							{config?.actions}

							{isAdmin && (
								<Link
									to="/"
									className={clsx(
										"group flex shrink-0 -skew-x-12 transform items-center gap-2 border-[2px] border-black px-3 py-1.5 font-black text-[10px] uppercase italic tracking-wider shadow-comic transition-all hover:shadow-comic-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:border-[3px] md:px-5 md:py-2 md:text-xs",
										variant === "dark"
											? "border-white bg-white text-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)]"
											: "border-black bg-[#ccff00] text-black",
									)}
								>
									<LogOut
										size={14}
										strokeWidth={3}
										className="skew-x-12 transform"
									/>
									<span className="hidden skew-x-12 transform whitespace-nowrap md:inline">
										Sair Admin
									</span>
								</Link>
							)}
						</div>
					</div>
				</div>
			)}

			{/* SPLIT BORDER RAILS (Screen-wide) */}
			<div className="absolute right-0 bottom-0 left-0 z-40 flex h-[4px] w-full font-bold">
				<div className="flex-1 bg-[#2e5cff]" />
				<div className="flex-1 bg-[#ff2e2e]" />
			</div>
		</header>
	);
}

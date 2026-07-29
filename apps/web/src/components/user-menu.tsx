import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import {
	Globe,
	LayoutDashboard,
	LogOut,
	Target,
	Trophy,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPoints } from "@/functions/get-user-points";
import { useLangLink } from "@/i18n/useLangLink";
import { authClient } from "@/lib/auth-client";
import { getUserMedalCounts } from "@/server/user-profile";
import { getMyProfile } from "@/server/users";
import { MedalCountSummary } from "./MiniMedalBadge";
import { Skeleton } from "./ui/skeleton";

function UserAvatar({
	src,
	name,
	size = "md",
	variant = "light",
}: {
	src?: string | null;
	name?: string | null;
	size?: "sm" | "md";
	variant?: "light" | "dark";
}) {
	const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
	const iconDim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

	return (
		<div
			className={clsx(
				"relative shrink-0 -skew-x-6 transform overflow-hidden border-[3px]",
				dim,
				variant === "dark"
					? "border-white bg-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
					: "border-black bg-white shadow-comic-sm",
			)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				{src ? (
					<img
						src={src}
						alt={name ?? "User"}
						className="h-full w-full object-cover"
					/>
				) : (
					<User
						strokeWidth={2.5}
						className={clsx(
							iconDim,
							variant === "dark" ? "text-white" : "text-black",
						)}
					/>
				)}
			</div>
		</div>
	);
}

function MenuActionItem({
	icon: Icon,
	label,
	onClick,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
}) {
	return (
		<DropdownMenuItem
			className="!text-black hover:!text-black hover:**:!text-black focus:!text-black focus:**:!text-black data-highlighted:!text-black data-highlighted:**:!text-black hover:[&_svg]:!text-black focus:[&_svg]:!text-black data-highlighted:[&_svg]:!text-black cursor-pointer gap-3 rounded-none px-3 py-2.5 font-black font-display text-xs uppercase italic tracking-tight transition-all hover:bg-electric-lime hover:shadow-comic-sm focus:bg-electric-lime focus:shadow-comic-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-comic-press data-highlighted:bg-electric-lime data-highlighted:shadow-comic-sm [&_svg]:text-black"
			onClick={onClick}
		>
			<Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
			<span>{label}</span>
		</DropdownMenuItem>
	);
}

export default function UserMenu({
	variant = "light",
}: {
	variant?: "light" | "dark";
}) {
	const { t } = useTranslation("profile");
	const navigate = useNavigate();
	const { routeTo } = useLangLink();
	const { data: session, isPending } = authClient.useSession();

	const { data: totalPoints } = useQuery({
		queryKey: ["userPoints", session?.user?.id],
		queryFn: () => getUserPoints(),
		enabled: !!session?.user?.id,
	});

	const { data: profile, isLoading: isProfileLoading } = useQuery({
		queryKey: ["myProfile"],
		queryFn: () => getMyProfile(),
		enabled: !!session?.user?.id,
		staleTime: 1000 * 60 * 5,
	});

	const { data: medalCounts } = useQuery({
		queryKey: ["userMedalCounts", session?.user?.id],
		queryFn: () => getUserMedalCounts({ data: session?.user?.id || "" }),
		enabled: !!session?.user?.id,
		staleTime: 1000 * 60 * 5,
	});

	const displayName = profile?.nickname || session?.user?.name;
	const avatarSrc = profile?.image ?? session?.user?.image;

	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || isPending || (session && isProfileLoading)) {
		return (
			<div className="flex items-center gap-1.5 sm:gap-3">
				<div className="hidden flex-col items-end gap-1.5 sm:flex">
					<Skeleton
						className={clsx(
							"h-3 w-20",
							variant === "dark" ? "bg-white/10" : "bg-black/10",
						)}
					/>
					<Skeleton
						className={clsx(
							"h-2 w-12",
							variant === "dark" ? "bg-white/10" : "bg-black/10",
						)}
					/>
				</div>
				<Skeleton
					className={clsx(
						"h-8 w-8 -skew-x-6 transform border-[3px] sm:h-10 sm:w-10",
						variant === "dark" ? "border-white/20" : "border-black/20",
					)}
				/>
			</div>
		);
	}

	if (!session) {
		return (
			<Link {...routeTo("/login")}>
				<button
					type="button"
					className={clsx(
						"-skew-x-12 transform border-[3px] px-6 py-2 font-black font-display text-black text-sm uppercase italic shadow-comic transition-all hover:shadow-comic-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
						variant === "dark"
							? "border-white bg-white text-black"
							: "border-black bg-electric-lime text-black",
					)}
				>
					<span className="inline-block skew-x-12 transform">
						{t("signIn")}
					</span>
				</button>
			</Link>
		);
	}

	const menuActions = [
		{
			icon: LayoutDashboard,
			label: t("userMenu.commandCenter"),
			onClick: () => navigate(routeTo("/dashboard")),
		},
		{
			icon: User,
			label: t("userMenu.label"),
			onClick: () => navigate(routeTo("/profile")),
		},
		{
			icon: Globe,
			label: t("userMenu.viewPublic"),
			onClick: () => {
				const r = routeTo("/users/$userId");
				navigate({
					to: r.to,
					params: { ...r.params, userId: session.user.id },
				});
			},
		},
		{
			icon: Target,
			label: t("userMenu.myBets"),
			onClick: () => navigate(routeTo("/my-bets")),
		},
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				nativeButton={false}
				render={
					<div className="group flex cursor-pointer items-center gap-1.5 sm:gap-3">
						<div className="hidden flex-col items-end leading-none sm:flex">
							<span
								className={clsx(
									"max-w-[70px] truncate pe-[0.35em] px-1 font-black font-display text-xs uppercase italic leading-[1.15] tracking-tighter sm:max-w-none sm:text-sm",
									variant === "dark" ? "text-white" : "text-black",
								)}
							>
								{displayName}
							</span>
							<div className="mt-0.5 flex items-center gap-2">
								<span className="font-body font-bold text-[9px] text-brawl-red uppercase tabular-nums tracking-widest">
									{t("userMenu.pointsShort", { count: totalPoints ?? 0 })}
								</span>
								{medalCounts && medalCounts.total > 0 && (
									<span className="flex items-center gap-0.5 font-body font-bold text-[9px] text-brawl-yellow uppercase tabular-nums tracking-widest">
										<Trophy className="h-3 w-3" fill="currentColor" />
										{medalCounts.total}
									</span>
								)}
							</div>
						</div>
						<div className="relative transition-transform group-hover:scale-105 group-active:translate-x-[2px] group-active:translate-y-[2px]">
							<UserAvatar
								src={avatarSrc}
								name={displayName}
								variant={variant}
							/>
						</div>
					</div>
				}
			/>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="!text-black w-[17.5rem] overflow-hidden rounded-none border-[3px] border-black bg-white p-0 shadow-comic-md sm:w-72"
			>
				{/* Identity panel — avatar stays in header trigger only */}
				<div className="border-black border-b-[3px] bg-charcoal p-3 text-white">
					<div className="min-w-0">
						<p className="truncate pe-[0.35em] pb-0.5 font-black font-display text-sm uppercase italic leading-[1.15] tracking-tighter">
							{displayName}
						</p>
						<p className="mt-0.5 truncate font-body font-bold text-[10px] text-white/50">
							{session.user.email}
						</p>
					</div>

					<div className="mt-3 grid grid-cols-2 gap-2">
						<div className="flex -skew-x-6 transform flex-col border-[2px] border-white/20 bg-panel-gray px-2.5 py-2">
							<span className="skew-x-6 transform font-body font-bold text-[9px] text-white/50 uppercase tracking-widest">
								{t("userMenu.pointsLabel")}
							</span>
							<span className="skew-x-6 transform font-black font-body text-brawl-red text-lg tabular-nums leading-none tracking-tighter">
								{totalPoints ?? 0}
							</span>
						</div>
						<div className="flex -skew-x-6 transform flex-col border-[2px] border-white/20 bg-panel-gray px-2.5 py-2">
							<span className="skew-x-6 transform font-body font-bold text-[9px] text-white/50 uppercase tracking-widest">
								{t("userMenu.medals")}
							</span>
							<div className="mt-0.5 flex skew-x-6 transform items-center gap-1.5">
								{medalCounts && medalCounts.total > 0 ? (
									<MedalCountSummary
										gold={medalCounts.gold}
										silver={medalCounts.silver}
										bronze={medalCounts.bronze}
										size="sm"
									/>
								) : (
									<span className="font-black font-body text-lg text-white/30 tabular-nums leading-none tracking-tighter">
										0
									</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Brand stripe */}
				<div aria-hidden="true" className="flex h-1 w-full">
					<div className="flex-1 bg-brawl-blue" />
					<div className="flex-1 bg-bsen-red" />
				</div>

				<DropdownMenuGroup className="p-2">
					{menuActions.map((action) => (
						<MenuActionItem key={action.label} {...action} />
					))}
				</DropdownMenuGroup>

				<DropdownMenuSeparator className="mx-0 h-[3px] bg-black" />

				<div className="p-2 pt-1">
					<DropdownMenuItem
						className="!text-white hover:!text-white hover:**:!text-white focus:!text-white focus:**:!text-white data-highlighted:!text-white data-highlighted:**:!text-white hover:[&_svg]:!text-white focus:[&_svg]:!text-white data-highlighted:[&_svg]:!text-white cursor-pointer justify-center gap-2 rounded-none border-[2px] border-black bg-bsen-red px-3 py-2.5 font-black font-display text-xs uppercase italic tracking-wider transition-all hover:bg-brawl-red focus:bg-brawl-red active:translate-x-[1px] active:translate-y-[1px] data-highlighted:bg-brawl-red [&_svg]:text-white"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate(routeTo("/"));
									},
								},
							});
						}}
					>
						<LogOut className="h-4 w-4 shrink-0" strokeWidth={2.5} />
						{t("userMenu.signOut")}
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

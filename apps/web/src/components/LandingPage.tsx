/*
 * Hallmark · macrostructure: Zoned Strip Stack · genre: playful · design-system: DESIGN.md
 * tone: broadcast-competitive · anchor hue: electric-lime #D2FF00
 * DNA-source: event.supercell.com Brawl Stars Championship collage landing
 *
 * Zone sequence:
 *   Z1  dark hero collage     — charcoal + arena photo · brand-first
 *   Z2  paper challengers     — asymmetric sticker + copy split
 *   Z3  amber watch/predict   — watch→pick→rep loop + copy
 *   Z4  pick arena            — paint splat blue vs red
 *   Z5  paper leaderboard     — podium + graffiti
 *   Z6  dark how-to           — staggered panels over lockers
 *   (SiteFooter global in __root.tsx)
 */
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	AnimatePresence,
	motion,
	useInView,
	useReducedMotion,
} from "framer-motion";
import { Crown, Star, Zap } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MedalCountSummary, MiniMedalBadge } from "@/components/MiniMedalBadge";
import { TeamLogo } from "@/components/TeamLogo";
import { useLangLink } from "@/i18n/useLangLink";
import {
	getLandingMatchups,
	type LandingMatchup,
} from "@/server/landing-matchups";
import type { LeaderboardEntry } from "@/server/leaderboard";

interface LandingPageProps {
	isAuthenticated: boolean;
	topUsers?: LeaderboardEntry[];
	matchups?: LandingMatchup[];
}

const EMPTY_MATCHUPS: LandingMatchup[] = [];

/* ─────────────────────────────────────────────
   SECTION CUT — hard flush + paint stripe.
   Diagonal join strips caused white bands / black
   hairlines on mobile; keep transitions seamless.
───────────────────────────────────────────── */
function SectionCut() {
	return (
		<div aria-hidden="true" className="relative z-20 flex h-1.5 w-full">
			<div className="w-1/2 bg-brawl-blue" />
			<div className="w-1/2 bg-bsen-red" />
		</div>
	);
}

/** Spray paint plate — original BSEN kit (transparent PNG) */
function SpraySplat({
	variant,
	className,
}: {
	variant: "blue" | "red";
	className?: string;
}) {
	return (
		<img
			src={
				variant === "blue"
					? "/landing/spray-blue.png"
					: "/landing/spray-red.png"
			}
			alt=""
			aria-hidden="true"
			draggable={false}
			className={clsx(
				"pointer-events-none select-none object-contain",
				className,
			)}
		/>
	);
}

/** Crumpled paper scrap label */
function TapeSticker({
	children,
	className,
	rotate = "-8deg",
	tone = "ink",
}: {
	children: ReactNode;
	className?: string;
	rotate?: string;
	tone?: "ink" | "lime" | "red";
}) {
	return (
		<div
			aria-hidden="true"
			className={clsx(
				"pointer-events-none relative inline-flex items-center justify-center px-6 py-3",
				className,
			)}
			style={{ transform: `rotate(${rotate})` }}
		>
			<img
				src="/landing/tape-scrap.png"
				alt=""
				draggable={false}
				className="absolute inset-0 h-full w-full object-fill drop-shadow-[3px_3px_0_rgba(0,0,0,0.35)]"
			/>
			<span
				className={clsx(
					"relative z-10 font-black text-base uppercase tracking-tight sm:text-xl md:text-3xl",
					tone === "lime" && "text-electric-lime",
					tone === "red" && "text-bsen-red",
					tone === "ink" && "text-black",
				)}
				style={{ fontFamily: "var(--font-body)" }}
			>
				{children}
			</span>
		</div>
	);
}

const paperCrumpleStyle: CSSProperties = {
	backgroundColor: "var(--color-paper)",
	backgroundImage: 'url("/landing/paper-crumple.jpg")',
	backgroundSize: "cover",
	backgroundPosition: "center",
};

const amberCrumpleStyle: CSSProperties = {
	backgroundColor: "#ffc700",
	backgroundImage: 'url("/landing/paper-crumple.jpg")',
	backgroundSize: "cover",
	backgroundPosition: "center",
	backgroundBlendMode: "soft-light",
};

/* ─────────────────────────────────────────────
   WATCH → PICK → REPUTATION LOOP
───────────────────────────────────────────── */
function WatchPredictLoop({ t }: { t: (key: string) => string }) {
	const reduceMotion = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { once: true, margin: "-80px" });
	const ease = [0.23, 1, 0.32, 1] as const;

	const step = (delay: number) =>
		reduceMotion
			? { initial: false as const, animate: { opacity: 1 } }
			: {
					initial: { opacity: 0, transform: "translateY(12px)" },
					animate: inView
						? { opacity: 1, transform: "translateY(0px)" }
						: { opacity: 0, transform: "translateY(12px)" },
					transition: { duration: 0.32, ease, delay },
				};

	return (
		<div
			ref={ref}
			className="relative mx-auto w-full max-w-[300px] select-none sm:max-w-[340px] md:mx-0 md:max-w-[360px]"
			aria-hidden="true"
		>
			{/* 1 — Watch */}
			<motion.div
				className="relative z-[1] -rotate-2 border-[3px] border-black bg-charcoal p-4 shadow-[6px_6px_0_#000] sm:p-5"
				{...step(0)}
			>
				<div className="mb-3 flex items-center gap-2">
					<span className="inline-block h-2.5 w-2.5 shrink-0 bg-bsen-red" />
					<span
						className="font-black text-[11px] text-electric-lime uppercase tracking-[0.18em]"
						style={{ fontFamily: "var(--font-body)" }}
					>
						{t("watchPredict.watchLabel")}
					</span>
				</div>
				<p
					className="font-black text-lg text-white uppercase leading-[0.95] tracking-tight sm:text-xl"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("watchPredict.stepWatch")}
				</p>
			</motion.div>

			{/* 2 — Pick */}
			<motion.div
				className="relative z-[2] -mt-4 ml-3 rotate-[2.5deg] border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#000] sm:ml-6 sm:p-5 md:ml-8"
				{...step(0.05)}
			>
				<div className="mb-3 inline-flex border-2 border-black bg-electric-lime px-2.5 py-1">
					<span
						className="font-black text-[11px] text-black uppercase tracking-[0.14em]"
						style={{ fontFamily: "var(--font-body)" }}
					>
						{t("watchPredict.predictLabel")}
					</span>
				</div>
				<p
					className="font-black text-ink text-lg uppercase leading-[0.95] tracking-tight sm:text-xl"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("watchPredict.stepPick")}
				</p>
				<div className="mt-3 flex items-center gap-2 border-2 border-black bg-paper px-2.5 py-1.5">
					<span
						className="material-symbols-outlined text-black text-lg"
						style={{ fontVariationSettings: "'FILL' 1" }}
					>
						check_circle
					</span>
					<span
						className="font-black text-[11px] text-black uppercase tracking-wider"
						style={{ fontFamily: "var(--font-body)" }}
					>
						{t("watchPredict.pickSaved")}
					</span>
				</div>
			</motion.div>

			{/* 3 — Reputation */}
			<motion.div
				className="relative z-[3] -mt-4 -rotate-[1.5deg] border-[3px] border-black bg-electric-lime p-4 shadow-[6px_6px_0_#000] sm:p-5 md:mr-2"
				{...step(0.1)}
			>
				<span
					className="font-black text-[11px] text-black uppercase tracking-[0.18em]"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("watchPredict.reputationLabel")}
				</span>
				<p
					className="mt-1 font-black text-4xl text-black uppercase leading-none tracking-tight sm:text-5xl"
					style={{ fontFamily: "var(--font-display)" }}
				>
					{t("watchPredict.pts")}
				</p>
				<p
					className="mt-2 font-black text-black/70 text-sm uppercase leading-snug"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("watchPredict.stepRep")}
				</p>
			</motion.div>
		</div>
	);
}

/* ─────────────────────────────────────────────
   BETTING CAROUSEL MOCK — mirrors BettingCarousel.tsx
───────────────────────────────────────────── */
function BettingCarouselMock({
	t,
	size = "md",
	className,
}: {
	t: (key: string, options?: Record<string, string | number>) => string;
	size?: "md" | "lg";
	className?: string;
}) {
	const large = size === "lg";
	const logoClass = large
		? "h-14 w-14 drop-shadow-sm sm:h-16 sm:w-16 md:h-24 md:w-24"
		: "h-14 w-14 drop-shadow-sm md:h-16 md:w-16";

	return (
		<div
			aria-hidden="true"
			className={`pointer-events-none relative mx-auto w-full shrink-0${large ? "max-w-[min(100%,360px)] sm:max-w-[400px] md:max-w-[440px] lg:max-w-[480px]" : "max-w-[340px]"}${className ? ` ${className}` : ""}`}
		>
			{/* Tournament header — outside the card, like the real carousel */}
			<div className="mb-4 flex justify-center">
				<div
					className={`flex max-w-full items-center gap-2 rounded-md border-2 border-black bg-white shadow-comic sm:gap-3 ${large ? "px-3 py-2 sm:px-4 sm:py-2.5" : "px-3 py-2"}`}
				>
					<img
						src="https://logos.bsebfantasy.me/tournaments/265/logo.png?t=1777573893124"
						alt=""
						className={`shrink-0 object-contain ${large ? "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" : "h-8 w-8"}`}
					/>
					<span
						className={`min-w-0 truncate font-black text-ink uppercase tracking-wider ${large ? "text-xs sm:text-sm md:text-base" : "text-xs"}`}
						style={{ fontFamily: "var(--font-body)" }}
					>
						{t("mock.tournamentName")}
					</span>
				</div>
			</div>

			<div className="mb-3 flex flex-wrap items-center justify-center gap-2">
				<span
					className="rounded-md bg-ink px-3 py-1 font-black text-white text-xs uppercase"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("mock.matchLabel")}
				</span>
				<span
					className="rounded-full bg-electric-lime px-3 py-1 font-black text-[10px] text-black uppercase"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("mock.picksOpen")}
				</span>
			</div>

			<div
				className="relative"
				style={{
					filter: large
						? "drop-shadow(10px 12px 0px rgba(0,0,0,0.45))"
						: "drop-shadow(6px 6px 0px rgba(0,0,0,0.30))",
				}}
			>
				<div className="relative -rotate-1 overflow-hidden rounded-lg border-[3px] border-black bg-white shadow-comic-md">
					{/* Match counter */}
					<div className="border-black border-b-2 bg-tape py-1.5 text-center">
						<span
							className="font-black text-[10px] text-ink uppercase tracking-wider"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("mock.matchCounter")}
						</span>
					</div>

					{/* Teams */}
					<div
						className={`relative grid grid-cols-2 ${large ? "h-40 sm:h-44 md:h-52" : "h-40"}`}
					>
						<div className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
							<div
								className={`flex items-center justify-center rounded-full border-2 border-black bg-white shadow-comic-sm ${large ? "h-10 w-10" : "h-9 w-9"}`}
							>
								<span
									className={`font-black text-ink ${large ? "text-sm" : "text-xs"}`}
									style={{ fontFamily: "var(--font-display)" }}
								>
									{t("pickArena.vs")}
								</span>
							</div>
						</div>

						{/* Team A — selected */}
						<div className="relative flex h-full flex-col overflow-hidden border-black border-r-2 bg-brawl-blue">
							<div className="pointer-events-none absolute inset-0 z-20 border-[4px] border-electric-lime" />
							<div className="relative z-10 flex h-full w-full flex-col">
								<div className="w-full bg-black/20 px-2 py-2 text-center">
									<span
										className={`block truncate font-black text-white uppercase tracking-wider ${large ? "text-xs" : "text-[10px]"}`}
										style={{ fontFamily: "var(--font-body)" }}
									>
										HMBLE
									</span>
								</div>
								<div className="flex flex-grow items-center justify-center p-3 md:p-4">
									<TeamLogo
										teamName="HMBLE"
										logoUrl="https://logos.bsebfantasy.me/teams/15/logo.png"
										size="xl"
										className={logoClass}
									/>
								</div>
								<div className="flex min-h-[34px] w-full items-center justify-center bg-black/10 px-2 py-1.5 text-center">
									<span className="font-bold text-[10px] text-white uppercase leading-none tracking-wider">
										WR: 72%
									</span>
								</div>
							</div>
						</div>

						{/* Team B — not selected (grayed like the real carousel) */}
						<div className="relative flex h-full flex-col overflow-hidden bg-gray-200 grayscale">
							<div className="relative z-10 flex h-full w-full flex-col">
								<div className="w-full bg-black/10 px-2 py-2 text-center">
									<span
										className={`block truncate font-black text-ink/70 uppercase tracking-wider ${large ? "text-xs" : "text-[10px]"}`}
										style={{ fontFamily: "var(--font-body)" }}
									>
										FUT Esports
									</span>
								</div>
								<div className="flex flex-grow items-center justify-center p-3 md:p-4">
									<TeamLogo
										teamName="FUT Esports"
										logoUrl="https://logos.bsebfantasy.me/teams/17/logo.png"
										size="xl"
										className={logoClass}
									/>
								</div>
								<div className="flex min-h-[34px] w-full items-center justify-center bg-black/5 px-2 py-1.5 text-center">
									<span className="font-bold text-[10px] text-ink/50 uppercase leading-none tracking-wider">
										WR: 61%
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-2 border-black border-t-2 bg-white">
						<div className="border-gray-200 border-r bg-brawl-blue/[0.04] px-3 py-3">
							<div className="mb-2.5 flex flex-wrap items-center gap-1.5">
								<span className="rounded bg-brawl-blue/10 px-1.5 py-0.5 font-black text-[10px] text-brawl-blue">
									{t("mock.seed", { n: 1 })}
								</span>
								<span className="rounded bg-tape px-1.5 py-0.5 font-bold text-[10px] text-gray-600">
									{t("mock.group", { g: "A" })}
								</span>
							</div>
							<div className="space-y-2">
								{[
									{
										label: t("mock.statRegion"),
										value: "EMEA",
										valueClass: "font-bold text-[10px] text-ink",
									},
									{
										label: t("mock.statWr"),
										value: "72%",
										valueClass: "font-black text-[11px] text-brawl-blue",
									},
									{
										label: t("mock.statSeries"),
										value: "+2",
										valueClass: "font-bold text-[10px] text-green-600",
									},
								].map(({ label, value, valueClass }) => (
									<div
										key={label}
										className="flex items-center justify-between rounded-md bg-white px-2.5 py-2 shadow-[1px_1px_0_0_#d9d9d9]"
									>
										<span className="font-black text-[9px] text-gray-400 uppercase">
											{label}
										</span>
										<span className={valueClass}>{value}</span>
									</div>
								))}
							</div>
						</div>
						<div className="bg-brawl-red/[0.04] px-3 py-3">
							<div className="mb-2.5 flex flex-wrap items-center justify-end gap-1.5">
								<span className="rounded bg-tape px-1.5 py-0.5 font-bold text-[10px] text-gray-600">
									{t("mock.group", { g: "D" })}
								</span>
								<span className="rounded bg-brawl-red/10 px-1.5 py-0.5 font-black text-[10px] text-brawl-red">
									{t("mock.seed", { n: 2 })}
								</span>
							</div>
							<div className="space-y-2">
								{[
									{
										label: t("mock.statRegion"),
										value: "EMEA",
										valueClass: "font-bold text-[10px] text-ink",
									},
									{
										label: t("mock.statWr"),
										value: "61%",
										valueClass: "font-black text-[11px] text-brawl-red",
									},
									{
										label: t("mock.statSeries"),
										value: "+1",
										valueClass: "font-bold text-[10px] text-green-600",
									},
								].map(({ label, value, valueClass }) => (
									<div
										key={label}
										className="flex items-center justify-between rounded-md bg-white px-2.5 py-2 shadow-[1px_1px_0_0_#d9d9d9]"
									>
										<span className="font-black text-[9px] text-gray-400 uppercase">
											{label}
										</span>
										<span className={valueClass}>{value}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Score picker — mirrors real carousel below the card */}
			<div className="mt-5 w-full">
				<div className="mb-2 text-center">
					<span
						className="font-black text-white/85 text-xs uppercase tracking-wider"
						style={{ fontFamily: "var(--font-body)" }}
					>
						{t("mock.pickScore")}
					</span>
				</div>
				<div className="grid grid-cols-3 gap-2 md:gap-3">
					{[
						{ label: "3 - 0", desc: t("mock.scoreDominant"), selected: true },
						{ label: "3 - 1", desc: t("mock.scoreStrong"), selected: false },
						{ label: "3 - 2", desc: t("mock.scoreClose"), selected: false },
					].map(({ label, desc, selected }) => (
						<div
							key={label}
							className={`relative flex h-14 flex-col items-center justify-center rounded-md border-2 bg-white p-1.5 md:h-16 ${selected ? "border-black shadow-comic" : "border-gray-300 opacity-80"}`}
						>
							{selected ? (
								<div className="absolute top-0 right-0 left-0 h-1 rounded-t-[4px] bg-brawl-blue" />
							) : null}
							<span
								className="font-black text-ink text-sm leading-none md:text-base"
								style={{ fontFamily: "var(--font-body)" }}
							>
								{label}
							</span>
							<span className="mt-1 hidden font-bold text-[8px] text-gray-400 uppercase leading-none min-[380px]:block">
								{desc}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="mt-4">
				<div
					className={`flex w-full items-center justify-center gap-2 rounded border-2 border-black bg-electric-lime font-black text-black uppercase tracking-wide shadow-comic ${large ? "py-3.5 text-sm md:text-base" : "py-3 text-sm"}`}
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("mock.confirmPick")}
				</div>
			</div>
		</div>
	);
}

function PrimaryCTA({
	children,
	href,
	className,
}: {
	children: ReactNode;
	href?: string;
	className?: string;
}) {
	const style: CSSProperties = {
		background: "var(--color-electric-lime)",
		color: "#000000",
		borderRadius: "4px",
		boxShadow: "var(--shadow-broadcast)",
		fontFamily: "var(--font-body)",
		fontWeight: 800,
		lineHeight: "1.15",
		letterSpacing: "-0.01em",
		minHeight: "48px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		textDecoration: "none",
		textTransform: "uppercase",
		whiteSpace: "normal",
		textAlign: "center",
	};
	return (
		<a
			href={href}
			className={clsx(
				"landing-cta landing-cta-lime px-4 text-sm sm:px-6 sm:text-base",
				"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-electric-lime/50",
				className,
			)}
			style={style}
		>
			{children}
		</a>
	);
}

function DarkCTA({
	children,
	href,
	className,
}: {
	children: ReactNode;
	href?: string;
	className?: string;
}) {
	const style: CSSProperties = {
		background: "var(--color-bsen-red)",
		color: "#FFFFFF",
		borderRadius: "4px",
		boxShadow: "var(--shadow-broadcast)",
		fontFamily: "var(--font-body)",
		fontWeight: 800,
		lineHeight: "1.15",
		letterSpacing: "-0.01em",
		minHeight: "48px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		textDecoration: "none",
		textTransform: "uppercase",
		whiteSpace: "normal",
		textAlign: "center",
	};
	return (
		<a
			href={href}
			className={clsx(
				"landing-cta landing-cta-red px-4 text-sm sm:px-6 sm:text-base",
				"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bsen-red/50",
				className,
			)}
			style={style}
		>
			{children}
		</a>
	);
}

function InkCTA({
	children,
	href,
	className,
}: {
	children: ReactNode;
	href?: string;
	className?: string;
}) {
	const style: CSSProperties = {
		background: "var(--color-ink)",
		color: "#FFFFFF",
		borderRadius: "4px",
		boxShadow: "var(--shadow-broadcast)",
		fontFamily: "var(--font-body)",
		fontWeight: 800,
		lineHeight: "1.15",
		letterSpacing: "-0.01em",
		minHeight: "48px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		textDecoration: "none",
		textTransform: "uppercase",
		whiteSpace: "normal",
		textAlign: "center",
	};
	return (
		<a
			href={href}
			className={clsx(
				"landing-cta landing-cta-ink px-4 text-sm sm:px-6 sm:text-base",
				"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/40",
				className,
			)}
			style={style}
		>
			{children}
		</a>
	);
}

const podiumCfg = {
	1: {
		bg: "bg-brawl-yellow",
		shadow: "shadow-comic-lg",
		height: "h-44 md:h-52",
		avatarSize: "h-20 w-20 md:h-24 md:w-24",
		rankSize: "text-6xl md:text-7xl",
		rankColor: "text-[#d4a800]",
		badgeBg: "bg-brawl-yellow",
		badgeText: "text-black",
		ptsSize: "text-3xl",
		crown: true,
	},
	2: {
		bg: "bg-[#c0c0c0]",
		shadow: "shadow-comic-md",
		height: "h-36 md:h-44",
		avatarSize: "h-16 w-16 md:h-20 md:w-20",
		rankSize: "text-5xl md:text-6xl",
		rankColor: "text-[#909090]",
		badgeBg: "bg-ink",
		badgeText: "text-white",
		ptsSize: "text-2xl",
		crown: false,
	},
	3: {
		bg: "bg-[#cd7f32]",
		shadow: "shadow-comic-md",
		height: "h-28 md:h-36",
		avatarSize: "h-14 w-14 md:h-16 md:w-16",
		rankSize: "text-4xl md:text-5xl",
		rankColor: "text-[#8b5e2a]",
		badgeBg: "bg-ink",
		badgeText: "text-white",
		ptsSize: "text-xl",
		crown: false,
	},
} as const;

function PodiumColumn({
	entry,
	rank,
}: {
	entry?: LeaderboardEntry;
	rank: 1 | 2 | 3;
}) {
	const cfg = podiumCfg[rank];
	const accuracyRate =
		entry && entry.totalBets > 0
			? Math.round((entry.correctPredictions / entry.totalBets) * 100)
			: 0;

	if (!entry) {
		return <div className="flex flex-1 flex-col items-center" />;
	}

	const tierLabel = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";

	return (
		<div
			className={clsx(
				"flex flex-1 flex-col items-center",
				rank === 1 ? "z-20 scale-105" : "z-10",
			)}
		>
			<div className="mb-1">
				{cfg.crown ? (
					<Crown
						className="h-7 w-7 text-[#ffc700]"
						fill="#ffc700"
						strokeWidth={2}
					/>
				) : (
					<MiniMedalBadge tier={tierLabel as "1st" | "2nd" | "3rd"} size="sm" />
				)}
			</div>

			<div className="relative mb-1">
				<div
					className={clsx(
						"overflow-hidden rounded-lg border-2 border-black bg-white",
						cfg.avatarSize,
						cfg.shadow,
					)}
				>
					{entry.image ? (
						<img
							src={entry.image}
							alt={entry.name}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-paper font-black text-gray-400 text-xl">
							{entry.name.charAt(0).toUpperCase()}
						</div>
					)}
				</div>
				<div
					className={clsx(
						"absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-lg border-2 border-black font-black text-xs shadow-sm",
						cfg.badgeBg,
						cfg.badgeText,
					)}
				>
					{rank}
				</div>
			</div>

			<span className="mb-1 block max-w-[120px] truncate text-center font-black text-[#121212] text-xs uppercase tracking-tight md:max-w-[140px] md:text-sm">
				{entry.name}
			</span>

			<div className="mb-2 text-center">
				<span
					className={clsx(
						"block font-black text-black leading-none",
						cfg.ptsSize,
					)}
				>
					{entry.totalPoints}
				</span>
				<span className="block font-bold text-[10px] text-gray-500 uppercase tracking-[0.2em]">
					pts
				</span>
			</div>

			{entry.medals.total > 0 && (
				<div className="mb-1.5">
					<MedalCountSummary
						gold={entry.medals.gold}
						silver={entry.medals.silver}
						bronze={entry.medals.bronze}
						size="sm"
					/>
				</div>
			)}

			<div className="mb-3 flex items-center gap-0.5">
				<div className="flex items-center gap-0.5 rounded border border-black bg-brawl-yellow px-1 py-0.5 shadow-comic-press">
					<Star className="h-2.5 w-2.5 text-black" fill="black" />
					<span className="font-black text-[9px] text-black">
						{entry.perfectPicks}
					</span>
				</div>
				<div className="flex items-center gap-0.5 rounded border border-black/20 bg-white px-1 py-0.5 shadow-comic-press">
					<span className="font-black text-[9px] text-green-600">✓</span>
					<span className="font-black text-[9px] text-black">
						{entry.correctPredictions}
					</span>
				</div>
				{entry.underdogPicks > 0 && (
					<div className="flex items-center gap-0.5 rounded border border-black bg-purple-400 px-1 py-0.5 shadow-comic-press">
						<Zap className="h-2.5 w-2.5 text-black" strokeWidth={3} />
						<span className="font-black text-[9px] text-black">
							{entry.underdogPicks}
						</span>
					</div>
				)}
				<div
					className={clsx(
						"rounded border border-black px-1 py-0.5 shadow-comic-press",
						accuracyRate >= 70
							? "bg-green-500"
							: accuracyRate >= 40
								? "bg-yellow-400"
								: "bg-red-500",
					)}
				>
					<span
						className={clsx(
							"font-black text-[9px]",
							accuracyRate >= 40 ? "text-black" : "text-white",
						)}
					>
						{accuracyRate}%
					</span>
				</div>
			</div>

			<div
				className={clsx(
					"relative mt-auto w-full rounded-t-xl border-[3px] border-black",
					cfg.bg,
					cfg.height,
					cfg.shadow,
					rank === 1 ? "-skew-x-1" : rank === 2 ? "-skew-x-1" : "skew-x-1",
				)}
			>
				<span
					className={clsx(
						"absolute bottom-2 left-1/2 -translate-x-1/2 select-none font-black italic tracking-tighter",
						cfg.rankSize,
						cfg.rankColor,
						rank === 1 ? "skew-x-1" : rank === 2 ? "skew-x-1" : "-skew-x-1",
					)}
				>
					{rank}
				</span>
			</div>
		</div>
	);
}

function LandingLeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
	const accuracyRate =
		entry.totalBets > 0
			? Math.round((entry.correctPredictions / entry.totalBets) * 100)
			: 0;

	return (
		<div className="landing-lb-card flex w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-black bg-white px-3 py-2.5 shadow-comic">
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/10 bg-ink">
				<span className="font-black text-base text-white italic">
					{entry.rank}
				</span>
			</div>

			<div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-paper">
				{entry.image ? (
					<img
						src={entry.image}
						alt={entry.name}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center font-black text-base text-gray-400">
						{entry.name.charAt(0).toUpperCase()}
					</div>
				)}
			</div>

			<div className="flex min-w-0 flex-1 flex-col justify-center">
				<span className="block truncate font-bold text-[#121212] text-xs uppercase tracking-tight md:text-sm">
					{entry.name}
				</span>
				<div className="mt-1 flex flex-wrap items-center gap-1">
					<div className="flex items-center gap-0.5 rounded bg-brawl-yellow px-1.5 py-0.5">
						<Star className="h-2.5 w-2.5 text-black" fill="black" />
						<span className="font-black text-[10px] text-black">
							{entry.perfectPicks}
						</span>
					</div>
					<div className="flex items-center gap-0.5 rounded border border-black/20 bg-white px-1.5 py-0.5">
						<span className="font-black text-[10px] text-green-600">✓</span>
						<span className="font-black text-[10px] text-black">
							{entry.correctPredictions}
						</span>
					</div>
					{entry.underdogPicks > 0 && (
						<div className="flex items-center gap-0.5 rounded bg-purple-400 px-1.5 py-0.5">
							<span className="font-black text-[10px] text-black">
								{entry.underdogPicks}
							</span>
						</div>
					)}
					<div
						className={clsx(
							"rounded px-1.5 py-0.5",
							accuracyRate >= 70
								? "bg-green-500"
								: accuracyRate >= 40
									? "bg-yellow-400"
									: "bg-red-500",
						)}
					>
						<span
							className={clsx(
								"font-black text-[10px]",
								accuracyRate >= 40 ? "text-black" : "text-white",
							)}
						>
							{accuracyRate}%
						</span>
					</div>
					{entry.medals.total > 0 && (
						<MedalCountSummary
							gold={entry.medals.gold}
							silver={entry.medals.silver}
							bronze={entry.medals.bronze}
							size="sm"
						/>
					)}
				</div>
			</div>

			<div className="shrink-0 rounded-md border-2 border-black bg-white px-3 py-1.5 text-center shadow-comic-sm">
				<span className="block font-black text-[#121212] text-xl leading-none">
					{entry.totalPoints}
				</span>
				<span className="block font-bold text-[9px] text-gray-500 uppercase tracking-wider">
					pts
				</span>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────
   PICK ARENA — rotating featured BSC matchups
───────────────────────────────────────────── */
function PickArenaTeam({
	team,
	variant,
}: {
	team: LandingMatchup["teamA"];
	variant: "blue" | "red";
}) {
	return (
		<div className="relative flex w-full flex-col items-center">
			<div className="relative flex h-36 w-full items-center justify-center sm:h-48 md:h-64">
				<SpraySplat
					variant={variant}
					className={clsx(
						"absolute top-1/2 left-1/2 z-0 h-44 w-52 max-w-none -translate-x-1/2 -translate-y-1/2 sm:h-64 sm:w-80 md:h-80 md:w-[26rem]",
						variant === "blue" ? "-rotate-6" : "rotate-6",
					)}
				/>
				{team.logoUrl ? (
					<img
						src={team.logoUrl}
						alt={team.name}
						className="relative z-10 h-20 w-20 object-contain drop-shadow-[3px_4px_0_rgba(0,0,0,0.35)] sm:h-28 sm:w-28 md:h-40 md:w-40"
					/>
				) : (
					<span className="relative z-10 font-black text-4xl text-black drop-shadow-[2px_2px_0_#fff] sm:text-5xl md:text-6xl">
						{team.name.charAt(0)}
					</span>
				)}
			</div>
			<span
				className="relative z-10 mt-2 max-w-full truncate px-1 text-center font-black text-black text-sm uppercase leading-tight tracking-tight sm:text-lg md:text-2xl"
				style={{ fontFamily: "var(--font-body)" }}
			>
				{team.name}
			</span>
			{team.region ? (
				<span className="relative z-10 mt-1 font-bold text-black/45 text-xs uppercase tracking-widest md:text-sm">
					{team.region}
				</span>
			) : null}
		</div>
	);
}

function PickArenaMatchup({ matchups }: { matchups: LandingMatchup[] }) {
	const { t } = useTranslation("landing");
	const reduceMotion = useReducedMotion();
	const [index, setIndex] = useState(0);
	const [hoverPaused, setHoverPaused] = useState(false);

	const isPaused = hoverPaused || !!reduceMotion;

	useEffect(() => {
		if (matchups.length < 2 || isPaused) return;
		const id = window.setInterval(() => {
			setIndex((prev) => (prev + 1) % matchups.length);
		}, 7500);
		return () => window.clearInterval(id);
	}, [matchups.length, isPaused]);

	if (matchups.length === 0) return null;

	const matchup = matchups[index];
	if (!matchup) return null;

	const enterEase = [0.23, 1, 0.32, 1] as const;
	const exitEase = [0.4, 0, 1, 1] as const;
	const enterDur = reduceMotion ? 0.2 : 0.42;
	const exitDur = reduceMotion ? 0.15 : 0.22;
	const liveLabel = t("pickArena.matchupLive", {
		teamA: matchup.teamA.name,
		teamB: matchup.teamB.name,
	});

	return (
		<div
			className="relative mb-8 flex min-h-[220px] w-full max-w-5xl items-center justify-center overflow-hidden sm:mb-12 sm:min-h-[280px] md:min-h-[360px]"
			onMouseEnter={() => setHoverPaused(true)}
			onMouseLeave={() => setHoverPaused(false)}
			onFocusCapture={() => setHoverPaused(true)}
			onBlurCapture={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
					setHoverPaused(false);
				}
			}}
		>
			<p className="sr-only" aria-live="polite" aria-atomic="true">
				{liveLabel}
			</p>

			<AnimatePresence mode="sync" initial={false}>
				<motion.div
					key={`${matchup.teamA.id}-${matchup.teamB.id}`}
					className="absolute inset-0 flex items-center justify-center gap-1 px-1 sm:gap-6 sm:px-0 md:gap-10"
					initial={{
						opacity: 0,
						filter: reduceMotion ? "blur(0px)" : "blur(2px)",
					}}
					animate={{ opacity: 1, filter: "blur(0px)" }}
					exit={{
						opacity: 0,
						filter: reduceMotion ? "blur(0px)" : "blur(2px)",
					}}
					transition={{
						opacity: { duration: exitDur, ease: exitEase },
						filter: { duration: exitDur, ease: exitEase },
					}}
					aria-hidden="true"
				>
					<motion.div
						className="relative flex w-[42%] max-w-[320px] sm:w-64 md:w-80"
						initial={
							reduceMotion
								? { opacity: 0 }
								: {
										opacity: 0,
										transform: "translateX(-48px) scale(0.92) rotate(-4deg)",
									}
						}
						animate={{
							opacity: 1,
							transform: "translateX(0px) scale(1) rotate(0deg)",
						}}
						exit={
							reduceMotion
								? { opacity: 0 }
								: {
										opacity: 0,
										transform: "translateX(-32px) scale(0.94) rotate(-3deg)",
									}
						}
						transition={{
							duration: enterDur,
							ease: enterEase,
							delay: reduceMotion ? 0 : 0.03,
						}}
					>
						<PickArenaTeam team={matchup.teamA} variant="blue" />
					</motion.div>

					<motion.div
						className="relative z-20 shrink-0 px-1.5 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4"
						initial={
							reduceMotion
								? { opacity: 0 }
								: {
										opacity: 0,
										transform: "translateY(8px) scale(0.92) rotate(-12deg)",
									}
						}
						animate={{
							opacity: 1,
							transform: "translateY(0px) scale(1) rotate(-3deg)",
						}}
						exit={
							reduceMotion
								? { opacity: 0 }
								: {
										opacity: 0,
										transform: "translateY(-6px) scale(0.94) rotate(8deg)",
									}
						}
						transition={
							reduceMotion
								? { duration: 0.2 }
								: {
										type: "spring",
										stiffness: 380,
										damping: 22,
										delay: 0.06,
									}
						}
					>
						<img
							src="/landing/tape-scrap.png"
							alt=""
							aria-hidden="true"
							draggable={false}
							className="absolute inset-0 h-full w-full object-fill drop-shadow-[3px_3px_0_rgba(0,0,0,0.4)]"
						/>
						<span
							className="relative z-10 font-black text-base text-black sm:text-xl md:text-3xl"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("pickArena.vs")}
						</span>
					</motion.div>

					<motion.div
						className="relative flex w-[42%] max-w-[320px] sm:w-64 md:w-80"
						initial={
							reduceMotion
								? { opacity: 0 }
								: {
										opacity: 0,
										transform: "translateX(48px) scale(0.92) rotate(4deg)",
									}
						}
						animate={{
							opacity: 1,
							transform: "translateX(0px) scale(1) rotate(0deg)",
						}}
						exit={
							reduceMotion
								? { opacity: 0 }
								: {
										opacity: 0,
										transform: "translateX(32px) scale(0.94) rotate(3deg)",
									}
						}
						transition={{
							duration: enterDur,
							ease: enterEase,
							delay: reduceMotion ? 0 : 0.03,
						}}
					>
						<PickArenaTeam team={matchup.teamB} variant="red" />
					</motion.div>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export function LandingPage({
	isAuthenticated,
	topUsers = [],
	matchups: matchupsProp = EMPTY_MATCHUPS,
}: LandingPageProps) {
	const { t } = useTranslation("landing");
	const { routeTo } = useLangLink();
	const reduceMotion = useReducedMotion();
	const [matchups, setMatchups] = useState<LandingMatchup[]>(matchupsProp);

	useEffect(() => {
		if (matchupsProp.length > 0) {
			setMatchups(matchupsProp);
			return;
		}
		let cancelled = false;
		getLandingMatchups()
			.then((rows) => {
				if (!cancelled) setMatchups(rows);
			})
			.catch(() => {
				if (!cancelled) setMatchups([]);
			});
		return () => {
			cancelled = true;
		};
	}, [matchupsProp]);

	const top3 = topUsers.slice(0, 3);
	const rest = topUsers.slice(3);
	const authTarget = isAuthenticated ? "/dashboard" : "/login";
	const rankingTarget = isAuthenticated ? "/leaderboard" : "/login";

	const floatY = reduceMotion ? 0 : 4;

	return (
		<div
			className="flex min-h-[100dvh] flex-col bg-paper"
			style={{ overflowX: "clip", backgroundColor: "var(--color-paper)" }}
		>
			{/* ════════════════════════════════════════════════════
			    Z1 — DARK HERO COLLAGE
			════════════════════════════════════════════════════ */}
			<section
				className="relative min-h-[100dvh] w-full overflow-hidden"
				style={{ background: "var(--color-charcoal)" }}
			>
				{/* Arena atmosphere */}
				<img
					src="/landing/hero-arena.png"
					alt=""
					className="pointer-events-none absolute inset-0 h-full w-full object-cover"
					aria-hidden="true"
				/>
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(24,24,24,0.94)_0%,rgba(24,24,24,0.88)_55%,rgba(24,24,24,0.72)_100%)] md:bg-[linear-gradient(105deg,rgba(24,24,24,0.92)_0%,rgba(24,24,24,0.72)_48%,rgba(24,24,24,0.45)_100%)]" />
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						backgroundImage: "var(--background-image-noise)",
						opacity: 0.12,
					}}
				/>

				{/* Team paint wash */}
				<div className="absolute top-0 right-0 left-0 z-20 flex h-[5px]">
					<div className="flex-1 bg-brawl-blue" />
					<div className="flex-1 bg-bsen-red" />
				</div>

				{/* Red spray — asymmetric atmosphere (blue is anchored to the logo) */}
				<SpraySplat
					variant="red"
					className="absolute right-[-8%] bottom-[8%] z-[1] h-36 w-52 opacity-35 sm:h-48 sm:w-72 sm:opacity-50 md:right-[-6%] md:bottom-[12%] md:h-72 md:w-96"
				/>

				{/* Hero content + product mock — stacked through tablet/laptop, split at xl */}
				<div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col xl:flex-row xl:items-center xl:gap-6 2xl:gap-10">
					<div className="relative z-10 flex min-w-0 flex-col justify-center px-4 pt-24 pb-6 sm:px-6 md:px-10 xl:w-[54%] xl:shrink-0 xl:px-12 xl:pt-28 xl:pb-24 2xl:w-[56%] 2xl:px-20">
						<motion.div
							initial={
								reduceMotion
									? false
									: { opacity: 0, transform: "translateY(12px)" }
							}
							animate={{ opacity: 1, transform: "translateY(0px)" }}
							transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
							className="relative mb-5 w-fit"
						>
							<SpraySplat
								variant="blue"
								className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-28 w-40 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-6 opacity-55 sm:h-36 sm:w-52 sm:opacity-60 md:h-44 md:w-64 xl:h-52 xl:w-72"
							/>
							<img
								src="/logo-white.png"
								alt="BSEN Pickems"
								className="relative z-10 h-11 w-auto object-contain sm:h-14 md:h-16 xl:h-[5.5rem] 2xl:h-24"
							/>
						</motion.div>

						<motion.h1
							initial={
								reduceMotion
									? false
									: { opacity: 0, transform: "translateY(16px)" }
							}
							animate={{ opacity: 1, transform: "translateY(0px)" }}
							transition={{
								duration: 0.3,
								delay: 0.04,
								ease: [0.23, 1, 0.32, 1],
							}}
							className="max-w-full font-black text-white uppercase leading-[0.92] tracking-tight"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(2.1rem, 1.75rem + 2.8vw, 5.5rem)",
							}}
						>
							<span className="block break-words xl:whitespace-nowrap">
								{t("hero.title")}
							</span>
							<span className="block break-words text-electric-lime xl:whitespace-nowrap">
								{t("hero.titleAccent")}
							</span>
						</motion.h1>

						<motion.p
							initial={reduceMotion ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.09, duration: 0.28 }}
							className="mt-5 max-w-lg font-black text-[#A0A0A0] text-base leading-relaxed md:text-lg xl:text-xl"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("hero.subtitle")}
						</motion.p>

						<motion.div
							initial={
								reduceMotion
									? false
									: { opacity: 0, transform: "translateY(10px)" }
							}
							animate={{ opacity: 1, transform: "translateY(0px)" }}
							transition={{
								delay: 0.12,
								duration: 0.28,
								ease: [0.23, 1, 0.32, 1],
							}}
							className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
						>
							<Link {...routeTo(authTarget)} asChild>
								<PrimaryCTA className="w-full sm:w-auto">
									{t("hero.cta")}
								</PrimaryCTA>
							</Link>

							{!isAuthenticated && (
								<Link
									{...routeTo("/login")}
									className="landing-text-link inline-flex items-center gap-1.5 font-black text-[#717070] text-sm uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-lime/50"
									style={{ fontFamily: "var(--font-body)" }}
								>
									{t("hero.secondaryCta")}
									<span
										className="material-symbols-outlined text-sm"
										aria-hidden="true"
									>
										arrow_forward
									</span>
								</Link>
							)}
						</motion.div>
					</div>

					<div className="relative z-0 flex w-full min-w-0 flex-1 items-center justify-center overflow-hidden px-4 pt-4 pb-12 sm:px-6 md:px-10 xl:w-[46%] xl:max-w-none xl:overflow-visible xl:px-8 xl:py-24 2xl:px-12">
						<motion.div
							initial={
								reduceMotion
									? false
									: {
											opacity: 0,
											transform: "translateY(16px) scale(0.96)",
										}
							}
							animate={
								reduceMotion
									? { opacity: 1, transform: "translateY(0px) scale(1)" }
									: {
											opacity: 1,
											transform: [
												"translateY(0px) scale(1)",
												`translateY(-${floatY}px) scale(1)`,
												"translateY(0px) scale(1)",
											],
										}
							}
							transition={
								reduceMotion
									? { duration: 0.28 }
									: {
											opacity: {
												duration: 0.35,
												delay: 0.1,
												ease: [0.23, 1, 0.32, 1],
											},
											transform: {
												duration: 6.5,
												repeat: Number.POSITIVE_INFINITY,
												ease: "easeInOut",
												delay: 0.45,
												times: [0, 0.5, 1],
											},
										}
							}
							className="w-full max-w-[min(100%,380px)] sm:max-w-[400px] xl:max-w-[460px] 2xl:max-w-[520px]"
						>
							<BettingCarouselMock t={t} size="lg" />
						</motion.div>
					</div>
				</div>
			</section>

			<SectionCut />

			{/* ════════════════════════════════════════════════════
			    Z2 — PAPER CHALLENGERS (asymmetric split)
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-12 md:py-20"
				style={paperCrumpleStyle}
			>
				<div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 sm:gap-10 sm:px-8 md:grid-cols-12 md:items-center md:gap-12 lg:px-12">
					{/* Left: community rank board (not the site logo) */}
					<div className="relative order-2 flex justify-center md:order-1 md:col-span-5 md:justify-start">
						<div
							className="relative w-full max-w-[280px] rotate-[-4deg] border-[3px] border-black bg-white p-5 shadow-comic-lg md:max-w-[320px] md:p-6"
							style={{
								backgroundImage: 'url("/landing/paper-crumple.jpg")',
								backgroundSize: "cover",
							}}
						>
							<TapeSticker rotate="-3deg" className="mb-4" tone="red">
								{t("challengers.sticker")}
							</TapeSticker>

							{/* Mini podium bars */}
							<div
								className="relative flex items-end justify-center gap-2 pt-2"
								aria-hidden="true"
							>
								<div className="flex w-14 flex-col items-center gap-1.5 md:w-16">
									<span
										className="font-black text-[#909090] text-lg leading-none"
										style={{ fontFamily: "var(--font-display)" }}
									>
										2
									</span>
									<div className="h-16 w-full border-2 border-black bg-[#c0c0c0] shadow-comic-sm md:h-20" />
								</div>
								<div className="relative z-10 flex w-16 flex-col items-center gap-1.5 md:w-[4.5rem]">
									<svg
										viewBox="0 0 80 100"
										className="mb-0.5 h-10 w-auto md:h-12"
									>
										<path
											fill="#c9a227"
											d="M20 12h40v8c0 14-8 24-16 28v8h10v8H26v-8h10v-8C28 44 20 34 20 20V12zm-8 4h6v10c0 6-2 10-6 12V16zm50 0h6v12c-4-2-6-6-6-12V16zM30 72h20l4 16H26l4-16z"
										/>
									</svg>
									<span
										className="font-black text-2xl text-[#d4a800] leading-none md:text-3xl"
										style={{ fontFamily: "var(--font-display)" }}
									>
										1
									</span>
									<div className="h-24 w-full border-2 border-black bg-brawl-yellow shadow-comic-md md:h-28" />
								</div>
								<div className="flex w-14 flex-col items-center gap-1.5 md:w-16">
									<span
										className="font-black text-[#8b5e2a] text-lg leading-none"
										style={{ fontFamily: "var(--font-display)" }}
									>
										3
									</span>
									<div className="h-12 w-full border-2 border-black bg-[#cd7f32] shadow-comic-sm md:h-14" />
								</div>
							</div>

							<div className="mt-4 border-2 border-black bg-electric-lime px-3 py-2 text-center shadow-comic-sm">
								<span
									className="font-black text-black text-xs uppercase tracking-[0.18em]"
									style={{ fontFamily: "var(--font-body)" }}
								>
									{t("challengers.rankMark")}
								</span>
							</div>
						</div>
					</div>

					{/* Right: copy */}
					<div className="order-1 flex flex-col gap-5 text-center md:order-2 md:col-span-7 md:text-left">
						<h2
							className="font-black text-black uppercase leading-[0.9] tracking-tight"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(1.75rem, 7.5vw, 3.5rem)",
								letterSpacing: "-0.02em",
							}}
						>
							{t("challengers.title")}
							<br />
							<span className="text-bsen-red">
								{t("challengers.titleAccent")}
							</span>
						</h2>

						<p
							className="mx-auto max-w-xl font-black text-[#454545] text-base leading-relaxed md:mx-0 md:text-lg"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("challengers.body")}
						</p>

						<div className="mt-1 flex justify-center md:justify-start">
							<Link {...routeTo(rankingTarget)} asChild>
								<DarkCTA className="w-full sm:w-auto">
									{t("challengers.cta")}
								</DarkCTA>
							</Link>
						</div>
					</div>
				</div>
			</section>

			<SectionCut />

			{/* ════════════════════════════════════════════════════
			    Z3 — AMBER WATCH + PREDICT
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-12 md:py-20"
				style={amberCrumpleStyle}
			>
				<div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 sm:gap-10 sm:px-8 md:grid-cols-12 md:gap-10 lg:px-12">
					<div className="order-2 flex justify-center md:order-1 md:col-span-5 md:justify-start">
						<WatchPredictLoop t={t} />
					</div>

					<div className="order-1 flex flex-col gap-5 text-center md:order-2 md:col-span-7 md:text-left">
						<h2
							className="mx-auto max-w-xl font-black text-black uppercase leading-[0.9] tracking-tight md:mx-0"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(1.6rem, 6.5vw, 3.25rem)",
								letterSpacing: "-0.02em",
							}}
						>
							{t("watchPredict.title")}
						</h2>

						<p
							className="mx-auto max-w-lg font-black text-base text-black/55 leading-relaxed md:mx-0 md:text-lg"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("watchPredict.body")}
						</p>

						<div className="mt-1 flex justify-center md:justify-start">
							<Link {...routeTo(authTarget)} asChild>
								<PrimaryCTA className="w-full sm:w-auto">
									{t("watchPredict.cta")}
								</PrimaryCTA>
							</Link>
						</div>
					</div>
				</div>
			</section>

			<SectionCut />

			{/* ════════════════════════════════════════════════════
			    Z4 — PICK ARENA (rotating matchups)
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-20 md:py-28"
				style={paperCrumpleStyle}
			>
				<div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-8">
					{matchups.length > 0 ? (
						<PickArenaMatchup matchups={matchups} />
					) : (
						<div className="relative mb-10 flex min-h-[120px] w-full max-w-xl items-center justify-center">
							<SpraySplat
								variant="blue"
								className="absolute top-1/2 left-[18%] h-36 w-48 -translate-x-1/2 -translate-y-1/2 -rotate-6 md:h-44 md:w-56"
							/>
							<SpraySplat
								variant="red"
								className="absolute top-1/2 right-[18%] h-36 w-48 translate-x-1/2 -translate-y-1/2 rotate-6 md:h-44 md:w-56"
							/>
							<div className="relative z-10 px-5 py-3">
								<img
									src="/landing/tape-scrap.png"
									alt=""
									aria-hidden="true"
									draggable={false}
									className="absolute inset-0 h-full w-full object-fill drop-shadow-[3px_3px_0_rgba(0,0,0,0.4)]"
								/>
								<span
									className="relative z-10 font-black text-black text-xl md:text-2xl"
									style={{ fontFamily: "var(--font-body)" }}
								>
									{t("pickArena.vs")}
								</span>
							</div>
						</div>
					)}

					<h2
						className="font-black text-black uppercase leading-[0.95] tracking-tight"
						style={{
							fontFamily: "var(--font-body)",
							fontSize: "clamp(1.75rem, 7.5vw, 3.5rem)",
							letterSpacing: "-0.02em",
						}}
					>
						{t("pickArena.title")}
					</h2>
					<p
						className="mt-4 max-w-md font-black text-[#454545] text-base leading-relaxed md:text-lg"
						style={{ fontFamily: "var(--font-body)" }}
					>
						{t("pickArena.body")}
					</p>
					<div className="mt-7">
						<Link {...routeTo(authTarget)} asChild>
							<InkCTA>{t("watchPredict.cta")}</InkCTA>
						</Link>
					</div>
				</div>
			</section>

			{/* ════════════════════════════════════════════════════
			    Z5 — LEADERBOARD
			════════════════════════════════════════════════════ */}
			<section className="relative py-12 md:py-20" style={paperCrumpleStyle}>
				<div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-8">
					<div className="mb-2 text-center">
						<h2
							className="font-black text-black uppercase tracking-tight"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(1.7rem, 7vw, 3rem)",
								letterSpacing: "-0.02em",
							}}
						>
							{t("leaderboard.title")}
						</h2>
						<p
							className="mt-1 font-black text-[#717070] text-xs uppercase tracking-[0.2em]"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("leaderboard.subtitle")}
						</p>
					</div>

					{topUsers.length === 0 ? (
						<div className="mt-8 flex flex-col items-center justify-center border-2 border-black/20 border-dashed bg-white/70 py-12 text-center">
							<p
								className="font-black text-[#717070] text-xs uppercase tracking-[0.2em]"
								style={{ fontFamily: "var(--font-body)" }}
							>
								{t("leaderboard.empty")}
							</p>
						</div>
					) : (
						<>
							{top3.length > 0 && (
								<div className="relative mt-8 flex items-end gap-1.5 px-0 pt-6 sm:gap-4 sm:px-1 sm:pt-8">
									<div className="absolute right-0 bottom-0 left-0 h-1.5 bg-black" />
									<PodiumColumn entry={top3[1]} rank={2} />
									<PodiumColumn entry={top3[0]} rank={1} />
									<PodiumColumn entry={top3[2]} rank={3} />
								</div>
							)}

							{rest.length > 0 && (
								<div className="mt-6 flex flex-col gap-3">
									{rest.map((entry) => (
										<LandingLeaderboardCard key={entry.userId} entry={entry} />
									))}
								</div>
							)}
						</>
					)}

					<div className="mt-8 flex justify-center">
						<Link {...routeTo(rankingTarget)} asChild>
							<DarkCTA>{t("leaderboard.viewAll")}</DarkCTA>
						</Link>
					</div>
				</div>
			</section>

			{/* Hard cut into dark howto — paint stripe only, no diagonal gap */}
			<div aria-hidden="true" className="relative z-20 flex h-1 w-full">
				<div className="w-1/2 bg-brawl-blue" />
				<div className="w-1/2 bg-bsen-red" />
			</div>

			{/* ════════════════════════════════════════════════════
			    Z6 — HOW TO COMPETE (staggered panels)
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-12 md:py-20"
				style={{ background: "var(--color-charcoal)" }}
			>
				<img
					src="/landing/howto-atmosphere.jpg"
					alt=""
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
				/>
				<div className="pointer-events-none absolute inset-0 bg-charcoal/70" />
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						backgroundImage: "var(--background-image-noise)",
						opacity: 0.2,
					}}
				/>

				{/* Trophy behind middle */}
				<svg
					aria-hidden="true"
					viewBox="0 0 80 100"
					className="pointer-events-none absolute top-1/2 left-1/2 z-[1] hidden h-56 w-auto -translate-x-1/2 -translate-y-1/2 opacity-15 md:block"
				>
					<path
						fill="var(--color-electric-lime)"
						d="M20 12h40v8c0 14-8 24-16 28v8h10v8H26v-8h10v-8C28 44 20 34 20 20V12zm-8 4h6v10c0 6-2 10-6 12V16zm50 0h6v12c-4-2-6-6-6-12V16zM30 72h20l4 16H26l4-16z"
					/>
				</svg>

				<div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-8">
					<h2
						className="mb-8 font-black text-white uppercase leading-[0.9] tracking-tight sm:mb-10"
						style={{
							fontFamily: "var(--font-body)",
							fontSize: "clamp(1.85rem, 8vw, 4.5rem)",
							letterSpacing: "-0.02em",
						}}
					>
						{t("howToCompete.title")}
					</h2>

					{/* Staggered overlapping panels — not equal columns */}
					<div className="relative flex flex-col gap-4 sm:gap-5 md:min-h-[340px] md:flex-row md:items-start md:gap-0">
						{[
							{
								n: 1,
								title: t("howToCompete.step1Title"),
								desc: t("howToCompete.step1Desc"),
								accent: "#2e5cff",
								accentText: "#FFFFFF",
								offset:
									"md:mt-0 md:-rotate-1 lg:-rotate-2 md:z-10 lg:mr-[-12px]",
							},
							{
								n: 2,
								title: t("howToCompete.step2Title"),
								desc: t("howToCompete.step2Desc"),
								accent: "var(--color-bsen-red)",
								accentText: "#FFFFFF",
								offset: "md:mt-6 md:rotate-1 md:z-20 lg:mt-10 lg:scale-105",
							},
							{
								n: 3,
								title: t("howToCompete.step3Title"),
								desc: t("howToCompete.step3Desc"),
								accent: "var(--color-electric-lime)",
								accentText: "#000000",
								offset: "md:mt-4 md:-rotate-1 md:z-10 lg:ml-[-12px]",
							},
						].map((step, i) => (
							<motion.div
								key={step.n}
								className={clsx("flex-1 p-5 sm:p-6 md:p-7", step.offset)}
								style={{
									background: "var(--color-panel-gray)",
									border: "1px solid #454545",
									borderRadius: "0px",
									boxShadow: "var(--shadow-broadcast-deep)",
									borderTop: `4px solid ${step.accent}`,
								}}
								initial={
									reduceMotion
										? false
										: { opacity: 0, transform: "translateY(14px)" }
								}
								whileInView={{
									opacity: 1,
									transform: "translateY(0px)",
								}}
								viewport={{ once: true, margin: "-60px" }}
								transition={{
									duration: 0.32,
									ease: [0.23, 1, 0.32, 1],
									delay: reduceMotion ? 0 : i * 0.05,
								}}
							>
								<div
									className="mb-5 flex h-10 w-10 items-center justify-center font-black text-xl"
									style={{
										background: step.accent,
										color: step.accentText,
										fontFamily: "var(--font-body)",
										borderRadius: "0px",
									}}
								>
									{step.n}
								</div>
								<h3
									className="mb-2 font-black text-white uppercase leading-tight tracking-tight"
									style={{
										fontFamily: "var(--font-body)",
										fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
										letterSpacing: "-0.01em",
									}}
								>
									{step.title}
								</h3>
								<p
									className="font-black text-sm text-white/70 leading-relaxed"
									style={{ fontFamily: "var(--font-body)" }}
								>
									{step.desc}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}

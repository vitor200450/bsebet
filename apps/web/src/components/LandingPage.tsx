/*
 * Hallmark · macrostructure: Zoned Strip Stack · genre: playful · design-system: DESIGN.md
 * tone: broadcast-competitive · anchor hue: electric-yellow #D2FF00
 * studied: yes · DNA-source: event.supercell.com-DESIGN.md (official BSC design system)
 * pre-emit critique: P5 H5 E5 S5 R5 V5
 *
 * Zone sequence (mirrors BSC Championship reference):
 *   Z1  dark hero        — #000 bg · Geist Mono 800 headline · electric-yellow accent
 *   Z2  paper section    — #f5f4f0 · torn edge · challengers pitch
 *   Z3  amber flood      — #ffc700 · WATCH/PREDICT sticker diptych · CTA
 *   Z4  paper leaderboard— #f5f4f0 · rank table
 *   Z5  dark how-to      — #181818 · step cards
 *   Z6  footer           — #000 · minimal split
 *
 * Font usage per design-system spec:
 *   Display/H1/H2: Geist Mono weight 800 (var(--font-body))
 *   Body/labels:   Inter (var(--font-display) — already mapped in index.css)
 *   Decorative:    Permanent Marker (var(--font-marker)) for graffiti-text only
 *
 * Button spec (from design system §4):
 *   Primary CTA:   bg #D2FF00, text #000, border-radius 4px, shadow rgba(0,0,0,0.24) 0 4px 4px 0
 *   Secondary CTA: bg transparent, text #000 (or #fff on dark), hover → #FF5543
 *   NO thick comic borders, NO skew, NO hard-offset shadows on buttons.
 *
 * Card/surface spec:
 *   Cards:  bg #181818 or #2B2B2B, border 1px solid #2B2B2B, border-radius 0px
 *   Shadow: rgba(0,0,0,0.24) 0px 4px 4px 0px (raised) · rgba(0,0,0,0.5) 0px 8px 32px 0px (modal)
 */
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { Crown, Star, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MedalCountSummary, MiniMedalBadge } from "@/components/MiniMedalBadge";
import { useLangLink } from "@/i18n/useLangLink";
import type { LeaderboardEntry } from "@/server/leaderboard";

interface LandingPageProps {
	isAuthenticated: boolean;
	topUsers?: LeaderboardEntry[];
}

/* ─────────────────────────────────────────────
   TORN EDGE — organic multi-layer paper rip
   Two SVG layers for physical paper depth.
   flip=true inverts for torn-bottom-of-zone.
───────────────────────────────────────────── */
function TornEdge({
	topColor,
	bottomColor,
	flip = false,
	height = 56,
}: {
	topColor: string;
	bottomColor: string;
	flip?: boolean;
	height?: number;
}) {
	return (
		<div
			aria-hidden="true"
			className={`relative w-full overflow-hidden leading-none select-none${flip ? "scale-y-[-1]" : ""}`}
			style={{ background: bottomColor, height: `${height}px` }}
		>
			<svg
				viewBox="0 0 1440 56"
				xmlns="http://www.w3.org/2000/svg"
				preserveAspectRatio="none"
				className="absolute bottom-0 left-0 h-full w-full"
				style={{ fill: topColor }}
				aria-hidden="true"
			>
				<path d="M0,0 L0,32 L12,22 L28,38 L40,18 L58,40 L70,24 L84,44 L96,28 L112,46 L124,30 L138,48 L154,26 L168,42 L180,20 L196,38 L210,14 L228,36 L242,22 L256,42 L272,16 L284,38 L300,26 L316,44 L328,18 L344,40 L360,22 L374,46 L388,28 L402,42 L418,20 L434,38 L448,14 L462,36 L476,26 L492,44 L506,18 L520,40 L536,22 L550,46 L564,28 L578,42 L594,16 L608,38 L622,24 L636,44 L652,18 L666,40 L682,22 L696,46 L710,30 L726,44 L740,20 L754,38 L770,14 L784,36 L800,26 L814,44 L830,18 L844,40 L858,24 L874,46 L888,28 L902,42 L918,20 L932,38 L948,14 L962,36 L976,26 L990,44 L1006,18 L1020,40 L1034,22 L1050,46 L1064,28 L1078,42 L1094,16 L1108,38 L1122,24 L1136,44 L1150,18 L1166,40 L1180,22 L1196,46 L1210,30 L1226,42 L1242,16 L1258,38 L1272,24 L1288,44 L1302,18 L1318,40 L1334,22 L1350,46 L1364,28 L1380,42 L1396,20 L1412,38 L1428,14 L1440,32 L1440,0 Z" />
			</svg>
			<svg
				viewBox="0 0 1440 56"
				xmlns="http://www.w3.org/2000/svg"
				preserveAspectRatio="none"
				className="absolute bottom-0 left-0 h-full w-full opacity-35"
				style={{ fill: topColor }}
				aria-hidden="true"
			>
				<path d="M0,0 L0,40 L16,30 L36,48 L56,28 L72,50 L90,36 L108,52 L130,34 L148,54 L166,38 L184,56 L202,40 L222,56 L242,42 L262,56 L282,44 L302,56 L322,40 L342,56 L362,44 L382,56 L402,40 L422,56 L442,44 L462,56 L482,42 L502,56 L522,44 L542,56 L562,40 L582,56 L602,44 L622,56 L642,42 L662,56 L682,44 L702,56 L722,40 L742,56 L762,44 L782,56 L802,42 L822,56 L842,44 L862,56 L882,40 L902,56 L922,44 L942,56 L962,42 L982,56 L1002,44 L1022,56 L1042,40 L1062,56 L1082,44 L1102,56 L1122,42 L1142,56 L1162,44 L1182,56 L1202,40 L1222,56 L1242,44 L1262,56 L1282,42 L1302,56 L1322,44 L1342,56 L1362,40 L1382,56 L1402,44 L1422,56 L1440,44 L1440,0 Z" />
			</svg>
		</div>
	);
}

/* ─────────────────────────────────────────────
   SPARK STAR — decorative 4-point star
───────────────────────────────────────────── */
function SparkStar({
	className,
	size = 32,
	color = "#D2FF00",
}: {
	className?: string;
	size?: number;
	color?: string;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<path
				d="M16 0L18 12L28 4L20 14L32 16L20 18L28 28L18 20L16 32L14 20L4 28L12 18L0 16L12 14L4 4L14 12Z"
				fill={color}
			/>
		</svg>
	);
}

/* ─────────────────────────────────────────────
   GRAFFITI MARKER TEXT — Permanent Marker font
   Decorative background element, aria-hidden.
───────────────────────────────────────────── */
function GraffitiText({
	children,
	className,
	color = "rgba(255,255,255,0.04)",
}: {
	children: string;
	className?: string;
	color?: string;
}) {
	return (
		<span
			aria-hidden="true"
			className={`pointer-events-none select-none font-marker uppercase leading-none${className ? ` ${className}` : ""}`}
			style={{ color }}
		>
			{children}
		</span>
	);
}

/* ─────────────────────────────────────────────
   LIVE BADGE — broadcast indicator
───────────────────────────────────────────── */
function LiveBadge({ label }: { label: string }) {
	return (
		<div
			className="inline-flex items-center gap-2 px-3 py-1"
			style={{
				background: "#D2FF00",
				borderRadius: "4px",
				boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
			}}
		>
			<span className="h-2 w-2 animate-pulse rounded-full bg-black" />
			<span
				className="font-black text-black text-xs uppercase tracking-[0.18em]"
				style={{ fontFamily: "var(--font-body)" }}
			>
				{label}
			</span>
		</div>
	);
}


/* ─────────────────────────────────────────────
   BETTING CAROUSEL MOCK — static preview for landing page Z3
   Replicates the real BettingCarousel card visual.
   aria-hidden: true — purely decorative.
───────────────────────────────────────────── */
function BettingCarouselMock({ t }: { t: (key: string) => string }) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none relative w-full shrink-0 md:w-[340px]"
			style={{ filter: "drop-shadow(6px 6px 0px rgba(0,0,0,0.30))" }}
		>
			{/* Outer wrapper — slight tilt for energy */}
			<div className="relative -rotate-1">
				{/* Paint splatter decorations */}
				<div
					className="pointer-events-none absolute -top-8 -left-10 z-0 h-[180px] w-[180px] -rotate-12 opacity-50"
					style={{
						background: "radial-gradient(circle, #2E5CFF 0%, transparent 70%)",
						filter: "blur(18px)",
					}}
				/>
				<div
					className="pointer-events-none absolute -top-8 -right-10 z-0 h-[180px] w-[180px] rotate-12 opacity-50"
					style={{
						background: "radial-gradient(circle, #FF5543 0%, transparent 70%)",
						filter: "blur(18px)",
					}}
				/>

				{/* Card shell */}
				<div className="relative z-10 overflow-hidden rounded-lg border-[3px] border-black bg-white">
					{/* Tournament header badge */}
					<div className="flex items-center justify-center gap-2 border-black border-b-2 bg-white px-4 py-2.5">
						<img
							src="https://logos.bsebfantasy.me/tournaments/265/logo.png?t=1777573893124"
							alt=""
							className="h-6 w-6 rounded-sm object-contain"
						/>
						<span
							className="font-black text-xs text-black uppercase tracking-wider"
							style={{ fontFamily: "var(--font-body)" }}
						>
							BSC 2026: Brawl Cup
						</span>
					</div>

					{/* Match counter bar */}
					<div className="border-black border-b-2 bg-[#f5f4f0] py-1.5 text-center">
						<span
							className="font-black text-[10px] text-black uppercase tracking-wider"
							style={{ fontFamily: "var(--font-body)" }}
						>
							{t("mock.matchCounter")}
						</span>
					</div>

					{/* Teams display */}
					<div className="relative grid h-36 grid-cols-2">
						{/* VS badge */}
						<div className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
							<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
								<span
									className="font-black text-xs"
									style={{ fontFamily: "var(--font-display)" }}
								>
									VS
								</span>
							</div>
						</div>

						{/* Team A — Blue, selected (neon border) */}
						<div className="relative flex h-full flex-col items-center overflow-hidden border-black border-r-2 bg-[#2E5CFF]">
							{/* Neon selection border */}
							<div className="pointer-events-none absolute inset-0 z-20 border-[#ccff00] border-[4px]" />
							<div className="w-full bg-black/20 px-2 py-1.5 text-center">
								<span
									className="block font-black text-[10px] text-white uppercase tracking-wider"
									style={{ fontFamily: "var(--font-body)" }}
								>
									LOUD
								</span>
							</div>
							<div className="flex flex-grow items-center justify-center">
								<div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 p-2">
									<img
										src="https://logos.bsebfantasy.me/teams/1/logo.png"
										alt="LOUD"
										className="h-full w-full object-contain"
									/>
								</div>
							</div>
							<div className="w-full bg-black/10 px-2 py-1 text-center">
								<span className="font-bold text-[9px] text-white uppercase tracking-wider">WR: 68%</span>
							</div>
						</div>

						{/* Team B — Red */}
						<div className="relative flex h-full flex-col items-center overflow-hidden bg-[#FF5543]">
							<div className="w-full bg-black/20 px-2 py-1.5 text-center">
								<span
									className="block font-black text-[10px] text-white uppercase tracking-wider"
									style={{ fontFamily: "var(--font-body)" }}
								>
									Tribe Gaming
								</span>
							</div>
							<div className="flex flex-grow items-center justify-center">
								<div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 p-2">
									<img
										src="https://logos.bsebfantasy.me/teams/9/logo.png"
										alt="Tribe Gaming"
										className="h-full w-full object-contain"
									/>
								</div>
							</div>
							<div className="w-full bg-black/10 px-2 py-1 text-center">
								<span className="font-bold text-[9px] text-white uppercase tracking-wider">WR: 55%</span>
							</div>
						</div>
					</div>

					{/* Stats row */}
					<div className="grid grid-cols-2 border-black border-t-2">
						<div className="border-gray-200 border-r bg-[#2E5CFF]/[0.04] px-3 py-2 space-y-1.5">
							{[
								{ label: t("mock.statRegion"), value: "BR" },
								{ label: t("mock.statWr"), value: "68%", accent: "#2E5CFF" },
								{ label: t("mock.statSeries"), value: "+3", accent: "#16a34a" },
							].map(({ label, value, accent }) => (
								<div
									key={label}
									className="flex items-center justify-between rounded bg-white px-2 py-1 shadow-[1px_1px_0_0_#d9d9d9]"
								>
									<span className="font-black text-[8px] text-gray-400 uppercase">{label}</span>
									<span
										className="font-black text-[10px]"
										style={{ color: accent ?? "#111" }}
									>
										{value}
									</span>
								</div>
							))}
						</div>
						<div className="bg-[#FF5543]/[0.04] px-3 py-2 space-y-1.5">
							{[
								{ label: t("mock.statRegion"), value: "NA" },
								{ label: t("mock.statWr"), value: "55%", accent: "#FF5543" },
								{ label: t("mock.statSeries"), value: "-1", accent: "#FF5543" },
							].map(({ label, value, accent }) => (
								<div
									key={label}
									className="flex items-center justify-between rounded bg-white px-2 py-1 shadow-[1px_1px_0_0_#d9d9d9]"
								>
									<span className="font-black text-[8px] text-gray-400 uppercase">{label}</span>
									<span
										className="font-black text-[10px]"
										style={{ color: accent ?? "#111" }}
									>
										{value}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Predict button — decorative */}
					<div className="border-black border-t-2 px-4 py-3">
						<div
							className="flex w-full items-center justify-center gap-2 rounded py-2.5 font-black text-sm uppercase tracking-wide text-black"
							style={{
								background: "#D2FF00",
								borderRadius: "4px",
								boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
								fontFamily: "var(--font-body)",
							}}
						>
							{t("mock.confirmPick")}
						</div>
					</div>
				</div>
			</div>

			{/* Bets open badge below card */}
			<div className="mt-3 flex justify-center">
				<span
					className="rounded-full bg-[#ccff00] px-3 py-1 font-black text-[10px] uppercase text-black"
					style={{ fontFamily: "var(--font-body)" }}
				>
					{t("mock.picksOpen")}
				</span>
			</div>
		</div>
	);
}


/* ─────────────────────────────────────────────
   PRIMARY CTA BUTTON — per design system spec
   bg #D2FF00, text #000, radius 4px, soft shadow
───────────────────────────────────────────── */
function PrimaryCTA({
	children,
	href,
	className,
}: {
	children: React.ReactNode;
	href?: string;
	className?: string;
}) {
	const style: React.CSSProperties = {
		background: "#D2FF00",
		color: "#000000",
		borderRadius: "4px",
		boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
		fontFamily: "var(--font-body)",
		fontWeight: 800,
		fontSize: "16px",
		lineHeight: "16px",
		letterSpacing: "-0.01em",
		minHeight: "48px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "0 24px",
		textDecoration: "none",
		transition: "box-shadow 150ms, filter 150ms",
		textTransform: "uppercase",
	};
	return (
		<a
			href={href}
			className={`hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D2FF00]/50 hover:[box-shadow:rgba(0,0,0,0.32)_0px_6px_8px_0px] active:[box-shadow:rgba(0,0,0,0.16)_0px_2px_2px_0px] active:brightness-95${className ? ` ${className}` : ""}`}
			style={style}
		>
			{children}
		</a>
	);
}

/* ─────────────────────────────────────────────
   DARK CTA BUTTON — dark bg version
   Used on light / amber zones
───────────────────────────────────────────── */
function DarkCTA({
	children,
	href,
	className,
}: {
	children: React.ReactNode;
	href?: string;
	className?: string;
}) {
	const style: React.CSSProperties = {
		background: "#FF5543",
		color: "#FFFFFF",
		borderRadius: "4px",
		boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
		fontFamily: "var(--font-body)",
		fontWeight: 800,
		fontSize: "16px",
		lineHeight: "16px",
		letterSpacing: "-0.01em",
		minHeight: "48px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "0 24px",
		textDecoration: "none",
		transition: "box-shadow 150ms, filter 150ms",
		textTransform: "uppercase",
	};
	return (
		<a
			href={href}
			className={`hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF5543]/50 hover:[box-shadow:rgba(0,0,0,0.32)_0px_6px_8px_0px] active:[box-shadow:rgba(0,0,0,0.16)_0px_2px_2px_0px] active:brightness-95${className ? ` ${className}` : ""}`}
			style={style}
		>
			{children}
		</a>
	);
}

/* ─────────────────────────────────────────────
   PODIUM COLUMN — mirrors leaderboard.tsx PodiumSection
   Ranks 1/2/3 with coloured base, avatar initials,
   comic shadow, stats pills, and crown for 1st.
───────────────────────────────────────────── */
const podiumCfg = {
	1: {
		bg: "bg-[#ffc700]",
		shadow: "shadow-[6px_6px_0_0_#000]",
		height: "h-44 md:h-52",
		avatarSize: "h-20 w-20 md:h-24 md:w-24",
		rankSize: "text-6xl md:text-7xl",
		rankColor: "text-[#d4a800]",
		badgeBg: "bg-[#ffc700]",
		badgeText: "text-black",
		ptsSize: "text-3xl",
		crown: true,
	},
	2: {
		bg: "bg-[#c0c0c0]",
		shadow: "shadow-[4px_4px_0_0_#000]",
		height: "h-36 md:h-44",
		avatarSize: "h-16 w-16 md:h-20 md:w-20",
		rankSize: "text-5xl md:text-6xl",
		rankColor: "text-[#909090]",
		badgeBg: "bg-[#121212]",
		badgeText: "text-white",
		ptsSize: "text-2xl",
		crown: false,
	},
	3: {
		bg: "bg-[#cd7f32]",
		shadow: "shadow-[4px_4px_0_0_#000]",
		height: "h-28 md:h-36",
		avatarSize: "h-14 w-14 md:h-16 md:w-16",
		rankSize: "text-4xl md:text-5xl",
		rankColor: "text-[#8b5e2a]",
		badgeBg: "bg-[#121212]",
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
			{/* Crown / Medal badge */}
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

			{/* Avatar */}
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
						<div className="flex h-full w-full items-center justify-center bg-[#f0f0f0] font-black text-gray-400 text-xl">
							{entry.name.charAt(0).toUpperCase()}
						</div>
					)}
				</div>
				{/* Rank badge overlay */}
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

			{/* Name */}
			<span className="mb-1 block max-w-[120px] truncate text-center font-black text-[#121212] text-xs uppercase tracking-tight md:max-w-[140px] md:text-sm">
				{entry.name}
			</span>

			{/* Points */}
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

			{/* Medals */}
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

			{/* Mini stat pills */}
			<div className="mb-3 flex items-center gap-0.5">
				<div className="flex items-center gap-0.5 rounded border border-black bg-[#ffc700] px-1 py-0.5 shadow-[1.5px_1.5px_0_0_#000]">
					<Star className="h-2.5 w-2.5 text-black" fill="black" />
					<span className="font-black text-[9px] text-black">
						{entry.perfectPicks}
					</span>
				</div>
				<div className="flex items-center gap-0.5 rounded border border-black/20 bg-white px-1 py-0.5 shadow-[1.5px_1.5px_0_0_#000]">
					<span className="font-black text-[9px] text-green-600">✓</span>
					<span className="font-black text-[9px] text-black">
						{entry.correctPredictions}
					</span>
				</div>
				{entry.underdogPicks > 0 && (
					<div className="flex items-center gap-0.5 rounded border border-black bg-purple-400 px-1 py-0.5 shadow-[1.5px_1.5px_0_0_#000]">
						<Zap className="h-2.5 w-2.5 text-black" strokeWidth={3} />
						<span className="font-black text-[9px] text-black">
							{entry.underdogPicks}
						</span>
					</div>
				)}
				<div
					className={clsx(
						"rounded border border-black px-1 py-0.5 shadow-[1.5px_1.5px_0_0_#000]",
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

			{/* Coloured base */}
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

/* ─────────────────────────────────────────────
   LEADERBOARD CARD — rank 4+ entry
   Mirrors LeaderboardCard from leaderboard.tsx
───────────────────────────────────────────── */
function LandingLeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
	const accuracyRate =
		entry.totalBets > 0
			? Math.round((entry.correctPredictions / entry.totalBets) * 100)
			: 0;

	return (
		<div className="flex w-full items-center gap-3 overflow-hidden rounded-lg border-2 border-black bg-white px-3 py-2.5 shadow-[3px_3px_0_0_#000]">
			{/* Rank Badge */}
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/10 bg-[#121212]">
				<span className="font-black text-base text-white italic">
					{entry.rank}
				</span>
			</div>

			{/* Avatar initials */}
			<div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-[#f0f0f0]">
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

			{/* Name + stats */}
			<div className="flex min-w-0 flex-1 flex-col justify-center">
				<span className="block truncate font-bold text-[#121212] text-xs uppercase tracking-tight md:text-sm">
					{entry.name}
				</span>
				<div className="mt-1 flex flex-wrap items-center gap-1">
					<div className="flex items-center gap-0.5 rounded bg-[#ffc700] px-1.5 py-0.5">
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
								⚡{entry.underdogPicks}
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

			{/* Points */}
			<div className="shrink-0 rounded-md border-2 border-black bg-white px-3 py-1.5 text-center shadow-[2px_2px_0_0_#000]">
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
   MAIN COMPONENT
───────────────────────────────────────────── */
export function LandingPage({
	isAuthenticated,
	topUsers = [],
}: LandingPageProps) {
	const { t } = useTranslation("landing");
	const { routeTo } = useLangLink();

	const top3 = topUsers.slice(0, 3);
	const rest = topUsers.slice(3);

	return (
		<div className="flex min-h-screen flex-col" style={{ overflowX: "clip" }}>
			{/* ════════════════════════════════════════════════════
			    Z1 — DARK HERO
			    Pure black bg. Geist Mono 800 at max size.
			    Electric yellow (#D2FF00) accent word.
			    Soft shadow depth — no hard comic borders.
			════════════════════════════════════════════════════ */}
			<section
				className="relative min-h-[90vh] w-full overflow-hidden md:min-h-screen"
				style={{ background: "#000000" }}
			>
				{/* Noise texture overlay */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						backgroundImage: "var(--background-image-noise)",
						opacity: 0.08,
					}}
				/>

				{/* Point 3 — split stripe Blue/Red at top, thick broadcast bar */}
				<div className="absolute top-0 right-0 left-0 z-20 flex h-[5px]">
					<div className="flex-1" style={{ background: "#2e5cff" }} />
					<div className="flex-1" style={{ background: "#FF5543" }} />
				</div>

				{/* Decorative sparks */}
				<SparkStar
					className="absolute top-[16%] right-[8%] rotate-12 opacity-70 md:right-[11%]"
					size={52}
					color="#D2FF00"
				/>
				<SparkStar
					className="absolute top-[55%] right-[3%] -rotate-6 opacity-25 md:right-[5%]"
					size={28}
					color="#D2FF00"
				/>
				<SparkStar
					className="absolute bottom-[28%] left-[4%] rotate-45 opacity-15"
					size={20}
					color="#D2FF00"
				/>

				{/* Background graffiti text */}
				<GraffitiText
					className="absolute top-[8%] right-[1%] text-[8rem] opacity-100 md:text-[14rem]"
					color="rgba(255,255,255,0.065)"
				>
					BSC
				</GraffitiText>
				<GraffitiText
					className="absolute bottom-[18%] left-[1%] text-[5rem] opacity-100 md:text-[9rem]"
					color="rgba(255,255,255,0.05)"
				>
					BRAWL
				</GraffitiText>

				{/* Hero content */}
				<div className="relative z-10 flex h-full min-h-[90vh] flex-col justify-center px-6 py-20 md:min-h-screen md:px-16 md:py-0 lg:px-24">
					{/* Live badge */}
					<motion.div
						initial={{ opacity: 0, x: -12 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.3 }}
						className="mb-6 w-fit"
					>
						<LiveBadge label={t("hero.eyebrow")} />
					</motion.div>

					{/* Point 1 — BSEN Pickems logo real como âncora visual */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.45, delay: 0.05 }}
						className="mb-6 w-fit"
					>
						<img
							src="/logo-white.png"
							alt="BSEN Pickems"
							className="h-14 w-auto object-contain md:h-20"
						/>
					</motion.div>

					{/* Main headline — Geist Mono 800, matches design system Display/H1 spec */}
					<motion.h1
						initial={{ opacity: 0, y: 28 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.15 }}
						className="font-black uppercase leading-[0.9] tracking-tight"
						style={{
							fontFamily: "var(--font-body)",
							fontSize: "clamp(3.5rem, 13vw, 9rem)",
							overflowWrap: "anywhere",
							minWidth: 0,
							color: "#FFFFFF",
						}}
					>
						{t("hero.title")}
						<br />
						<span style={{ color: "#D2FF00" }}>{t("hero.titleAccent")}</span>
					</motion.h1>

					{/* Subtitle */}
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.38, duration: 0.4 }}
						className="mt-6 max-w-lg font-black text-base leading-relaxed md:text-lg"
						style={{
							color: "#A0A0A0",
							fontFamily: "var(--font-body)",
						}}
					>
						{t("hero.subtitle")}
					</motion.p>

					{/* CTA group */}
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.55, duration: 0.35 }}
						className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
					>
						<Link
							{...routeTo(isAuthenticated ? "/dashboard" : "/login")}
							asChild
						>
							<PrimaryCTA>{t("hero.cta")}</PrimaryCTA>
						</Link>

						{!isAuthenticated && (
							<Link
								{...routeTo("/login")}
								className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2FF00]/50"
								style={{
									color: "#717070",
									fontFamily: "var(--font-body)",
									fontWeight: 800,
									fontSize: "14px",
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									transition: "color 150ms",
								}}
							>
								<span className="transition-colors hover:text-white">
									{t("hero.secondaryCta")}
								</span>
								<span className="material-symbols-outlined text-sm">
									arrow_forward
								</span>
							</Link>
						)}
					</motion.div>

				</div>
			</section>

			{/* Torn edge: black → paper */}
			<TornEdge topColor="#000000" bottomColor="#f5f4f0" height={64} />

			{/* ════════════════════════════════════════════════════
			    Z2 — PAPER CHALLENGERS
			    Light paper with texture. BSEN sticker left.
			    Headline + body + red CTA right.
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-14 md:py-20"
				style={{
					background: "#f5f4f0",
					backgroundImage: "var(--background-image-paper-texture)",
				}}
			>
				{/* Decorative graffiti on paper */}
				<GraffitiText
					className="absolute top-[8%] -right-3 rotate-6 text-[6rem] opacity-100 md:text-[10rem]"
					color="rgba(0,0,0,0.04)"
				>
					ZZZ
				</GraffitiText>
				<GraffitiText
					className="absolute bottom-[4%] left-0 -rotate-3 text-[4rem] opacity-100 md:text-[7rem]"
					color="rgba(0,0,0,0.035)"
				>
					BRAWL
				</GraffitiText>

				{/* Amber glow top-right — decorative */}
				<div
					className="pointer-events-none absolute top-0 right-0 h-40 w-40 md:h-64 md:w-64"
					style={{
						background:
							"radial-gradient(ellipse at 80% 20%, #ffc700 0%, transparent 70%)",
						filter: "blur(32px)",
						opacity: 0.18,
					}}
				/>

				<div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
					{/* headline + body + CTA */}
					<div className="flex flex-col gap-5">
						{/* Eyebrow */}
						<span
							className="inline-block font-black text-xs uppercase tracking-[0.18em]"
							style={{
								fontFamily: "var(--font-body)",
								color: "#FF5543",
							}}
						>
							{t("challengers.eyebrow")}
						</span>

						<h2
							className="font-black uppercase leading-[0.9] tracking-tight"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(2rem, 6vw, 3.75rem)",
								overflowWrap: "anywhere",
								minWidth: 0,
								color: "#000000",
								letterSpacing: "-0.02em",
							}}
						>
							{t("challengers.title")}
							<br />
							<span style={{ color: "#FF5543" }}>
								{t("challengers.titleAccent")}
							</span>
						</h2>

						<p
							className="max-w-xl font-black text-base leading-relaxed md:text-lg"
							style={{ color: "#454545", fontFamily: "var(--font-body)" }}
						>
							{t("challengers.body")}
						</p>

						<div className="mt-1">
							<Link
								{...routeTo(isAuthenticated ? "/dashboard" : "/login")}
								asChild
							>
								<DarkCTA>{t("challengers.cta")}</DarkCTA>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Torn edge: paper → amber */}
			<TornEdge topColor="#f5f4f0" bottomColor="#ffc700" height={52} />

			{/* ════════════════════════════════════════════════════
			    Z3 — AMBER WATCH+PREDICT FLOOD
			    Warm golden zone. WATCH/PREDICT sticker diptych left.
			    Headline + body + dark CTA right.
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-14 md:py-20"
				style={{
					background: "#ffc700",
					backgroundImage: "var(--background-image-paper-texture)",
				}}
			>
				{/* Decorative sparks */}
				<SparkStar
					className="absolute top-4 left-[6%] -rotate-12 opacity-60 md:left-[10%]"
					size={40}
					color="#000"
				/>
				<SparkStar
					className="absolute right-[5%] bottom-4 rotate-12 opacity-40 md:right-[8%]"
					size={24}
					color="#000"
				/>
				<SparkStar
					className="absolute top-[45%] right-[22%] opacity-20"
					size={14}
					color="#000"
				/>

				<div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
					<div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between md:gap-16">
						{/* Left: BettingCarousel mock */}
						<BettingCarouselMock t={t} />

						{/* Right: headline + body + CTA */}
						<div className="flex flex-col gap-5">
							<h2
								className="font-black uppercase leading-[0.9] tracking-tight"
								style={{
									fontFamily: "var(--font-body)",
									fontSize: "clamp(1.75rem, 4.5vw, 3.25rem)",
									overflowWrap: "anywhere",
									minWidth: 0,
									color: "#000000",
									letterSpacing: "-0.02em",
									maxWidth: "30rem",
								}}
							>
								{t("watchPredict.title")}
							</h2>

							<p
								className="max-w-lg font-black text-base leading-relaxed md:text-lg"
								style={{
									color: "rgba(0,0,0,0.55)",
									fontFamily: "var(--font-body)",
								}}
							>
								{t("watchPredict.body")}
							</p>

							<div className="mt-1">
								<Link
									{...routeTo(isAuthenticated ? "/dashboard" : "/login")}
									asChild
								>
									<PrimaryCTA>{t("watchPredict.cta")}</PrimaryCTA>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Torn edge: amber → paper */}
			<TornEdge topColor="#ffc700" bottomColor="#f5f4f0" height={52} />

			{/* ════════════════════════════════════════════════════
			    Z4 — LEADERBOARD
			    Paper bg. Pódio 2-1-3 + cards 4°/5°.
			    DNA idêntico à leaderboard.tsx.
			════════════════════════════════════════════════════ */}
			<section
				className="relative py-14 md:py-20"
				style={{
					background: "#f5f4f0",
					backgroundImage: "var(--background-image-paper-texture)",
				}}
			>
				{/* Graffiti bg */}
				<GraffitiText
					className="absolute right-[-1%] bottom-[5%] rotate-3 text-[5rem] opacity-100 md:text-[8rem]"
					color="rgba(0,0,0,0.035)"
				>
					CULT
				</GraffitiText>

				<div className="relative z-10 mx-auto max-w-2xl px-6 sm:px-8">
					{/* Section header */}
					<div className="mb-2 text-center">
						<h2
							className="font-black uppercase tracking-tight"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(2rem, 6vw, 3rem)",
								color: "#000000",
								letterSpacing: "-0.02em",
							}}
						>
							{t("leaderboard.title")}
						</h2>
						<p
							className="mt-1 font-black text-xs uppercase tracking-[0.2em]"
							style={{ color: "#717070", fontFamily: "var(--font-body)" }}
						>
							{t("leaderboard.subtitle")}
						</p>
					</div>

					{topUsers.length === 0 ? (
						/* Empty state */
						<div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-black/20 border-dashed bg-white/60 py-12 text-center">
							<p
								className="font-black text-xs uppercase tracking-[0.2em]"
								style={{ color: "#717070", fontFamily: "var(--font-body)" }}
							>
								{t("leaderboard.empty")}
							</p>
						</div>
					) : (
						<>
							{/* Pódio — 2nd · 1st · 3rd, com floor line */}
							{top3.length > 0 && (
								<div className="relative mt-8 flex items-end gap-2 px-1 pt-8 sm:gap-4">
									{/* Floor line */}
									<div className="absolute right-0 bottom-0 left-0 h-1.5 bg-black" />
									<PodiumColumn entry={top3[1]} rank={2} />
									<PodiumColumn entry={top3[0]} rank={1} />
									<PodiumColumn entry={top3[2]} rank={3} />
								</div>
							)}

							{/* Cards 4°+ */}
							{rest.length > 0 && (
								<div className="mt-6 flex flex-col gap-3">
									{rest.map((entry) => (
										<LandingLeaderboardCard key={entry.userId} entry={entry} />
									))}
								</div>
							)}
						</>
					)}

					{/* View all CTA */}
					<div className="mt-8 flex justify-center">
						<Link
							{...routeTo(isAuthenticated ? "/leaderboard" : "/login")}
							asChild
						>
							<DarkCTA>{t("leaderboard.viewAll")}</DarkCTA>
						</Link>
					</div>
				</div>
			</section>

			{/* Torn edge: paper → dark */}
			<TornEdge topColor="#f5f4f0" bottomColor="#181818" height={52} flip />

			{/* ════════════════════════════════════════════════════
			    Z5 — DARK HOW-TO
			    #181818 bg. Step cards with 0px radius, 1px borders.
			    Mirrors "COMO COMPETIR" section from the reference.
			════════════════════════════════════════════════════ */}
			<section
				className="relative overflow-hidden py-14 md:py-20"
				style={{ background: "#181818" }}
			>
				{/* Noise overlay */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						backgroundImage: "var(--background-image-noise)",
						opacity: 0.15,
					}}
				/>
				{/* Top color stripe */}
				<div className="absolute top-0 right-0 left-0 flex h-[3px]">
					<div className="w-1/2 bg-[#2e5cff]" />
					<div className="w-1/2 bg-[#FF5543]" />
				</div>

				{/* Background graffiti */}
				<GraffitiText
					className="absolute bottom-[6%] left-[-1%] -rotate-6 text-[5rem] opacity-100 md:text-[8rem]"
					color="rgba(255,255,255,0.03)"
				>
					BRAWL
				</GraffitiText>
				<SparkStar
					className="absolute top-[12%] right-[4%] rotate-12 opacity-25"
					size={40}
					color="#D2FF00"
				/>

				<div className="relative z-10 mx-auto max-w-5xl px-6 sm:px-8">
					{/* Section header */}
					<div className="mb-10">
						<span
							className="font-black text-xs uppercase tracking-[0.22em]"
							style={{ fontFamily: "var(--font-body)", color: "#D2FF00" }}
						>
							{t("howToCompete.eyebrow")}
						</span>
						<h2
							className="mt-2 font-black uppercase leading-[0.9] tracking-tight"
							style={{
								fontFamily: "var(--font-body)",
								fontSize: "clamp(2.2rem, 7vw, 4.5rem)",
								overflowWrap: "anywhere",
								minWidth: 0,
								color: "#FFFFFF",
								letterSpacing: "-0.02em",
							}}
						>
							{t("howToCompete.title")}
						</h2>
					</div>

					{/* Step cards — border-radius 0px, 1px solid border, soft shadow */}
					<div className="flex flex-col gap-4 md:flex-row md:gap-5">
						{/* Step 1 — blue accent */}
						<div
							className="flex-1 p-6 md:p-8"
							style={{
								background: "#2B2B2B",
								border: "1px solid #454545",
								borderRadius: "0px",
								boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
								borderTop: "3px solid #2e5cff",
							}}
						>
							<div
								className="mb-5 flex h-10 w-10 items-center justify-center font-black text-xl"
								style={{
									background: "#2e5cff",
									color: "#FFFFFF",
									fontFamily: "var(--font-body)",
									borderRadius: "0px",
								}}
							>
								1
							</div>
							<h3
								className="mb-2 font-black uppercase leading-tight tracking-tight"
								style={{
									fontFamily: "var(--font-body)",
									fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
									overflowWrap: "anywhere",
									minWidth: 0,
									color: "#FFFFFF",
									letterSpacing: "-0.01em",
								}}
							>
								{t("howToCompete.step1Title")}
							</h3>
							<p
								className="font-black text-sm leading-relaxed"
								style={{ color: "#717070", fontFamily: "var(--font-body)" }}
							>
								{t("howToCompete.step1Desc")}
							</p>
						</div>

						{/* Step 2 — red accent */}
						<div
							className="flex-1 p-6 md:p-8"
							style={{
								background: "#2B2B2B",
								border: "1px solid #454545",
								borderRadius: "0px",
								boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
								borderTop: "3px solid #FF5543",
							}}
						>
							<div
								className="mb-5 flex h-10 w-10 items-center justify-center font-black text-xl"
								style={{
									background: "#FF5543",
									color: "#FFFFFF",
									fontFamily: "var(--font-body)",
									borderRadius: "0px",
								}}
							>
								2
							</div>
							<h3
								className="mb-2 font-black uppercase leading-tight tracking-tight"
								style={{
									fontFamily: "var(--font-body)",
									fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
									overflowWrap: "anywhere",
									minWidth: 0,
									color: "#FFFFFF",
									letterSpacing: "-0.01em",
								}}
							>
								{t("howToCompete.step2Title")}
							</h3>
							<p
								className="font-black text-sm leading-relaxed"
								style={{ color: "#717070", fontFamily: "var(--font-body)" }}
							>
								{t("howToCompete.step2Desc")}
							</p>
						</div>

						{/* Step 3 — lime accent */}
						<div
							className="flex-1 p-6 md:p-8"
							style={{
								background: "#2B2B2B",
								border: "1px solid #454545",
								borderRadius: "0px",
								boxShadow: "rgba(0,0,0,0.24) 0px 4px 4px 0px",
								borderTop: "3px solid #D2FF00",
							}}
						>
							<div
								className="mb-5 flex h-10 w-10 items-center justify-center font-black text-xl"
								style={{
									background: "#D2FF00",
									color: "#000000",
									fontFamily: "var(--font-body)",
									borderRadius: "0px",
								}}
							>
								3
							</div>
							<h3
								className="mb-2 font-black uppercase leading-tight tracking-tight"
								style={{
									fontFamily: "var(--font-body)",
									fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
									overflowWrap: "anywhere",
									minWidth: 0,
									color: "#FFFFFF",
									letterSpacing: "-0.01em",
								}}
							>
								{t("howToCompete.step3Title")}
							</h3>
							<p
								className="font-black text-sm leading-relaxed"
								style={{ color: "#717070", fontFamily: "var(--font-body)" }}
							>
								{t("howToCompete.step3Desc")}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ════════════════════════════════════════════════════
			    Z6 — FOOTER (minimal split)
			════════════════════════════════════════════════════ */}
			<footer
				className="relative overflow-hidden"
				style={{ background: "#000000" }}
			>
				{/* Top stripe */}
				<div className="absolute top-0 left-0 flex h-[3px] w-full">
					<div className="w-1/2 bg-[#2e5cff]" />
					<div className="w-1/2 bg-[#FF5543]" />
				</div>

				<div className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:px-8 lg:px-12">
					<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
						{/* Left: brand + tagline + CTA */}
						<div className="flex flex-col gap-4">
							<img
								src="/logo-white.png"
								alt="BSEN Pickems"
								className="h-10 w-auto object-contain md:h-12"
							/>
							<p
								className="font-black text-xs uppercase tracking-[0.2em]"
								style={{ color: "#717070", fontFamily: "var(--font-body)" }}
							>
								{t("footer.tagline")}
							</p>
							<Link
								{...routeTo(isAuthenticated ? "/dashboard" : "/login")}
								asChild
							>
								<PrimaryCTA className="w-fit">{t("hero.cta")}</PrimaryCTA>
							</Link>
						</div>

						{/* Right: legal */}
						<div className="flex flex-col gap-1 md:text-right">
							<p
								className="font-black text-xs leading-relaxed md:max-w-xs"
								style={{ color: "#454545", fontFamily: "var(--font-body)" }}
							>
								{t("footer.disclaimer")}
							</p>
							<p
								className="font-black text-xs"
								style={{ color: "#2B2B2B", fontFamily: "var(--font-body)" }}
							>
								{t("footer.copyright")}
							</p>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}

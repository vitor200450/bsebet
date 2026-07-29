import type { CSSProperties } from "react";
import type {
	PresentationTheme,
	VenueMode,
} from "@/server/event-kind-template";
import { resolvePresentationTheme } from "@/server/event-kind-template";

export type TournamentRegionCode =
	| "GLOBAL"
	| "WORLD"
	| "NA"
	| "EMEA"
	| "SA"
	| "CN"
	| "EA"
	| "SEA"
	| "SAS"
	| "UNKNOWN";

export type RegionPalette = {
	code: TournamentRegionCode;
	accent: string;
	accentMuted: string;
	surfaceTint: string;
	tintClass: string;
	textOnAccentClass: string;
	lightText: boolean;
};

export type TournamentVisualIdentity = {
	theme: PresentationTheme;
	venueMode: VenueMode;
	region: RegionPalette;
	/** Top bar on the match card (stage label) */
	stageBarClass: string;
	/** Extra framing on the pick card */
	cardFrameClass: string;
	/** Event-kind badge surface */
	kindBadgeClass: string;
	decorDensity: "minimal" | "standard" | "premium";
};

const REGION_PALETTES: Record<TournamentRegionCode, RegionPalette> = {
	GLOBAL: {
		code: "GLOBAL",
		accent: "#121212",
		accentMuted: "rgba(18, 18, 18, 0.12)",
		surfaceTint: "rgba(18, 18, 18, 0.06)",
		tintClass: "bg-ink",
		textOnAccentClass: "text-white",
		lightText: true,
	},
	WORLD: {
		code: "WORLD",
		accent: "#121212",
		accentMuted: "rgba(18, 18, 18, 0.12)",
		surfaceTint: "rgba(18, 18, 18, 0.06)",
		tintClass: "bg-ink",
		textOnAccentClass: "text-white",
		lightText: true,
	},
	NA: {
		code: "NA",
		accent: "#85BA3A",
		accentMuted: "rgba(133, 186, 58, 0.22)",
		surfaceTint: "rgba(133, 186, 58, 0.1)",
		tintClass: "bg-[#85BA3A]",
		textOnAccentClass: "text-black",
		lightText: false,
	},
	EMEA: {
		code: "EMEA",
		accent: "#0997DE",
		accentMuted: "rgba(9, 151, 222, 0.22)",
		surfaceTint: "rgba(9, 151, 222, 0.1)",
		tintClass: "bg-[#0997DE]",
		textOnAccentClass: "text-white",
		lightText: true,
	},
	CN: {
		code: "CN",
		accent: "#ff2e2e",
		accentMuted: "rgba(255, 46, 46, 0.2)",
		surfaceTint: "rgba(255, 46, 46, 0.09)",
		tintClass: "bg-[#ff2e2e]",
		textOnAccentClass: "text-white",
		lightText: true,
	},
	EA: {
		code: "EA",
		accent: "#EC00AC",
		accentMuted: "rgba(236, 0, 172, 0.2)",
		surfaceTint: "rgba(236, 0, 172, 0.1)",
		tintClass: "bg-[#EC00AC]",
		textOnAccentClass: "text-white",
		lightText: true,
	},
	SEA: {
		code: "SEA",
		accent: "#1dd1a1",
		accentMuted: "rgba(29, 209, 161, 0.22)",
		surfaceTint: "rgba(29, 209, 161, 0.1)",
		tintClass: "bg-[#1dd1a1]",
		textOnAccentClass: "text-black",
		lightText: false,
	},
	SAS: {
		code: "SAS",
		accent: "#f39c12",
		accentMuted: "rgba(243, 156, 18, 0.22)",
		surfaceTint: "rgba(243, 156, 18, 0.1)",
		tintClass: "bg-[#f39c12]",
		textOnAccentClass: "text-black",
		lightText: false,
	},
	SA: {
		code: "SA",
		accent: "#E24C3C",
		accentMuted: "rgba(226, 76, 60, 0.22)",
		surfaceTint: "rgba(226, 76, 60, 0.1)",
		tintClass: "bg-[#E24C3C]",
		textOnAccentClass: "text-white",
		lightText: true,
	},
	UNKNOWN: {
		code: "UNKNOWN",
		accent: "#e6e6e6",
		accentMuted: "rgba(230, 230, 230, 0.5)",
		surfaceTint: "rgba(230, 230, 230, 0.35)",
		tintClass: "bg-tape",
		textOnAccentClass: "text-ink",
		lightText: false,
	},
};

export function normalizeTournamentRegion(
	region: string | null | undefined,
): TournamentRegionCode {
	const raw = region?.trim().toUpperCase();
	if (!raw) return "UNKNOWN";
	if (raw in REGION_PALETTES) {
		return raw as TournamentRegionCode;
	}
	return "UNKNOWN";
}

export function getRegionPalette(
	region: string | null | undefined,
): RegionPalette {
	return REGION_PALETTES[normalizeTournamentRegion(region)];
}

function themeKindBadgeClass(theme: PresentationTheme): string {
	switch (theme) {
		case "major":
			return "surface-ink border-2 border-brawl-yellow";
		case "monthly_finals":
			return "bg-brawl-yellow text-black border-2 border-black";
		case "qualifier":
			return "bg-white text-ink border-2 border-black";
		default:
			return "bg-tape text-ink border-2 border-black";
	}
}

function themeCardFrameClass(theme: PresentationTheme): string {
	switch (theme) {
		case "major":
			return "border-[4px] shadow-[6px_6px_0_0_#000]";
		case "monthly_finals":
			return "";
		case "qualifier":
			return "";
		default:
			return "";
	}
}

function themeDecorDensity(
	theme: PresentationTheme,
): TournamentVisualIdentity["decorDensity"] {
	switch (theme) {
		case "major":
			return "premium";
		case "monthly_finals":
			return "standard";
		case "qualifier":
			return "minimal";
		default:
			return "standard";
	}
}

function buildStageBarClass(
	theme: PresentationTheme,
	_region: RegionPalette,
): string {
	const base =
		"flex items-center justify-between gap-2 border-black border-b-[3px] px-3 py-2";
	if (theme === "major") {
		return `${base} bg-charcoal text-white`;
	}
	if (theme === "monthly_finals") {
		return `${base} text-white`;
	}
	if (theme === "qualifier") {
		return `${base} bg-tape text-ink`;
	}
	return `${base} bg-charcoal text-white`;
}

/** Inline style for themed stage bar (region accent on prestige events). */
export function stageBarStyle(
	identity: TournamentVisualIdentity,
): CSSProperties | undefined {
	if (identity.theme === "monthly_finals") {
		return { backgroundColor: identity.region.accent };
	}
	return undefined;
}

export function resolveTournamentVisualIdentity(input: {
	presentationTheme?: PresentationTheme | string | null;
	region?: string | null;
	venueMode?: VenueMode | string | null;
	eventKind?: { presentationTheme?: PresentationTheme | string } | null;
}): TournamentVisualIdentity {
	const theme = resolvePresentationTheme(
		input.eventKind ??
			(input.presentationTheme
				? { presentationTheme: input.presentationTheme }
				: null),
	);
	const region = getRegionPalette(input.region);
	const venueMode: VenueMode = input.venueMode === "lan" ? "lan" : "online";

	return {
		theme,
		venueMode,
		region,
		stageBarClass: buildStageBarClass(theme, region),
		cardFrameClass: themeCardFrameClass(theme),
		kindBadgeClass: themeKindBadgeClass(theme),
		decorDensity: themeDecorDensity(theme),
	};
}

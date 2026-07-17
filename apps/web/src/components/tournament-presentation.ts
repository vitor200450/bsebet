import type { PresentationTheme } from "@/server/event-kind-template";
import { resolvePresentationTheme } from "@/server/event-kind-template";

export function getTournamentPresentationTheme(
	eventKind:
		| { presentationTheme: PresentationTheme | string }
		| null
		| undefined,
): PresentationTheme {
	return resolvePresentationTheme(eventKind);
}

/** Card header / hero surface classes by Presentation Theme */
export function presentationThemeHeaderClass(
	theme: PresentationTheme,
	status: "upcoming" | "active" | "finished",
): string {
	if (theme === "major") {
		return "bg-gradient-to-r from-ink via-[#1a1a2e] to-brawl-blue/40";
	}
	if (theme === "monthly_finals") {
		return "bg-gradient-to-r from-[#ccff00]/30 via-[#ffc700]/25 to-[#ff2e2e]/15";
	}
	if (theme === "qualifier") {
		return "bg-gradient-to-r from-paper to-[#e8e8e8]";
	}
	// default — status-aware like today's cards
	if (status === "active") {
		return "bg-gradient-to-r from-[#ff2e2e]/20 to-[#ffc700]/20";
	}
	if (status === "finished") {
		return "bg-gradient-to-r from-gray-100 to-gray-50";
	}
	return "bg-gradient-to-r from-[#ffc700]/20 to-[#ccff00]/10";
}

export function presentationThemeBadgeClass(theme: PresentationTheme): string {
	switch (theme) {
		case "major":
			return "surface-ink border-2 border-brawl-yellow";
		case "monthly_finals":
			return "bg-[#ccff00] text-black border-2 border-black";
		case "qualifier":
			return "bg-white text-ink border-2 border-black";
		default:
			return "";
	}
}

export function venueModePillClass(mode: "online" | "lan"): string {
	return mode === "lan"
		? "bg-brawl-blue text-white border-2 border-black"
		: "bg-white text-ink border-2 border-black";
}

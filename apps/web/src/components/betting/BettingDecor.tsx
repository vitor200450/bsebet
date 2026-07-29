import { clsx } from "clsx";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SPRAY_MASK_COUNT = 6;

/**
 * Original BSEN spray masks (black silhouette PNGs), tinted like the
 * championship pattern: CSS mask-image + background-color + per-match rotation.
 */
export function SpraySplat({
	variant,
	maskIndex = 1,
	rotate = 0,
	className,
}: {
	variant: "blue" | "red";
	maskIndex?: number;
	rotate?: number;
	className?: string;
}) {
	const safeIndex = ((maskIndex - 1) % SPRAY_MASK_COUNT) + 1;
	const maskUrl = `/betting/spray-mask-${String(safeIndex).padStart(2, "0")}.png`;

	return (
		<div aria-hidden="true" className={clsx("pointer-events-none", className)}>
			<div
				className="h-full w-full"
				style={{
					backgroundColor: variant === "blue" ? "#2e5cff" : "#ff2e2e",
					WebkitMaskImage: `url(${maskUrl})`,
					maskImage: `url(${maskUrl})`,
					WebkitMaskSize: "contain",
					maskSize: "contain",
					WebkitMaskRepeat: "no-repeat",
					maskRepeat: "no-repeat",
					WebkitMaskPosition: "center",
					maskPosition: "center",
					transform: `rotate(${rotate}deg)`,
				}}
			/>
		</div>
	);
}

/** Taped label strip — slight tilt, scrapbook energy */
export function TapeLabel({
	children,
	rotate = "-2deg",
	className,
}: {
	children: ReactNode;
	rotate?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative flex w-full max-w-full items-center justify-center px-8 py-5 sm:px-10 sm:py-6",
				className,
			)}
			style={{ transform: `rotate(${rotate})` }}
		>
			<img
				src="/landing/tape-scrap.png"
				alt=""
				aria-hidden="true"
				draggable={false}
				className="pointer-events-none absolute inset-0 h-full w-full object-fill drop-shadow-[3px_3px_0_rgba(0,0,0,0.28)]"
			/>
			<span className="relative z-10 max-w-full text-balance text-center font-black font-display text-ink text-sm uppercase leading-snug tracking-tight sm:text-base">
				{children}
			</span>
		</div>
	);
}

const logoStickerSizes = {
	sm: "h-24 w-24 sm:h-28 sm:w-28",
	md: "h-36 w-36 sm:h-44 sm:w-44",
} as const;

/** Paper sticker for tournament logo */
export function TournamentLogoSticker({
	src,
	alt,
	rotate = "4deg",
	size = "md",
}: {
	src: string;
	alt: string;
	rotate?: string;
	size?: keyof typeof logoStickerSizes;
}) {
	return (
		<div
			className="relative shrink-0"
			style={{ transform: `rotate(${rotate})` }}
		>
			<img
				src="/landing/tape-scrap.png"
				alt=""
				aria-hidden="true"
				draggable={false}
				className="absolute -top-3 left-1/2 z-20 h-5 w-16 -translate-x-1/2 object-fill opacity-90 drop-shadow-[1px_1px_0_rgba(0,0,0,0.2)]"
			/>
			<div
				className={clsx(
					"relative flex items-center justify-center overflow-hidden border-[3px] border-black shadow-comic-md",
					logoStickerSizes[size],
				)}
			>
				<img
					src="/betting/paper-sticker.jpg"
					alt=""
					aria-hidden="true"
					draggable={false}
					className="absolute inset-0 h-full w-full object-cover"
				/>
				<div aria-hidden="true" className="absolute inset-0 bg-paper/55" />
				<img
					src={src}
					alt={alt}
					draggable={false}
					className="relative z-10 h-[78%] w-[78%] object-contain drop-shadow-[1px_1px_0_rgba(0,0,0,0.15)]"
				/>
			</div>
		</div>
	);
}

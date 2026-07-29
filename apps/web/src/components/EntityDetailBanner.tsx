import { clsx } from "clsx";
import type { ReactNode } from "react";

export type EntityBannerColors = {
	primary: string;
	secondary: string;
	intermediate?: string;
};

type EntityDetailBannerProps = {
	colors: EntityBannerColors;
	topBar: ReactNode;
	logo: ReactNode;
	logoBadge?: ReactNode;
	title: string;
	subtitle?: ReactNode;
	meta?: ReactNode;
	className?: string;
};

export const bannerBackLinkClass =
	"inline-flex items-center gap-2 border-[3px] border-black bg-ink px-3 py-1.5 font-black font-display text-sm text-white uppercase tracking-wider shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

export const bannerActionLinkClass =
	"inline-flex items-center gap-2 border-[3px] border-black surface-lime px-3 py-1.5 font-black font-display text-sm uppercase tracking-wider shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

/**
 * Shared entity hero for tournament + team detail pages.
 * Keeps the logo-derived gradient banner; comic framing matches the rest of the product.
 */
export function EntityDetailBanner({
	colors,
	topBar,
	logo,
	logoBadge,
	title,
	subtitle,
	meta,
	className,
}: EntityDetailBannerProps) {
	const mid = colors.intermediate ?? colors.primary;

	return (
		<header
			className={clsx(
				"relative z-10 overflow-hidden border-black border-b-[3px]",
				className,
			)}
			style={{
				background: `linear-gradient(135deg, ${colors.primary} 0%, ${mid} 50%, ${colors.secondary} 100%)`,
			}}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-[0.12]"
				style={{
					backgroundImage:
						"repeating-linear-gradient(-12deg, transparent, transparent 10px, rgba(0,0,0,0.35) 10px, rgba(0,0,0,0.35) 11px)",
				}}
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/25"
			/>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
				<div className="mb-6">{topBar}</div>

				<div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-8">
					<div className="relative shrink-0">
						<div className="flex h-32 w-32 items-center justify-center overflow-hidden border-[3px] border-black bg-white p-3 text-ink shadow-comic-md md:h-40 md:w-40 md:p-4">
							{logo}
						</div>
						{logoBadge}
					</div>

					<div className="min-w-0 flex-1 text-center md:text-left">
						{meta ? (
							<div className="mb-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
								{meta}
							</div>
						) : null}

						<h1 className="mb-2 inline-block max-w-full pb-1 pr-[0.3em] font-black font-display text-3xl text-white uppercase italic leading-[1.1] tracking-tighter [text-wrap:balance] md:text-5xl lg:text-6xl">
							{title}
						</h1>

						{subtitle ? (
							<div className="font-body font-bold text-sm text-white/85 uppercase tracking-widest">
								{subtitle}
							</div>
						) : null}
					</div>
				</div>
			</div>
		</header>
	);
}

/** Meta chip sitting on the banner (region, dates, counts) */
export function BannerMetaPill({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={clsx(
				"inline-flex items-center gap-1.5 border-2 border-white/50 bg-black/30 px-2 py-1 font-body font-bold text-white text-xs uppercase tracking-widest",
				className,
			)}
		>
			{children}
		</span>
	);
}

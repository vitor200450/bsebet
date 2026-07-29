import { clsx } from "clsx";
import type { ReactNode } from "react";

type GroupStageShellProps = {
	title: string;
	formatLabel: string;
	badgeLabel?: string;
	children: ReactNode;
	className?: string;
};

/**
 * Shared comic panel for GSL / Round Robin group stage blocks on tournament detail.
 */
export function GroupStageShell({
	title,
	formatLabel,
	badgeLabel,
	children,
	className,
}: GroupStageShellProps) {
	return (
		<section
			className={clsx(
				"flex flex-col gap-6 border-[3px] border-black bg-white p-4 text-ink shadow-comic-md md:p-6",
				className,
			)}
		>
			<header className="flex flex-col gap-3 border-black border-b-[3px] pb-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<div className="hidden h-10 w-1.5 shrink-0 bg-ink sm:block" />
					<h3 className="font-black font-display text-2xl text-ink uppercase italic tracking-tighter md:text-3xl">
						{title}
					</h3>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span className="surface-ink border-[3px] border-black px-3 py-1.5 font-body font-bold text-[10px] uppercase tracking-widest shadow-comic-sm">
						{formatLabel}
					</span>
					{badgeLabel ? (
						<span className="surface-lime border-[3px] border-black px-3 py-1.5 font-body font-bold text-[10px] uppercase tracking-widest shadow-comic-sm">
							{badgeLabel}
						</span>
					) : null}
				</div>
			</header>
			{children}
		</section>
	);
}

export function GroupStageColumnLabel({
	children,
	tone = "ink",
}: {
	children: ReactNode;
	tone?: "ink" | "lime" | "red" | "tape";
}) {
	return (
		<div className="mb-3 text-center">
			<span
				className={clsx(
					"inline-block border-[3px] border-black px-3 py-1 font-body font-bold text-[10px] uppercase tracking-widest shadow-comic-sm",
					tone === "ink" && "surface-ink",
					tone === "lime" && "surface-lime",
					tone === "red" && "surface-brawl-red",
					tone === "tape" && "surface-tape",
				)}
			>
				{children}
			</span>
		</div>
	);
}

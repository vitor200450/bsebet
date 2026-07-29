import { clsx } from "clsx";
import type { ReactNode } from "react";

export type DetailFilterTab<T extends string> = {
	key: T;
	label: string;
	count?: number;
};

type DetailFilterTabsProps<T extends string> = {
	tabs: DetailFilterTab<T>[];
	value: T;
	onChange: (key: T) => void;
	ariaLabel: string;
	className?: string;
};

export function DetailFilterTabs<T extends string>({
	tabs,
	value,
	onChange,
	ariaLabel,
	className,
}: DetailFilterTabsProps<T>) {
	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className={clsx("flex flex-wrap gap-2", className)}
		>
			{tabs.map((tab) => {
				const selected = value === tab.key;
				return (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={selected}
						onClick={() => onChange(tab.key)}
						className={clsx(
							"flex min-w-[6.5rem] flex-1 items-center justify-center gap-2 border-[3px] border-black px-3 py-2.5 font-black font-display text-sm uppercase tracking-wider shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
							selected ? "surface-ink" : "hover-surface-lime bg-white text-ink",
						)}
					>
						<span>{tab.label}</span>
						{typeof tab.count === "number" && tab.count > 0 ? (
							<span
								className={clsx(
									"border-2 border-black px-1.5 py-0.5 font-body font-bold text-[10px] tabular-nums tracking-widest",
									selected ? "surface-brawl-red" : "bg-tape text-ink",
								)}
							>
								{tab.count}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

export function DetailSectionHeader({
	title,
	trailing,
	className,
}: {
	title: string;
	trailing?: ReactNode;
	className?: string;
}) {
	return (
		<div className={clsx("mb-6 flex flex-wrap items-center gap-3", className)}>
			<div className="h-8 w-1.5 shrink-0 bg-ink" />
			<h2 className="font-black font-display text-2xl text-ink uppercase italic tracking-tighter md:text-3xl">
				{title}
			</h2>
			{trailing}
			<div className="hidden h-0.5 min-w-[2rem] flex-1 bg-black/10 sm:block" />
		</div>
	);
}

export function DetailEmptyState({
	icon,
	title,
	hint,
}: {
	icon: ReactNode;
	title: string;
	hint?: string;
}) {
	return (
		<div className="border-[3px] border-black border-dashed bg-white py-14 text-center text-ink shadow-comic-sm">
			<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-black bg-tape shadow-comic-sm">
				{icon}
			</div>
			<h3 className="font-black font-display text-ink text-xl uppercase italic">
				{title}
			</h3>
			{hint ? (
				<p className="mt-2 font-bold font-display text-gray-600 text-sm">
					{hint}
				</p>
			) : null}
		</div>
	);
}

export function DetailPanel({
	title,
	icon,
	children,
	className,
}: {
	title: string;
	icon?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={clsx(
				"border-[3px] border-black bg-white p-5 text-ink shadow-comic-md md:p-6",
				className,
			)}
		>
			<div className="mb-6 flex w-full items-center gap-3">
				{icon}
				<h3 className="font-black font-display text-2xl text-ink uppercase italic tracking-tighter">
					{title}
				</h3>
				<div className="h-0.5 flex-1 bg-black/10" />
			</div>
			{children}
		</section>
	);
}

export function DetailStatCard({
	icon,
	label,
	value,
	variant = "default",
}: {
	icon: ReactNode;
	label: string;
	value: string;
	variant?: "default" | "highlight" | "win" | "loss";
}) {
	return (
		<div
			className={clsx(
				"relative flex flex-col items-center justify-center overflow-hidden border-[3px] border-black p-3 text-center shadow-comic-md transition-all hover:-translate-y-0.5 hover:shadow-comic-lg",
				variant === "highlight" && "surface-yellow",
				variant === "win" && "bg-electric-lime/40 text-ink",
				variant === "loss" && "bg-brawl-red/15 text-ink",
				variant === "default" && "bg-white text-ink",
			)}
		>
			<div className="relative mb-1 text-ink">{icon}</div>
			<div className="relative font-black font-display text-2xl text-ink tabular-nums">
				{value}
			</div>
			<div className="relative font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
				{label}
			</div>
		</div>
	);
}

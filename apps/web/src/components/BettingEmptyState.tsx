import { clsx } from "clsx";
import type { ReactNode } from "react";

type BettingEmptyStateProps = {
	icon: string;
	title: string;
	titleAccent?: string;
	description: string;
	action?: ReactNode;
	layout?: "page" | "embedded";
};

/** Spray paint plate — original BSEN kit (same assets as landing/login) */
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

function EmptyAtmosphere() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			{/* Team dual wash — blue left / red right */}
			<SpraySplat
				variant="blue"
				className="absolute top-[18%] left-[-18%] h-44 w-64 -rotate-12 opacity-40 sm:left-[-8%] sm:h-56 sm:w-80 sm:opacity-50 md:top-[14%] md:left-[4%] md:h-72 md:w-[26rem]"
			/>
			<SpraySplat
				variant="red"
				className="absolute right-[-18%] bottom-[16%] h-44 w-64 rotate-12 opacity-40 sm:right-[-8%] sm:h-56 sm:w-80 sm:opacity-50 md:right-[4%] md:bottom-[12%] md:h-72 md:w-[26rem]"
			/>

			{/* Hard comic scraps — geometry only, no copy */}
			<div className="absolute top-[22%] right-[12%] hidden h-3 w-16 -rotate-6 border-2 border-black bg-electric-lime shadow-comic-sm sm:block md:right-[18%]" />
			<div className="absolute bottom-[24%] left-[10%] hidden h-8 w-8 rotate-3 border-2 border-black bg-brawl-yellow shadow-comic-sm sm:block md:left-[16%]" />
			<div className="absolute top-[38%] left-[8%] hidden h-2 w-10 skew-x-[-12deg] border-2 border-black bg-ink sm:block md:left-[14%]" />
			<div className="absolute right-[10%] bottom-[36%] hidden h-2 w-12 skew-x-12 border-2 border-black bg-brawl-blue sm:block md:right-[15%]" />
		</div>
	);
}

export function BettingEmptyState({
	icon,
	title,
	titleAccent,
	description,
	action,
	layout = "page",
}: BettingEmptyStateProps) {
	const card = (
		<div className="relative z-10 flex w-full max-w-sm flex-col items-center rounded-lg border-2 border-black bg-white p-8 text-center shadow-comic-md">
			<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-tape shadow-comic-sm">
				<span className="material-symbols-outlined text-2xl text-gray-500">
					{icon}
				</span>
			</div>

			<h2 className="mb-2 pb-1 font-black font-display text-2xl text-ink uppercase italic leading-[1.1]">
				{title}
				{titleAccent ? (
					<>
						{" "}
						<span className="text-brawl-red">{titleAccent}</span>
					</>
				) : null}
			</h2>

			<p
				className={
					action
						? "mb-6 font-bold font-display text-gray-600 text-sm"
						: "font-bold font-display text-gray-600 text-sm"
				}
			>
				{description}
			</p>

			{action}
		</div>
	);

	if (layout === "embedded") {
		return <div className="flex justify-center py-12">{card}</div>;
	}

	return (
		<div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-transparent p-6 text-ink">
			<EmptyAtmosphere />
			<div className="relative z-10 w-full max-w-sm">{card}</div>
		</div>
	);
}

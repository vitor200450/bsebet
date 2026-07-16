import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const BAR_DELAYS = [0, 0.12, 0.24, 0.18, 0.3];

const SIZE_CONFIG = {
	xs: {
		bars: 3,
		height: "h-3",
		width: "w-0.5",
		gap: "gap-px",
		border: "border border-black",
	},
	sm: {
		bars: 3,
		height: "h-4",
		width: "w-1",
		gap: "gap-0.5",
		border: "border border-black",
	},
	md: {
		bars: 4,
		height: "h-5",
		width: "w-1.5",
		gap: "gap-0.5",
		border: "border border-black",
	},
	lg: {
		bars: 5,
		height: "h-8",
		width: "w-2",
		gap: "gap-1",
		border: "border-2 border-black",
	},
	xl: {
		bars: 5,
		height: "h-12",
		width: "w-2.5",
		gap: "gap-1.5",
		border: "border-2 border-black",
	},
} as const;

export type InlineLoaderSize = keyof typeof SIZE_CONFIG;

type BroadcastBarsProps = {
	size?: InlineLoaderSize;
	className?: string;
	"aria-hidden"?: boolean;
};

export function BroadcastBars({
	size = "md",
	className,
	"aria-hidden": ariaHidden = true,
}: BroadcastBarsProps) {
	const reduceMotion = useReducedMotion();
	const config = SIZE_CONFIG[size];
	const delays = BAR_DELAYS.slice(0, config.bars);

	return (
		<div
			className={cn("flex items-end", config.gap, className)}
			aria-hidden={ariaHidden}
		>
			{delays.map((delay, index) => (
				<motion.div
					key={`${size}-bar-${index}`}
					className={cn(
						config.height,
						config.width,
						"origin-bottom bg-electric-lime",
						config.border,
					)}
					initial={{ scaleY: 0.35 }}
					animate={
						reduceMotion
							? { scaleY: 0.55 + index * 0.08 }
							: { scaleY: [0.3, 1, 0.45, 0.85, 0.3] }
					}
					transition={
						reduceMotion
							? { duration: 0 }
							: {
									duration: 0.85,
									repeat: Number.POSITIVE_INFINITY,
									delay,
									ease: "easeInOut",
								}
					}
				/>
			))}
		</div>
	);
}

type InlineLoaderProps = {
	size?: InlineLoaderSize;
	className?: string;
	label?: string;
};

export function InlineLoader({
	size = "md",
	className,
	label,
}: InlineLoaderProps) {
	return (
		<span
			role={label ? "status" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={cn("inline-flex shrink-0 items-center", className)}
		>
			<BroadcastBars size={size} />
		</span>
	);
}

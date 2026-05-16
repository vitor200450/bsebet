import { useTranslation } from "react-i18next";
import type { BetStats } from "@/server/bets";

interface BetSplitBarProps {
	teamAName: string;
	teamBName: string;
	stats: BetStats;
	compact?: boolean;
}

export function BetSplitBar({
	teamAName,
	teamBName,
	stats,
	compact = false,
}: BetSplitBarProps) {
	const { t } = useTranslation("betting");

	const { teamAPercent, teamBPercent, totalCount } = stats;

	if (totalCount === 0) {
		return (
			<div className="w-full">
				{!compact && (
					<p className="mb-1 font-black text-[9px] text-gray-400 uppercase tracking-wider">
						{t("community.title")}
					</p>
				)}
				<div className="h-3 w-full rounded-sm border-2 border-black bg-gray-200 shadow-[2px_2px_0_0_#000]" />
				{!compact && (
					<p className="mt-1 text-center font-bold text-[9px] text-gray-400">
						{t("community.noBets")}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="w-full">
			{!compact && (
				<p className="mb-1 font-black text-[9px] text-gray-400 uppercase tracking-wider">
					{t("community.title")}
				</p>
			)}

			{/* Labels row */}
			<div className="mb-1 flex items-center justify-between">
				<span className="font-black text-[10px] text-[#2e5cff]">
					{teamAName} {teamAPercent}%
				</span>
				<span className="font-black text-[10px] text-[#ff2e2e]">
					{teamBPercent}% {teamBName}
				</span>
			</div>

			{/* Bar */}
			<div
				className={`relative w-full overflow-hidden rounded-sm border-2 border-black shadow-[2px_2px_0_0_#000] ${compact ? "h-3" : "h-5"}`}
			>
				<div
					className="absolute inset-y-0 left-0 bg-[#2e5cff] transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamAPercent}%` }}
				/>
				<div
					className="absolute inset-y-0 right-0 bg-[#ff2e2e] transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamBPercent}%` }}
				/>
			</div>

			{/* Total count */}
			{!compact && (
				<p className="mt-1 text-center font-bold text-[9px] text-gray-400">
					{t("community.totalVotes", { count: totalCount })}
				</p>
			)}
		</div>
	);
}

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
				<div className={`w-full bg-gray-300 ${compact ? "h-4" : "h-5"}`} />
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
			{/* Title label */}
			{!compact && (
				<p className="mb-1 font-black text-[9px] text-gray-400 uppercase tracking-wider">
					{t("community.title")}
				</p>
			)}

			{/* Split bar — flush with card edges */}
			<div className={`flex w-full ${compact ? "h-4" : "h-5"}`}>
				{/* Left fill (blue) */}
				<div
					className="relative flex items-center justify-end bg-[#2e5cff] pr-1 transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamAPercent}%` }}
				>
					{teamAPercent >= 12 && (
						<span className="font-black text-white text-[9px] leading-none">
							{teamAPercent}%
						</span>
					)}
				</div>

				{/* Right fill (red) */}
				<div
					className="relative flex flex-1 items-center bg-[#ff2e2e] pl-1 transition-[flex-grow] duration-[600ms] ease-out motion-reduce:transition-none"
				>
					{teamBPercent >= 12 && (
						<span className="font-black text-white text-[9px] leading-none">
							{teamBPercent}%
						</span>
					)}
				</div>
			</div>

			{/* Total count */}
			{!compact && (
				<p className="mt-1 text-right font-bold text-[9px] text-gray-400">
					{t("community.totalVotes", { count: totalCount })}
				</p>
			)}
		</div>
	);
}

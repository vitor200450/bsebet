import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import type { BetStats } from "@/server/bets";

interface BetSplitBarProps {
	teamAName: string;
	teamBName: string;
	stats: BetStats;
	compact?: boolean;
}

const MIN_LABEL_PERCENT = 12;

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
			<div
				className={clsx(
					"w-full border-black border-t-[3px] bg-paper",
					compact ? "px-3 py-2" : "px-3 py-2.5",
				)}
			>
				{!compact && (
					<p className="mb-1.5 font-body font-bold text-[9px] text-ink/50 uppercase tracking-widest">
						{t("community.title")}
					</p>
				)}
				<div className="flex items-center justify-center border-2 border-black border-dashed bg-white/70 px-3 py-1.5">
					<p className="font-body font-bold text-[9px] text-ink/60 uppercase tracking-widest">
						{t("community.noBets")}
					</p>
				</div>
			</div>
		);
	}

	const showA = teamAPercent >= MIN_LABEL_PERCENT;
	const showB = teamBPercent >= MIN_LABEL_PERCENT;

	return (
		<div className="w-full border-black border-t-[3px]">
			{!compact && (
				<div className="flex items-center justify-between gap-2 bg-paper px-3 py-1">
					<p className="font-body font-bold text-[9px] text-ink/50 uppercase tracking-widest">
						{t("community.title")}
					</p>
					<p className="font-body font-bold text-[9px] text-ink/50 uppercase tabular-nums tracking-widest">
						{t("community.totalVotes", { count: totalCount })}
					</p>
				</div>
			)}

			<div
				className={clsx("flex w-full overflow-hidden", compact ? "h-7" : "h-8")}
				role="img"
				aria-label={`${teamAName} ${teamAPercent}%, ${teamBName} ${teamBPercent}%`}
			>
				<div
					className="relative flex items-center justify-end bg-brawl-blue pr-2 transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamAPercent}%` }}
					title={teamAName}
				>
					{showA && (
						<span className="font-black font-display text-sm text-white uppercase italic tabular-nums leading-none">
							{teamAPercent}%
						</span>
					)}
				</div>
				<div
					className="relative flex items-center justify-start bg-brawl-red pl-2 transition-[width] duration-[600ms] ease-out motion-reduce:transition-none"
					style={{ width: `${teamBPercent}%` }}
					title={teamBName}
				>
					{showB && (
						<span className="font-black font-display text-sm text-white uppercase italic tabular-nums leading-none">
							{teamBPercent}%
						</span>
					)}
				</div>
			</div>

			{compact && (
				<p className="bg-paper px-3 py-1 text-right font-body font-bold text-[8px] text-ink/45 uppercase tabular-nums tracking-widest">
					{t("community.totalVotes", { count: totalCount })}
				</p>
			)}
		</div>
	);
}

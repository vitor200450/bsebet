import { Calendar, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MatchSchedulePillsProps {
	startTime: string | Date | null | undefined;
	locale: string;
}

export function MatchSchedulePills({
	startTime,
	locale,
}: MatchSchedulePillsProps) {
	const { t } = useTranslation("admin-matches");
	const startDate = startTime ? new Date(startTime) : null;
	const isValidDate = startDate !== null && !Number.isNaN(startDate.getTime());

	if (!isValidDate) {
		return (
			<span className="inline-flex w-fit items-center gap-1 border-2 border-gray-300 border-dashed bg-white px-1.5 py-0.5 font-body font-bold text-[9px] text-gray-400 uppercase tracking-widest">
				<Clock className="h-3 w-3 shrink-0" strokeWidth={2.5} />
				{t("matches.noDateSet")}
			</span>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className="inline-flex items-center gap-1 border-2 border-black bg-white px-1.5 py-0.5 font-body font-bold text-[9px] text-black uppercase tabular-nums tracking-widest shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
				<Calendar className="h-3 w-3 shrink-0" strokeWidth={2.5} />
				{startDate.toLocaleDateString(locale, {
					day: "2-digit",
					month: "short",
				})}
			</span>
			<span className="inline-flex items-center gap-1 border-2 border-black bg-black px-1.5 py-0.5 font-body font-bold text-[9px] text-white uppercase tabular-nums tracking-widest shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
				<Clock className="h-3 w-3 shrink-0" strokeWidth={2.5} />
				{startDate.toLocaleTimeString(locale, {
					hour: "2-digit",
					minute: "2-digit",
				})}
			</span>
		</div>
	);
}

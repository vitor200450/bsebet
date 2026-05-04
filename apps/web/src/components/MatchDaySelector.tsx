import { Calendar, Check, Lock, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MatchDay {
	id: number;
	label: string;
	date: Date | string;
	status: "draft" | "open" | "locked" | "finished";
	matchCount?: number;
}

interface MatchDaySelectorProps {
	matchDays: MatchDay[];
	activeMatchDayId: number | null;
	onSelect: (matchDayId: number) => void;
	tournamentName?: string;
}

export function MatchDaySelector({
	matchDays,
	activeMatchDayId,
	onSelect,
	tournamentName,
}: MatchDaySelectorProps) {
	const { t, i18n } = useTranslation("tournament");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";

	const getStatusInfo = (status: string) => {
		switch (status) {
			case "open":
				return {
					bg: "bg-[#ccff00]",
					textColor: "text-black",
					label: t("matchDay.betsOpen"),
					icon: Trophy,
					borderColor: "border-[#ccff00]",
				};
			case "locked":
				return {
					bg: "bg-[#ffc700]",
					textColor: "text-black",
					label: t("matchDay.betsClosed"),
					icon: Lock,
					borderColor: "border-[#ffc700]",
				};
			case "finished":
				return {
					bg: "bg-brawl-blue",
					textColor: "text-white",
					label: t("matchDay.completed"),
					icon: Check,
					borderColor: "border-brawl-blue",
				};
			default:
				return {
					bg: "bg-tape",
					textColor: "text-gray-600",
					label: t("matchDay.draft"),
					icon: Calendar,
					borderColor: "border-tape",
				};
		}
	};

	// Sort: by date (earliest first), then by id if dates are the same
	const sortedMatchDays = [...matchDays].sort((a, b) => {
		const dateA = new Date(a.date).getTime();
		const dateB = new Date(b.date).getTime();
		if (dateA !== dateB) {
			return dateA - dateB;
		}
		return a.id - b.id;
	});

	return (
		<div className="relative flex min-h-screen flex-col items-center bg-paper p-6">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			<div className="relative z-10 w-full max-w-4xl">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 inline-block -rotate-1 transform border-[#ccff00] border-b-4 bg-ink px-6 py-3 shadow-[4px_4px_0px_0px_#000]">
						<h1 className="font-black font-display text-3xl text-white uppercase italic tracking-tighter md:text-4xl">
							{t("matchDay.selectTitle")}
						</h1>
					</div>
					{tournamentName && (
						<div className="mt-2 mb-4 flex w-full justify-center">
							<div className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-[#ccff00] px-4 py-2 shadow-[3px_3px_0px_0px_#000]">
								<Trophy className="h-4 w-4 text-black" strokeWidth={3} />
								<span className="font-black text-black text-xs uppercase md:text-sm">
									{t("matchDay.tournamentLabel")}: {tournamentName}
								</span>
							</div>
						</div>
					)}
					<p className="font-bold text-gray-600 text-sm uppercase md:text-base">
						{t("matchDay.selectPrompt")}
					</p>
				</div>

				{/* Match Days Grid */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{sortedMatchDays.map((md) => {
						const isActive = md.id === activeMatchDayId;
						const isDraft = md.status === "draft";
						const statusInfo = getStatusInfo(md.status);
						const Icon = statusInfo.icon;

						return (
							<button
								key={md.id}
								type="button"
								onClick={() => {
									if (isDraft) return;
									onSelect(md.id);
								}}
								disabled={isDraft}
								className={`relative rounded-lg border-2 border-black bg-white p-5 text-left shadow-[4px_4px_0px_0px_#000] transition-all duration-150 ${
									isDraft
										? "cursor-not-allowed opacity-70"
										: "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_#000]"
								} ${isActive ? "ring-2 ring-[#ccff00] ring-offset-2" : ""}`}
							>
								{/* Active Badge */}
								{isActive && (
									<div className="absolute -top-3 -right-3 rotate-6 border-2 border-black bg-[#ccff00] px-2.5 py-1 shadow-[3px_3px_0px_0px_#000]">
										<span className="font-black text-black text-xs uppercase">
											🔥 {t("matchDay.active")}
										</span>
									</div>
								)}
								{isDraft && (
									<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/35">
										<span className="border-2 border-white bg-ink px-3 py-1.5 font-black text-[10px] text-white uppercase shadow-[2px_2px_0px_0px_#000]">
											{t("matchDay.unavailable")}
										</span>
									</div>
								)}

								{/* Header with Icon and Status */}
								<div className="mb-4 flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div
											className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-black ${statusInfo.bg} shadow-[2px_2px_0px_0px_#000]`}
										>
											<Icon
												className={`h-5 w-5 ${statusInfo.textColor}`}
												strokeWidth={2.5}
											/>
										</div>
										<div>
											<h3 className="font-black font-display text-ink text-xl uppercase italic tracking-tight md:text-2xl">
												{md.label}
											</h3>
											<p className="font-bold text-gray-500 text-sm uppercase">
												{new Date(md.date).toLocaleDateString(locale, {
													weekday: "short",
													day: "2-digit",
													month: "short",
												})}
											</p>
										</div>
									</div>
								</div>

								{/* Status Badge */}
								<div
									className={`inline-block ${statusInfo.bg} ${statusInfo.textColor} mb-3 rounded-md border-2 border-black px-2.5 py-1 font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_#000]`}
								>
									{statusInfo.label}
								</div>

								{/* Match Count */}
								{md.matchCount !== undefined && (
									<div className="flex items-center gap-2 text-sm">
										{md.matchCount > 0 ? (
											<>
												<span className="material-symbols-outlined text-base text-gray-600">
													sports_esports
												</span>
												<span className="font-bold text-gray-700">
													{t("matchDay.available", { count: md.matchCount })}
												</span>
											</>
										) : isDraft ? (
											<>
												<span className="material-symbols-outlined text-base text-brawl-red">
													warning
												</span>
												<span className="font-bold text-brawl-red">
													{t("matchDay.noMatches")}
												</span>
											</>
										) : (
											<span className="font-bold text-gray-400 text-xs uppercase">
												{t("matchDay.pending")}
											</span>
										)}
									</div>
								)}

								{/* Arrow indicator */}
								<div className="absolute right-4 bottom-4">
									<span className="material-symbols-outlined text-2xl text-black/20 transition-colors group-hover:text-black/40">
										arrow_forward
									</span>
								</div>
							</button>
						);
					})}
				</div>

				{/* No Match Days Message */}
				{matchDays.length === 0 && (
					<div className="py-12 text-center">
						<div className="inline-block rounded-lg border-2 border-black bg-white p-8 shadow-[6px_6px_0px_0px_#000]">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-tape">
								<Calendar className="h-8 w-8 text-gray-400" strokeWidth={3} />
							</div>
							<h3 className="mb-2 font-black font-display text-ink text-xl uppercase italic">
								{t("matchDay.noMatchDayTitle")}
							</h3>
							<p className="text-gray-600 text-sm">
								{t("matchDay.noMatchDay")}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

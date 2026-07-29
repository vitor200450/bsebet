import { clsx } from "clsx";
import { History, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActiveBetRow } from "@/components/ActiveBetRow";
import { useModalPresence } from "@/hooks/useModalPresence";
import type { UserRecentBet } from "@/server/user-profile";

export type UserPicksTournamentGroup = {
	id: string;
	name: string;
	logoUrl?: string | null;
	bets: UserRecentBet[];
};

type UserPicksModalProps = {
	isOpen: boolean;
	onClose: () => void;
	playerName: string;
	groups: UserPicksTournamentGroup[];
	locale: string;
	initialTournamentId?: string | null;
};

export function UserPickTile({
	bet,
	locale,
	fallbackLabel,
	tbdLabel,
}: {
	bet: UserRecentBet;
	locale: string;
	fallbackLabel: string;
	tbdLabel: string;
}) {
	return (
		<ActiveBetRow
			variant="tile"
			matchLabel={bet.match.tournament?.name ?? fallbackLabel}
			headerLogoUrl={bet.match.tournament?.logoUrl}
			headerLogoAlt={bet.match.tournament?.name ?? undefined}
			teamA={{
				id: bet.match.teamA?.id,
				name: bet.match.teamA?.name || tbdLabel,
				logoUrl: bet.match.teamA?.logoUrl,
				slug: bet.match.teamA?.slug,
			}}
			teamB={{
				id: bet.match.teamB?.id,
				name: bet.match.teamB?.name || tbdLabel,
				logoUrl: bet.match.teamB?.logoUrl,
				slug: bet.match.teamB?.slug,
			}}
			status={
				(bet.match.status as "scheduled" | "live" | "finished") || "scheduled"
			}
			startTime={
				typeof bet.match.startTime === "string"
					? bet.match.startTime
					: bet.match.startTime?.toISOString()
			}
			predictedWinnerId={bet.predictedWinnerId}
			predictedScoreA={bet.predictedScoreA}
			predictedScoreB={bet.predictedScoreB}
			actualScoreA={bet.match.scoreA}
			actualScoreB={bet.match.scoreB}
			actualWinnerId={bet.match.winner?.id ?? null}
			pointsEarned={bet.pointsEarned}
			isPerfectPick={bet.isPerfectPick ?? undefined}
			isUnderdogPick={bet.isUnderdogPick ?? undefined}
			locale={locale}
		/>
	);
}

export function UserPicksModal({
	isOpen,
	onClose,
	playerName,
	groups,
	locale,
	initialTournamentId = null,
}: UserPicksModalProps) {
	const { t } = useTranslation(["user", "common"]);
	const { present, visible, exiting } = useModalPresence(isOpen);
	const bodyRef = useRef<HTMLDivElement>(null);
	const [selectedTournamentId, setSelectedTournamentId] = useState<
		string | null
	>(initialTournamentId);

	useEffect(() => {
		if (!isOpen) return;
		setSelectedTournamentId(initialTournamentId ?? groups[0]?.id ?? null);
	}, [isOpen, initialTournamentId, groups]);

	useEffect(() => {
		if (!present) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [present]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	function selectTournament(id: string) {
		setSelectedTournamentId(id);
		bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
	}

	if (!present) return null;

	const activeTournamentId = selectedTournamentId ?? groups[0]?.id ?? null;
	const selectedGroup =
		groups.find((group) => group.id === activeTournamentId) ??
		groups[0] ??
		null;
	const showTournamentSwitcher = groups.length > 1;

	return (
		<div className="fixed inset-0 z-[300] flex items-end justify-center p-0 sm:items-center sm:p-4">
			<button
				type="button"
				className="admin-modal-overlay absolute inset-0 bg-black/60"
				aria-label={t("common:actions.close")}
				onClick={onClose}
				disabled={exiting}
				data-open={visible ? "true" : undefined}
				data-exiting={exiting ? "true" : undefined}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="user-picks-modal-title"
				className="admin-modal-panel relative flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden border-[4px] border-black bg-white text-ink shadow-[10px_10px_0px_0px_#000] sm:h-auto sm:max-h-[85dvh]"
				data-open={visible ? "true" : undefined}
				data-exiting={exiting ? "true" : undefined}
			>
				{/* Persistent chrome: title + tournament switcher stay pinned */}
				<header className="sticky top-0 z-20 shrink-0 bg-white">
					<div className="flex items-center justify-between border-black border-b-[4px] surface-brawl-blue p-3 md:p-4">
						<div className="min-w-0">
							<p className="font-body font-bold text-[10px] text-white/80 uppercase tracking-widest">
								{t("user:picksModal.eyebrow")}
							</p>
							<h2
								id="user-picks-modal-title"
								className="truncate pe-[0.35em] pb-0.5 font-black font-display text-lg text-white uppercase italic leading-[1.15] tracking-tighter md:text-2xl"
							>
								{t("user:picksModal.title", { name: playerName })}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={exiting}
							className="admin-press shrink-0 border-2 border-black bg-ink p-1.5 text-white transition-colors hover:bg-white hover:text-ink disabled:opacity-50"
							aria-label={t("common:actions.close")}
						>
							<X className="h-5 w-5" strokeWidth={3} />
						</button>
					</div>

					{showTournamentSwitcher ? (
						<div className="border-black border-b-[3px] bg-paper">
							<div className="flex items-center justify-between gap-2 px-3 pt-2">
								<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
									{t("user:filterLabel")}
								</span>
								<span className="font-body font-bold text-[10px] text-gray-400 uppercase tabular-nums tracking-widest">
									{t("user:picksModal.tournamentCount", {
										count: groups.length,
									})}
								</span>
							</div>
							<div
								role="tablist"
								aria-label={t("user:filterLabel")}
								className="scrollbar-hide flex gap-2 overflow-x-auto p-2 sm:p-3"
							>
								{groups.map((tab) => {
									const isSelected = tab.id === activeTournamentId;
									return (
										<button
											key={tab.id}
											type="button"
											role="tab"
											aria-selected={isSelected}
											onClick={() => selectTournament(tab.id)}
											className={clsx(
												"flex shrink-0 items-center gap-2 border-2 border-black px-3 py-2 transition-all",
												isSelected
													? "surface-lime shadow-comic-sm"
													: "bg-white text-ink hover:bg-tape",
											)}
										>
											<div
												className={clsx(
													"flex h-8 w-8 shrink-0 items-center justify-center border border-black",
													isSelected ? "bg-white" : "bg-brawl-yellow",
												)}
											>
												{tab.logoUrl ? (
													<img
														src={tab.logoUrl}
														alt=""
														className="h-5 w-5 object-contain"
													/>
												) : (
													<Trophy
														className="h-4 w-4 text-ink"
														strokeWidth={2.5}
													/>
												)}
											</div>
											<span className="max-w-[140px] truncate pe-[0.35em] pr-1 font-black font-display text-ink text-xs uppercase italic leading-[1.15] tracking-tighter sm:max-w-[200px] sm:text-sm">
												{tab.name}
											</span>
											<span
												className={clsx(
													"border border-black px-1.5 py-0.5 font-black font-body text-[10px] tabular-nums",
													isSelected
														? "surface-ink"
														: "bg-electric-lime text-black",
												)}
											>
												{tab.bets.length}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					{selectedGroup ? (
						<div className="flex flex-wrap items-center gap-2 border-black border-b-[3px] bg-white px-3 py-2.5 sm:px-5">
							{selectedGroup.logoUrl ? (
								<div className="h-8 w-8 shrink-0 overflow-hidden border-2 border-black bg-white p-0.5 shadow-comic-sm">
									<img
										src={selectedGroup.logoUrl}
										alt=""
										className="h-full w-full object-contain"
									/>
								</div>
							) : (
								<div className="h-5 w-5 -skew-x-12 border-2 border-black bg-brawl-yellow" />
							)}
							<h3 className="min-w-0 flex-1 truncate pe-[0.35em] pb-0.5 font-black font-display text-ink text-base uppercase italic leading-[1.15] tracking-tight md:text-xl">
								{selectedGroup.name}
							</h3>
							<span className="border-2 border-black bg-tape px-2 py-0.5 font-body font-bold text-[10px] text-ink uppercase tabular-nums tracking-widest">
								{t("user:pickCount", { count: selectedGroup.bets.length })}
							</span>
						</div>
					) : null}
				</header>

				<div
					ref={bodyRef}
					className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5"
				>
					{!selectedGroup ? (
						<div className="py-10 text-center">
							<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-[3px] border-black bg-tape shadow-comic-sm">
								<History className="h-5 w-5 text-ink" strokeWidth={2.5} />
							</div>
							<p className="font-black font-display text-ink text-lg uppercase italic">
								{t("user:empty.recentBets")}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{selectedGroup.bets.map((bet) => (
								<UserPickTile
									key={bet.id}
									bet={bet}
									locale={locale}
									fallbackLabel={t("user:profile")}
									tbdLabel={t("user:tbd")}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

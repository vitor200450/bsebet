import {
	closestCenter,
	DndContext,
	DragOverlay,
	type DropAnimation,
	defaultDropAnimationSideEffects,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "@tanstack/react-router";
import { ArrowUpDown, GripVertical, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MatchSchedulePills } from "@/components/admin/MatchSchedulePills";
import { InlineLoader } from "@/components/inline-loader";
import type { Match } from "@/components/TournamentBracket";
import { updateMatchOrder } from "@/server/matches";

interface MatchOrderingProps {
	matches: Match[];
	tournamentId: number;
}

/** Saved manual order uses displayOrder 0..n-1; bracket-generated orders are sparse. */
function hasSavedManualOrder(matches: Match[]): boolean {
	if (matches.length === 0) return false;
	const orders = [...matches]
		.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
		.map((m) => m.displayOrder ?? 0);
	return orders.every((order, index) => order === index);
}

function sortMatchesForOrdering(matches: Match[]): Match[] {
	if (hasSavedManualOrder(matches)) {
		return [...matches].sort(
			(a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
		);
	}

	return [...matches].sort((a, b) => {
		const timeDiff =
			new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
		if (timeDiff !== 0) return timeDiff;
		return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
	});
}

function MatchItemCard({
	match,
	index,
	isOverlay,
	isDragging,
	dragListeners,
	dragAttributes,
	locale,
}: {
	match: Match;
	index: number;
	isOverlay?: boolean;
	isDragging?: boolean;
	dragListeners?: Record<string, unknown>;
	dragAttributes?: Record<string, unknown>;
	locale: string;
}) {
	const { t } = useTranslation("admin-matches");

	return (
		<div
			className={`admin-card-interactive admin-card-shadow-hover border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${
				isOverlay
					? "z-50 rotate-1 scale-[1.02] cursor-grabbing shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
					: isDragging
						? "opacity-30"
						: ""
			}`}
		>
			<div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch lg:gap-6">
				<div className="flex items-center gap-3 lg:shrink-0">
					<button
						type="button"
						{...dragAttributes}
						{...dragListeners}
						className="flex shrink-0 cursor-grab touch-none items-center justify-center border-2 border-black bg-gray-50 p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-[background-color] duration-150 ease-out hover:bg-electric-lime active:scale-[0.97] active:cursor-grabbing"
						aria-label={t("ordering.title")}
					>
						<GripVertical className="h-5 w-5" strokeWidth={2.5} />
					</button>

					<div className="-skew-x-6 border-2 border-black bg-black px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
						<span className="block skew-x-6 font-black font-display text-lg text-white uppercase italic tabular-nums leading-none">
							#{index + 1}
						</span>
					</div>

					<div className="min-w-0 flex-1 lg:hidden">
						<p className="truncate font-black font-display text-black text-sm uppercase italic leading-tight">
							{match.name || match.label || t("ordering.tbdVsTbd")}
						</p>
					</div>
				</div>

				<div className="min-w-0 flex-1 lg:flex lg:flex-col lg:justify-center">
					<p className="hidden truncate font-black font-display text-base text-black uppercase italic leading-tight lg:block">
						{match.name || match.label || t("ordering.tbdVsTbd")}
					</p>
					<div className="mt-1 flex flex-wrap items-center gap-2">
						<MatchSchedulePills startTime={match.startTime} locale={locale} />
						{match.status === "finished" && (
							<span className="border border-black bg-black px-1.5 py-0.5 font-body font-bold text-[9px] text-white uppercase tracking-widest">
								{t("bracketEditor.badgeFinal")}
							</span>
						)}
						{match.status === "live" && (
							<span className="border border-black bg-brawl-red px-1.5 py-0.5 font-body font-bold text-[9px] text-white uppercase tracking-widest">
								{t("bracketEditor.badgeLive")}
							</span>
						)}
					</div>
				</div>

				<div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-[3px] border-black bg-gray-50 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.08)] lg:min-w-[min(100%,520px)] lg:max-w-[560px] lg:flex-1 lg:gap-4 lg:p-4">
					<div className="flex min-w-0 items-center justify-end gap-3">
						<span className="min-w-0 flex-1 pr-0.5 text-right font-black font-display text-black text-sm uppercase italic leading-[1.15] tracking-tighter [overflow-wrap:anywhere] lg:text-base">
							{match.teamA?.name ||
								match.labelTeamA ||
								t("ordering.unknownTeam")}
						</span>
						<div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] lg:h-14 lg:w-14">
							{match.teamA?.logoUrl ? (
								<img
									src={match.teamA.logoUrl}
									alt=""
									className="h-9 w-9 object-contain lg:h-11 lg:w-11"
								/>
							) : (
								<span className="font-body font-bold text-gray-300 text-sm">
									?
								</span>
							)}
						</div>
					</div>

					<span className="px-1 font-black font-display text-base text-gray-300 uppercase italic lg:text-xl">
						{t("ordering.vs")}
					</span>

					<div className="flex min-w-0 items-center gap-3">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] lg:h-14 lg:w-14">
							{match.teamB?.logoUrl ? (
								<img
									src={match.teamB.logoUrl}
									alt=""
									className="h-9 w-9 object-contain lg:h-11 lg:w-11"
								/>
							) : (
								<span className="font-body font-bold text-gray-300 text-sm">
									?
								</span>
							)}
						</div>
						<span className="min-w-0 flex-1 pr-1 pl-0.5 font-black font-display text-black text-sm uppercase italic leading-[1.15] tracking-tighter [overflow-wrap:anywhere] lg:text-base">
							{match.teamB?.name ||
								match.labelTeamB ||
								t("ordering.unknownTeam")}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function SortableMatchItem({
	match,
	index,
	locale,
}: {
	match: Match;
	index: number;
	locale: string;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: match.id });

	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<MatchItemCard
				match={match}
				index={index}
				isDragging={isDragging}
				dragListeners={listeners}
				dragAttributes={attributes}
				locale={locale}
			/>
		</div>
	);
}

export function MatchOrdering({ matches: initialMatches }: MatchOrderingProps) {
	const { t, i18n } = useTranslation("admin-matches");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const [matches, setMatches] = useState(() =>
		sortMatchesForOrdering(initialMatches),
	);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const router = useRouter();

	const sortedInitial = useMemo(
		() => sortMatchesForOrdering(initialMatches),
		[initialMatches],
	);

	const hasLocalEdits = useMemo(() => {
		if (matches.length !== sortedInitial.length) return true;
		return matches.some((m, index) => m.id !== sortedInitial[index]?.id);
	}, [matches, sortedInitial]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	useEffect(() => {
		if (!hasLocalEdits) {
			setMatches(sortedInitial);
		}
	}, [sortedInitial, hasLocalEdits]);

	const handleDragStart = (event: { active: { id: number } }) => {
		setActiveId(event.active.id);
	};

	const handleDragEnd = (event: {
		active: { id: number };
		over: { id: number } | null;
	}) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over || active.id === over.id) return;

		setMatches((items) => {
			const oldIndex = items.findIndex((i) => i.id === active.id);
			const newIndex = items.findIndex((i) => i.id === over.id);
			return arrayMove(items, oldIndex, newIndex);
		});
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const updates = matches.map((m, index) => ({
				id: m.id,
				displayOrder: index,
			}));

			await updateMatchOrder({ data: { updates } });
			toast.success(t("ordering.saved"));
			router.invalidate();
		} catch (e) {
			console.error("Failed to save order:", e);
			toast.error(t("ordering.saveError"));
		} finally {
			setIsSaving(false);
		}
	};

	const activeMatch = activeId ? matches.find((m) => m.id === activeId) : null;
	const activeIndex = activeMatch
		? matches.findIndex((m) => m.id === activeId)
		: -1;

	const dropAnimation: DropAnimation = {
		sideEffects: defaultDropAnimationSideEffects({
			styles: {
				active: {
					opacity: "0.5",
				},
			},
		}),
	};

	return (
		<div className="space-y-6">
			<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<ArrowUpDown
								className="h-5 w-5 shrink-0 text-black"
								strokeWidth={2.5}
							/>
							<h2 className="font-black font-display text-2xl text-black uppercase italic">
								{t("ordering.title")}
							</h2>
						</div>
						<p className="mt-1 font-body font-bold text-gray-500 text-sm tracking-wide">
							{t("ordering.subtitle")}
						</p>
					</div>
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || matches.length === 0}
						className="admin-press-comic flex h-10 w-full shrink-0 items-center justify-center gap-2 border-[3px] border-black bg-electric-lime px-6 font-black font-display text-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#bbe000] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:w-auto"
					>
						{isSaving ? (
							<InlineLoader size="sm" />
						) : (
							<Save className="h-4 w-4" strokeWidth={3} />
						)}
						{t("ordering.saveButton")}
					</button>
				</div>
			</div>

			{matches.length === 0 ? (
				<div className="border-[3px] border-black border-dashed bg-white px-6 py-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
					<ArrowUpDown
						className="mx-auto mb-3 h-8 w-8 text-gray-300"
						strokeWidth={2}
					/>
					<p className="font-black font-display text-gray-400 text-lg uppercase italic">
						{t("ordering.emptyTitle")}
					</p>
					<p className="mt-1 font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest">
						{t("ordering.emptyHint")}
					</p>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={matches.map((m) => m.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-3">
							{matches.map((match, index) => (
								<SortableMatchItem
									key={match.id}
									match={match}
									index={index}
									locale={locale}
								/>
							))}
						</div>
					</SortableContext>

					<DragOverlay dropAnimation={dropAnimation}>
						{activeMatch ? (
							<MatchItemCard
								match={activeMatch}
								index={activeIndex}
								isOverlay
								locale={locale}
							/>
						) : null}
					</DragOverlay>
				</DndContext>
			)}
		</div>
	);
}

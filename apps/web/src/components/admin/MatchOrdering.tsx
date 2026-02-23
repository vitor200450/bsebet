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
import { GripVertical, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "@/components/TournamentBracket";
import { updateMatchOrder } from "@/server/matches";

interface MatchOrderingProps {
	matches: Match[];
	tournamentId: number;
}

// 1. Extracted Card Component for reuse in Item and Overlay
function MatchItemCard({
	match,
	index,
	isOverlay,
	isDragging,
	dragListeners,
	dragAttributes,
}: {
	match: Match;
	index: number;
	isOverlay?: boolean;
	isDragging?: boolean;
	dragListeners?: any;
	dragAttributes?: any;
}) {
	return (
		<div
			className={`flex items-center gap-6 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-200 ${
				isOverlay
					? "z-50 rotate-1 scale-[1.03] cursor-grabbing shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
					: isDragging
						? "opacity-30"
						: "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
			}`}
		>
			<div
				{...dragAttributes}
				{...dragListeners}
				className="cursor-grab touch-none rounded p-2 text-black transition-colors hover:bg-gray-100 active:cursor-grabbing"
			>
				<GripVertical className="h-6 w-6 text-gray-400 transition-colors hover:text-black" />
			</div>

			<div className="w-16 flex-shrink-0 select-none text-center font-black text-3xl text-gray-300 italic">
				#{index + 1}
			</div>

			<div className="flex min-w-0 flex-grow items-center justify-between gap-8">
				{/* Match Info */}
				<div className="flex min-w-0 flex-grow select-none flex-col">
					<span className="break-words font-black text-black text-xl uppercase uppercase italic leading-[1.1]">
						{match.name || match.label || "TBD vs TBD"}
					</span>
					<div className="mt-1 flex items-center gap-2">
						<span className="font-black text-gray-500 text-xs uppercase">
							{new Date(match.startTime).toLocaleDateString()} •{" "}
							{new Date(match.startTime).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
						{match.status === "finished" && (
							<span className="bg-black px-1.5 py-0.5 font-black text-[10px] text-white uppercase leading-none">
								FINAL
							</span>
						)}
						{match.status === "live" && (
							<span className="animate-pulse bg-red-500 px-1.5 py-0.5 font-black text-[10px] text-white uppercase leading-none">
								LIVE
							</span>
						)}
					</div>
				</div>

				{/* Teams Display */}
				<div className="ml-auto flex w-[420px] flex-shrink-0 select-none items-center justify-center gap-4 rounded-xl border-2 border-black/5 bg-gray-50 px-4 py-2">
					{/* Team A */}
					<div className="flex w-[160px] items-center justify-end gap-3">
						<span className="truncate text-right font-bold text-black text-sm uppercase">
							{match.teamA?.name || match.labelTeamA || "?"}
						</span>
						<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white shadow-sm">
							{match.teamA?.logoUrl ? (
								<img
									src={match.teamA.logoUrl}
									alt="Team A"
									className="h-8 w-8 object-contain"
								/>
							) : (
								<div className="h-full w-full animate-pulse bg-gray-100" />
							)}
						</div>
					</div>

					<div className="flex w-[40px] flex-col items-center">
						<span className="font-black text-gray-300 text-xl italic leading-none">
							VS
						</span>
					</div>

					{/* Team B */}
					<div className="flex w-[160px] items-center justify-start gap-3">
						<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white shadow-sm">
							{match.teamB?.logoUrl ? (
								<img
									src={match.teamB.logoUrl}
									alt="Team B"
									className="h-8 w-8 object-contain"
								/>
							) : (
								<div className="h-full w-full animate-pulse bg-gray-100" />
							)}
						</div>
						<span className="truncate text-left font-bold text-black text-sm uppercase">
							{match.teamB?.name || match.labelTeamB || "?"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

// 2. Sortable Wrapper
function SortableMatchItem({ match, index }: { match: Match; index: number }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: match.id });

	const style = {
		// USE CSS.Translate instead of Transform for better performance (no layout shift artifacts)
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
			/>
		</div>
	);
}

export function MatchOrdering({ matches: initialMatches }: MatchOrderingProps) {
	const [matches, setMatches] = useState(initialMatches);
	const [activeId, setActiveId] = useState<number | null>(null); // Track active item
	const [isSaving, setIsSaving] = useState(false);
	const router = useRouter();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5, // Prevent accidental drags
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	useEffect(() => {
		setMatches(initialMatches);
	}, [initialMatches]);

	const handleDragStart = (event: any) => {
		setActiveId(event.active.id);
	};

	const handleDragEnd = (event: any) => {
		const { active, over } = event;
		setActiveId(null);

		if (active.id !== over.id) {
			setMatches((items) => {
				const oldIndex = items.findIndex((i) => i.id === active.id);
				const newIndex = items.findIndex((i) => i.id === over.id);
				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const updates = matches.map((m, index) => ({
				id: m.id,
				displayOrder: index,
			}));

			await updateMatchOrder({ data: { updates } });
			toast.success("Ordem salva com sucesso!");
			router.invalidate();
		} catch (e) {
			console.error("Failed to save order:", e);
			toast.error("Erro ao salvar ordem");
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
		<div className="space-y-4">
			<div className="flex items-center justify-between border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<div>
					<h3 className="font-black text-black text-lg uppercase italic">
						Ordenar Partidas
					</h3>
					<p className="font-bold text-gray-600 text-sm">
						Arraste para reordenar o carrossel
					</p>
				</div>
				<button
					onClick={handleSave}
					disabled={isSaving}
					className="flex items-center gap-2 border-2 border-black bg-brawl-yellow px-4 py-2 font-bold text-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#ffe600] hover:shadow-none disabled:opacity-50"
				>
					{isSaving ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Save className="h-4 w-4" />
					)}
					Salvar Ordem
				</button>
			</div>

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
					<div className="space-y-4">
						{matches.map((match, index) => (
							<SortableMatchItem key={match.id} match={match} index={index} />
						))}
					</div>
				</SortableContext>

				<DragOverlay dropAnimation={dropAnimation}>
					{activeMatch ? (
						<MatchItemCard match={activeMatch} index={activeIndex} isOverlay />
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}

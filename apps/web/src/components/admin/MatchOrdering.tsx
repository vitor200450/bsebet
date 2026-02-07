import { useState, useEffect } from "react";
import type { Match } from "@/components/TournamentBracket";
import { updateMatchOrder } from "@/server/matches";
import { toast } from "sonner";
import { Save, Loader2, GripVertical } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
      className={`flex items-center gap-6 bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-200 ${
        isOverlay
          ? "shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] scale-[1.03] rotate-1 cursor-grabbing z-50"
          : isDragging
            ? "opacity-30"
            : "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      }`}
    >
      <div
        {...dragAttributes}
        {...dragListeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded text-black transition-colors touch-none"
      >
        <GripVertical className="w-6 h-6 text-gray-400 hover:text-black transition-colors" />
      </div>

      <div className="font-black italic text-3xl text-gray-300 w-16 text-center select-none flex-shrink-0">
        #{index + 1}
      </div>

      <div className="flex-grow flex items-center justify-between gap-8 min-w-0">
        {/* Match Info */}
        <div className="flex flex-col flex-grow min-w-0 select-none">
          <span className="font-black uppercase text-black italic text-xl leading-[1.1] break-words uppercase">
            {match.name || match.label || "TBD vs TBD"}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-black text-gray-500 uppercase">
              {new Date(match.startTime).toLocaleDateString()} •{" "}
              {new Date(match.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {match.status === "finished" && (
              <span className="bg-black text-white text-[10px] font-black uppercase px-1.5 py-0.5 leading-none">
                FINAL
              </span>
            )}
            {match.status === "live" && (
              <span className="bg-red-500 text-white text-[10px] font-black uppercase px-1.5 py-0.5 leading-none animate-pulse">
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Teams Display */}
        <div className="flex items-center justify-center gap-4 bg-gray-50 px-4 py-2 border-2 border-black/5 rounded-xl ml-auto flex-shrink-0 w-[420px] select-none">
          {/* Team A */}
          <div className="flex items-center justify-end gap-3 w-[160px]">
            <span className="font-bold text-sm text-black uppercase truncate text-right">
              {match.teamA?.name || match.labelTeamA || "?"}
            </span>
            <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center rounded-lg shadow-sm flex-shrink-0">
              {match.teamA?.logoUrl ? (
                <img
                  src={match.teamA.logoUrl}
                  alt="Team A"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 animate-pulse" />
              )}
            </div>
          </div>

          <div className="flex flex-col items-center w-[40px]">
            <span className="font-black text-gray-300 italic text-xl leading-none">
              VS
            </span>
          </div>

          {/* Team B */}
          <div className="flex items-center justify-start gap-3 w-[160px]">
            <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center rounded-lg shadow-sm flex-shrink-0">
              {match.teamB?.logoUrl ? (
                <img
                  src={match.teamB.logoUrl}
                  alt="Team B"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 animate-pulse" />
              )}
            </div>
            <span className="font-bold text-sm text-black uppercase truncate text-left">
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
      <div className="flex justify-between items-center bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h3 className="font-black italic uppercase text-lg text-black">
            Ordenar Partidas
          </h3>
          <p className="text-sm text-gray-600 font-bold">
            Arraste para reordenar o carrossel
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-brawl-yellow hover:bg-[#ffe600] text-black px-4 py-2 font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
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

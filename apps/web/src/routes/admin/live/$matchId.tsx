import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { clsx } from "clsx";
import { X, RotateCcw, ChevronRight } from "lucide-react";
import * as React from "react";
import {
  getLiveMatch,
  incrementScore,
  resetScores,
  finalizeMatch,
} from "../../../server/matches";

export const Route = createFileRoute("/admin/live/$matchId")({
  loader: async ({ params }) => {
    const matchId = parseInt(params.matchId);
    const match = await getLiveMatch({ data: { matchId } });
    return { match };
  },
  component: LiveMatchControl,
});

function LiveMatchControl() {
  const { match: initialMatch } = Route.useLoaderData();
  const navigate = useNavigate();
  const [match, setMatch] = useState(initialMatch);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;

  const matchFormat = match.tournament?.format?.toLowerCase() || "";
  let bestOf = 5;
  if (matchFormat.includes("bo3")) bestOf = 3;
  else if (matchFormat.includes("bo5")) bestOf = 5;
  else if (matchFormat.includes("bo7")) bestOf = 7;

  const winsNeeded = Math.ceil(bestOf / 2);
  const isMatchPointA = scoreA === winsNeeded - 1;
  const isMatchPointB = scoreB === winsNeeded - 1;
  const winner = scoreA >= winsNeeded ? "A" : scoreB >= winsNeeded ? "B" : null;

  const handleIncrement = async (team: "A" | "B") => {
    if (isUpdating || winner) return;

    // Optimistic check
    if (team === "A" && scoreA >= winsNeeded) return;
    if (team === "B" && scoreB >= winsNeeded) return;

    setIsUpdating(true);

    try {
      const updated = await incrementScore({
        data: { matchId: match.id, team },
      });
      setMatch((prev) => ({ ...prev, ...updated }));
    } catch (error) {
      console.error("Error updating score:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const updated = await resetScores({ data: { matchId: match.id } });
      setMatch((prev) => ({ ...prev, ...updated }));
    } catch (error) {
      console.error("Error resetting scores:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalize = async () => {
    if (scoreA === scoreB) {
      alert("O placar está empatado. Defina um vencedor.");
      return;
    }

    const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
    if (!winnerId) {
      alert("Erro: Times não definidos");
      return;
    }

    try {
      await finalizeMatch({ data: { matchId: match.id, winnerId } });
      navigate({ to: "/admin/tournaments" });
    } catch (error) {
      console.error("Error finalizing match:", error);
    }
  };

  // Slider drag handling - Optimized with refs and single event binding
  const isDraggingRef = useRef(false);
  const sliderProgressRef = useRef(0);

  const updateSliderVisuals = (progress: number) => {
    setSliderProgress(progress);
  };

  const handleDragStart = (clientX: number) => {
    if (!sliderRef.current) return;
    isDraggingRef.current = true;
    setIsDragging(true); // Trigger render to show active state if needed
    updateProgress(clientX);
  };

  const updateProgress = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const progress = Math.min(
      100,
      Math.max(0, ((clientX - rect.left) / rect.width) * 100),
    );
    sliderProgressRef.current = progress;
    updateSliderVisuals(progress);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (sliderProgressRef.current >= 95) {
      setShowConfirmModal(true);
    }

    // Reset
    sliderProgressRef.current = 0;
    updateSliderVisuals(0);
  };

  // Global event listeners
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      updateProgress(e.clientX);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      updateProgress(e.touches[0].clientX);
    };

    const handleGlobalEnd = () => {
      handleDragEnd();
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalEnd);
    document.addEventListener("touchmove", handleGlobalTouchMove);
    document.addEventListener("touchend", handleGlobalEnd);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalEnd);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalEnd);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-body select-none">
      {/* Header */}
      <header className="bg-black border-b-[3px] border-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-brawl-red rounded-full animate-pulse" />
          <span className="text-white font-black uppercase text-sm tracking-widest">
            AO VIVO{" "}
            {bestOf > 1 && (
              <span className="text-gray-500 ml-1 text-[10px]">
                (Bo{bestOf})
              </span>
            )}
          </span>
        </div>

        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider truncate max-w-[50%] text-center">
          {match.name || match.label || "Partida"}
        </span>

        <button
          onClick={() => navigate({ to: "/admin/tournaments" })}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Winner Banner */}
      {winner && (
        <div className="bg-[#ccff00] text-black font-black uppercase text-center py-2 text-sm tracking-widest animate-in slide-in-from-top duration-300">
          VENCEDOR DEFINIDO!
        </div>
      )}

      {/* Scoreboard */}
      <div className="p-4">
        <div
          className={clsx(
            "bg-[#1a1a1a] border-[4px] border-black shadow-[6px_6px_0px_0px_#000] p-4 relative overflow-hidden transition-all duration-500",
            winner ? "shadow-[#ccff00]/20 border-[#ccff00]/50" : "",
          )}
        >
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between">
            {/* Team A */}
            <div
              className={clsx(
                "flex-1 text-center transition-opacity duration-300",
                winner && winner !== "A" ? "opacity-30" : "opacity-100",
              )}
            >
              <div className="text-brawl-blue font-black uppercase text-sm mb-1 truncate px-2">
                {match.teamA?.name || "Time A"}
              </div>
              <div className="text-white font-black text-6xl tabular-nums relative inline-block">
                {scoreA}
                {isMatchPointA && !winner && (
                  <div className="absolute -top-4 -right-6 text-[10px] bg-brawl-yellow text-black px-1.5 py-0.5 rounded-sm font-black rotate-12 animate-pulse">
                    MP
                  </div>
                )}
              </div>
            </div>

            {/* VS Separator */}
            <div className="w-12 h-12 bg-black border-[3px] border-gray-700 rounded-full flex items-center justify-center mx-2 flex-shrink-0">
              <span className="text-gray-400 font-black text-xs">VS</span>
            </div>

            {/* Team B */}
            <div
              className={clsx(
                "flex-1 text-center transition-opacity duration-300",
                winner && winner !== "B" ? "opacity-30" : "opacity-100",
              )}
            >
              <div className="text-brawl-red font-black uppercase text-sm mb-1 truncate px-2">
                {match.teamB?.name || "Time B"}
              </div>
              <div className="text-white font-black text-6xl tabular-nums relative inline-block">
                {scoreB}
                {isMatchPointB && !winner && (
                  <div className="absolute -top-4 -right-6 text-[10px] bg-brawl-yellow text-black px-1.5 py-0.5 rounded-sm font-black rotate-12 animate-pulse">
                    MP
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Buttons */}
      <div className="flex-1 flex gap-4 px-4 pb-4 min-h-[200px]">
        {/* Team A Button */}
        <button
          onClick={() => handleIncrement("A")}
          disabled={isUpdating || !!winner || scoreA >= winsNeeded}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-4 border-[4px] border-black shadow-[6px_6px_0px_0px_#000] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0px_0px_#000] relative overflow-hidden",
            isUpdating || !!winner || scoreA >= winsNeeded
              ? "opacity-30 grayscale cursor-not-allowed"
              : "",
          )}
          style={{
            background:
              "linear-gradient(180deg, #4a7fff 0%, #2e5cff 50%, #1a4ad4 100%)",
          }}
        >
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />

          <div className="relative z-10">
            {match.teamA?.logoUrl ? (
              <img
                src={match.teamA.logoUrl}
                alt={match.teamA.name}
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-2xl">A</span>
              </div>
            )}
          </div>

          <span className="relative z-10 text-white font-black text-4xl italic drop-shadow-lg">
            +1
          </span>
        </button>

        {/* Team B Button */}
        <button
          onClick={() => handleIncrement("B")}
          disabled={isUpdating || !!winner || scoreB >= winsNeeded}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-4 border-[4px] border-black shadow-[6px_6px_0px_0px_#000] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0px_0px_#000] relative overflow-hidden",
            isUpdating || !!winner || scoreB >= winsNeeded
              ? "opacity-30 grayscale cursor-not-allowed"
              : "",
          )}
          style={{
            background:
              "linear-gradient(180deg, #ff5a5a 0%, #ff2e2e 50%, #d41d1d 100%)",
          }}
        >
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />

          <div className="relative z-10">
            {match.teamB?.logoUrl ? (
              <img
                src={match.teamB.logoUrl}
                alt={match.teamB.name}
                className="w-16 h-16 object-contain drop-shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-2xl">B</span>
              </div>
            )}
          </div>

          <span className="relative z-10 text-white font-black text-4xl italic drop-shadow-lg">
            +1
          </span>
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-4 pb-8 space-y-4">
        {/* Reset Button */}
        <button
          onClick={handleReset}
          disabled={isUpdating || (scoreA === 0 && scoreB === 0)}
          className={clsx(
            "w-full py-3 border-[2px] border-gray-600 text-gray-400 font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all hover:border-white hover:text-white",
            (isUpdating || (scoreA === 0 && scoreB === 0)) &&
              "opacity-50 cursor-not-allowed",
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Resetar Placar
        </button>

        {/* Finalize Slider */}
        <div
          ref={sliderRef}
          className="relative h-14 bg-brawl-yellow border-[4px] border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Progress Fill */}
          <div
            className={clsx(
              "absolute inset-y-0 left-0 bg-black/20",
              isDragging ? "transition-none" : "transition-all duration-300",
            )}
            style={{ width: `${sliderProgress}%` }}
          />

          {/* Slider Thumb */}
          <div
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg",
              isDragging ? "transition-none" : "transition-all duration-300",
            )}
            style={{ left: `calc(${Math.max(5, sliderProgress)}% - 20px)` }}
          >
            <ChevronRight className="w-5 h-5 text-brawl-yellow" />
          </div>

          {/* Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-black font-black uppercase text-sm tracking-wider pl-8">
              Deslize para Finalizar
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border-[4px] border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-0 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-black p-4 text-center border-b-[3px] border-[#333]">
              <h2 className="text-white font-black text-2xl uppercase italic tracking-wider">
                FINALIZAR <span className="text-brawl-yellow">JOGO?</span>
              </h2>
            </div>

            <div className="p-8">
              <div className="bg-black/40 p-6 border-[2px] border-gray-700 relative">
                {/* Result Container */}
                <div className="flex items-center justify-between gap-4">
                  {/* Team A */}
                  <div className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                      {match.teamA?.logoUrl ? (
                        <img
                          src={match.teamA.logoUrl}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-2xl font-black text-gray-500">
                          A
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black uppercase text-gray-400 mb-1 max-w-[100px] truncate">
                        {match.teamA?.name}
                      </div>
                      <div
                        className={clsx(
                          "text-5xl font-black leading-none",
                          scoreA > scoreB ? "text-brawl-blue" : "text-gray-600",
                        )}
                      >
                        {scoreA}
                      </div>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-10 w-[2px] bg-gray-700" />
                    <span className="text-gray-500 font-black text-xs">VS</span>
                    <div className="h-10 w-[2px] bg-gray-700" />
                  </div>

                  {/* Team B */}
                  <div className="flex-1 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                      {match.teamB?.logoUrl ? (
                        <img
                          src={match.teamB.logoUrl}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-2xl font-black text-gray-500">
                          B
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-black uppercase text-gray-400 mb-1 max-w-[100px] truncate">
                        {match.teamB?.name}
                      </div>
                      <div
                        className={clsx(
                          "text-5xl font-black leading-none",
                          scoreB > scoreA ? "text-brawl-red" : "text-gray-600",
                        )}
                      >
                        {scoreB}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Winner Declaration */}
                <div className="mt-6 pt-6 border-t border-gray-700 text-center">
                  <div className="text-xs font-bold uppercase text-gray-500 mb-1">
                    VENCEDOR
                  </div>
                  <div
                    className={clsx(
                      "text-xl font-black uppercase tracking-widest",
                      scoreA > scoreB ? "text-brawl-blue" : "text-brawl-red",
                    )}
                  >
                    {scoreA > scoreB ? match.teamA?.name : match.teamB?.name}
                  </div>
                </div>
              </div>

              <div className="text-center mt-4 text-[10px] text-gray-500 font-mono">
                Esta ação não pode ser desfeita automaticamente.
              </div>
            </div>

            <div className="flex border-t-[3px] border-black">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 bg-[#2a2a2a] text-gray-400 font-bold uppercase hover:bg-[#333] hover:text-white transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalize}
                className="flex-1 py-4 bg-brawl-yellow text-black font-black uppercase hover:bg-white transition-all text-sm tracking-widest"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

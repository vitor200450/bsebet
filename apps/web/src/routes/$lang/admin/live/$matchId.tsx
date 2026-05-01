import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight, RotateCcw, X } from "lucide-react";
import * as React from "react";
import { useRef, useState } from "react";
import { useSetHeader } from "../../../components/HeaderContext";
import {
	finalizeMatch,
	getLiveMatch,
	incrementScore,
	resetScores,
} from "../../../server/matches";

export const Route = createFileRoute("/admin/live/$matchId")({
	loader: async ({ params }) => {
		const matchId = Number.parseInt(params.matchId);
		const match = await getLiveMatch({ data: { matchId } });
		return { match };
	},
	component: LiveMatchControl,
});

function LiveMatchControl() {
	const { match: initialMatch } = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [match, setMatch] = useState(initialMatch);
	const [isUpdating, setIsUpdating] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);
	const [sliderProgress, setSliderProgress] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const sliderRef = useRef<HTMLDivElement>(null);
	const [editingScoreTeam, setEditingScoreTeam] = useState<"A" | "B" | null>(
		null,
	);
	const [directScoreValue, setDirectScoreValue] = useState("");

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

	const handleDirectScoreSubmit = async (team: "A" | "B") => {
		const newScore = Number.parseInt(directScoreValue);
		if (isNaN(newScore)) {
			setEditingScoreTeam(null);
			return;
		}

		// Cap score at winsNeeded
		const cappedScore = Math.min(newScore, winsNeeded);

		setIsUpdating(true);
		setEditingScoreTeam(null);

		try {
			const { updateMatch } = await import("../../../server/matches");
			const updated = await updateMatch({
				data: {
					matchId: match.id,
					[team === "A" ? "scoreA" : "scoreB"]: cappedScore,
				},
			});
			setMatch((prev: any) => ({ ...prev, ...updated }));
			// Invalidate user points cache when score is updated
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
		} catch (error) {
			console.error("Error updating score directly:", error);
		} finally {
			setIsUpdating(false);
		}
	};

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
			setMatch((prev: any) => ({ ...prev, ...updated }));
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
			setMatch((prev: any) => ({ ...prev, ...updated }));
			// Invalidate user points cache when scores are reset
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
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
			// Invalidate user points cache when match is finalized
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			navigate({ to: "/admin/tournaments" });
		} catch (error) {
			console.error("Error finalizing match:", error);
		}
	};

	const handleClose = () => {
		// If match is live (has scores or status is live) and not finished -> confirm exit
		if (!winner && (scoreA > 0 || scoreB > 0 || match.status === "live")) {
			setShowCancelModal(true);
		} else {
			navigate({ to: "/admin/tournaments" });
		}
	};

	const headerConfig = React.useMemo(
		() => ({
			title: "AO VIVO",
			variant: "dark" as const,
			actions: (
				<div className="flex items-center gap-4">
					<span className="hidden font-bold text-[10px] text-gray-500 uppercase sm:inline">
						{match.name || match.label}
					</span>
					<button
						onClick={handleClose}
						className="flex h-10 w-10 items-center justify-center border-2 border-transparent text-gray-400 transition-colors hover:border-white/20 hover:text-white"
					>
						<X className="h-6 w-6" />
					</button>
				</div>
			),
		}),
		[match.name, match.label, handleClose],
	);

	useSetHeader(headerConfig);

	const handleDiscardMatch = async () => {
		try {
			// Reset scores and set status back to scheduled
			await resetScores({
				data: { matchId: match.id, status: "scheduled" },
			});
			// Invalidate user points cache when match is discarded/reset
			await queryClient.invalidateQueries({ queryKey: ["userPoints"] });
			navigate({ to: "/admin/tournaments" });
		} catch (error) {
			console.error("Error discarding match:", error);
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
		<div className="flex min-h-screen select-none flex-col bg-[#0a0a0a] font-body">
			<div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
				{/* Winner Banner */}

				{/* Winner Banner */}
				{winner && (
					<div className="slide-in-from-top animate-in bg-[#ccff00] py-2 text-center font-black text-black text-sm uppercase tracking-widest duration-300">
						VENCEDOR DEFINIDO!
					</div>
				)}

				{/* Scoreboard */}
				<div className="p-4">
					<div
						className={clsx(
							"relative overflow-hidden border-[4px] border-black bg-[#1a1a1a] p-4 shadow-[6px_6px_0px_0px_#000] transition-all duration-500",
							winner ? "border-[#ccff00]/50 shadow-[#ccff00]/20" : "",
						)}
					>
						{/* Glossy overlay */}
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />

						<div className="relative flex items-center justify-between">
							{/* Team A */}
							<div
								className={clsx(
									"flex-1 text-center transition-opacity duration-300",
									winner && winner !== "A" ? "opacity-30" : "opacity-100",
								)}
							>
								<div className="mb-1 truncate px-2 font-black text-brawl-blue text-sm uppercase">
									{match.teamA?.name || "Time A"}
								</div>
								{editingScoreTeam === "A" ? (
									<div className="zoom-in-95 flex animate-in flex-col items-center duration-200">
										<input
											autoFocus
											type="number"
											value={directScoreValue}
											onChange={(e) => setDirectScoreValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleDirectScoreSubmit("A");
												if (e.key === "Escape") setEditingScoreTeam(null);
											}}
											onBlur={() => handleDirectScoreSubmit("A")}
											className="w-16 border-brawl-blue border-b-4 bg-black text-center font-black text-3xl text-white tabular-nums focus:outline-none md:w-24 md:text-5xl"
										/>
									</div>
								) : (
									<div
										onClick={() => {
											if (!winner && !isUpdating) {
												setEditingScoreTeam("A");
												setDirectScoreValue(String(scoreA));
											}
										}}
										className={clsx(
											"relative inline-block cursor-pointer font-black text-4xl text-white tabular-nums transition-transform hover:scale-105 md:text-6xl",
											!winner && !isUpdating && "hover:text-brawl-blue",
										)}
									>
										{scoreA}
										{isMatchPointA && !winner && (
											<div className="absolute -top-4 -right-6 rotate-12 animate-pulse rounded-sm bg-brawl-yellow px-1.5 py-0.5 font-black text-[10px] text-black">
												MP
											</div>
										)}
									</div>
								)}
							</div>

							{/* VS Separator */}
							<div className="mx-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-gray-700 bg-black md:h-12 md:w-12">
								<span className="font-black text-[10px] text-gray-400 md:text-xs">
									VS
								</span>
							</div>

							{/* Team B */}
							<div
								className={clsx(
									"flex-1 text-center transition-opacity duration-300",
									winner && winner !== "B" ? "opacity-30" : "opacity-100",
								)}
							>
								<div className="mb-1 truncate px-2 font-black text-brawl-red text-xs uppercase md:text-sm">
									{match.teamB?.name || "Time B"}
								</div>
								{editingScoreTeam === "B" ? (
									<div className="zoom-in-95 flex animate-in flex-col items-center duration-200">
										<input
											autoFocus
											type="number"
											value={directScoreValue}
											onChange={(e) => setDirectScoreValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleDirectScoreSubmit("B");
												if (e.key === "Escape") setEditingScoreTeam(null);
											}}
											onBlur={() => handleDirectScoreSubmit("B")}
											className="w-16 border-brawl-red border-b-4 bg-black text-center font-black text-3xl text-white tabular-nums focus:outline-none md:w-24 md:text-5xl"
										/>
									</div>
								) : (
									<div
										onClick={() => {
											if (!winner && !isUpdating) {
												setEditingScoreTeam("B");
												setDirectScoreValue(String(scoreB));
											}
										}}
										className={clsx(
											"relative inline-block cursor-pointer font-black text-4xl text-white tabular-nums transition-transform hover:scale-105 md:text-6xl",
											!winner && !isUpdating && "hover:text-brawl-red",
										)}
									>
										{scoreB}
										{isMatchPointB && !winner && (
											<div className="absolute -top-4 -right-6 rotate-12 animate-pulse rounded-sm bg-brawl-yellow px-1.5 py-0.5 font-black text-[10px] text-black">
												MP
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Score Buttons */}
				<div className="flex min-h-[200px] flex-1 flex-col gap-4 px-4 pb-4 md:flex-row">
					{/* Team A Button */}
					<button
						onClick={() => handleIncrement("A")}
						disabled={isUpdating || !!winner || scoreA >= winsNeeded}
						className={clsx(
							"relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden border-[4px] border-black py-6 shadow-[6px_6px_0px_0px_#000] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0px_0px_#000] md:py-0",
							isUpdating || !!winner || scoreA >= winsNeeded
								? "cursor-not-allowed opacity-30 grayscale"
								: "",
						)}
						style={{
							background:
								"linear-gradient(180deg, #4a7fff 0%, #2e5cff 50%, #1a4ad4 100%)",
						}}
					>
						{/* Glossy overlay */}
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20" />

						<div className="relative z-10">
							{match.teamA?.logoUrl ? (
								<img
									src={match.teamA.logoUrl}
									alt={match.teamA.name}
									className="h-16 w-16 object-contain drop-shadow-lg"
								/>
							) : (
								<div className="flex h-16 w-16 items-center justify-center rounded-md bg-white/20">
									<span className="font-black text-2xl text-white">A</span>
								</div>
							)}
						</div>

						<span className="relative z-10 font-black text-4xl text-white italic drop-shadow-lg">
							+1
						</span>
					</button>

					{/* Team B Button */}
					<button
						onClick={() => handleIncrement("B")}
						disabled={isUpdating || !!winner || scoreB >= winsNeeded}
						className={clsx(
							"relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden border-[4px] border-black py-6 shadow-[6px_6px_0px_0px_#000] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0px_0px_#000] md:py-0",
							isUpdating || !!winner || scoreB >= winsNeeded
								? "cursor-not-allowed opacity-30 grayscale"
								: "",
						)}
						style={{
							background:
								"linear-gradient(180deg, #ff5a5a 0%, #ff2e2e 50%, #d41d1d 100%)",
						}}
					>
						{/* Glossy overlay */}
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20" />

						<div className="relative z-10">
							{match.teamB?.logoUrl ? (
								<img
									src={match.teamB.logoUrl}
									alt={match.teamB.name}
									className="h-16 w-16 object-contain drop-shadow-lg"
								/>
							) : (
								<div className="flex h-16 w-16 items-center justify-center rounded-md bg-white/20">
									<span className="font-black text-2xl text-white">B</span>
								</div>
							)}
						</div>

						<span className="relative z-10 font-black text-4xl text-white italic drop-shadow-lg">
							+1
						</span>
					</button>
				</div>

				{/* Action Bar */}
				<div className="space-y-4 p-4 pb-8">
					{/* Reset Button */}
					<button
						onClick={handleReset}
						disabled={isUpdating || (scoreA === 0 && scoreB === 0)}
						className={clsx(
							"flex w-full items-center justify-center gap-2 border-[2px] border-gray-600 py-3 font-bold text-gray-400 text-sm uppercase transition-all hover:border-white hover:text-white",
							(isUpdating || (scoreA === 0 && scoreB === 0)) &&
								"cursor-not-allowed opacity-50",
						)}
					>
						<RotateCcw className="h-4 w-4" />
						Resetar Placar
					</button>

					{/* Finalize Slider */}
					<div
						ref={sliderRef}
						className={clsx(
							"relative h-14 select-none overflow-hidden border-[4px] border-black shadow-[4px_4px_0px_0px_#000] transition-all",
							!winner
								? "cursor-not-allowed bg-gray-300 opacity-50 grayscale"
								: "cursor-pointer bg-brawl-yellow hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]",
						)}
						onMouseDown={!winner ? undefined : handleMouseDown}
						onTouchStart={!winner ? undefined : handleTouchStart}
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
								"absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black shadow-lg",
								isDragging ? "transition-none" : "transition-all duration-300",
								!winner ? "opacity-50" : "opacity-100",
							)}
							style={{ left: `calc(${Math.max(5, sliderProgress)}% - 20px)` }}
						>
							<ChevronRight
								className={clsx(
									"h-5 w-5",
									!winner ? "text-gray-500" : "text-brawl-yellow",
								)}
							/>
						</div>

						{/* Label */}
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							<span className="pl-8 font-black text-black text-sm uppercase tracking-wider">
								{!winner ? "DEFINA O VENCEDOR" : "DESLIZE PARA FINALIZAR"}
							</span>
						</div>
					</div>
				</div>

				{/* Confirmation Modal */}
				{showConfirmModal && (
					<div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 p-6 backdrop-blur-sm duration-200">
						<div className="zoom-in-95 w-full max-w-md animate-in overflow-hidden border-[4px] border-black bg-[#1a1a1a] p-0 shadow-[8px_8px_0px_0px_#000] duration-200">
							<div className="border-[#333] border-b-[3px] bg-black p-4 text-center">
								<h2 className="font-black text-2xl text-white uppercase italic tracking-wider">
									FINALIZAR <span className="text-brawl-yellow">JOGO?</span>
								</h2>
							</div>

							<div className="p-8">
								<div className="relative border-[2px] border-gray-700 bg-black/40 p-6">
									{/* Result Container */}
									<div className="flex items-center justify-between gap-4">
										{/* Team A */}
										<div className="flex flex-1 flex-col items-center gap-3">
											<div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border-2 border-gray-600 bg-gray-800">
												{match.teamA?.logoUrl ? (
													<img
														src={match.teamA.logoUrl}
														className="h-full w-full object-contain p-2"
													/>
												) : (
													<span className="font-black text-2xl text-gray-500">
														A
													</span>
												)}
											</div>
											<div className="text-center">
												<div className="mb-1 max-w-[100px] truncate font-black text-gray-400 text-xs uppercase">
													{match.teamA?.name}
												</div>
												<div
													className={clsx(
														"font-black text-5xl leading-none",
														scoreA > scoreB
															? "text-brawl-blue"
															: "text-gray-600",
													)}
												>
													{scoreA}
												</div>
											</div>
										</div>

										{/* VS */}
										<div className="flex flex-col items-center gap-1">
											<div className="h-10 w-[2px] bg-gray-700" />
											<span className="font-black text-gray-500 text-xs">
												VS
											</span>
											<div className="h-10 w-[2px] bg-gray-700" />
										</div>

										{/* Team B */}
										<div className="flex flex-1 flex-col items-center gap-3">
											<div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border-2 border-gray-600 bg-gray-800">
												{match.teamB?.logoUrl ? (
													<img
														src={match.teamB.logoUrl}
														className="h-full w-full object-contain p-2"
													/>
												) : (
													<span className="font-black text-2xl text-gray-500">
														B
													</span>
												)}
											</div>
											<div className="text-center">
												<div className="mb-1 max-w-[100px] truncate font-black text-gray-400 text-xs uppercase">
													{match.teamB?.name}
												</div>
												<div
													className={clsx(
														"font-black text-5xl leading-none",
														scoreB > scoreA
															? "text-brawl-red"
															: "text-gray-600",
													)}
												>
													{scoreB}
												</div>
											</div>
										</div>
									</div>

									{/* Winner Declaration */}
									<div className="mt-6 border-gray-700 border-t pt-6 text-center">
										<div className="mb-1 font-bold text-gray-500 text-xs uppercase">
											VENCEDOR
										</div>
										<div
											className={clsx(
												"font-black text-xl uppercase tracking-widest",
												scoreA > scoreB ? "text-brawl-blue" : "text-brawl-red",
											)}
										>
											{scoreA > scoreB ? match.teamA?.name : match.teamB?.name}
										</div>
									</div>
								</div>

								<div className="mt-4 text-center font-mono text-[10px] text-gray-500">
									Esta ação não pode ser desfeita automaticamente.
								</div>
							</div>

							<div className="flex border-black border-t-[3px]">
								<button
									onClick={() => setShowConfirmModal(false)}
									className="flex-1 bg-[#2a2a2a] py-4 font-bold text-gray-400 text-sm uppercase transition-all hover:bg-[#333] hover:text-white"
								>
									Cancelar
								</button>
								<button
									onClick={handleFinalize}
									className="flex-1 bg-brawl-yellow py-4 font-black text-black text-sm uppercase tracking-widest transition-all hover:bg-white"
								>
									Confirmar
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Cancel Match Modal */}
				{showCancelModal && (
					<div className="fade-in fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 p-6 backdrop-blur-sm duration-200">
						<div className="zoom-in-95 w-full max-w-md animate-in overflow-hidden border-[4px] border-black bg-[#1a1a1a] p-0 shadow-[8px_8px_0px_0px_#000] duration-200">
							<div className="border-[#333] border-b-[3px] bg-black p-4 text-center">
								<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 bg-red-900/30">
									<X className="h-6 w-6 text-red-500" />
								</div>
								<h2 className="font-black text-white text-xl uppercase italic tracking-wider">
									SAIR DA <span className="text-brawl-red">PARTIDA?</span>
								</h2>
							</div>

							<div className="p-6 text-center">
								<p className="mb-6 text-gray-400 text-sm leading-relaxed">
									Você começou a pontuar esta partida. O que deseja fazer com as
									alterações?
								</p>

								<div className="flex flex-col gap-3">
									<button
										onClick={() => navigate({ to: "/admin/tournaments" })}
										className="flex w-full items-center justify-center gap-2 border-2 border-gray-600 bg-[#333] py-3 font-bold text-sm text-white uppercase transition-all hover:border-gray-400 hover:bg-[#444]"
									>
										<span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
										Manter Partida Ao Vivo
									</button>
									<div className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">
										ou
									</div>
									<button
										onClick={handleDiscardMatch}
										className="w-full border-2 border-red-900/50 bg-red-500/10 py-3 font-bold text-red-500 text-sm uppercase transition-all hover:border-red-500 hover:bg-red-500 hover:text-white"
									>
										Descartar e Resetar Status
									</button>
								</div>
							</div>

							<div className="border-[#333] border-t-[3px] bg-black p-3">
								<button
									onClick={() => setShowCancelModal(false)}
									className="w-full py-3 font-bold text-gray-500 text-xs uppercase transition-all hover:text-white"
								>
									Cancelar e Voltar
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

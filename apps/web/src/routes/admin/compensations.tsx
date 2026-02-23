import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	AlertTriangle,
	Award,
	Check,
	History,
	Loader2,
	Search,
	Trophy,
	User,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { useSetHeader } from "@/components/HeaderContext";
import { getMatches } from "@/server/matches";
import {
	adjustUserPoints,
	getPointAdjustments,
	searchUsersForAdjustment,
} from "@/server/point-adjustments";
import { calculatePoints } from "@/server/scoring";
import { getTournament, getTournaments } from "@/server/tournaments";

export const Route = createFileRoute("/admin/compensations")({
	component: CompensationsPage,
	loader: async () => {
		const [tournaments, adjustments] = await Promise.all([
			getTournaments(),
			getPointAdjustments({ data: { limit: 20 } }),
		]);
		return { tournaments, adjustments };
	},
});

interface UserSearchResult {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

function CompensationsPage() {
	const { tournaments, adjustments: initialAdjustments } =
		Route.useLoaderData();
	const router = useRouter();

	const [selectedTournamentId, setSelectedTournamentId] = useState<number | "">(
		"",
	);
	const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(
		null,
	);
	const [selectedMatchId, setSelectedMatchId] = useState<number | "">("");
	const [predictedScoreA, setPredictedScoreA] = useState<string>("");
	const [predictedScoreB, setPredictedScoreB] = useState<string>("");
	const [calculatedPoints, setCalculatedPoints] = useState<number>(0);
	const [selectedMatchData, setSelectedMatchData] = useState<any>(null);
	const [tournamentRules, setTournamentRules] = useState<any>(null);
	const [tournamentStages, setTournamentStages] = useState<any[]>([]);
	const [reason, setReason] = useState<string>("");
	const [isRecoveryCompensation, setIsRecoveryCompensation] = useState(true);

	const [userSearchTerm, setUserSearchTerm] = useState("");
	const [userSearchResults, setUserSearchResults] = useState<
		UserSearchResult[]
	>([]);
	const [isSearchingUsers, setIsSearchingUsers] = useState(false);
	const [showUserDropdown, setShowUserDropdown] = useState(false);

	const [tournamentMatches, setTournamentMatches] = useState<
		{
			id: number;
			name: string | null;
			teamAName?: string;
			teamBName?: string;
			teamALogo?: string | null;
			teamBLogo?: string | null;
			scoreA?: number | null;
			scoreB?: number | null;
			winnerId?: number | null;
			underdogTeamId?: number | null;
			teamAId?: number | null;
			teamBId?: number | null;
			stageId?: string | null;
		}[]
	>([]);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [adjustments, setAdjustments] = useState(initialAdjustments);

	useSetHeader({
		title: "COMPENSAÇÃO DE PONTOS",
		actions: (
			<div className="flex items-center gap-2 text-gray-600 text-sm">
				<History className="h-4 w-4" />
				<span className="font-bold uppercase">
					{adjustments.length} ajustes realizados
				</span>
			</div>
		),
	});

	// Fetch matches and tournament rules when tournament changes
	useEffect(() => {
		if (selectedTournamentId) {
			Promise.all([
				getMatches({ data: { tournamentId: Number(selectedTournamentId) } }),
				getTournament({ data: Number(selectedTournamentId) }),
			])
				.then(([matches, tournament]) => {
					const formattedMatches = matches.map((m) => ({
						id: m.id,
						name: m.name || m.label,
						teamAName: m.teamA?.name,
						teamBName: m.teamB?.name,
						teamALogo: m.teamA?.logoUrl,
						teamBLogo: m.teamB?.logoUrl,
						scoreA: m.scoreA,
						scoreB: m.scoreB,
						winnerId: m.winnerId,
						underdogTeamId: m.underdogTeamId,
						teamAId: m.teamAId,
						teamBId: m.teamBId,
						stageId: m.stageId,
					}));
					setTournamentMatches(formattedMatches);
					setTournamentRules(tournament?.scoringRules || null);
					setTournamentStages(tournament?.stages || []);
				})
				.catch((error) => {
					console.error("Error fetching matches:", error);
					setTournamentMatches([]);
					setTournamentRules(null);
					setTournamentStages([]);
				});
		} else {
			setTournamentMatches([]);
			setTournamentRules(null);
			setTournamentStages([]);
		}
		// Reset selected match when tournament changes
		setSelectedMatchId("");
		setSelectedMatchData(null);
		setPredictedScoreA("");
		setPredictedScoreB("");
		setCalculatedPoints(0);
	}, [selectedTournamentId]);

	// Search users with debounce
	useEffect(() => {
		const timeout = setTimeout(async () => {
			if (userSearchTerm.length >= 2) {
				setIsSearchingUsers(true);
				try {
					const results = await searchUsersForAdjustment({
						data: userSearchTerm,
					});
					setUserSearchResults(results);
					setShowUserDropdown(true);
				} catch (error) {
					console.error("Error searching users:", error);
				} finally {
					setIsSearchingUsers(false);
				}
			} else {
				setUserSearchResults([]);
				setShowUserDropdown(false);
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [userSearchTerm]);

	// Update selected match data when match changes
	useEffect(() => {
		if (selectedMatchId) {
			const match = tournamentMatches.find(
				(m) => m.id === Number(selectedMatchId),
			);
			setSelectedMatchData(match || null);
		} else {
			setSelectedMatchData(null);
		}
	}, [selectedMatchId, tournamentMatches]);

	// Calculate points when scores or match changes
	useEffect(() => {
		if (
			selectedMatchData &&
			predictedScoreA !== "" &&
			predictedScoreB !== "" &&
			tournamentRules &&
			selectedMatchData.winnerId !== null &&
			selectedMatchData.scoreA !== null &&
			selectedMatchData.scoreB !== null
		) {
			// Determine predicted winner based on scores
			const scoreA = Number(predictedScoreA);
			const scoreB = Number(predictedScoreB);
			let predictedWinnerId: number | null = null;

			if (scoreA > scoreB) {
				predictedWinnerId = selectedMatchData.teamAId;
			} else if (scoreB > scoreA) {
				predictedWinnerId = selectedMatchData.teamBId;
			}
			// If tie, no winner (shouldn't happen in esports)

			if (predictedWinnerId !== null) {
				const result = calculatePoints(
					{
						predictedWinnerId,
						predictedScoreA: scoreA,
						predictedScoreB: scoreB,
					},
					{
						winnerId: selectedMatchData.winnerId,
						scoreA: selectedMatchData.scoreA,
						scoreB: selectedMatchData.scoreB,
						underdogId: selectedMatchData.underdogTeamId,
					},
					tournamentRules,
				);
				setCalculatedPoints(result.points);
			} else {
				setCalculatedPoints(0);
			}
		} else {
			setCalculatedPoints(0);
		}
	}, [predictedScoreA, predictedScoreB, selectedMatchData, tournamentRules]);

	const handleSelectUser = (user: UserSearchResult) => {
		setSelectedUser(user);
		setUserSearchTerm("");
		setShowUserDropdown(false);
	};

	const handleClearUser = () => {
		setSelectedUser(null);
		setUserSearchTerm("");
	};

	const matchType = useMemo(() => {
		if (!selectedMatchData?.stageId || tournamentStages.length === 0)
			return null;
		const stage = tournamentStages.find(
			(s) => s.id === selectedMatchData.stageId,
		);
		return (stage?.settings?.matchType as "Bo1" | "Bo3" | "Bo5" | null) ?? null;
	}, [selectedMatchData, tournamentStages]);

	const maxWins = useMemo(() => {
		if (matchType === "Bo1") return 1;
		if (matchType === "Bo3") return 2;
		if (matchType === "Bo5") return 3;
		return null; // unknown format — no limit enforced
	}, [matchType]);

	const isScoreValid = useMemo(() => {
		if (predictedScoreA === "" || predictedScoreB === "") return false;
		const a = Number(predictedScoreA);
		const b = Number(predictedScoreB);
		if (a < 0 || b < 0) return false;
		if (maxWins === null) return a !== b; // no format info — just require a winner
		// Neither score can exceed maxWins
		if (a > maxWins || b > maxWins) return false;
		// Exactly one score must equal maxWins (the winner)
		if (a !== maxWins && b !== maxWins) return false;
		// Both cannot be maxWins
		if (a === maxWins && b === maxWins) return false;
		return true;
	}, [predictedScoreA, predictedScoreB, maxWins]);

	const handleScoreChange = (value: string, set: (v: string) => void) => {
		if (value === "") {
			set("");
			return;
		}
		const num = Math.max(0, Number.parseInt(value, 10));
		if (isNaN(num)) {
			set("");
			return;
		}
		const clamped = maxWins !== null ? Math.min(num, maxWins) : num;
		set(String(clamped));
	};

	const isValid = useMemo(() => {
		return (
			selectedTournamentId !== "" &&
			selectedUser !== null &&
			isScoreValid &&
			calculatedPoints > 0 &&
			reason.length >= 10
		);
	}, [
		selectedTournamentId,
		selectedUser,
		isScoreValid,
		calculatedPoints,
		reason,
	]);

	const handleSubmit = async () => {
		if (!isValid) return;
		setShowConfirmModal(true);
	};

	const confirmAdjustment = async () => {
		setIsSubmitting(true);
		try {
			const result = await adjustUserPoints({
				data: {
					userId: selectedUser!.id,
					tournamentId: Number(selectedTournamentId),
					matchId: selectedMatchId ? Number(selectedMatchId) : undefined,
					points: calculatedPoints,
					reason,
					isRecoveryCompensation,
				},
			});

			toast.success(
				`Compensação de ${calculatedPoints} pontos aplicada para ${result.userName}!`,
				{
					description: `Motivo: ${reason}`,
				},
			);

			// Reset form
			setSelectedUser(null);
			setPredictedScoreA("");
			setPredictedScoreB("");
			setCalculatedPoints(0);
			setSelectedMatchData(null);
			setReason("");
			setSelectedMatchId("");
			setIsRecoveryCompensation(true);
			setShowConfirmModal(false);

			// Refresh adjustments list
			const newAdjustments = await getPointAdjustments({ data: { limit: 20 } });
			setAdjustments(newAdjustments);

			router.invalidate();
		} catch (error: any) {
			toast.error(error.message || "Erro ao aplicar compensação");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans">
			<div className="mx-auto max-w-[1600px] px-6 py-8">
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* LEFT COLUMN - Form */}
					<div className="space-y-6">
						{/* Header */}
						<div className="border-[4px] border-black bg-[#ccff00] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
							<h1 className="font-black text-2xl text-black uppercase italic tracking-tighter">
								Nova Compensação
							</h1>
							<p className="mt-1 font-bold text-black/70 text-sm">
								Ajuste manual de pontos para usuários afetados por bugs no
								recovery bets
							</p>
						</div>

						{/* Form Card */}
						<div className="space-y-6 border-[4px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]">
							{/* Tournament Selector */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-black text-black text-xs uppercase">
									<Trophy className="h-4 w-4" />
									Torneio
								</label>
								<CustomSelect
									label=""
									value={
										selectedTournamentId ? String(selectedTournamentId) : ""
									}
									onChange={(val) =>
										setSelectedTournamentId(val ? Number(val) : "")
									}
									placeholder="Selecione um torneio..."
									options={[
										{ value: "", label: "Selecione um torneio..." },
										...tournaments.map((t) => ({
											value: String(t.id),
											label: t.name,
										})),
									]}
								/>
							</div>

							{/* User Search */}
							<div className="relative">
								<label className="mb-2 ml-1 block flex items-center gap-2 font-black text-black text-xs uppercase">
									<User className="h-4 w-4" />
									Usuário
								</label>

								{selectedUser ? (
									<div className="flex items-center gap-3 border-[3px] border-black bg-gray-50 p-3">
										{selectedUser.image ? (
											<img
												src={selectedUser.image}
												alt={selectedUser.name}
												className="h-16 w-16 rounded-lg border-[3px] border-black object-cover"
											/>
										) : (
											<div className="flex h-16 w-16 items-center justify-center rounded-lg border-[3px] border-black bg-gray-200">
												<User className="h-5 w-5 text-gray-500" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate font-black text-black">
												{selectedUser.name}
											</p>
											<p className="truncate font-mono text-gray-500 text-xs">
												{selectedUser.email}
											</p>
										</div>
										<button
											onClick={handleClearUser}
											className="border-2 border-black bg-white p-2 transition-colors hover:bg-red-50"
										>
											<X className="h-4 w-4 text-red-500" />
										</button>
									</div>
								) : (
									<div className="relative">
										<Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
										<input
											type="text"
											placeholder="Buscar usuário por nome ou email..."
											value={userSearchTerm}
											onChange={(e) => setUserSearchTerm(e.target.value)}
											className="w-full border-[3px] border-black p-3 pl-10 font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
										/>
										{isSearchingUsers && (
											<Loader2 className="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 animate-spin text-gray-400" />
										)}

										{/* Dropdown Results */}
										{showUserDropdown && userSearchResults.length > 0 && (
											<div className="absolute top-full right-0 left-0 z-50 mt-2 max-h-60 overflow-auto border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
												{userSearchResults.map((user) => (
													<button
														key={user.id}
														onClick={() => handleSelectUser(user)}
														className="flex w-full items-center gap-3 border-gray-100 border-b-2 p-3 text-left transition-colors last:border-b-0 hover:bg-[#ccff00]/20"
													>
														{user.image ? (
															<img
																src={user.image}
																alt={user.name}
																className="h-8 w-8 rounded-full border-2 border-black object-cover"
															/>
														) : (
															<div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-gray-200">
																<User className="h-4 w-4 text-gray-500" />
															</div>
														)}
														<div className="min-w-0 flex-1">
															<p className="truncate font-bold text-black text-sm">
																{user.name}
															</p>
															<p className="truncate font-mono text-gray-500 text-xs">
																{user.email}
															</p>
														</div>
													</button>
												))}
											</div>
										)}

										{showUserDropdown &&
											userSearchTerm.length >= 2 &&
											userSearchResults.length === 0 &&
											!isSearchingUsers && (
												<div className="absolute top-full right-0 left-0 z-50 mt-2 border-[3px] border-black bg-white p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
													<p className="font-bold text-gray-500 text-sm">
														Nenhum usuário encontrado
													</p>
												</div>
											)}
									</div>
								)}
							</div>

							{/* Match Selector (Optional) */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-black text-black text-xs uppercase">
									<Trophy className="h-4 w-4" />
									Partida Afetada{" "}
									<span className="font-normal text-gray-500">(opcional)</span>
								</label>
								<CustomSelect
									key={`match-select-${selectedTournamentId}-${tournamentMatches.length}`}
									label=""
									value={selectedMatchId ? String(selectedMatchId) : ""}
									onChange={(val) => setSelectedMatchId(val ? Number(val) : "")}
									placeholder={
										selectedTournamentId
											? "Selecione uma partida..."
											: "Selecione um torneio primeiro"
									}
									options={[
										{
											value: "",
											label: selectedTournamentId
												? "Selecione uma partida..."
												: "Selecione um torneio primeiro",
										},
										...tournamentMatches.map((m) => ({
											value: String(m.id),
											label: `${m.name || `Partida #${m.id}`}${m.teamAName && m.teamBName ? ` - ${m.teamAName} vs ${m.teamBName}` : ""}`,
										})),
									]}
								/>
							</div>

							{/* Score Inputs */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-black text-black text-xs uppercase">
									<Award className="h-4 w-4" />
									Placar da Aposta (Score)
								</label>
								<div className="flex gap-3">
									<div className="flex flex-1 flex-col items-center gap-2">
										<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-[3px] border-black bg-white p-1">
											{selectedMatchData?.teamALogo ? (
												<img
													src={selectedMatchData.teamALogo}
													alt={selectedMatchData?.teamAName || "Time A"}
													className="h-full w-full object-contain"
												/>
											) : (
												<span className="font-bold text-gray-500 text-lg">
													A
												</span>
											)}
										</div>
										<label className="w-full text-center font-bold text-[10px] text-gray-500 uppercase leading-tight">
											{selectedMatchData?.teamAName || "Time A"}
										</label>
										<input
											type="number"
											min="0"
											max="10"
											value={predictedScoreA}
											onChange={(e) => setPredictedScoreA(e.target.value)}
											placeholder="0"
											className="w-full border-[3px] border-black p-3 text-center font-bold text-black text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
										/>
									</div>
									<span className="mb-3 self-end font-black text-gray-400 text-xl">
										×
									</span>
									<div className="flex flex-1 flex-col items-center gap-2">
										<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-[3px] border-black bg-white p-1">
											{selectedMatchData?.teamBLogo ? (
												<img
													src={selectedMatchData.teamBLogo}
													alt={selectedMatchData?.teamBName || "Time B"}
													className="h-full w-full object-contain"
												/>
											) : (
												<span className="font-bold text-gray-500 text-lg">
													B
												</span>
											)}
										</div>
										<label className="w-full text-center font-bold text-[10px] text-gray-500 uppercase leading-tight">
											{selectedMatchData?.teamBName || "Time B"}
										</label>
										<input
											type="number"
											min="0"
											max="10"
											value={predictedScoreB}
											onChange={(e) => setPredictedScoreB(e.target.value)}
											placeholder="0"
											className="w-full border-[3px] border-black p-3 text-center font-bold text-black text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
										/>
									</div>
								</div>
							</div>

							{/* Points Preview */}
							{calculatedPoints > 0 && (
								<div className="border-[#ccff00] border-[3px] bg-[#ccff00]/10 p-4">
									<div className="flex items-center justify-between">
										<span className="font-bold text-black text-sm">
											Pontos Calculados:
										</span>
										<span className="font-black text-2xl text-black">
											+{calculatedPoints}
										</span>
									</div>
									<p className="mt-1 text-gray-600 text-xs">
										Baseado no placar informado e no resultado real da partida
									</p>
								</div>
							)}
							{selectedMatchData &&
								(selectedMatchData?.scoreA === null ||
									selectedMatchData?.scoreB === null) && (
									<div className="border-2 border-yellow-300 bg-yellow-50 p-3">
										<p className="font-bold text-sm text-yellow-800">
											⚠️ Partida sem resultado final
										</p>
										<p className="text-xs text-yellow-700">
											Selecione uma partida finalizada para calcular os pontos
											automaticamente.
										</p>
									</div>
								)}

							{/* Recovery Compensation Flag */}
							<div className="flex items-center gap-3 border-2 border-yellow-200 bg-yellow-50 p-3">
								<input
									type="checkbox"
									id="isRecovery"
									checked={isRecoveryCompensation}
									onChange={(e) => setIsRecoveryCompensation(e.target.checked)}
									className="h-5 w-5 rounded-none border-2 border-black accent-[#ccff00]"
								/>
								<label
									htmlFor="isRecovery"
									className="cursor-pointer font-bold text-black text-sm"
								>
									Compensação por bug em recovery bet
								</label>
							</div>

							{/* Reason Textarea */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-black text-black text-xs uppercase">
									<AlertTriangle className="h-4 w-4" />
									Justificativa{" "}
									<span className="font-normal text-gray-500">
										(mín. 10 caracteres)
									</span>
								</label>
								<textarea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="Descreva o motivo da compensação (ex: Bug recovery bet - usuário não conseguiu apostar na final após acertar semifinal)"
									rows={4}
									className="w-full resize-none border-[3px] border-black p-3 font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
								/>
							</div>

							{/* Warning Box */}
							<div className="flex items-start gap-3 border-[3px] border-red-500 bg-red-50 p-4">
								<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
								<div>
									<p className="font-bold text-red-700 text-sm">
										Esta ação será registrada e é irreversível
									</p>
									<p className="mt-1 text-red-600 text-xs">
										O ajuste será auditado com seu ID de administrador, data e
										justificativa. Use com responsabilidade.
									</p>
								</div>
							</div>

							{/* Submit Button */}
							<button
								onClick={handleSubmit}
								disabled={!isValid || isSubmitting}
								className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#ccff00] py-4 font-black text-black text-lg uppercase italic shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-[#bbe000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-5 w-5 animate-spin" />
										Aplicando...
									</>
								) : (
									<>
										<Check className="h-5 w-5" />
										Confirmar Compensação
									</>
								)}
							</button>
						</div>
					</div>

					{/* RIGHT COLUMN - History */}
					<div className="space-y-6">
						<div className="border-[4px] border-black bg-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]">
							<h2 className="flex items-center gap-2 font-black text-white text-xl uppercase italic tracking-tighter">
								<History className="h-5 w-5" />
								Histórico de Ajustes
							</h2>
						</div>

						<div className="overflow-hidden border-[4px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]">
							{adjustments.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black border-dashed bg-gray-200">
										<History className="h-8 w-8 text-gray-400" />
									</div>
									<span className="font-black text-gray-400 text-lg uppercase italic">
										Nenhum ajuste realizado
									</span>
								</div>
							) : (
								<div className="divide-y-[3px] divide-black">
									{adjustments.map((adj) => (
										<div
											key={adj.id}
											className="p-4 transition-colors hover:bg-gray-50"
										>
											<div className="flex items-start gap-3">
												<div
													className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-black font-black text-lg ${
														adj.points >= 0
															? "bg-[#ccff00] text-black"
															: "bg-[#ff2e2e] text-white"
													}`}
												>
													{adj.points >= 0 ? "+" : ""}
													{adj.points}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="truncate font-black text-black">
															{adj.userName}
														</span>
														{adj.isRecoveryCompensation && (
															<span className="border border-yellow-300 bg-yellow-100 px-2 py-0.5 font-bold text-[10px] text-yellow-800 uppercase">
																Recovery
															</span>
														)}
													</div>
													<p className="font-mono text-gray-500 text-xs">
														{adj.tournamentName}
													</p>
													<p className="mt-1 line-clamp-2 font-medium text-gray-700 text-sm">
														{adj.reason}
													</p>
													<div className="mt-2 flex items-center gap-3 text-gray-400 text-xs">
														<span className="font-mono">
															{new Date(adj.createdAt).toLocaleDateString(
																"pt-BR",
															)}
														</span>
														<span>•</span>
														<span>por {adj.adminName}</span>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Confirmation Modal */}
			{showConfirmModal && (
				<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="zoom-in-95 w-full max-w-md transform animate-in overflow-hidden border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] duration-200">
						<div className="flex items-center gap-3 border-black border-b-[4px] bg-[#ccff00] p-4">
							<div className="border-[3px] border-black bg-white p-1">
								<AlertTriangle className="h-6 w-6 stroke-[3px] text-black" />
							</div>
							<h3 className="font-black text-2xl text-black uppercase italic tracking-tighter">
								Confirmar Ajuste
							</h3>
						</div>

						<div className="space-y-4 p-6">
							<div className="space-y-2 border-2 border-black bg-gray-50 p-4">
								<div className="flex justify-between">
									<span className="text-gray-500 text-sm">Usuário:</span>
									<span className="font-bold text-black">
										{selectedUser?.name}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500 text-sm">Torneio:</span>
									<span className="font-bold text-black">
										{
											tournaments.find(
												(t) => t.id === Number(selectedTournamentId),
											)?.name
										}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500 text-sm">
										Placar Informado:
									</span>
									<span className="font-bold text-black">
										{predictedScoreA} × {predictedScoreB}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-500 text-sm">
										Pontos Calculados:
									</span>
									<span
										className={`font-black text-lg ${
											calculatedPoints >= 0 ? "text-green-600" : "text-red-600"
										}`}
									>
										{calculatedPoints >= 0 ? "+" : ""}
										{calculatedPoints}
									</span>
								</div>
							</div>

							<div>
								<span className="text-gray-500 text-sm">Justificativa:</span>
								<p className="mt-1 border border-gray-200 bg-gray-50 p-3 font-medium text-black text-sm">
									{reason}
								</p>
							</div>

							<div className="rounded border-2 border-yellow-200 bg-yellow-50 p-3 font-bold text-sm text-yellow-800">
								Esta ação não pode ser desfeita. O ajuste será registrado no
								histórico de auditoria.
							</div>

							<div className="flex flex-col gap-3 pt-2">
								<button
									onClick={confirmAdjustment}
									disabled={isSubmitting}
									className="flex w-full items-center justify-center gap-2 border-[4px] border-black bg-[#ccff00] py-4 font-black text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
								>
									{isSubmitting ? (
										<Loader2 className="h-6 w-6 animate-spin" />
									) : (
										"Confirmar Compensação"
									)}
								</button>
								<button
									onClick={() => setShowConfirmModal(false)}
									disabled={isSubmitting}
									className="w-full border-[3px] border-black bg-white py-3 font-black text-black uppercase transition-colors hover:bg-gray-100"
								>
									Cancelar
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

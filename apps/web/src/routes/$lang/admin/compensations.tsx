import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	AlertTriangle,
	Award,
	Check,
	History,
	Trophy,
	User,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import {
	CustomAsyncSearch,
	CustomSelect,
} from "@/components/admin/CustomInputs";
import { useSetHeader } from "@/components/HeaderContext";
import { InlineLoader } from "@/components/inline-loader";
import { getMatches } from "@/server/matches";
import {
	adjustUserPoints,
	getPointAdjustments,
	searchUsersForAdjustment,
} from "@/server/point-adjustments";
import { calculatePoints } from "@/server/scoring";
import { getTournament, getTournaments } from "@/server/tournaments";

export const Route = createFileRoute("/$lang/admin/compensations")({
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
	const { t } = useTranslation("admin");
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
		title: t("compensations.title"),
		actions: (
			<div className="flex h-11 items-center gap-2 border-[3px] border-black bg-white px-4 font-body font-bold text-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
				<History className="h-4 w-4 shrink-0" strokeWidth={3} />
				<span className="pr-0.5">
					{t("compensations.adjustmentCount", { count: adjustments.length })}
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
				t("compensations.applied", {
					points: calculatedPoints,
					userName: result.userName,
				}),
				{
					description: t("compensations.reasonDescription", { reason }),
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
			toast.error(error.message || t("compensations.applyError"));
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
								{t("compensations.new")}
							</h1>
							<p className="mt-1 font-bold text-black/70 text-sm">
								{t("compensations.description")}
							</p>
						</div>

						{/* Form Card */}
						<div className="space-y-6 border-[4px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]">
							{/* Tournament Selector */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-body font-bold text-black text-xs uppercase tracking-widest">
									<Trophy className="h-4 w-4" />
									{t("compensations.tournament")}
								</label>
								<CustomSelect
									value={
										selectedTournamentId ? String(selectedTournamentId) : ""
									}
									onChange={(val) =>
										setSelectedTournamentId(val ? Number(val) : "")
									}
									placeholder={t("compensations.selectTournament")}
									options={[
										{ value: "", label: t("compensations.selectTournament") },
										...tournaments.map((tournament) => ({
											value: String(tournament.id),
											label: tournament.name,
										})),
									]}
								/>
							</div>

							{/* User Search */}
							<div className="relative">
								<label className="mb-2 ml-1 block flex items-center gap-2 font-body font-bold text-black text-xs uppercase tracking-widest">
									<User className="h-4 w-4" />
									{t("compensations.user")}
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
									<CustomAsyncSearch
										query={userSearchTerm}
										onQueryChange={setUserSearchTerm}
										results={userSearchResults.map((user) => ({
											id: user.id,
											title: user.name,
											subtitle: user.email,
											imageUrl: user.image,
										}))}
										isLoading={isSearchingUsers}
										open={showUserDropdown}
										onOpenChange={setShowUserDropdown}
										onSelect={(item) => {
											const user = userSearchResults.find(
												(entry) => entry.id === item.id,
											);
											if (user) handleSelectUser(user);
										}}
										placeholder={t("compensations.searchUser")}
										emptyMessage={t("compensations.noUserFound")}
										renderLeading={(item) =>
											item.imageUrl ? (
												<img
													src={item.imageUrl}
													alt=""
													className="size-8 shrink-0 rounded-full border-2 border-black object-cover"
												/>
											) : (
												<div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-gray-200">
													<User className="h-4 w-4 text-gray-500" />
												</div>
											)
										}
									/>
								)}
							</div>

							{/* Match Selector (Optional) */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-body font-bold text-black text-xs uppercase tracking-widest">
									<Trophy className="h-4 w-4" />
									{t("compensations.affectedMatch")}{" "}
									<span className="font-normal text-gray-500">
										{t("compensations.optional")}
									</span>
								</label>
								<CustomSelect
									key={`match-select-${selectedTournamentId}-${tournamentMatches.length}`}
									value={selectedMatchId ? String(selectedMatchId) : ""}
									onChange={(val) => setSelectedMatchId(val ? Number(val) : "")}
									placeholder={
										selectedTournamentId
											? t("compensations.selectMatch")
											: t("compensations.selectTournamentFirst")
									}
									options={[
										{
											value: "",
											label: selectedTournamentId
												? t("compensations.selectMatch")
												: t("compensations.selectTournamentFirst"),
										},
										...tournamentMatches.map((m) => ({
											value: String(m.id),
											label: `${m.name || `${t("compensations.matchLabel")} #${m.id}`}${m.teamAName && m.teamBName ? ` - ${m.teamAName} vs ${m.teamBName}` : ""}`,
										})),
									]}
								/>
							</div>

							{/* Score Inputs */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-body font-bold text-black text-xs uppercase tracking-widest">
									<Award className="h-4 w-4" />
									{t("compensations.betScore")}
								</label>
								<div className="flex gap-3">
									<div className="flex flex-1 flex-col items-center gap-2">
										<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-[3px] border-black bg-white p-1">
											{selectedMatchData?.teamALogo ? (
												<img
													src={selectedMatchData.teamALogo}
													alt={
														selectedMatchData?.teamAName ||
														t("compensations.teamAFallback")
													}
													className="h-full w-full object-contain"
												/>
											) : (
												<span className="font-bold text-gray-500 text-lg">
													A
												</span>
											)}
										</div>
										<label className="w-full text-center font-body font-bold text-[10px] text-gray-500 uppercase leading-tight tracking-widest">
											{selectedMatchData?.teamAName ||
												t("compensations.teamAFallback")}
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
													alt={
														selectedMatchData?.teamBName ||
														t("compensations.teamBFallback")
													}
													className="h-full w-full object-contain"
												/>
											) : (
												<span className="font-bold text-gray-500 text-lg">
													B
												</span>
											)}
										</div>
										<label className="w-full text-center font-body font-bold text-[10px] text-gray-500 uppercase leading-tight tracking-widest">
											{selectedMatchData?.teamBName ||
												t("compensations.teamBFallback")}
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
											{t("compensations.calculatedPoints")}
										</span>
										<span className="font-black text-2xl text-black">
											+{calculatedPoints}
										</span>
									</div>
									<p className="mt-1 text-gray-600 text-xs">
										{t("compensations.pointsExplanation")}
									</p>
								</div>
							)}
							{selectedMatchData &&
								(selectedMatchData?.scoreA === null ||
									selectedMatchData?.scoreB === null) && (
									<div className="border-2 border-yellow-300 bg-yellow-50 p-3">
										<p className="font-bold text-sm text-yellow-800">
											⚠️ {t("compensations.noResultTitle")}
										</p>
										<p className="text-xs text-yellow-700">
											{t("compensations.noResultDescription")}
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
									{t("compensations.recoveryLabel")}
								</label>
							</div>

							{/* Reason Textarea */}
							<div>
								<label className="mb-2 ml-1 block flex items-center gap-2 font-body font-bold text-black text-xs uppercase tracking-widest">
									<AlertTriangle className="h-4 w-4" />
									{t("compensations.reason")}{" "}
									<span className="font-normal text-gray-500">
										{t("compensations.minCharacters")}
									</span>
								</label>
								<textarea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder={t("compensations.reasonPlaceholder")}
									rows={4}
									className="w-full resize-none border-[3px] border-black p-3 font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
								/>
							</div>

							{/* Warning Box */}
							<div className="flex items-start gap-3 border-[3px] border-red-500 bg-red-50 p-4">
								<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
								<div>
									<p className="font-bold text-red-700 text-sm">
										{t("compensations.irreversibleWarning")}
									</p>
									<p className="mt-1 text-red-600 text-xs">
										{t("compensations.irreversibleDescription")}
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
										<InlineLoader size="md" />
										{t("compensations.applying")}
									</>
								) : (
									<>
										<Check className="h-5 w-5" />
										{t("compensations.confirm")}
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
								{t("compensations.history")}
							</h2>
						</div>

						<div className="overflow-hidden border-[4px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]">
							{adjustments.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black border-dashed bg-gray-200">
										<History className="h-8 w-8 text-gray-400" />
									</div>
									<span className="font-black text-gray-400 text-lg uppercase italic">
										{t("compensations.noAdjustments")}
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
															<span className="border border-yellow-300 bg-yellow-100 px-2 py-0.5 font-body font-bold text-[10px] text-yellow-800 uppercase tracking-widest">
																{t("compensations.recovery")}
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
														<span>
															{t("compensations.by", {
																adminName: adj.adminName,
															})}
														</span>
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

			<ConfirmationModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={confirmAdjustment}
				title={t("compensations.confirmAdjustment")}
				confirmLabel={t("compensations.confirm")}
				cancelLabel={t("common:actions.cancel")}
				isLoading={isSubmitting}
				variant="success"
			>
				<div className="space-y-4">
					<div className="space-y-2 border-2 border-black bg-paper p-4">
						<div className="flex justify-between gap-3">
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("compensations.userLabel")}
							</span>
							<span className="font-black font-display text-black text-sm uppercase italic">
								{selectedUser?.name}
							</span>
						</div>
						<div className="flex justify-between gap-3">
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("compensations.tournamentLabel")}
							</span>
							<span className="text-right font-black font-display text-black text-sm uppercase italic">
								{
									tournaments.find(
										(item) => item.id === Number(selectedTournamentId),
									)?.name
								}
							</span>
						</div>
						<div className="flex justify-between gap-3">
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("compensations.informedScore")}
							</span>
							<span className="font-body font-bold text-black tabular-nums">
								{predictedScoreA} × {predictedScoreB}
							</span>
						</div>
						<div className="flex justify-between gap-3">
							<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("compensations.calculatedPointsLabel")}
							</span>
							<span
								className={`font-black font-display text-lg tabular-nums ${
									calculatedPoints >= 0 ? "text-green-600" : "text-brawl-red"
								}`}
							>
								{calculatedPoints >= 0 ? "+" : ""}
								{calculatedPoints}
							</span>
						</div>
					</div>

					<div>
						<span className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
							{t("compensations.reasonLabel")}
						</span>
						<p className="mt-1 border-2 border-black bg-paper p-3 font-body font-bold text-black text-sm">
							{reason}
						</p>
					</div>

					<div className="border-2 border-brawl-yellow bg-brawl-yellow/20 p-3 font-body font-bold text-ink text-sm">
						{t("compensations.irreversible")}
					</div>
				</div>
			</ConfirmationModal>
		</div>
	);
}

import { useRouter } from "@tanstack/react-router";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	createMatchDay,
	deleteMatchDay,
	updateMatchDay,
} from "@/server/match-days";
import { CustomDatePicker, CustomSelect } from "./CustomInputs";

interface MatchDay {
	id: number;
	label: string;
	date: Date;
	status: "draft" | "open" | "locked" | "finished";
	matches: any[];
}

export function MatchDaysManager({
	tournamentId,
	matchDays,
	tournamentStartDate,
	tournamentEndDate,
}: {
	tournamentId: number;
	matchDays: MatchDay[];
	tournamentStartDate?: Date | null;
	tournamentEndDate?: Date | null;
}) {
	const router = useRouter();
	const [isCreating, setIsCreating] = useState(false);
	const [newDayLabel, setNewDayLabel] = useState("");
	const [newDayDate, setNewDayDate] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [editDate, setEditDate] = useState("");
	const [editStatus, setEditStatus] = useState<MatchDay["status"]>("draft");

	const handleCreate = async () => {
		if (!newDayLabel || !newDayDate) return;
		setIsCreating(true);
		try {
			await createMatchDay({
				data: {
					tournamentId,
					label: newDayLabel,
					date: `${newDayDate}T12:00:00`,
					status: "draft",
				},
			});
			toast.success("Dia criado com sucesso!");
			setNewDayLabel("");
			setNewDayDate("");
			router.invalidate();
		} catch (e) {
			toast.error("Erro ao criar dia.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("Tem certeza? Isso vai desvincular as partidas deste dia."))
			return;
		try {
			await deleteMatchDay({ data: id });
			toast.success("Dia excluído.");
			router.invalidate();
		} catch (e) {
			toast.error("Erro ao excluir dia.");
		}
	};

	const startEditing = (day: MatchDay) => {
		setEditingId(day.id);
		setEditLabel(day.label);
		setEditDate(new Date(day.date).toISOString().split("T")[0]);
		setEditStatus(day.status);
	};

	const cancelEditing = () => {
		setEditingId(null);
		setEditLabel("");
		setEditDate("");
		setEditStatus("draft");
	};

	const handleUpdate = async (id: number) => {
		if (!editLabel || !editDate) return;
		try {
			await updateMatchDay({
				data: {
					id,
					label: editLabel,
					date: `${editDate}T12:00:00`,
					status: editStatus,
				},
			});
			toast.success("Match day atualizado!");
			cancelEditing();
			router.invalidate();
		} catch (e) {
			toast.error("Erro ao atualizar match day.");
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "draft":
				return "bg-gray-200 text-gray-500 border-gray-400";
			case "open":
				return "bg-[#ccff00] text-black border-black";
			case "locked":
				return "bg-[#ff2e2e] text-white border-black";
			case "finished":
				return "bg-black text-white border-black";
			default:
				return "bg-white text-black border-black";
		}
	};

	return (
		<div className="space-y-6">
			{/* Info Box */}
			<div className="border-[3px] border-blue-300 bg-blue-50 p-4">
				<div className="flex items-start gap-3">
					<span className="text-2xl">ℹ️</span>
					<div>
						<p className="font-bold text-blue-900 text-sm">
							O <strong>status do Match Day</strong> controla automaticamente as
							apostas:
						</p>
						<ul className="mt-2 ml-4 space-y-1 text-blue-800 text-xs">
							<li>
								• <strong>Open</strong> = Apostas abertas para todas as partidas
							</li>
							<li>
								• <strong>Locked</strong> = Apostas fechadas (partidas em
								andamento)
							</li>
							<li>
								• <strong>Finished</strong> = Dia finalizado
							</li>
							<li>
								• <strong>Draft</strong> = Ainda não disponível
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Create New Day */}
			<div className="border-[4px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
				<h3 className="mb-4 font-black text-black text-xl uppercase italic">
					Novo Dia de Jogo
				</h3>
				<div className="flex items-end gap-4">
					<div className="flex-1">
						<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
							Nome do Dia (Ex: Dia 1 - Grupos)
						</label>
						<input
							type="text"
							value={newDayLabel}
							onChange={(e) => setNewDayLabel(e.target.value)}
							className="w-full border-[3px] border-black p-2 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
							placeholder="Digite o nome..."
						/>
					</div>
					<div className="w-48">
						<CustomDatePicker
							label="Data"
							value={newDayDate}
							onChange={setNewDayDate}
							minDate={
								tournamentStartDate
									? new Date(tournamentStartDate).toISOString().split("T")[0]
									: undefined
							}
							maxDate={
								tournamentEndDate
									? new Date(tournamentEndDate).toISOString().split("T")[0]
									: undefined
							}
						/>
					</div>
					<button
						onClick={handleCreate}
						disabled={isCreating || !newDayLabel || !newDayDate}
						className="flex h-[46px] items-center gap-2 border-[3px] border-black bg-black px-6 py-2 font-black text-sm text-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] transition-all hover:bg-[#ccff00] hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isCreating ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<Plus className="h-5 w-5" strokeWidth={3} />
						)}
						Criar
					</button>
				</div>
			</div>

			{/* List Days */}
			<div className="space-y-4">
				{matchDays.map((day) => {
					const isEditing = editingId === day.id;

					return (
						<div
							key={day.id}
							className="border-[3px] border-black bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
						>
							{isEditing ? (
								// EDIT MODE
								<div className="space-y-4">
									<div className="flex items-end gap-4">
										<div className="flex-1">
											<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
												Nome do Dia
											</label>
											<input
												type="text"
												value={editLabel}
												onChange={(e) => setEditLabel(e.target.value)}
												className="w-full border-[3px] border-black p-2 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
											/>
										</div>
										<div className="w-48">
											<CustomDatePicker
												label="Data"
												value={editDate}
												onChange={setEditDate}
												minDate={
													tournamentStartDate
														? new Date(tournamentStartDate)
																.toISOString()
																.split("T")[0]
														: undefined
												}
												maxDate={
													tournamentEndDate
														? new Date(tournamentEndDate)
																.toISOString()
																.split("T")[0]
														: undefined
												}
											/>
										</div>
										<div className="w-48">
											<CustomSelect
												label="Status"
												value={editStatus}
												onChange={(val) =>
													setEditStatus(val as MatchDay["status"])
												}
												options={[
													{ value: "draft", label: "Draft" },
													{ value: "open", label: "Open (Apostas Ativas)" },
													{
														value: "locked",
														label: "Locked (Apostas Fechadas)",
													},
													{ value: "finished", label: "Finished" },
												]}
												placeholder="Selecione..."
											/>
										</div>
									</div>
									<div className="flex justify-end gap-2">
										<button
											onClick={cancelEditing}
											className="flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2 font-black text-black text-sm uppercase transition-all hover:bg-gray-100"
										>
											<X className="h-4 w-4" strokeWidth={3} />
											Cancelar
										</button>
										<button
											onClick={() => handleUpdate(day.id)}
											disabled={!editLabel || !editDate}
											className="flex items-center gap-2 border-[3px] border-black bg-black px-4 py-2 font-black text-sm text-white uppercase transition-all hover:bg-[#ccff00] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Check className="h-4 w-4" strokeWidth={3} />
											Salvar
										</button>
									</div>
								</div>
							) : (
								// VIEW MODE
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4">
										<div className="skew-x-[-10deg] transform bg-black px-3 py-1 font-black text-lg text-white uppercase italic">
											{new Date(day.date).toLocaleDateString([], {
												day: "2-digit",
												month: "2-digit",
											})}
										</div>
										<div>
											<h4 className="font-black text-black text-lg uppercase leading-none">
												{day.label}
											</h4>
											<div className="mt-1 flex items-center gap-2">
												<span
													className={`rounded-full border-2 px-2 py-0.5 font-bold text-[10px] uppercase ${getStatusColor(
														day.status,
													)}`}
												>
													{day.status}
												</span>
												<span className="font-bold text-gray-400 text-xs">
													{day.matches.length} partidas
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2">
										{/* Betting Status Indicator - Based on Match Day Status */}
										<div className="mr-2 flex flex-col items-end">
											{day.status === "open" ? (
												<span className="border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0px_0px_#000]">
													APOSTAS ABERTAS
												</span>
											) : day.status === "locked" ? (
												<span className="border border-black bg-[#ff2e2e] px-1.5 py-0.5 font-black text-[9px] text-white uppercase">
													APOSTAS FECHADAS
												</span>
											) : day.status === "finished" ? (
												<span className="border border-black bg-black px-1.5 py-0.5 font-black text-[9px] text-white uppercase">
													FINALIZADO
												</span>
											) : (
												<span className="border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-black text-[9px] text-gray-400 uppercase">
													RASCUNHO
												</span>
											)}
										</div>

										<button
											onClick={() => startEditing(day)}
											className="border-2 border-black p-2 text-black transition-colors hover:bg-[#ccff00]"
											title="Editar Match Day"
										>
											<Pencil className="h-5 w-5" />
										</button>

										<button
											onClick={() => handleDelete(day.id)}
											className="p-2 text-gray-300 transition-colors hover:text-[#ff2e2e]"
										>
											<Trash2 className="h-5 w-5" />
										</button>
									</div>
								</div>
							)}
						</div>
					);
				})}
				{matchDays.length === 0 && (
					<div className="py-12 text-center font-bold text-gray-400 uppercase">
						Nenhum dia criado.
					</div>
				)}
			</div>
		</div>
	);
}

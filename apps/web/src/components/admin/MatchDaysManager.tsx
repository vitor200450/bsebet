import { useRouter } from "@tanstack/react-router";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation("admin-matches");
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
			toast.success(t("matchDays.created"));
			setNewDayLabel("");
			setNewDayDate("");
			router.invalidate();
		} catch (e) {
			toast.error(t("matchDays.createError"));
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm(t("matchDays.deleteConfirm"))) return;
		try {
			await deleteMatchDay({ data: id });
			toast.success(t("matchDays.deleted"));
			router.invalidate();
		} catch (e) {
			toast.error(t("matchDays.deleteError"));
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
			toast.success(t("matchDays.updated"));
			cancelEditing();
			router.invalidate();
		} catch (e) {
			toast.error(t("matchDays.updateError"));
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

	const getStatusLabel = (status: string) => {
		const labels: Record<string, string> = {
			draft: t("matchDays.statusDraft"),
			open: t("matchDays.statusOpen"),
			locked: t("matchDays.statusLocked"),
			finished: t("matchDays.statusFinished"),
		};
		return labels[status] || status;
	};

	return (
		<div className="space-y-6">
			{/* Info Box */}
			<div className="border-[3px] border-blue-300 bg-blue-50 p-4">
				<div className="flex items-start gap-3">
					<span className="text-2xl">ℹ️</span>
					<div>
						<p className="font-bold text-blue-900 text-sm">
							{t("matchDays.infoTitle")}
						</p>
						<ul className="mt-2 ml-4 space-y-1 text-blue-800 text-xs">
							<li>
								• <strong>Open</strong> = {t("matchDays.infoOpen")}
							</li>
							<li>
								• <strong>Locked</strong> = {t("matchDays.infoLocked")}
							</li>
							<li>
								• <strong>Finished</strong> = {t("matchDays.infoFinished")}
							</li>
							<li>
								• <strong>Draft</strong> = {t("matchDays.draft")}
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Create New Day */}
			<div className="border-[4px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
				<h3 className="mb-4 font-black text-black text-xl uppercase italic">
					{t("matchDays.newDay")}
				</h3>
				<div className="flex items-end gap-4">
					<div className="flex-1">
						<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
							{t("matchDays.nameLabel")}
						</label>
						<input
							type="text"
							value={newDayLabel}
							onChange={(e) => setNewDayLabel(e.target.value)}
							className="w-full border-[3px] border-black p-2 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
							placeholder={t("matchDays.namePlaceholder")}
						/>
					</div>
					<div className="w-48">
						<CustomDatePicker
							label={t("matchDays.dateLabel")}
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
						{t("matchDays.create")}
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
												{t("matchDays.editNameLabel")}
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
												label={t("matchDays.dateLabel")}
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
												label={t("matchDays.statusLabel")}
												value={editStatus}
												onChange={(val) =>
													setEditStatus(val as MatchDay["status"])
												}
												options={[
													{ value: "draft", label: t("matchDays.statusDraft") },
													{ value: "open", label: t("matchDays.statusOpen") },
													{
														value: "locked",
														label: t("matchDays.statusLocked"),
													},
													{
														value: "finished",
														label: t("matchDays.statusFinished"),
													},
												]}
												placeholder={t("matchDays.selectPlaceholder")}
											/>
										</div>
									</div>
									<div className="flex justify-end gap-2">
										<button
											onClick={cancelEditing}
											className="flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2 font-black text-black text-sm uppercase transition-all hover:bg-gray-100"
										>
											<X className="h-4 w-4" strokeWidth={3} />
											{t("matchDays.cancel")}
										</button>
										<button
											onClick={() => handleUpdate(day.id)}
											disabled={!editLabel || !editDate}
											className="flex items-center gap-2 border-[3px] border-black bg-black px-4 py-2 font-black text-sm text-white uppercase transition-all hover:bg-[#ccff00] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Check className="h-4 w-4" strokeWidth={3} />
											{t("matchDays.save")}
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
													{getStatusLabel(day.status)}
												</span>
												<span className="font-bold text-gray-400 text-xs">
													{t("matchDays.matchCount", {
														count: day.matches.length,
													})}
												</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2">
										{/* Betting Status Indicator - Based on Match Day Status */}
										<div className="mr-2 flex flex-col items-end">
											{day.status === "open" ? (
												<span className="border border-black bg-[#ccff00] px-1.5 py-0.5 font-black text-[9px] text-black uppercase shadow-[1px_1px_0px_0px_#000]">
													{t("matchDays.betsOpenBadge")}
												</span>
											) : day.status === "locked" ? (
												<span className="border border-black bg-[#ff2e2e] px-1.5 py-0.5 font-black text-[9px] text-white uppercase">
													{t("matchDays.betsClosedBadge")}
												</span>
											) : day.status === "finished" ? (
												<span className="border border-black bg-black px-1.5 py-0.5 font-black text-[9px] text-white uppercase">
													{t("matchDays.finishedBadge")}
												</span>
											) : (
												<span className="border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-black text-[9px] text-gray-400 uppercase">
													{t("matchDays.draftBadge")}
												</span>
											)}
										</div>

										<button
											onClick={() => startEditing(day)}
											className="border-2 border-black p-2 text-black transition-colors hover:bg-[#ccff00]"
											title={t("matchDays.editTitle")}
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
						{t("matchDays.noDays")}
					</div>
				)}
			</div>
		</div>
	);
}

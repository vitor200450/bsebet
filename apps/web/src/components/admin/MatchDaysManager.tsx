import { useRouter } from "@tanstack/react-router";
import { CalendarDays, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { InlineLoader } from "@/components/inline-loader";
import {
	createMatchDay,
	deleteMatchDay,
	updateMatchDay,
} from "@/server/match-days";
import { ConfirmationModal } from "./ConfirmationModal";
import { CustomDatePicker, CustomSelect } from "./CustomInputs";

interface MatchDay {
	id: number;
	label: string;
	date: Date;
	status: "draft" | "open" | "locked" | "finished";
	matches: any[];
}

const fieldLabelClass =
	"mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase leading-tight tracking-widest";

const textInputClass =
	"h-10 w-full border-[3px] border-black bg-white px-2.5 font-body font-bold text-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-2 focus:ring-electric-lime";

const selectTriggerClass =
	"h-10 min-h-10 px-2.5 font-display text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]";

type MatchDayStatus = MatchDay["status"];

const STATUS_STYLES: Record<
	MatchDayStatus,
	{ pill: string; accent: string; card: string }
> = {
	draft: {
		pill: "border-2 border-black bg-gray-200 text-gray-600",
		accent: "bg-gray-300",
		card: "border-l-gray-300",
	},
	open: {
		pill: "border-2 border-black bg-electric-lime text-black shadow-[2px_2px_0px_0px_#000]",
		accent: "bg-electric-lime",
		card: "border-l-electric-lime",
	},
	locked: {
		pill: "border-2 border-black bg-brawl-red text-white shadow-[2px_2px_0px_0px_#000]",
		accent: "bg-brawl-red",
		card: "border-l-brawl-red",
	},
	finished: {
		pill: "border-2 border-black bg-black text-white shadow-[2px_2px_0px_0px_#000]",
		accent: "bg-black",
		card: "border-l-black",
	},
};

const STATUS_ORDER: MatchDayStatus[] = ["draft", "open", "locked", "finished"];

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
	const { t, i18n } = useTranslation("admin-matches");
	const router = useRouter();
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const [isCreating, setIsCreating] = useState(false);
	const [newDayLabel, setNewDayLabel] = useState("");
	const [newDayDate, setNewDayDate] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [editDate, setEditDate] = useState("");
	const [editStatus, setEditStatus] = useState<MatchDayStatus>("draft");
	const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const minDate = tournamentStartDate
		? new Date(tournamentStartDate).toISOString().split("T")[0]
		: undefined;
	const maxDate = tournamentEndDate
		? new Date(tournamentEndDate).toISOString().split("T")[0]
		: undefined;

	const statusOptions = [
		{ value: "draft", label: t("matchDays.statusDraft") },
		{ value: "open", label: t("matchDays.statusOpen") },
		{ value: "locked", label: t("matchDays.statusLocked") },
		{ value: "finished", label: t("matchDays.statusFinished") },
	];

	const getStatusLabel = (status: MatchDayStatus) => {
		const labels: Record<MatchDayStatus, string> = {
			draft: t("matchDays.statusDraft"),
			open: t("matchDays.statusOpen"),
			locked: t("matchDays.statusLocked"),
			finished: t("matchDays.statusFinished"),
		};
		return labels[status];
	};

	const getInfoDescription = (status: MatchDayStatus) => {
		const descriptions: Record<MatchDayStatus, string> = {
			draft: t("matchDays.infoDraft"),
			open: t("matchDays.infoOpen"),
			locked: t("matchDays.infoLocked"),
			finished: t("matchDays.infoFinished"),
		};
		return descriptions[status];
	};

	const formatDayDate = (date: Date) =>
		new Date(date).toLocaleDateString(locale, {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

	const formatShortDate = (date: Date) =>
		new Date(date).toLocaleDateString(locale, {
			day: "2-digit",
			month: "2-digit",
		});

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
		} catch {
			toast.error(t("matchDays.createError"));
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = async (id: number) => {
		setIsDeleting(true);
		try {
			await deleteMatchDay({ data: id });
			toast.success(t("matchDays.deleted"));
			setDeleteTargetId(null);
			router.invalidate();
		} catch {
			toast.error(t("matchDays.deleteError"));
		} finally {
			setIsDeleting(false);
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
		} catch {
			toast.error(t("matchDays.updateError"));
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="border-[4px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<h2 className="font-black font-display text-2xl text-black uppercase italic">
					{t("matchDays.title")}
				</h2>
				<p className="mt-1 font-body font-bold text-gray-500 text-sm tracking-wide">
					{t("matchDays.subtitle")}
				</p>
			</div>

			{/* Status legend */}
			<div className="border-[3px] border-black bg-gray-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<p className="mb-3 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
					{t("matchDays.infoTitle")}
				</p>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{STATUS_ORDER.map((status) => (
						<div
							key={status}
							className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
						>
							<span
								className={`inline-block px-2 py-0.5 font-body font-bold text-[10px] uppercase tracking-widest ${STATUS_STYLES[status].pill}`}
							>
								{getStatusLabel(status)}
							</span>
							<p className="mt-2 font-body font-bold text-gray-600 text-xs leading-snug">
								{getInfoDescription(status)}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Create form */}
			<div className="border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
				<div className="mb-4 flex items-center gap-2">
					<Plus className="h-4 w-4 text-black" strokeWidth={3} />
					<h3 className="font-black font-display text-black text-lg uppercase italic">
						{t("matchDays.newDay")}
					</h3>
				</div>
				<div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_auto]">
					<div className="min-w-0">
						<label className={fieldLabelClass}>
							{t("matchDays.nameLabel")}
						</label>
						<input
							type="text"
							value={newDayLabel}
							onChange={(e) => setNewDayLabel(e.target.value)}
							className={textInputClass}
							placeholder={t("matchDays.namePlaceholder")}
						/>
					</div>
					<div className="min-w-0">
						<CustomDatePicker
							label={t("matchDays.dateLabel")}
							value={newDayDate}
							onChange={setNewDayDate}
							minDate={minDate}
							maxDate={maxDate}
						/>
					</div>
					<button
						type="button"
						onClick={handleCreate}
						disabled={isCreating || !newDayLabel || !newDayDate}
						className="admin-press-comic flex h-10 w-full items-center justify-center gap-2 border-[3px] border-black bg-electric-lime px-6 font-black font-display text-black text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#bbe000] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 md:w-auto"
					>
						{isCreating ? (
							<InlineLoader size="md" />
						) : (
							<Plus className="h-4 w-4" strokeWidth={3} />
						)}
						{t("matchDays.create")}
					</button>
				</div>
			</div>

			{/* List */}
			<div className="space-y-3">
				{matchDays.map((day) => {
					const isEditing = editingId === day.id;
					const styles = STATUS_STYLES[day.status];

					return (
						<div
							key={day.id}
							className={`admin-card-interactive admin-card-shadow-hover group border-[3px] border-black border-l-[6px] bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${styles.card}`}
						>
							{isEditing ? (
								<div className="space-y-4 p-4">
									<div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,14rem)]">
										<div className="min-w-0">
											<label className={fieldLabelClass}>
												{t("matchDays.editNameLabel")}
											</label>
											<input
												type="text"
												value={editLabel}
												onChange={(e) => setEditLabel(e.target.value)}
												className={textInputClass}
											/>
										</div>
										<div className="min-w-0">
											<CustomDatePicker
												label={t("matchDays.dateLabel")}
												value={editDate}
												onChange={setEditDate}
												minDate={minDate}
												maxDate={maxDate}
											/>
										</div>
										<div className="min-w-0">
											<CustomSelect
												label={t("matchDays.statusLabel")}
												value={editStatus}
												onChange={(val) => setEditStatus(val as MatchDayStatus)}
												options={statusOptions}
												placeholder={t("matchDays.selectPlaceholder")}
												triggerClassName={selectTriggerClass}
											/>
										</div>
									</div>
									<div className="flex flex-wrap justify-end gap-2">
										<button
											type="button"
											onClick={cancelEditing}
											className="admin-press-comic flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2 font-black font-display text-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100"
										>
											<X className="h-4 w-4" strokeWidth={3} />
											{t("matchDays.cancel")}
										</button>
										<button
											type="button"
											onClick={() => handleUpdate(day.id)}
											disabled={!editLabel || !editDate}
											className="admin-press-comic flex items-center gap-2 border-[3px] border-black bg-black px-4 py-2 font-black font-display text-white text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-electric-lime hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Check className="h-4 w-4" strokeWidth={3} />
											{t("matchDays.save")}
										</button>
									</div>
								</div>
							) : (
								<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex min-w-0 items-start gap-4">
										<div className="-skew-x-6 border-2 border-black bg-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
											<span className="block skew-x-6 font-black font-display text-lg text-white uppercase italic tabular-nums leading-none">
												{formatShortDate(day.date)}
											</span>
										</div>
										<div className="min-w-0">
											<h4 className="truncate font-black font-display text-black text-lg uppercase italic leading-tight">
												{day.label}
											</h4>
											<div className="mt-1.5 flex flex-wrap items-center gap-2">
												<span
													className={`px-2 py-0.5 font-body font-bold text-[10px] uppercase tracking-widest ${styles.pill}`}
												>
													{getStatusLabel(day.status)}
												</span>
												<span className="flex items-center gap-1 font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest">
													<CalendarDays className="h-3 w-3" strokeWidth={2.5} />
													{formatDayDate(day.date)}
												</span>
												<span className="font-body font-bold text-[10px] text-gray-400 uppercase tabular-nums tracking-widest">
													{t("matchDays.matchCount", {
														count: day.matches.length,
													})}
												</span>
											</div>
										</div>
									</div>

									<div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
										<button
											type="button"
											onClick={() => startEditing(day)}
											className="admin-press-comic border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-electric-lime"
											title={t("matchDays.editTitle")}
										>
											<Pencil className="h-4 w-4" strokeWidth={2.5} />
										</button>
										<button
											type="button"
											onClick={() => setDeleteTargetId(day.id)}
											className="admin-press-comic border-2 border-black bg-white p-2 text-gray-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brawl-red hover:text-white"
											title={t("common:actions.delete")}
										>
											<Trash2 className="h-4 w-4" strokeWidth={2.5} />
										</button>
									</div>
								</div>
							)}
						</div>
					);
				})}

				{matchDays.length === 0 && (
					<div className="border-[3px] border-black border-dashed bg-white px-6 py-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
						<CalendarDays
							className="mx-auto mb-3 h-8 w-8 text-gray-300"
							strokeWidth={2}
						/>
						<p className="font-black font-display text-gray-400 text-lg uppercase italic">
							{t("matchDays.noDays")}
						</p>
						<p className="mt-1 font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest">
							{t("matchDays.emptyHint")}
						</p>
					</div>
				)}
			</div>

			<ConfirmationModal
				isOpen={deleteTargetId !== null}
				onClose={() => setDeleteTargetId(null)}
				onConfirm={() => {
					if (deleteTargetId !== null) {
						void handleDelete(deleteTargetId);
					}
				}}
				title={t("common:actions.delete")}
				description={t("matchDays.deleteConfirm")}
				variant="danger"
				isLoading={isDeleting}
				confirmLabel={t("common:actions.delete")}
				cancelLabel={t("common:actions.cancel")}
			/>
		</div>
	);
}

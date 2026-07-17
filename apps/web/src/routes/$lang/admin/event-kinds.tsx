import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Archive, Edit2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AdminFormActions,
	AdminFormModal,
} from "@/components/admin/AdminFormModal";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { type Stage, StageBuilder } from "@/components/admin/StageBuilder";
import { useSetHeader } from "@/components/HeaderContext";
import {
	DEFAULT_SCORING_RULES,
	PRESENTATION_THEMES,
	type PresentationTheme,
} from "@/server/event-kind-template";
import {
	archiveEventKind,
	deleteEventKind,
	getAllEventKinds,
	restoreEventKind,
	saveEventKind,
} from "@/server/event-kinds";

export const Route = createFileRoute("/$lang/admin/event-kinds")({
	component: AdminEventKindsPage,
	loader: () => getAllEventKinds(),
});

function generateSlug(text: string) {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

type ScoringForm = {
	winner: number;
	exact: number;
	underdog_25: number;
	underdog_50: number;
	underdog_tier1_max_pct: number;
	underdog_tier2_max_pct: number;
};

const emptyScoring = (): ScoringForm => ({
	winner: DEFAULT_SCORING_RULES.winner,
	exact: DEFAULT_SCORING_RULES.exact,
	underdog_25: DEFAULT_SCORING_RULES.underdog_25,
	underdog_50: DEFAULT_SCORING_RULES.underdog_50,
	underdog_tier1_max_pct: DEFAULT_SCORING_RULES.underdog_tier1_max_pct ?? 0.25,
	underdog_tier2_max_pct: DEFAULT_SCORING_RULES.underdog_tier2_max_pct ?? 0.5,
});

function AdminEventKindsPage() {
	const { t } = useTranslation("admin");
	const eventKinds = Route.useLoaderData();
	const router = useRouter();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [useTemplateScoring, setUseTemplateScoring] = useState(false);
	const [itemToArchive, setItemToArchive] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [itemToDelete, setItemToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);

	const [formData, setFormData] = useState<{
		id?: number;
		name: string;
		slug: string;
		presentationTheme: PresentationTheme;
		templateStages: Stage[];
		templateScoringRules: ScoringForm;
	}>({
		name: "",
		slug: "",
		presentationTheme: "default",
		templateStages: [],
		templateScoringRules: emptyScoring(),
	});

	useSetHeader({
		title: t("eventKinds.title"),
		actions: (
			<button
				type="button"
				onClick={() => {
					setFormData({
						name: "",
						slug: "",
						presentationTheme: "default",
						templateStages: [],
						templateScoringRules: emptyScoring(),
					});
					setUseTemplateScoring(false);
					setIsModalOpen(true);
				}}
				className="flex h-11 items-center justify-center gap-2 border-[3px] border-black bg-[#ccff00] px-6 font-black font-display text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000]"
			>
				<Plus className="h-5 w-5" strokeWidth={3} />
				{t("eventKinds.create")}
			</button>
		),
	});

	const handleNameChange = (val: string) => {
		setFormData((prev) => ({
			...prev,
			name: val,
			slug: prev.id ? prev.slug : generateSlug(val),
		}));
	};

	const handleEdit = (item: (typeof eventKinds)[0]) => {
		const hasScoring = item.templateScoringRules != null;
		setUseTemplateScoring(hasScoring);
		setFormData({
			id: item.id,
			name: item.name,
			slug: item.slug,
			presentationTheme: item.presentationTheme as PresentationTheme,
			templateStages: (item.templateStages as Stage[]) || [],
			templateScoringRules: hasScoring
				? {
						winner: item.templateScoringRules?.winner ?? 1,
						exact: item.templateScoringRules?.exact ?? 3,
						underdog_25: item.templateScoringRules?.underdog_25 ?? 2,
						underdog_50: item.templateScoringRules?.underdog_50 ?? 1,
						underdog_tier1_max_pct:
							item.templateScoringRules?.underdog_tier1_max_pct ?? 0.25,
						underdog_tier2_max_pct:
							item.templateScoringRules?.underdog_tier2_max_pct ?? 0.5,
					}
				: emptyScoring(),
		});
		setIsModalOpen(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await saveEventKind({
				data: {
					id: formData.id,
					name: formData.name,
					slug: formData.slug,
					presentationTheme: formData.presentationTheme,
					templateStages: formData.templateStages as any,
					templateScoringRules: useTemplateScoring
						? formData.templateScoringRules
						: null,
				},
			});
			toast.success(t("eventKinds.saveSuccess"));
			setIsModalOpen(false);
			router.invalidate();
		} catch (error) {
			console.error(error);
			toast.error(t("eventKinds.saveError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const confirmArchive = async () => {
		if (!itemToArchive) return;
		setIsSubmitting(true);
		try {
			await archiveEventKind({ data: itemToArchive.id });
			toast.success(t("eventKinds.archiveSuccess"));
			setItemToArchive(null);
			router.invalidate();
		} catch {
			toast.error(t("eventKinds.archiveError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRestore = async (id: number) => {
		try {
			await restoreEventKind({ data: id });
			toast.success(t("eventKinds.restoreSuccess"));
			router.invalidate();
		} catch {
			toast.error(t("eventKinds.restoreError"));
		}
	};

	const confirmDelete = async () => {
		if (!itemToDelete) return;
		setIsSubmitting(true);
		try {
			await deleteEventKind({ data: itemToDelete.id });
			toast.success(t("eventKinds.deleteSuccess"));
			setItemToDelete(null);
			router.invalidate();
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			toast.error(
				message.includes("EVENT_KIND_IN_USE")
					? t("eventKinds.deleteInUse")
					: t("eventKinds.deleteError"),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			{eventKinds.length === 0 ? (
				<p className="font-body font-bold text-gray-500 text-sm uppercase tracking-widest">
					{t("eventKinds.empty")}
				</p>
			) : (
				<div className="space-y-3">
					{eventKinds.map((kind) => {
						const archived = kind.archivedAt != null;
						return (
							<div
								key={kind.id}
								className="flex flex-col gap-3 rounded-lg border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#000] sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<div className="flex flex-wrap items-center gap-2">
										<h2 className="font-black font-display text-ink text-lg uppercase italic tracking-tight">
											{kind.name}
										</h2>
										{archived && (
											<span className="rounded bg-gray-200 px-2 py-0.5 font-body font-bold text-[10px] text-gray-700 uppercase tracking-widest">
												{t("eventKinds.archivedBadge")}
											</span>
										)}
										<span className="rounded border-2 border-black bg-paper px-2 py-0.5 font-body font-bold text-[10px] text-ink uppercase tracking-widest">
											{t(`eventKinds.themes.${kind.presentationTheme}`)}
										</span>
									</div>
									<p className="mt-1 font-body text-gray-500 text-xs tabular-nums">
										{kind.slug}
									</p>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => handleEdit(kind)}
										className="flex items-center justify-center border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] hover:bg-electric-lime"
										title={t("eventKinds.edit")}
									>
										<Edit2 className="h-4 w-4" strokeWidth={2.5} />
									</button>
									{archived ? (
										<button
											type="button"
											onClick={() => handleRestore(kind.id)}
											className="flex items-center justify-center border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] hover:bg-[#ccff00]"
											title={t("eventKinds.restore")}
										>
											<RotateCcw className="h-4 w-4" strokeWidth={2.5} />
										</button>
									) : (
										<button
											type="button"
											onClick={() =>
												setItemToArchive({ id: kind.id, name: kind.name })
											}
											className="flex items-center justify-center border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] hover:bg-[#ffc700]"
											title={t("eventKinds.archive")}
										>
											<Archive className="h-4 w-4" strokeWidth={2.5} />
										</button>
									)}
									<button
										type="button"
										onClick={() =>
											setItemToDelete({ id: kind.id, name: kind.name })
										}
										className="flex items-center justify-center border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] hover:bg-[#ff2e2e] hover:text-white"
										title={t("eventKinds.delete")}
									>
										<Trash2 className="h-4 w-4" strokeWidth={2.5} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<AdminFormModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={
					formData.id ? t("eventKinds.editTitle") : t("eventKinds.createTitle")
				}
				onSubmit={handleSave}
				size="xl"
				formId="event-kind-form"
				footer={
					<AdminFormActions
						onCancel={() => setIsModalOpen(false)}
						cancelLabel={t("common:actions.cancel")}
						submitLabel={t("eventKinds.saveButton")}
						isSubmitting={isSubmitting}
						submitIcon={<Plus strokeWidth={4} className="h-5 w-5" />}
					/>
				}
			>
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("eventKinds.nameLabel")}
							</label>
							<input
								required
								type="text"
								value={formData.name}
								onChange={(e) => handleNameChange(e.target.value)}
								className="w-full border-[3px] border-black bg-white p-3 font-black font-display text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4 focus:ring-electric-lime"
								placeholder={t("eventKinds.namePlaceholder")}
							/>
						</div>
						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("eventKinds.slugLabel")}
							</label>
							<input
								required
								type="text"
								value={formData.slug}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										slug: generateSlug(e.target.value),
									}))
								}
								className="w-full border-[3px] border-black bg-white p-3 font-body text-black text-sm tabular-nums focus:outline-none focus:ring-4 focus:ring-electric-lime"
							/>
						</div>
					</div>

					<CustomSelect
						label={t("eventKinds.themeLabel")}
						value={formData.presentationTheme}
						onChange={(val) =>
							setFormData({
								...formData,
								presentationTheme: val as PresentationTheme,
							})
						}
						options={PRESENTATION_THEMES.map((theme) => ({
							value: theme,
							label: t(`eventKinds.themes.${theme}`),
						}))}
					/>

					<div>
						<p className="mb-2 font-body font-bold text-black text-xs uppercase tracking-widest">
							{t("eventKinds.templateStages")}
						</p>
						<StageBuilder
							stages={formData.templateStages}
							onChange={(stages) =>
								setFormData({ ...formData, templateStages: stages })
							}
						/>
					</div>

					<div className="space-y-3 rounded-lg border-2 border-black bg-paper p-4">
						<label className="flex items-center gap-2 font-body font-bold text-black text-xs uppercase tracking-widest">
							<input
								type="checkbox"
								checked={useTemplateScoring}
								onChange={(e) => setUseTemplateScoring(e.target.checked)}
								className="h-4 w-4 border-2 border-black"
							/>
							{t("eventKinds.templateScoring")}
						</label>
						{!useTemplateScoring && (
							<p className="font-body text-[10px] text-gray-600 uppercase tracking-widest">
								{t("eventKinds.useDefaultScoring")}
							</p>
						)}
						{useTemplateScoring && (
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								{(
									[
										["winner", "tournaments.winner"],
										["exact", "tournaments.exactScore"],
										["underdog_25", "tournaments.underdogTier1"],
										["underdog_50", "tournaments.underdogTier2"],
									] as const
								).map(([key, labelKey]) => (
									<div key={key}>
										<label className="mb-1 block font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
											{t(labelKey)}
										</label>
										<input
											type="number"
											value={formData.templateScoringRules[key]}
											onChange={(e) =>
												setFormData({
													...formData,
													templateScoringRules: {
														...formData.templateScoringRules,
														[key]: Number(e.target.value),
													},
												})
											}
											className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black tabular-nums"
										/>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</AdminFormModal>

			<ConfirmationModal
				isOpen={!!itemToArchive}
				onClose={() => setItemToArchive(null)}
				onConfirm={confirmArchive}
				title={t("eventKinds.archiveTitle")}
				description={t("eventKinds.archiveConfirm")}
				confirmLabel={t("eventKinds.archiveConfirmButton")}
				cancelLabel={t("common:actions.cancel")}
				isLoading={isSubmitting}
				challengeText={itemToArchive?.name}
			/>

			<ConfirmationModal
				isOpen={!!itemToDelete}
				onClose={() => setItemToDelete(null)}
				onConfirm={confirmDelete}
				title={t("eventKinds.deleteTitle")}
				description={
					itemToDelete
						? `${t("eventKinds.deleteConfirm")} ${itemToDelete.name}?`
						: ""
				}
				confirmLabel={t("eventKinds.deleteConfirmButton")}
				cancelLabel={t("common:actions.cancel")}
				isLoading={isSubmitting}
				challengeText={itemToDelete?.name}
				variant="danger"
			/>
		</div>
	);
}

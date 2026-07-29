import { createFileRoute, useRouter } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Archive,
	Edit2,
	Layers,
	Plus,
	RotateCcw,
	Search,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
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

const actionBtnClass =
	"flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none md:flex-none";

function AdminEventKindsPage() {
	const { t } = useTranslation("admin");
	const eventKinds = Route.useLoaderData();
	const router = useRouter();

	const [searchTerm, setSearchTerm] = useState("");
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

	const resetForm = () => {
		setFormData({
			name: "",
			slug: "",
			presentationTheme: "default",
			templateStages: [],
			templateScoringRules: emptyScoring(),
		});
		setUseTemplateScoring(false);
	};

	const filteredKinds = useMemo(
		() =>
			eventKinds.filter(
				(k) =>
					k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					k.slug.toLowerCase().includes(searchTerm.toLowerCase()),
			),
		[eventKinds, searchTerm],
	);

	useSetHeader({
		title: t("eventKinds.title"),
		actions: (
			<div className="flex h-11 w-full flex-col-reverse items-stretch gap-2 max-sm:h-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4">
				<div className="relative w-full sm:w-auto">
					<input
						type="text"
						placeholder={t("common:actions.search")}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="h-11 w-full border-[3px] border-black bg-white px-4 py-0 pr-10 font-body font-bold text-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:font-body placeholder:text-gray-400 placeholder:uppercase placeholder:tracking-widest hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-[#ccff00]/40 sm:w-64"
					/>
					<Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
				</div>

				<button
					type="button"
					onClick={() => {
						resetForm();
						setIsModalOpen(true);
					}}
					className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-[#ccff00] px-6 py-0 font-black font-display text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:w-auto"
				>
					<Plus className="h-5 w-5" strokeWidth={3} />
					<span className="inline">{t("eventKinds.create")}</span>
				</button>
			</div>
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
					templateStages: formData.templateStages.map(
						({ startDate: _s, endDate: _e, ...stage }) => stage,
					) as any,
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
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans">
			<div className="mx-auto max-w-[1600px] px-6 py-8">
				<div className="overflow-hidden border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)]">
					<div className="overflow-x-auto">
						<div className="min-w-full md:min-w-[800px]">
							<div className="hidden grid-cols-12 gap-4 border-black border-b-[4px] bg-black px-6 py-4 font-body font-bold text-sm text-white uppercase tracking-widest md:grid">
								<div className="col-span-4">{t("eventKinds.tableInfo")}</div>
								<div className="col-span-2">{t("eventKinds.tableTheme")}</div>
								<div className="col-span-2">
									{t("eventKinds.tableTemplate")}
								</div>
								<div className="col-span-2 text-center">
									{t("eventKinds.tableStatus")}
								</div>
								<div className="col-span-2 text-right">
									{t("eventKinds.tableActions")}
								</div>
							</div>

							{filteredKinds.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<button
										type="button"
										onClick={() => {
											resetForm();
											setIsModalOpen(true);
										}}
										className="flex flex-col items-center justify-center gap-4 border-[3px] border-black border-dashed bg-[#e6e6e6] px-10 py-8 opacity-80 transition-all hover:border-solid hover:bg-white hover:opacity-100"
									>
										<div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-white">
											<Layers className="h-8 w-8 text-ink" strokeWidth={2.5} />
										</div>
										<span className="font-black font-display text-gray-500 uppercase italic">
											{t("eventKinds.empty")}
										</span>
									</button>
								</div>
							) : (
								<div className="divide-y-[3px] divide-black">
									{filteredKinds.map((kind, index) => {
										const archived = kind.archivedAt != null;
										const stageCount = ((kind.templateStages as Stage[]) || [])
											.length;
										const hasScoring = kind.templateScoringRules != null;

										return (
											<div
												key={kind.id}
												className={clsx(
													"flex flex-col items-start gap-4 px-6 py-4 transition-colors hover:bg-[#ccff00]/10 md:grid md:grid-cols-12 md:items-center",
													index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]",
												)}
											>
												<div className="flex w-full items-center gap-4 md:col-span-4">
													<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border-[3px] border-black bg-paper shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
														<Layers
															className="h-6 w-6 text-ink"
															strokeWidth={2.5}
														/>
													</div>
													<div className="min-w-0">
														<h3 className="break-words font-black font-display text-black text-lg uppercase italic leading-none">
															{kind.name}
														</h3>
														<span className="mt-1 inline-block rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-body font-bold text-[10px] text-gray-500 tracking-widest">
															{kind.slug}
														</span>
													</div>
												</div>

												<div className="flex w-full md:col-span-2">
													<span className="w-fit rounded border-2 border-black bg-paper px-2 py-1 font-body font-bold text-[10px] text-ink uppercase tracking-widest">
														{t(`eventKinds.themes.${kind.presentationTheme}`)}
													</span>
												</div>

												<div className="flex w-full flex-row flex-wrap gap-2 md:col-span-2 md:flex-col md:gap-1.5">
													{stageCount === 0 && !hasScoring ? (
														<span className="font-body font-bold text-[10px] text-gray-400 uppercase italic tracking-widest">
															{t("eventKinds.noTemplate")}
														</span>
													) : (
														<>
															{stageCount > 0 && (
																<span className="w-fit rounded bg-gray-100 px-2 py-1 font-body font-bold text-[10px] text-gray-600 uppercase tabular-nums tracking-widest">
																	{t("eventKinds.stagesCount", {
																		count: stageCount,
																	})}
																</span>
															)}
															<span className="w-fit rounded bg-gray-100 px-2 py-1 font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest">
																{hasScoring
																	? t("eventKinds.scoringSeeded")
																	: t("eventKinds.scoringDefault")}
															</span>
														</>
													)}
												</div>

												<div className="flex w-full justify-start md:col-span-2 md:justify-center">
													<span
														className={clsx(
															"whitespace-nowrap border-[2px] border-black px-3 py-1 font-body font-bold text-[10px] uppercase italic tracking-widest",
															archived
																? "bg-gray-200 text-gray-600"
																: "bg-[#ccff00] text-black",
														)}
													>
														{archived
															? t("eventKinds.archivedBadge")
															: t("eventKinds.statusActive")}
													</span>
												</div>

												<div className="mt-2 flex w-full flex-wrap justify-start gap-2 md:col-span-2 md:mt-0 md:justify-end">
													<button
														type="button"
														onClick={() => handleEdit(kind)}
														className={clsx(
															actionBtnClass,
															"hover:bg-[#2e5cff] hover:text-white",
														)}
														title={t("eventKinds.edit")}
													>
														<Edit2 className="h-4 w-4" strokeWidth={2.5} />
													</button>
													{archived ? (
														<button
															type="button"
															onClick={() => handleRestore(kind.id)}
															className={clsx(
																actionBtnClass,
																"hover:bg-[#ccff00] hover:text-black",
															)}
															title={t("eventKinds.restore")}
														>
															<RotateCcw
																className="h-4 w-4"
																strokeWidth={2.5}
															/>
														</button>
													) : (
														<button
															type="button"
															onClick={() =>
																setItemToArchive({
																	id: kind.id,
																	name: kind.name,
																})
															}
															className={clsx(
																actionBtnClass,
																"hover:bg-[#ffc700] hover:text-black",
															)}
															title={t("eventKinds.archive")}
														>
															<Archive className="h-4 w-4" strokeWidth={2.5} />
														</button>
													)}
													<button
														type="button"
														onClick={() =>
															setItemToDelete({
																id: kind.id,
																name: kind.name,
															})
														}
														className={clsx(
															actionBtnClass,
															"hover:bg-[#ff2e2e] hover:text-white",
														)}
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
						</div>
					</div>
				</div>
			</div>

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
							showDates={false}
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

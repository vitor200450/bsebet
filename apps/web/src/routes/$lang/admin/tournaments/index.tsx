// Force HMR refresh

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Calendar,
	Copy,
	Edit2,
	Image as ImageIcon,
	Plus,
	Search,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
	AdminFormActions,
	AdminFormModal,
} from "@/components/admin/AdminFormModal";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import {
	CustomDatePicker,
	CustomSelect,
} from "@/components/admin/CustomInputs";
import { type Stage, StageBuilder } from "@/components/admin/StageBuilder";
import { useSetHeader } from "@/components/HeaderContext";
import { useLangLink } from "@/i18n/useLangLink";
import { getAllEventKinds } from "@/server/event-kinds";
import { applyEventKindTemplate } from "@/server/event-kind-template";
import {
	copyTournament,
	deleteTournament,
	getTournaments,
	saveTournament,
} from "@/server/tournaments";

export const Route = createFileRoute("/$lang/admin/tournaments/")({
	component: AdminTournamentsPage,
	loader: async () => {
		const [tournaments, eventKinds] = await Promise.all([
			getTournaments(),
			getAllEventKinds(),
		]);
		return { tournaments, eventKinds };
	},
});

function AdminTournamentsPage() {
	const { t } = useTranslation("admin");
	const { linkTo } = useLangLink();
	const { tournaments, eventKinds } = Route.useLoaderData();
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [itemToDelete, setItemToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);
	const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
	const [itemToDuplicate, setItemToDuplicate] = useState<{
		id: number;
		name: string;
	} | null>(null);

	const [isSubmitting, setIsSubmitting] = useState(false);

	// Form State
	const [formData, setFormData] = useState<{
		id?: number;
		name: string;
		slug: string;
		logoUrl: string;
		format: string;
		region: string;
		participantsCount: string;
		stages: Stage[];
		startDate: string;
		endDate: string;
		status: "upcoming" | "active" | "finished";
		venueMode: "online" | "lan";
		eventKindId: number | null;
		scoringRules: {
			winner: number;
			exact: number;
			underdog_25: number;
			underdog_50: number;
			underdog_tier1_max_pct: number;
			underdog_tier2_max_pct: number;
		};
	}>({
		name: "",
		slug: "",
		logoUrl: "",
		format: "",
		region: "",
		participantsCount: "",
		stages: [],
		startDate: "",
		endDate: "",
		status: "upcoming",
		venueMode: "online",
		eventKindId: null,
		scoringRules: {
			winner: 1,
			exact: 3,
			underdog_25: 2,
			underdog_50: 1,
			underdog_tier1_max_pct: 0.25,
			underdog_tier2_max_pct: 0.5,
		},
	});

	const [searchTerm, setSearchTerm] = useState("");

	const generateSlug = (name: string) => {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
	};

	useSetHeader({
		title: t("tournaments.title"),
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
					onClick={() => {
						setFormData({
							name: "",
							slug: "",
							logoUrl: "",
							format: "",
							region: "",
							participantsCount: "",
							stages: [],
							startDate: "",
							endDate: "",
							status: "upcoming",
							venueMode: "online",
							eventKindId: null,
							scoringRules: {
								winner: 1,
								exact: 3,
								underdog_25: 2,
								underdog_50: 1,
								underdog_tier1_max_pct: 0.25,
								underdog_tier2_max_pct: 0.5,
							},
						});
						setIsModalOpen(true);
					}}
					className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-[#ccff00] px-6 py-0 font-black font-display text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:w-auto"
				>
					<Plus className="h-5 w-5" strokeWidth={3} />
					<span className="inline">{t("tournaments.create")}</span>
				</button>
			</div>
		),
	});

	const handleNameChange = (val: string) => {
		const slug = generateSlug(val);
		setFormData((prev) => ({
			...prev,
			name: val,
			slug: prev.id ? prev.slug : slug,
		}));
	};

	// --- CRUD HANDLERS ---
	const handleEdit = (item: (typeof tournaments)[0]) => {
		setFormData({
			id: item.id,
			name: item.name,
			slug: item.slug,
			logoUrl: item.logoUrl || "",
			format: item.format || "",
			region: item.region || "",
			participantsCount: item.participantsCount
				? String(item.participantsCount)
				: "",
			stages: (item.stages as unknown as Stage[]) || [],
			startDate: item.startDate
				? new Date(item.startDate).toISOString().split("T")[0]
				: "",
			endDate: item.endDate
				? new Date(item.endDate).toISOString().split("T")[0]
				: "",

			status: item.status || "upcoming",
			venueMode: item.venueMode || "online",
			eventKindId: item.eventKindId ?? null,
			scoringRules: {
				winner: (item.scoringRules as any)?.winner ?? 1,
				exact: (item.scoringRules as any)?.exact ?? 3,
				underdog_25: (item.scoringRules as any)?.underdog_25 ?? 2,
				underdog_50: (item.scoringRules as any)?.underdog_50 ?? 1,
				underdog_tier1_max_pct:
					(item.scoringRules as any)?.underdog_tier1_max_pct ?? 0.25,
				underdog_tier2_max_pct:
					(item.scoringRules as any)?.underdog_tier2_max_pct ?? 0.5,
			},
		});
		setIsModalOpen(true);
	};

	const handleEventKindChange = (raw: string) => {
		const nextId = raw === "" ? null : Number(raw);
		const kind = nextId ? eventKinds.find((k) => k.id === nextId) : undefined;

		setFormData((prev) => {
			const next = { ...prev, eventKindId: nextId };
			// Client-side seed preview on create — same rules as server applyEventKindTemplate
			if (!prev.id && kind) {
				const seeded = applyEventKindTemplate(
					{
						stages: prev.stages as any,
						scoringRules: prev.scoringRules,
					},
					{
						stages: (kind.templateStages as any) || [],
						scoringRules: kind.templateScoringRules,
					},
				);
				next.stages = seeded.stages as Stage[];
				next.scoringRules = {
					winner: seeded.scoringRules.winner,
					exact: seeded.scoringRules.exact,
					underdog_25: seeded.scoringRules.underdog_25,
					underdog_50: seeded.scoringRules.underdog_50,
					underdog_tier1_max_pct:
						seeded.scoringRules.underdog_tier1_max_pct ?? 0.25,
					underdog_tier2_max_pct:
						seeded.scoringRules.underdog_tier2_max_pct ?? 0.5,
				};
			}
			return next;
		});
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			const tier1 = formData.scoringRules.underdog_tier1_max_pct;
			const tier2 = formData.scoringRules.underdog_tier2_max_pct;

			if (tier1 <= 0 || tier1 > 1 || tier2 <= 0 || tier2 > 1 || tier1 > tier2) {
				toast.error(t("tournaments.underdogLimits"));
				setIsSubmitting(false);
				return;
			}

			await saveTournament({
				data: {
					...formData,
					participantsCount: Number(formData.participantsCount) || 0,
					// Cast stages to unknown first if there are type mismatches with the exact Zod infer
					stages: formData.stages as any,
					startDate: formData.startDate
						? new Date(formData.startDate)
						: undefined,
					endDate: formData.endDate ? new Date(formData.endDate) : undefined,
					scoringRules: formData.scoringRules,
					venueMode: formData.venueMode,
					eventKindId: formData.eventKindId,
				},
			});

			toast.success(t("tournaments.saveSuccess"));
			setIsModalOpen(false);
			router.invalidate();
		} catch (error) {
			console.error(error);
			toast.error(t("tournaments.saveError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = (id: number, name: string) => {
		setItemToDelete({ id, name });
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!itemToDelete) return;
		setIsSubmitting(true);
		try {
			await deleteTournament({ data: itemToDelete.id });
			toast.success(t("tournaments.deleteSuccess"));
			setIsDeleteModalOpen(false);
			setItemToDelete(null);
			router.invalidate();
			if (formData.id === itemToDelete.id) {
				setIsModalOpen(false);
			}
		} catch (error) {
			toast.error(t("tournaments.deleteError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDuplicate = (item: { id: number; name: string }) => {
		setItemToDuplicate(item);
		setIsDuplicateModalOpen(true);
	};

	const confirmDuplicate = async () => {
		if (!itemToDuplicate) return;

		try {
			await toast.promise(copyTournament({ data: itemToDuplicate.id }), {
				loading: t("tournaments.duplicating"),
				success: t("tournaments.duplicateSuccess"),
				error: t("tournaments.duplicateError"),
			});

			router.invalidate();
			setIsDuplicateModalOpen(false);
			setItemToDuplicate(null);
		} catch (error) {
			console.error(error);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setFormData({ ...formData, logoUrl: reader.result as string });
			};
			reader.readAsDataURL(file);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-[#ccff00] text-black border-[#ccff00]";
			case "finished":
				return "bg-black text-white border-black";
			default:
				return "bg-gray-200 text-gray-500 border-gray-300";
		}
	};

	const formatDateUTC = (date: string | Date | null) => {
		if (!date) return "";
		return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
	};

	const filteredTournaments = tournaments.filter(
		(t) =>
			t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			t.slug.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans">
			{/* LIST CONTENT */}
			<div className="mx-auto max-w-[1600px] px-6 py-8">
				<div className="overflow-hidden border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)]">
					<div className="overflow-x-auto">
						<div className="min-w-full md:min-w-[800px]">
							{/* Table Header - Hidden on small screens */}
							<div className="hidden grid-cols-12 gap-4 border-black border-b-[4px] bg-black px-6 py-4 font-body font-bold text-sm text-white uppercase tracking-widest md:grid">
								<div className="col-span-4">{t("tournaments.tableInfo")}</div>
								<div className="col-span-2">
									{t("tournaments.tableDetails")}
								</div>
								<div className="col-span-2">{t("tournaments.tableDates")}</div>
								<div className="col-span-2 text-center">
									{t("tournaments.tableStatus")}
								</div>
								<div className="col-span-2 text-right">
									{t("tournaments.tableActions")}
								</div>
							</div>

							{/* Table Rows */}
							{filteredTournaments.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black border-dashed bg-gray-200">
										<Copy className="h-8 w-8 text-gray-400" />
									</div>
									<span className="font-black text-gray-400 text-lg uppercase italic">
										{t("tournaments.empty")}
									</span>
								</div>
							) : (
								<div className="divide-y-[3px] divide-black">
									{filteredTournaments.map((tournament, index) => (
										<div
											key={tournament.id}
											className={`flex flex-col items-start gap-4 px-6 py-4 transition-colors md:grid md:grid-cols-12 md:items-center ${
												index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]"
											} hover:bg-[#ccff00]/10`}
										>
											{/* Tournament Info */}
											<div className="flex w-full items-center gap-4 md:col-span-4">
												<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border-[3px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
													{tournament.logoUrl ? (
														<img
															src={tournament.logoUrl}
															alt={tournament.name}
															className="h-full w-full object-contain p-2"
														/>
													) : (
														<ImageIcon className="h-6 w-6 text-gray-300" />
													)}
												</div>
												<div className="min-w-0">
													<h3 className="break-words font-black font-display text-black text-lg uppercase italic leading-none">
														{tournament.name}
													</h3>
													<span className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-body font-bold text-[10px] text-gray-500 tracking-widest">
														{tournament.slug}
													</span>
												</div>
											</div>

											{/* Details (Region, Format, Players) */}
											<div className="flex w-full flex-row flex-wrap gap-2 md:col-span-2 md:flex-col md:gap-1.5">
												{tournament.region && (
													<span className="flex w-fit items-center gap-1.5 rounded bg-paper px-2 py-1 font-body font-bold text-[10px] text-gray-700 uppercase tracking-widest">
														<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brawl-blue" />
														{tournament.region}
													</span>
												)}
												{tournament.format && (
													<span
														className="w-fit truncate rounded bg-gray-100 px-2 py-1 font-body font-bold text-[10px] text-gray-600 uppercase tracking-widest"
														title={tournament.format}
													>
														<span className="mr-1 md:hidden">
															{t("tournaments.formatAbbr")}:
														</span>
														{tournament.format}
													</span>
												)}
												{tournament.participantsCount && (
													<span className="flex w-fit items-center gap-1 rounded bg-gray-100 px-2 py-1 font-body font-bold text-[10px] text-gray-600 uppercase tabular-nums tracking-widest">
														{tournament.participantsCount}{" "}
														{t("tournaments.teams")}
													</span>
												)}
											</div>

											{/* Dates */}
											<div className="flex w-full gap-2 md:col-span-2 md:block">
												{tournament.startDate ? (
													<div className="flex w-fit flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded bg-paper px-2 py-1 font-body font-bold text-[10px] text-gray-600 uppercase tabular-nums tracking-widest md:flex-col md:items-start">
														<span>{formatDateUTC(tournament.startDate)}</span>
														{tournament.endDate && (
															<span className="text-gray-400">
																<span className="md:hidden">- </span>
																<span className="hidden md:inline">
																	{t("tournaments.to")}{" "}
																</span>
																{formatDateUTC(tournament.endDate)}
															</span>
														)}
													</div>
												) : (
													<span className="font-body font-bold text-[10px] text-gray-400 uppercase italic tracking-widest">
														{t("tournaments.tbd")}
													</span>
												)}
											</div>

											{/* Status Badge */}
											<div className="flex w-full justify-start md:col-span-2 md:justify-center">
												<span
													className={`whitespace-nowrap border-[2px] border-black px-3 py-1 font-body font-bold text-[10px] uppercase italic tracking-widest ${getStatusColor(
														tournament.status || "upcoming",
													)}`}
												>
													{tournament.status === "active"
														? t("tournaments.statusActive")
														: tournament.status === "finished"
															? t("tournaments.statusFinished")
															: t("tournaments.statusUpcoming")}
												</span>
											</div>

											<div className="mt-2 flex w-full flex-wrap justify-start gap-2 md:col-span-2 md:mt-0 md:justify-end">
												<Link
													to={linkTo(
														"/admin/tournaments/$tournamentId/matches",
													)}
													params={{ tournamentId: String(tournament.id) }}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ccff00] hover:text-black hover:shadow-none md:flex-none"
													title={t("tournaments.matchScheduler")}
												>
													<Calendar className="h-4 w-4" strokeWidth={2.5} />
												</Link>
												<button
													onClick={() =>
														handleDuplicate({
															id: tournament.id,
															name: tournament.name,
														})
													}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ccff00] hover:text-black hover:shadow-none md:flex-none"
													title={t("tournaments.duplicate")}
												>
													<Copy className="h-4 w-4" strokeWidth={2.5} />
												</button>
												<button
													onClick={() => handleEdit(tournament)}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#2e5cff] hover:text-white hover:shadow-none md:flex-none"
													title={t("tournaments.edit")}
												>
													<Edit2 className="h-4 w-4" strokeWidth={2.5} />
												</button>
												<button
													onClick={() =>
														handleDelete(tournament.id, tournament.name)
													}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ff2e2e] hover:text-white hover:shadow-none md:flex-none"
													title={t("tournaments.delete")}
												>
													<Trash2 className="h-4 w-4" strokeWidth={2.5} />
												</button>
											</div>
											{formData.logoUrl.startsWith("data:") && (
												<p className="mt-1 w-full font-body font-bold text-[10px] text-red-500 uppercase italic tracking-widest">
													⚠️ {t("tournaments.base64Warning")}{" "}
													<Link
														to={linkTo("/admin/migrate-logos")}
														className="underline hover:text-red-700"
													>
														{t("common.logoMigrationPage")}
													</Link>
												</p>
											)}
										</div>
									))}
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
					formData.id
						? t("tournaments.editTitle")
						: t("tournaments.createTitle")
				}
				onSubmit={handleSave}
				size="xl"
				formId="tournament-form"
				footer={
					<AdminFormActions
						onCancel={() => setIsModalOpen(false)}
						cancelLabel={t("common:actions.cancel")}
						submitLabel={t("tournaments.saveButton")}
						isSubmitting={isSubmitting}
						submitIcon={<Plus strokeWidth={4} className="h-5 w-5" />}
					/>
				}
			>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
					<div className="space-y-4">
						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("tournaments.nameLabel")}
							</label>
							<input
								required
								type="text"
								value={formData.name}
								onChange={(e) => handleNameChange(e.target.value)}
								className="w-full border-[3px] border-black bg-white p-3 font-black font-display text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:font-bold placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime"
								placeholder={t("tournaments.namePlaceholder")}
							/>
						</div>

						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("tournaments.slugLabel")}
							</label>
							<div className="relative">
								<input
									type="text"
									value={formData.slug}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											slug: generateSlug(e.target.value),
										}))
									}
									className="w-full border-[3px] border-black bg-white p-3 pr-10 font-body text-black text-sm tabular-nums focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime"
								/>
								<Copy className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-black" />
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
									{t("tournaments.participantsLabel")}
								</label>
								<input
									type="number"
									value={formData.participantsCount}
									onChange={(e) =>
										setFormData({
											...formData,
											participantsCount: e.target.value,
										})
									}
									className="w-full border-[3px] border-black bg-white p-2 font-body font-bold text-black tabular-nums focus:outline-none focus:ring-4 focus:ring-electric-lime"
									placeholder={t("tournaments.participantsPlaceholder")}
								/>
							</div>
							<CustomSelect
								label={t("tournaments.regionLabel")}
								value={formData.region}
								onChange={(val) => setFormData({ ...formData, region: val })}
								options={[
									{
										value: "Global",
										label: t("tournaments.regions.global"),
									},
									{ value: "NA", label: t("tournaments.regions.na") },
									{ value: "EMEA", label: t("tournaments.regions.emea") },
									{ value: "SA", label: t("tournaments.regions.sa") },
									{ value: "CN", label: t("tournaments.regions.cn") },
									{ value: "EA", label: t("tournaments.regions.ea") },
									{ value: "SEA", label: t("tournaments.regions.sea") },
									{ value: "SAS", label: t("tournaments.regions.sas") },
								]}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<CustomDatePicker
								label={t("tournaments.startDate")}
								value={formData.startDate}
								onChange={(val) => setFormData({ ...formData, startDate: val })}
							/>
							<CustomDatePicker
								label={t("tournaments.endDate")}
								value={formData.endDate}
								onChange={(val) => setFormData({ ...formData, endDate: val })}
							/>
						</div>

						<CustomSelect
							label={t("tournaments.statusLabel")}
							value={formData.status}
							onChange={(val) =>
								setFormData({
									...formData,
									status: val as "upcoming" | "active" | "finished",
								})
							}
							searchable={false}
							options={[
								{
									value: "upcoming",
									label: t("tournaments.statusUpcoming"),
								},
								{
									value: "active",
									label: t("tournaments.statusActive"),
								},
								{
									value: "finished",
									label: t("tournaments.statusFinished"),
								},
							]}
						/>

						<div className="grid grid-cols-2 gap-4">
							<CustomSelect
								label={t("tournaments.venueModeLabel")}
								value={formData.venueMode}
								onChange={(val) =>
									setFormData({
										...formData,
										venueMode: val as "online" | "lan",
									})
								}
								searchable={false}
								options={[
									{
										value: "online",
										label: t("tournaments.venueModes.online"),
									},
									{ value: "lan", label: t("tournaments.venueModes.lan") },
								]}
							/>
							<CustomSelect
								label={t("tournaments.eventKindLabel")}
								value={
									formData.eventKindId != null
										? String(formData.eventKindId)
										: ""
								}
								onChange={handleEventKindChange}
								options={[
									{ value: "", label: t("tournaments.eventKindNone") },
									...eventKinds
										.filter(
											(k) =>
												k.archivedAt == null || k.id === formData.eventKindId,
										)
										.map((k) => ({
											value: String(k.id),
											label:
												k.archivedAt != null
													? `${k.name} (${t("eventKinds.archivedBadge")})`
													: k.name,
										})),
								]}
							/>
						</div>
						{!formData.id && formData.eventKindId != null && (
							<p className="font-body text-[10px] text-gray-600 uppercase tracking-widest">
								{t("tournaments.eventKindSeedHint")}
							</p>
						)}

						<div className="space-y-3 border-[3px] border-black bg-paper p-4">
							<h3 className="flex items-center gap-2 font-black font-display text-black text-sm uppercase italic">
								{t("tournaments.scoringRules")}
							</h3>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
										{t("tournaments.winner")}
									</label>
									<input
										type="number"
										value={formData.scoringRules.winner}
										onChange={(e) =>
											setFormData({
												...formData,
												scoringRules: {
													...formData.scoringRules,
													winner: Number(e.target.value),
												},
											})
										}
										className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black text-sm tabular-nums"
									/>
								</div>
								<div>
									<label className="mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
										{t("tournaments.exactScore")}
									</label>
									<input
										type="number"
										value={formData.scoringRules.exact}
										onChange={(e) =>
											setFormData({
												...formData,
												scoringRules: {
													...formData.scoringRules,
													exact: Number(e.target.value),
												},
											})
										}
										className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black text-sm tabular-nums"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest"
										title={t("tournaments.tier1Bonus")}
									>
										{t("tournaments.underdogTier1")}
									</label>
									<input
										type="number"
										value={formData.scoringRules.underdog_25}
										onChange={(e) =>
											setFormData({
												...formData,
												scoringRules: {
													...formData.scoringRules,
													underdog_25: Number(e.target.value),
												},
											})
										}
										className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black text-sm tabular-nums"
									/>
								</div>
								<div>
									<label
										className="mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest"
										title={t("tournaments.tier2Bonus")}
									>
										{t("tournaments.underdogTier2")}
									</label>
									<input
										type="number"
										value={formData.scoringRules.underdog_50}
										onChange={(e) =>
											setFormData({
												...formData,
												scoringRules: {
													...formData.scoringRules,
													underdog_50: Number(e.target.value),
												},
											})
										}
										className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black text-sm tabular-nums"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest"
										title={t("tournaments.maxVotes")}
									>
										{t("tournaments.tier1Threshold")}
									</label>
									<input
										type="number"
										min={1}
										max={100}
										step={1}
										value={Math.round(
											(formData.scoringRules.underdog_tier1_max_pct ?? 0.25) *
												100,
										)}
										onChange={(e) => {
											const parsed = Number(e.target.value);
											setFormData({
												...formData,
												scoringRules: {
													...formData.scoringRules,
													underdog_tier1_max_pct:
														Number.isFinite(parsed) && parsed > 0
															? parsed / 100
															: 0.25,
												},
											});
										}}
										className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black text-sm tabular-nums"
									/>
								</div>
								<div>
									<label
										className="mb-1 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest"
										title={t("tournaments.maxVotes")}
									>
										{t("tournaments.tier2Threshold")}
									</label>
									<input
										type="number"
										min={1}
										max={100}
										step={1}
										value={Math.round(
											(formData.scoringRules.underdog_tier2_max_pct ?? 0.5) *
												100,
										)}
										onChange={(e) => {
											const parsed = Number(e.target.value);
											setFormData({
												...formData,
												scoringRules: {
													...formData.scoringRules,
													underdog_tier2_max_pct:
														Number.isFinite(parsed) && parsed > 0
															? parsed / 100
															: 0.5,
												},
											});
										}}
										className="w-full border-2 border-black bg-white p-2 font-body font-bold text-black text-sm tabular-nums"
									/>
								</div>
							</div>
							<p className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
								{t("tournaments.autoFallback")}
							</p>
						</div>
					</div>

					<div className="flex flex-col gap-4">
						<StageBuilder
							stages={formData.stages}
							onChange={(stages) => setFormData({ ...formData, stages })}
						/>

						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("tournaments.logoUrlLabel")}
							</label>
							<div className="flex gap-2">
								<div className="relative flex-1">
									<ImageIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
									<input
										type="text"
										value={
											formData.logoUrl.startsWith("data:")
												? t("tournaments.base64Display")
												: formData.logoUrl
										}
										readOnly={formData.logoUrl.startsWith("data:")}
										onChange={(e) =>
											setFormData({ ...formData, logoUrl: e.target.value })
										}
										className={clsx(
											"w-full border-[3px] border-black p-2 pl-9 font-body text-black text-xs focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime",
											formData.logoUrl.startsWith("data:")
												? "bg-paper text-gray-400 italic"
												: "bg-white",
										)}
										placeholder={t("tournaments.logoPlaceholder")}
									/>
									{formData.logoUrl.startsWith("data:") && (
										<button
											type="button"
											onClick={() => setFormData({ ...formData, logoUrl: "" })}
											className="absolute top-1/2 right-2 -translate-y-1/2 border-2 border-black bg-white p-0.5 text-brawl-red hover:bg-red-50"
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</div>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									ref={fileInputRef}
									onChange={handleFileUpload}
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="border-[3px] border-black bg-black px-3 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:bg-brawl-blue active:translate-y-[2px] active:shadow-none"
								>
									<Upload className="h-4 w-4" />
								</button>
							</div>
							{formData.logoUrl && (
								<div className="mt-2 flex justify-center border-2 border-black border-dashed bg-tape p-4">
									<img
										src={formData.logoUrl}
										alt=""
										className="h-24 w-24 object-contain"
									/>
								</div>
							)}
						</div>
					</div>
				</div>
			</AdminFormModal>

			<ConfirmationModal
				isOpen={isDeleteModalOpen && !!itemToDelete}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDelete}
				title={t("tournaments.deleteTitle")}
				description={
					itemToDelete
						? `${t("tournaments.deleteConfirm")} ${itemToDelete.name}?`
						: ""
				}
				confirmLabel={t("tournaments.deleteConfirmButton")}
				cancelLabel={t("common:actions.cancel")}
				isLoading={isSubmitting}
				variant="danger"
			/>

			<ConfirmationModal
				isOpen={isDuplicateModalOpen && !!itemToDuplicate}
				onClose={() => setIsDuplicateModalOpen(false)}
				onConfirm={confirmDuplicate}
				title={t("tournaments.duplicateTitle")}
				description={
					itemToDuplicate
						? `${t("tournaments.duplicateConfirm")} ${itemToDuplicate.name}? ${t("tournaments.duplicateWarning1")} ${t("tournaments.duplicateWarning2")}.`
						: ""
				}
				confirmLabel={t("tournaments.duplicateConfirmButton")}
				cancelLabel={t("common:actions.cancel")}
				variant="warning"
			/>
		</div>
	);
}

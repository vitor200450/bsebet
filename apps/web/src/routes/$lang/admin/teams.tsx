import { createFileRoute, useRouter } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	ChevronLeft,
	ChevronRight,
	Copy,
	Edit2,
	Image as ImageIcon,
	Loader2,
	Plus,
	Search,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AdminFormActions,
	AdminFormModal,
} from "@/components/admin/AdminFormModal";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import { CustomSelect } from "@/components/admin/CustomInputs";
import { uploadTeamLogoImage } from "@/server/logos";
import { deleteTeam, getTeams, saveTeam } from "@/server/teams";
import { useSetHeader } from "../../../components/HeaderContext";
import { TeamLogo } from "../../../components/TeamLogo";

export const Route = createFileRoute("/$lang/admin/teams")({
	component: AdminTeamsPage,
	loader: () => getTeams(),
});

const PAGE_SIZE = 10;
const TEAM_REGIONS = ["SA", "NA", "EMEA", "CN", "EA", "SEA", "SAS"] as const;

// Helper for Region Colors
const getRegionColor = (region: string) => {
	switch (region) {
		case "NA":
			return "bg-[#85BA3A] text-black shadow-[1px_1px_0px_0px_#000]";
		case "EMEA":
			return "bg-[#0997DE] text-white shadow-[1px_1px_0px_0px_#000]";
		case "CN":
			return "bg-[#ff2e2e] text-white shadow-[1px_1px_0px_0px_#000]";
		case "EA":
			return "bg-[#EC00AC] text-white shadow-[1px_1px_0px_0px_#000]";
		case "SEA":
			return "bg-[#1dd1a1] text-black shadow-[1px_1px_0px_0px_#000]";
		case "SAS":
			return "bg-[#f39c12] text-white shadow-[1px_1px_0px_0px_#000]";
		case "SA":
		default:
			return "bg-[#E24C3C] text-white shadow-[1px_1px_0px_0px_#000]";
	}
};

function AdminTeamsPage() {
	const { t } = useTranslation("admin");
	const teams = Route.useLoaderData();
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [sortOrder, setSortOrder] = useState("recent");
	const [regionFilter, setRegionFilter] = useState<string>("all");
	const [page, setPage] = useState(1);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [teamToDelete, setTeamToDelete] = useState<{
		id: number;
		name: string;
	} | null>(null);

	// Form State
	const [formData, setFormData] = useState({
		id: undefined as number | undefined,
		name: "",
		slug: "",
		region: "",
		logoUrl: "",
	});

	const resetForm = () => {
		setFormData({
			id: undefined,
			name: "",
			slug: "",
			region: "",
			logoUrl: "",
		});
	};

	const handleOpenNew = () => {
		resetForm();
		setIsModalOpen(true);
	};

	const handleEdit = (team: (typeof teams)[0]) => {
		setFormData({
			id: team.id,
			name: team.name,
			slug: team.slug,
			region: team.region || "",
			logoUrl: team.logoUrl || "",
		});
		setIsModalOpen(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
			await saveTeam({ data: formData });

			setIsModalOpen(false);
			resetForm();
			router.invalidate();
			toast.success(t("teams.toast.saved"));
		} catch (error: any) {
			console.error("Failed to save team:", error);
			toast.error(t("teams.toast.saveError"), {
				description: error.message || t("teams.toast.checkData"),
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = (id: number, name: string) => {
		setTeamToDelete({ id, name });
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!teamToDelete) return;

		setIsSubmitting(true);
		try {
			await deleteTeam({ data: teamToDelete.id });
			toast.success(t("teams.toast.deleted", { name: teamToDelete.name }));
			setIsDeleteModalOpen(false);
			setTeamToDelete(null);
			router.invalidate();
		} catch (error: any) {
			toast.error(t("teams.toast.deleteError"), {
				description: error?.message || t("teams.toast.tryAgain"),
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Auto-generate slug
	const handleNameChange = (val: string) => {
		setFormData((prev) => ({
			...prev,
			name: val,
			slug: !prev.id
				? val
						.toLowerCase()
						.replace(/ /g, "-")
						.replace(/[^\w-]+/g, "")
				: prev.slug,
		}));
	};

	// Image Upload Logic — convert to R2 immediately so the form stores a URL
	const fileInputRef = useRef<HTMLInputElement>(null);
	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 500 * 1024) {
			toast.error(t("teams.logoTooLarge"));
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		setIsUploadingLogo(true);
		try {
			const imageBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = () => reject(new Error("Failed to read file"));
				reader.readAsDataURL(file);
			});

			const { logoUrl } = await uploadTeamLogoImage({
				data: { imageBase64 },
			});
			setFormData((prev) => ({ ...prev, logoUrl }));
		} catch (error: any) {
			console.error("Failed to upload team logo:", error);
			toast.error(t("teams.toast.uploadError"), {
				description: error?.message || t("teams.toast.tryAgain"),
			});
		} finally {
			setIsUploadingLogo(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const filteredTeams = teams
		.filter(
			(team) =>
				team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				team.slug.toLowerCase().includes(searchTerm.toLowerCase()),
		)
		.filter((team) =>
			regionFilter === "all" ? true : team.region === regionFilter,
		)
		.sort((a, b) => {
			if (sortOrder === "name") return a.name.localeCompare(b.name);
			if (sortOrder === "region")
				return (a.region || "").localeCompare(b.region || "");
			if (sortOrder === "recent") return (b.id || 0) - (a.id || 0);
			return 0;
		});

	const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageStart = (safePage - 1) * PAGE_SIZE;
	const paginatedTeams = filteredTeams.slice(pageStart, pageStart + PAGE_SIZE);

	useEffect(() => {
		setPage(1);
	}, [searchTerm, sortOrder, regionFilter]);

	useSetHeader({
		title: t("common:nav.adminTeams"),
		actions: (
			<div className="flex h-11 w-full flex-col-reverse items-stretch gap-2 max-sm:h-auto sm:w-auto sm:flex-row sm:items-center sm:gap-4">
				{/* Sorting Dropdown */}
				<div className="w-full sm:w-auto sm:min-w-[200px]">
					<CustomSelect
						value={sortOrder}
						onChange={setSortOrder}
						searchable={false}
						size="toolbar"
						placeholder={t("common:actions.sort")}
						options={[
							{ value: "recent", label: t("teams.sortByRecent") },
							{ value: "name", label: t("teams.sortByName") },
							{ value: "region", label: t("teams.sortByRegion") },
						]}
					/>
				</div>

				{/* Search Bar */}
				<div className="relative w-full sm:w-auto">
					<input
						type="text"
						placeholder={t("teams.searchPlaceholder")}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="h-11 w-full border-[3px] border-black bg-white px-4 py-0 pr-10 font-body font-bold text-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder:font-body placeholder:text-gray-400 placeholder:uppercase placeholder:tracking-widest focus:outline-none focus:ring-4 focus:ring-electric-lime/40 sm:w-64"
					/>
					<Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
				</div>

				<button
					type="button"
					onClick={() => {
						setIsModalOpen(true);
						resetForm();
					}}
					className="admin-press-comic flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-electric-lime px-6 py-0 font-black font-display text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#bbe000] sm:w-auto"
				>
					<Plus className="h-5 w-5" strokeWidth={3} />
					<span className="inline">{t("teams.newButton")}</span>
				</button>
			</div>
		),
	});

	return (
		<div className="min-h-[100dvh] bg-paper bg-paper-texture pb-20 font-sans">
			<div className="mx-auto max-w-[1600px] space-y-4 px-6 py-8">
				{/* Region filter */}
				<div className="flex flex-wrap items-center gap-2">
					<span className="mr-1 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
						{t("teams.region")}:
					</span>
					<button
						type="button"
						onClick={() => setRegionFilter("all")}
						className={clsx(
							"border-[2px] border-black px-3 py-1 font-body font-bold text-[10px] uppercase tracking-widest transition-all",
							regionFilter === "all"
								? "bg-electric-lime text-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
								: "surface-white text-gray-600 hover:bg-gray-100",
						)}
					>
						{t("teams.filterAll")}
					</button>
					{TEAM_REGIONS.map((region) => (
						<button
							key={region}
							type="button"
							onClick={() => setRegionFilter(region)}
							className={clsx(
								"border-[2px] border-black px-3 py-1 font-body font-bold text-[10px] uppercase tracking-widest transition-all",
								regionFilter === region
									? `${getRegionColor(region)} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
									: "surface-white text-gray-600 hover:bg-gray-100",
							)}
						>
							{region}
						</button>
					))}
					<span className="ml-auto font-body font-bold text-[10px] text-gray-500 uppercase tabular-nums tracking-widest">
						{t("teams.resultCount", { count: filteredTeams.length })}
					</span>
				</div>

				{/* Table */}
				<div className="overflow-hidden border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)]">
					<div className="overflow-x-auto">
						<div className="min-w-full md:min-w-[800px]">
							<div className="hidden grid-cols-12 gap-4 border-black border-b-[4px] bg-ink px-6 py-4 font-body font-bold text-sm text-white uppercase tracking-widest md:grid">
								<div className="col-span-5">{t("teams.tableTeam")}</div>
								<div className="col-span-3">{t("teams.tableSlug")}</div>
								<div className="col-span-2 text-center">
									{t("teams.tableRegion")}
								</div>
								<div className="col-span-2 text-right">
									{t("teams.tableActions")}
								</div>
							</div>

							{paginatedTeams.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<button
										type="button"
										onClick={handleOpenNew}
										className="flex flex-col items-center justify-center gap-4 border-[3px] border-black border-dashed bg-[#e6e6e6] px-10 py-8 opacity-80 transition-all hover:border-solid hover:bg-white hover:opacity-100"
									>
										<div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-white">
											<Plus className="h-8 w-8 text-ink" strokeWidth={3} />
										</div>
										<span className="font-black font-display text-gray-500 uppercase italic">
											{t("teams.addTeam")}
										</span>
									</button>
								</div>
							) : (
								<div className="divide-y-[3px] divide-black">
									{paginatedTeams.map((team, index) => (
										<div
											key={team.id}
											className={clsx(
												"flex flex-col items-start gap-4 px-4 py-4 transition-colors hover:bg-[#ccff00]/10 md:grid md:grid-cols-12 md:items-center md:gap-4 md:px-6",
												index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]",
											)}
										>
											{/* Team identity - logo prominent */}
											<div className="flex w-full items-center gap-4 md:col-span-5">
												<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border-[3px] border-black bg-paper shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
													<TeamLogo
														teamName={team.name}
														logoUrl={team.logoUrl}
														size="xl"
														className="h-16 w-16 object-contain p-1"
													/>
												</div>
												<div className="min-w-0 overflow-visible">
													<h3
														className="pr-1.5 font-black font-display text-ink text-xl uppercase italic leading-[1.1] tracking-tighter"
														title={team.name}
													>
														{team.name}
													</h3>
													<span className="mt-1 block font-body font-bold text-[10px] text-gray-400 uppercase tabular-nums tracking-widest md:hidden">
														{team.slug}
													</span>
												</div>
											</div>

											{/* Slug */}
											<div className="hidden md:col-span-3 md:block">
												<span className="inline-block rounded border border-gray-300 bg-gray-100 px-2 py-1 font-body font-bold text-[11px] text-gray-600 tracking-widest">
													{team.slug}
												</span>
											</div>

											{/* Region */}
											<div className="flex w-full justify-start md:col-span-2 md:justify-center">
												{team.region ? (
													<span
														className={clsx(
															"rounded-full border-2 border-black px-3 py-1 font-body font-bold text-[10px] uppercase tracking-widest",
															getRegionColor(team.region),
														)}
													>
														{team.region}
													</span>
												) : (
													<span className="font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest">
														--
													</span>
												)}
											</div>

											{/* Actions */}
											<div className="flex w-full justify-start gap-2 md:col-span-2 md:justify-end">
												<button
													type="button"
													onClick={() => handleEdit(team)}
													className="flex items-center gap-2 border-[2px] border-black bg-white px-3 py-2 font-black font-display text-[10px] text-ink uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-electric-lime active:translate-y-[1px] active:shadow-none"
												>
													<Edit2 className="h-3.5 w-3.5" strokeWidth={3} />
													{t("teams.editButton")}
												</button>
												<button
													type="button"
													onClick={() => handleDelete(team.id, team.name)}
													className="border-[2px] border-black bg-white px-3 py-2 text-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-brawl-red hover:text-white active:translate-y-[1px] active:shadow-none"
													aria-label={t("teams.deleteTitle")}
												>
													<Trash2 className="h-3.5 w-3.5" strokeWidth={3} />
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Pagination */}
				{filteredTeams.length > 0 && (
					<div className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.12)]">
						<span className="font-body font-bold text-[10px] text-gray-500 uppercase tabular-nums tracking-widest">
							{t("teams.pageStatus", {
								page: safePage,
								totalPages,
								from: pageStart + 1,
								to: Math.min(pageStart + PAGE_SIZE, filteredTeams.length),
								count: filteredTeams.length,
							})}
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								disabled={safePage <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								className="flex h-10 items-center gap-1 border-[2px] border-black bg-white px-3 font-black font-display text-[10px] text-ink uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-electric-lime disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
							>
								<ChevronLeft className="h-4 w-4" strokeWidth={3} />
								{t("teams.prevPage")}
							</button>
							<button
								type="button"
								disabled={safePage >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								className="flex h-10 items-center gap-1 border-[2px] border-black bg-white px-3 font-black font-display text-[10px] text-ink uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-electric-lime disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
							>
								{t("teams.nextPage")}
								<ChevronRight className="h-4 w-4" strokeWidth={3} />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* MODAL */}
			<AdminFormModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={formData.id ? t("teams.editTitle") : t("teams.newTitle")}
				onSubmit={handleSave}
				size="md"
				formId="team-form"
				headerActions={
					formData.id ? (
						<button
							type="button"
							onClick={() => handleDelete(formData.id!, formData.name)}
							className="border-2 border-white bg-black p-1.5 text-white transition-colors hover:bg-brawl-red"
							title={t("teams.deleteTitle")}
						>
							<Trash2 className="h-5 w-5" strokeWidth={3} />
						</button>
					) : null
				}
				footer={
					<AdminFormActions
						onCancel={() => setIsModalOpen(false)}
						cancelLabel={t("teams.cancel")}
						submitLabel={t("teams.save")}
						savingLabel={t("teams.saving")}
						isSubmitting={isSubmitting || isUploadingLogo}
						submitIcon={<Plus strokeWidth={4} className="h-5 w-5" />}
					/>
				}
			>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
					<div className="space-y-4">
						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("teams.nameLabel")}
							</label>
							<input
								required
								type="text"
								value={formData.name}
								onChange={(e) => handleNameChange(e.target.value)}
								className="w-full border-[3px] border-black bg-white p-3 font-black font-display text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:font-bold placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime"
								placeholder={t("teams.namePlaceholder")}
							/>
						</div>

						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("teams.slugLabel")}
							</label>
							<div className="relative">
								<input
									required
									type="text"
									value={formData.slug}
									onChange={(e) =>
										setFormData({ ...formData, slug: e.target.value })
									}
									className="w-full border-[3px] border-black bg-paper p-3 pr-10 font-body text-black text-sm tabular-nums focus:border-brawl-blue focus:outline-none focus:ring-4 focus:ring-electric-lime"
									placeholder={t("teams.slugPlaceholder")}
								/>
								<Copy className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-black" />
							</div>
						</div>

						<CustomSelect
							label={t("teams.region")}
							value={formData.region}
							onChange={(val) => setFormData({ ...formData, region: val })}
							placeholder="--"
							searchable={false}
							options={TEAM_REGIONS.map((region) => ({
								value: region,
								label: region,
							}))}
						/>
					</div>

					<div className="flex flex-col gap-4">
						<div>
							<label className="mb-1 ml-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
								{t("teams.logoUrlLabel")}
							</label>
							<div className="flex gap-2">
								<div className="relative flex-1">
									<ImageIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
									<input
										type="text"
										value={formData.logoUrl}
										disabled={isUploadingLogo}
										onChange={(e) =>
											setFormData({
												...formData,
												logoUrl: e.target.value,
											})
										}
										className="w-full border-[3px] border-black bg-white p-2 pl-10 font-body text-black text-xs focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime disabled:opacity-60"
										placeholder={
											isUploadingLogo
												? t("teams.uploadingLogo")
												: t("teams.logoPlaceholder")
										}
									/>
									{formData.logoUrl && !isUploadingLogo && (
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
									disabled={isUploadingLogo}
									onClick={() => fileInputRef.current?.click()}
									className="border-[3px] border-black bg-black px-3 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:bg-brawl-blue active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
									title={t("teams.uploadImage")}
								>
									{isUploadingLogo ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Upload className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						<div className="relative flex min-h-[280px] flex-1 items-center justify-center border-[3px] border-black border-dashed bg-tape p-6">
							{formData.logoUrl ? (
								<TeamLogo
									teamName={formData.name}
									logoUrl={formData.logoUrl}
									size="2xl"
									className="drop-shadow-md"
								/>
							) : (
								<div className="text-center text-gray-400">
									<span className="mb-2 block font-black font-display text-4xl uppercase italic opacity-20">
										{t("teams.logoPreview")}
									</span>
									<span className="font-body font-bold text-xs uppercase tracking-widest">
										{t("teams.imagePreview")}
									</span>
								</div>
							)}

							{formData.region && (
								<span
									className={clsx(
										"absolute top-2 right-2 border-2 border-black px-2 py-0.5 font-body font-bold text-[10px] uppercase tracking-widest shadow-sm",
										getRegionColor(formData.region),
									)}
								>
									{formData.region}
								</span>
							)}
						</div>
					</div>
				</div>
			</AdminFormModal>

			<ConfirmationModal
				isOpen={isDeleteModalOpen && !!teamToDelete}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setTeamToDelete(null);
				}}
				onConfirm={confirmDelete}
				title={t("teams.deleteConfirm")}
				description={
					teamToDelete
						? `${t("teams.deleteConfirmMessage")} ${teamToDelete.name}`
						: ""
				}
				confirmLabel={t("teams.deleteConfirmAction")}
				cancelLabel={t("teams.deleteCancel")}
				isLoading={isSubmitting}
				variant="danger"
			/>
		</div>
	);
}

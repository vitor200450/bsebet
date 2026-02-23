// Force HMR refresh

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	Calendar,
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
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	copyTournament,
	deleteTournament,
	getTournaments,
	saveTournament,
} from "@/server/tournaments";
import {
	CustomDatePicker,
	CustomSelect,
} from "../../../components/admin/CustomInputs";
import {
	type Stage,
	StageBuilder,
} from "../../../components/admin/StageBuilder";
import { useSetHeader } from "../../../components/HeaderContext";

export const Route = createFileRoute("/admin/tournaments/")({
	component: AdminTournamentsPage,
	loader: () => getTournaments(),
});

function AdminTournamentsPage() {
	const tournaments = Route.useLoaderData();
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
		scoringRules: {
			winner: number;
			exact: number;
			underdog_25: number;
			underdog_50: number;
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
		scoringRules: {
			winner: 1,
			exact: 3,
			underdog_25: 2,
			underdog_50: 1,
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
		title: "TOURNAMENTS",
		actions: (
			<div className="flex w-full flex-col-reverse items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
				<div className="relative w-full sm:w-auto">
					<input
						type="text"
						placeholder="SEARCH..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full border-[3px] border-black px-4 py-2 font-bold text-black text-sm uppercase placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none sm:w-64"
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
							scoringRules: {
								winner: 1,
								exact: 3,
								underdog_25: 2,
								underdog_50: 1,
							},
						});
						setIsModalOpen(true);
					}}
					className="flex w-full items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-[#ccff00] px-6 py-2 font-black text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:w-auto"
				>
					<Plus className="h-5 w-5" strokeWidth={3} />
					<span className="inline">NOVO TORNEIO</span>
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
			scoringRules: {
				winner: (item.scoringRules as any)?.winner ?? 1,
				exact: (item.scoringRules as any)?.exact ?? 3,
				underdog_25: (item.scoringRules as any)?.underdog_25 ?? 2,
				underdog_50: (item.scoringRules as any)?.underdog_50 ?? 1,
			},
		});
		setIsModalOpen(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		try {
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
				},
			});

			toast.success("Tournament saved successfully!");
			setIsModalOpen(false);
			router.invalidate();
		} catch (error) {
			console.error(error);
			toast.error("Failed to save tournament.");
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
			toast.success("Tournament deleted.");
			setIsDeleteModalOpen(false);
			setItemToDelete(null);
			router.invalidate();
			if (formData.id === itemToDelete.id) {
				setIsModalOpen(false);
			}
		} catch (error) {
			toast.error("Failed to delete.");
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

		// Optimistically close modal or keep open?
		// Let's keep open with loading state like delete/save
		try {
			// We'll wrap the promise here inside the component logic or just use the toast promise
			// but we want to wait for it to close the modal.
			await toast.promise(copyTournament({ data: itemToDuplicate.id }), {
				loading: "Duplicating tournament...",
				success: "Tournament duplicated!",
				error: "Failed to duplicate tournament",
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
							<div className="hidden grid-cols-12 gap-4 border-black border-b-[4px] bg-black px-6 py-4 font-black text-sm text-white uppercase italic tracking-wider md:grid">
								<div className="col-span-4">Tournament Info</div>
								<div className="col-span-2">Details</div>
								<div className="col-span-2">Dates</div>
								<div className="col-span-2 text-center">Status</div>
								<div className="col-span-2 text-right">Actions</div>
							</div>

							{/* Table Rows */}
							{filteredTournaments.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black border-dashed bg-gray-200">
										<Copy className="h-8 w-8 text-gray-400" />
									</div>
									<span className="font-black text-gray-400 text-lg uppercase italic">
										No tournaments found
									</span>
								</div>
							) : (
								<div className="divide-y-[3px] divide-black">
									{filteredTournaments.map((t, index) => (
										<div
											key={t.id}
											className={`flex flex-col items-start gap-4 px-6 py-4 transition-colors md:grid md:grid-cols-12 md:items-center ${
												index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]"
											} hover:bg-[#ccff00]/10`}
										>
											{/* Tournament Info */}
											<div className="flex w-full items-center gap-4 md:col-span-4">
												<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border-[3px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
													{t.logoUrl ? (
														<img
															src={t.logoUrl}
															alt={t.name}
															className="h-full w-full object-contain p-2"
														/>
													) : (
														<ImageIcon className="h-6 w-6 text-gray-300" />
													)}
												</div>
												<div className="min-w-0">
													<h3 className="break-words font-black text-black text-lg uppercase italic leading-none">
														{t.name}
													</h3>
													<span className="rounded border border-gray-300 bg-gray-100 px-1 font-bold font-mono text-gray-500 text-xs">
														{t.slug}
													</span>
												</div>
											</div>

											{/* Details (Region, Format, Players) */}
											<div className="flex w-full flex-row flex-wrap gap-2 md:col-span-2 md:flex-col md:gap-1">
												{t.region && (
													<span className="flex items-center gap-1 font-bold text-black text-xs uppercase">
														<span className="h-2 w-2 rounded-full bg-blue-500" />{" "}
														{t.region}
													</span>
												)}
												{t.format && (
													<span
														className="truncate font-bold text-gray-600 text-xs uppercase"
														title={t.format}
													>
														<span className="mr-1 md:hidden">Fmt:</span>
														{t.format}
													</span>
												)}
												{t.participantsCount && (
													<span className="w-fit rounded bg-gray-200 px-1 font-mono text-[10px] text-gray-500">
														{t.participantsCount} Teams
													</span>
												)}
											</div>

											{/* Dates */}
											<div className="flex w-full gap-2 font-bold text-gray-600 text-sm uppercase md:col-span-2 md:block">
												{t.startDate ? (
													<div className="flex flex-row gap-x-2 md:flex-col">
														<span>{formatDateUTC(t.startDate)}</span>
														{t.endDate && (
															<span className="text-gray-400 text-xs">
																<span className="md:hidden">-</span>
																<span className="hidden md:inline">to</span>{" "}
																{formatDateUTC(t.endDate)}
															</span>
														)}
													</div>
												) : (
													<span className="text-gray-400 italic">TBD</span>
												)}
											</div>

											{/* Status Badge */}
											<div className="flex w-full justify-start md:col-span-2 md:justify-center">
												<span
													className={`whitespace-nowrap border-[2px] border-black px-3 py-1 font-black text-[10px] uppercase italic ${getStatusColor(
														t.status || "upcoming",
													)}`}
												>
													{t.status || "upcoming"}
												</span>
											</div>

											<div className="mt-2 flex w-full flex-wrap justify-start gap-2 md:col-span-2 md:mt-0 md:justify-end">
												<Link
													to="/admin/tournaments/$tournamentId/matches"
													params={{ tournamentId: String(t.id) }}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ccff00] hover:text-black hover:shadow-none md:flex-none"
													title="Match Scheduler"
												>
													<Calendar className="h-4 w-4" strokeWidth={2.5} />
												</Link>
												<button
													onClick={() =>
														handleDuplicate({ id: t.id, name: t.name })
													}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ccff00] hover:text-black hover:shadow-none md:flex-none"
													title="Duplicate"
												>
													<Copy className="h-4 w-4" strokeWidth={2.5} />
												</button>
												<button
													onClick={() => handleEdit(t)}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#2e5cff] hover:text-white hover:shadow-none md:flex-none"
													title="Edit"
												>
													<Edit2 className="h-4 w-4" strokeWidth={2.5} />
												</button>
												<button
													onClick={() => handleDelete(t.id, t.name)}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ff2e2e] hover:text-white hover:shadow-none md:flex-none"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" strokeWidth={2.5} />
												</button>
											</div>
											{formData.logoUrl.startsWith("data:") && (
												<p className="mt-1 w-full font-bold text-[10px] text-red-500 uppercase italic">
													⚠️ Esta logo está em Base64. Salve para converter para
													R2 ou use a{" "}
													<Link
														to="/admin/migrate-logos"
														className="underline hover:text-red-700"
													>
														Página de Migração
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

			{/* CREATE/EDIT MODAL */}
			{isModalOpen && (
				<div className="fade-in fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="fade-in zoom-in-95 relative max-h-[90vh] w-full max-w-5xl animate-in overflow-y-auto border-[4px] border-black bg-white shadow-[10px_10px_0px_0px_#000] duration-200">
						{/* Modal Header */}
						<div className="sticky top-0 z-50 flex items-center justify-between border-black border-b-[4px] bg-[#2e5cff] p-3">
							<h2 className="font-black text-lg text-white uppercase italic">
								{formData.id ? "EDITAR TORNEIO" : "NOVO TORNEIO"}
							</h2>
							<button
								onClick={() => setIsModalOpen(false)}
								className="rounded-sm border-2 border-white bg-black p-1 text-white transition-colors hover:bg-[#ff2e2e]"
							>
								<X className="h-4 w-4" strokeWidth={2} />
							</button>
						</div>

						<form
							onSubmit={handleSave}
							className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2"
						>
							{/* Left Column */}
							<div className="space-y-4">
								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Tournament Name
									</label>
									<input
										required
										type="text"
										value={formData.name}
										onChange={(e) => handleNameChange(e.target.value)}
										className="w-full border-[3px] border-black p-3 font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
										placeholder="EX: WORLD FINALS 2025"
									/>
								</div>

								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Slug (URL)
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
											className="w-full border-[3px] border-black bg-white p-3 pr-10 font-mono text-black text-sm focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
										/>
										<Copy className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-black" />
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
											Participants
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
											className="w-full border-[3px] border-black bg-white p-2 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
											placeholder="Ex: 16"
										/>
									</div>
									<CustomSelect
										label="Region"
										value={formData.region}
										onChange={(val) =>
											setFormData({ ...formData, region: val })
										}
										options={[
											{ value: "Global", label: "Global / World" },
											{ value: "NA", label: "North America" },
											{ value: "EMEA", label: "EMEA" },
											{ value: "SA", label: "South America" },
											{ value: "CN", label: "China" },
											{ value: "EA", label: "East Asia (KR/JP)" },
											{ value: "SEA", label: "Southeast Asia" },
											{ value: "SAS", label: "South Asia" },
										]}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<CustomDatePicker
										label="Start Date"
										value={formData.startDate}
										onChange={(val) =>
											setFormData({ ...formData, startDate: val })
										}
									/>
									<CustomDatePicker
										label="End Date"
										value={formData.endDate}
										onChange={(val) =>
											setFormData({ ...formData, endDate: val })
										}
									/>
								</div>

								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Status
									</label>
									<select
										value={formData.status}
										onChange={(e) =>
											setFormData({
												...formData,
												status: e.target.value as any,
											})
										}
										className="w-full cursor-pointer border-[3px] border-black bg-white p-3 font-bold text-black uppercase focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
									>
										<option value="upcoming">Upcoming</option>
										<option value="active">Active</option>
										<option value="finished">Finished</option>
									</select>
								</div>

								{/* Default Scoring Rules */}
								<div className="space-y-3 border-[3px] border-black bg-gray-50 p-4">
									<h3 className="flex items-center gap-2 font-black text-black text-sm uppercase">
										Default Scoring Rules
									</h3>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
												Winner
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
												className="w-full border-2 border-black bg-white p-2 font-bold text-black text-sm"
											/>
										</div>
										<div>
											<label className="mb-1 block font-bold text-[10px] text-gray-500 uppercase">
												Exact Score
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
												className="w-full border-2 border-black bg-white p-2 font-bold text-black text-sm"
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												className="mb-1 block font-bold text-[10px] text-gray-500 uppercase"
												title="Bonus when picking winner with ≤25% of votes"
											>
												Underdog Tier 1 (≤25%)
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
												className="w-full border-2 border-black bg-white p-2 font-bold text-black text-sm"
											/>
										</div>
										<div>
											<label
												className="mb-1 block font-bold text-[10px] text-gray-500 uppercase"
												title="Bonus when picking winner with 26-50% of votes"
											>
												Underdog Tier 2 (26-50%)
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
												className="w-full border-2 border-black bg-white p-2 font-bold text-black text-sm"
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Right Column */}
							<div className="flex flex-col gap-4">
								{/* Stages Builder */}
								<StageBuilder
									stages={formData.stages}
									onChange={(stages) => setFormData({ ...formData, stages })}
								/>

								{/* Logo Upload */}
								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Logo URL
									</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<ImageIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
											<input
												type="text"
												value={
													formData.logoUrl.startsWith("data:")
														? "[IMAGEM BASE64 - SALVE PARA CONVERTER]"
														: formData.logoUrl
												}
												readOnly={formData.logoUrl.startsWith("data:")}
												onChange={(e) =>
													setFormData({ ...formData, logoUrl: e.target.value })
												}
												className={`w-full border-[3px] border-black p-2 pl-9 font-mono text-black text-xs focus:border-black focus:outline-none ${
													formData.logoUrl.startsWith("data:")
														? "bg-gray-100 text-gray-400 italic"
														: "bg-white"
												}`}
												placeholder="https://..."
											/>
											{formData.logoUrl.startsWith("data:") && (
												<button
													type="button"
													onClick={() =>
														setFormData({ ...formData, logoUrl: "" })
													}
													className="absolute top-1/2 right-2 -translate-y-1/2 border-2 border-black bg-white p-0.5 hover:bg-red-50"
												>
													<X className="h-3 w-3 text-red-500" />
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
											className="border-[3px] border-black bg-black px-3 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:bg-[#2e5cff] active:translate-y-[2px] active:shadow-none"
										>
											<Upload className="h-4 w-4" />
										</button>
									</div>
									{formData.logoUrl && (
										<div className="mt-2 flex justify-center border-2 border-black border-dashed bg-gray-50 p-4">
											<img
												src={formData.logoUrl}
												alt="Preview"
												className="h-24 w-24 object-contain"
											/>
										</div>
									)}
								</div>
							</div>

							{/* Footer */}
							<div className="col-span-1 mt-8 flex gap-3 border-gray-100 border-t-2 pt-4 md:col-span-2">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="flex-1 border-[3px] border-transparent py-3 font-black text-gray-500 uppercase transition-colors hover:bg-gray-100"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="flex flex-[2] items-center justify-center gap-2 border-[3px] border-black bg-[#ccff00] py-3 font-black text-black text-lg uppercase italic shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-[#bbe000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] disabled:cursor-not-allowed disabled:opacity-70"
								>
									{isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
									SAVE TOURNAMENT
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* DELETE CONFIRMATION MODAL */}
			{isDeleteModalOpen && itemToDelete && (
				<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="zoom-in-95 w-full max-w-md transform animate-in overflow-hidden border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] duration-200">
						<div className="flex items-center gap-3 border-black border-b-[4px] bg-[#ff2e2e] p-4">
							<div className="border-[3px] border-black bg-white p-1">
								<Trash2 className="h-6 w-6 stroke-[3px] text-[#ff2e2e]" />
							</div>
							<h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">
								DELETE TOURNAMENT
							</h3>
						</div>

						<div className="p-6">
							<p className="mb-4 font-bold text-black text-lg">
								Are you sure you want to delete{" "}
								<span className="font-black italic">{itemToDelete.name}</span>?
							</p>

							<div className="flex flex-col gap-3">
								<button
									onClick={confirmDelete}
									disabled={isSubmitting}
									className="flex w-full items-center justify-center gap-2 border-[4px] border-black bg-[#ff2e2e] py-4 font-black text-white uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#d41d1d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
								>
									{isSubmitting ? (
										<Loader2 className="h-6 w-6 animate-spin" />
									) : (
										"YES, DELETE IT"
									)}
								</button>
								<button
									onClick={() => setIsDeleteModalOpen(false)}
									className="w-full border-[3px] border-black bg-white py-3 font-black text-black uppercase transition-colors hover:bg-gray-100"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			{/* DUPLICATE CONFIRMATION MODAL */}
			{isDuplicateModalOpen && itemToDuplicate && (
				<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="zoom-in-95 w-full max-w-md transform animate-in overflow-hidden border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] duration-200">
						<div className="flex items-center gap-3 border-black border-b-[4px] bg-[#ccff00] p-4">
							<div className="border-[3px] border-black bg-white p-1">
								<Copy className="h-6 w-6 stroke-[3px] text-black" />
							</div>
							<h3 className="font-black text-2xl text-black uppercase italic tracking-tighter">
								DUPLICATE TOURNAMENT
							</h3>
						</div>

						<div className="p-6">
							<p className="mb-4 font-bold text-black text-lg">
								Are you sure you want to duplicate{" "}
								<span className="font-black italic">
									{itemToDuplicate.name}
								</span>
								?
							</p>

							<div className="mb-6 rounded border-2 border-yellow-200 bg-yellow-50 p-3 font-bold text-sm text-yellow-800">
								This will create a new tournament with the same settings, but
								<span className="ml-1 underline">
									without participants or logo
								</span>
								.
							</div>

							<div className="flex flex-col gap-3">
								<button
									onClick={confirmDuplicate}
									className="flex w-full items-center justify-center gap-2 border-[4px] border-black bg-[#ccff00] py-4 font-black text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
								>
									Confirm Duplicate
								</button>
								<button
									onClick={() => setIsDuplicateModalOpen(false)}
									className="w-full border-[3px] border-black bg-white py-3 font-black text-black uppercase transition-colors hover:bg-gray-100"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

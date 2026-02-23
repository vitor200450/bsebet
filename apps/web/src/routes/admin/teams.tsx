import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
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
import { deleteTeam, getTeams, saveTeam } from "@/server/teams";
import { useSetHeader } from "../../components/HeaderContext";
import { TeamLogo } from "../../components/TeamLogo";

export const Route = createFileRoute("/admin/teams")({
	component: AdminTeamsPage,
	loader: () => getTeams(),
});

// Helper for Region Colors
const getRegionColor = (region: string) => {
	switch (region) {
		case "NA":
			return "bg-[#2e5cff] text-white shadow-[1px_1px_0px_0px_#000]";
		case "EMEA":
			return "bg-[#9b59b6] text-white shadow-[1px_1px_0px_0px_#000]";
		case "CN":
			return "bg-[#ff2e2e] text-white shadow-[1px_1px_0px_0px_#000]";
		case "EA":
			return "bg-[#ff9f43] text-black shadow-[1px_1px_0px_0px_#000]";
		case "SEA":
			return "bg-[#1dd1a1] text-black shadow-[1px_1px_0px_0px_#000]";
		case "SAS":
			return "bg-[#f39c12] text-white shadow-[1px_1px_0px_0px_#000]";
		case "SA":
		default:
			return "bg-[#2ecc71] text-white shadow-[1px_1px_0px_0px_#000]";
	}
};

const getRegionHoverColor = (region?: string) => {
	switch (region) {
		case "NA":
			return "group-hover:bg-[#2e5cff]";
		case "EMEA":
			return "group-hover:bg-[#9b59b6]";
		case "CN":
			return "group-hover:bg-[#ff2e2e]";
		case "EA":
			return "group-hover:bg-[#ff9f43]";
		case "SEA":
			return "group-hover:bg-[#1dd1a1]";
		case "SAS":
			return "group-hover:bg-[#f39c12]";
		case "SA":
		default:
			return "group-hover:bg-[#2ecc71]";
	}
};

const getRegionHoverBorderColor = (
	region?: string,
	type: "card" | "group" = "card",
) => {
	if (type === "card") {
		switch (region) {
			case "NA":
				return "hover:!border-[#2e5cff]";
			case "EMEA":
				return "hover:!border-[#9b59b6]";
			case "CN":
				return "hover:!border-[#ff2e2e]";
			case "EA":
				return "hover:!border-[#ff9f43]";
			case "SEA":
				return "hover:!border-[#1dd1a1]";
			case "SAS":
				return "hover:!border-[#f39c12]";
			case "SA":
			default:
				return "hover:!border-[#2ecc71]";
		}
	}
	switch (region) {
		case "NA":
			return "group-hover:border-[#2e5cff]";
		case "EMEA":
			return "group-hover:border-[#9b59b6]";
		case "CN":
			return "group-hover:border-[#ff2e2e]";
		case "EA":
			return "group-hover:border-[#ff9f43]";
		case "SEA":
			return "group-hover:border-[#1dd1a1]";
		case "SAS":
			return "group-hover:border-[#f39c12]";
		case "SA":
		default:
			return "group-hover:border-[#2ecc71]";
	}
};

function AdminTeamsPage() {
	const teams = Route.useLoaderData();
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [sortOrder, setSortOrder] = useState("recent");
	const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
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
			toast.success("Time salvo com sucesso!");
		} catch (error: any) {
			console.error("Failed to save team:", error);
			toast.error("Erro ao salvar time", {
				description: error.message || "Verifique os dados e tente novamente.",
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
			toast.success(`Time "${teamToDelete.name}" excluído!`);
			setIsDeleteModalOpen(false);
			setTeamToDelete(null);
			router.invalidate();
		} catch (error: any) {
			toast.error("Erro ao excluir time");
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

	// Image Upload Logic
	const fileInputRef = useRef<HTMLInputElement>(null);
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 500 * 1024) {
			// 500KB limit
			alert("O arquivo é muito grande! Máximo 500KB.");
			return;
		}

		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result as string;
			setFormData((prev) => ({ ...prev, logoUrl: result }));
		};
		reader.readAsDataURL(file);
	};

	const filteredTeams = teams
		.filter(
			(t) =>
				t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				t.slug.toLowerCase().includes(searchTerm.toLowerCase()),
		)
		.sort((a, b) => {
			if (sortOrder === "name") return a.name.localeCompare(b.name);
			if (sortOrder === "region")
				return (a.region || "").localeCompare(b.region || "");
			if (sortOrder === "recent") return (b.id || 0) - (a.id || 0); // Desc ID
			return 0;
		});

	useSetHeader({
		title: "TEAMS",
		actions: (
			<div className="flex w-full flex-col-reverse items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
				{/* Sorting Dropdown */}
				<div className="relative w-full sm:w-auto">
					<button
						type="button"
						onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
						className="relative flex w-full min-w-[120px] items-center gap-2 border-[3px] border-black bg-white px-4 py-2 pr-10 font-bold text-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:w-auto"
					>
						<span className="mr-1 text-gray-400 text-xs">Sort:</span>
						{sortOrder === "recent"
							? "Recents"
							: sortOrder === "name"
								? "A-Z"
								: "Region"}
						<div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
							<span className="text-[10px]">▼</span>
						</div>
					</button>

					{isSortDropdownOpen && (
						<div className="absolute top-full left-0 z-50 mt-1 w-full border-[3px] border-black bg-white py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
							{[
								{ id: "recent", label: "Recents" },
								{ id: "name", label: "A-Z" },
								{ id: "region", label: "Region" },
							].map((opt) => (
								<button
									key={opt.id}
									onClick={() => {
										setSortOrder(opt.id);
										setIsSortDropdownOpen(false);
									}}
									className={`w-full px-4 py-2 text-left font-bold text-black text-xs uppercase transition-colors hover:bg-[#ccff00] ${
										sortOrder === opt.id ? "bg-gray-100" : ""
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Search Bar */}
				<div className="relative w-full sm:w-auto">
					<input
						type="text"
						placeholder="BUSCAR TIME..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full border-[3px] border-black px-4 py-2 font-bold text-black text-sm uppercase placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none sm:w-64"
					/>
					<Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
				</div>

				<button
					onClick={() => {
						setIsModalOpen(true);
						resetForm();
					}}
					className="flex w-full items-center justify-center gap-2 whitespace-nowrap border-[3px] border-black bg-[#ccff00] px-6 py-2 font-black text-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#bbe000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:w-auto"
				>
					<Plus className="h-5 w-5" strokeWidth={3} />
					<span className="inline">NOVO TIME</span>
				</button>
			</div>
		),
	});

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans">
			{/* GRID */}
			<div className="mx-auto max-w-[1600px] px-6 py-8">
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredTeams.map((team) => (
						<div
							key={team.id}
							className={`group relative flex flex-col overflow-hidden border-[3px] border-black bg-white p-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${getRegionHoverBorderColor(team.region || undefined, "card")}`}
						>
							{/* Decoration */}
							<div
								className={`absolute top-0 right-0 z-0 -mt-8 -mr-8 h-16 w-16 rotate-45 border-black border-b-[3px] border-l-[3px] bg-[#f0f0f0] transition-colors ${getRegionHoverColor(team.region || undefined)} ${getRegionHoverBorderColor(team.region || undefined, "group")}`}
							/>

							<div className="relative z-10 flex flex-1 flex-col items-center gap-4 p-6">
								{/* Logo Area */}
								<div
									className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border-[3px] border-black bg-[#f0f0f0] shadow-inner transition-all duration-300 group-hover:scale-105 ${getRegionHoverBorderColor(team.region || undefined, "group")}`}
								>
									<TeamLogo
										teamName={team.name}
										logoUrl={team.logoUrl}
										size="lg"
										className="h-full w-full p-4"
									/>
								</div>

								{/* Info */}
								<div className="w-full text-center">
									<h3
										className="w-full truncate font-black text-black text-xl uppercase italic tracking-tight"
										title={team.name}
									>
										{team.name}
									</h3>
									<div className="mt-2 flex items-center justify-center gap-2">
										<span className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 font-mono text-gray-500 text-xs">
											{team.slug}
										</span>
										{team.region && (
											<span
												className={`rounded-full border-2 border-black px-2 py-0.5 font-bold text-xs ${getRegionColor(
													team.region,
												)}`}
											>
												{team.region}
											</span>
										)}
									</div>
								</div>
							</div>

							{/* Actions Footer */}
							<div
								className={`flex justify-center gap-2 border-black border-t-[3px] bg-gray-50 p-3 transition-colors ${getRegionHoverBorderColor(team.region || undefined, "group")}`}
							>
								<button
									onClick={() => handleEdit(team)}
									className={`flex flex-1 translate-y-0 items-center justify-center gap-2 rounded-sm border-2 border-black bg-white px-3 py-1.5 font-bold text-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all hover:translate-y-[2px] hover:bg-[#ccff00] hover:shadow-none ${getRegionHoverBorderColor(team.region || undefined, "group")}`}
								>
									<Edit2 className="h-4 w-4" />
									EDITAR
								</button>
								<button
									onClick={() => handleDelete(team.id, team.name)}
									className={`translate-y-0 rounded-sm border-2 border-black bg-white px-3 py-1.5 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all hover:translate-y-[2px] hover:bg-[#ff2e2e] hover:text-white hover:shadow-none ${getRegionHoverBorderColor(team.region || undefined, "group")}`}
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}

					{/* Empty State / Add New Card */}
					{filteredTeams.length === 0 && (
						<button
							onClick={handleOpenNew}
							className="flex min-h-[300px] flex-col items-center justify-center gap-4 border-[3px] border-black border-dashed bg-[#e6e6e6] p-8 opacity-60 shadow-inner transition-all hover:border-solid hover:bg-white hover:opacity-100"
						>
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-300">
								<Plus className="h-8 w-8 text-gray-500" />
							</div>
							<span className="font-black text-gray-500 uppercase italic">
								Adicionar Time
							</span>
						</button>
					)}
				</div>
			</div>

			{/* MODAL */}
			{isModalOpen && (
				<div className="fade-in fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="fade-in zoom-in-95 relative w-full max-w-2xl animate-in overflow-hidden border-[4px] border-black bg-white shadow-[10px_10px_0px_0px_#000] duration-200">
						{/* Modal Header */}
						<div className="flex items-center justify-between border-black border-b-[4px] bg-[#2e5cff] p-4">
							<h2 className="font-black text-white text-xl uppercase italic">
								{formData.id ? "EDITAR TIME" : "NOVO TIME"}
							</h2>
							<div className="flex items-center gap-2">
								{formData.id && ( // Only show delete button if editing an existing team
									<button
										onClick={() => handleDelete(formData.id!, formData.name)}
										className="rounded-sm p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#ff2e2e]"
										title="Excluir Time"
									>
										<Trash2 className="h-5 w-5" />
									</button>
								)}
								<button
									onClick={() => setIsModalOpen(false)}
									className="rounded-sm border-2 border-white bg-black p-1 text-white transition-colors hover:bg-[#ff2e2e]"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						<form
							onSubmit={handleSave}
							className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2"
						>
							{/* Left: Inputs */}
							<div className="space-y-4">
								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Nome do Time
									</label>
									<input
										required
										type="text"
										value={formData.name}
										onChange={(e) => handleNameChange(e.target.value)}
										className="w-full border-[3px] border-black p-3 font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
										placeholder="EX: LOUD"
									/>
								</div>

								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Slug (URL)
									</label>
									<div className="relative">
										<input
											required
											type="text"
											value={formData.slug}
											onChange={(e) =>
												setFormData({ ...formData, slug: e.target.value })
											}
											className="w-full border-[3px] border-black bg-gray-50 p-3 pr-10 font-mono text-black text-sm focus:border-[#2e5cff] focus:outline-none"
											placeholder="ex: loud-gg"
										/>
										<Copy className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-black" />
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="relative">
										<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
											Região
										</label>

										{/* Custom Dropdown Trigger */}
										<button
											type="button"
											onClick={() =>
												setIsRegionDropdownOpen(!isRegionDropdownOpen)
											}
											className="relative flex w-full items-center justify-center gap-2 border-[3px] border-black bg-white p-3 text-center font-bold text-black uppercase focus:border-black focus:outline-none focus:ring-4 focus:ring-[#ffc700]"
										>
											{formData.region || (
												<span className="text-gray-400">--</span>
											)}
											<div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
												<span className="text-[10px] leading-none">▼</span>
											</div>
										</button>

										{/* Dropdown Menu */}
										{isRegionDropdownOpen && (
											<div className="absolute top-full left-0 z-50 max-h-48 w-full overflow-y-auto border-[3px] border-black border-t-0 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
												{["SA", "NA", "EMEA", "CN", "EA", "SEA", "SAS"].map(
													(r) => (
														<button
															key={r}
															type="button"
															onClick={() => {
																setFormData({ ...formData, region: r });
																setIsRegionDropdownOpen(false);
															}}
															className="w-full border-gray-100 border-b-2 py-2 text-center font-bold text-black uppercase transition-colors last:border-0 hover:bg-[#ffc700] hover:text-black"
														>
															{r}
														</button>
													),
												)}
											</div>
										)}
									</div>
									{/* Placeholder for future fields like color etc */}
								</div>
							</div>

							{/* Right: Preview & Logo */}
							<div className="flex flex-col gap-4">
								<div>
									<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
										Logo URL (ou Upload)
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
													setFormData({
														...formData,
														logoUrl: e.target.value,
													})
												}
												className={`w-full border-[3px] border-black p-2 pl-10 font-mono text-black text-xs focus:border-black focus:outline-none ${
													formData.logoUrl.startsWith("data:")
														? "bg-gray-100 text-gray-400 italic"
														: ""
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
											title="Upload Imagem"
										>
											<Upload className="h-4 w-4" />
										</button>
									</div>
									{formData.logoUrl.startsWith("data:") && (
										<p className="mt-1 font-bold text-[10px] text-red-500 uppercase italic">
											⚠️ Esta logo está em Base64. Salve para converter para R2
											ou use a{" "}
											<Link
												to="/admin/migrate-logos"
												className="underline hover:text-red-700"
											>
												Página de Migração
											</Link>
										</p>
									)}
								</div>

								<div className="group relative flex min-h-[160px] flex-1 items-center justify-center border-[3px] border-black border-dashed bg-[#e6e6e6]">
									{formData.logoUrl ? (
										<TeamLogo
											teamName={formData.name}
											logoUrl={formData.logoUrl}
											size="lg"
											className="drop-shadow-md"
										/>
									) : (
										<div className="text-center text-gray-400">
											<span className="mb-2 block font-black text-4xl opacity-20">
												LOGO
											</span>
											<span className="font-bold text-xs uppercase">
												Preview da Imagem
											</span>
										</div>
									)}

									{/* Fake region badge preview */}
									{formData.region && (
										<span
											className={`absolute top-2 right-2 rounded-full border-2 border-black px-2 py-0.5 font-bold text-[10px] shadow-sm ${getRegionColor(
												formData.region,
											)}`}
										>
											{formData.region}
										</span>
									)}
								</div>
							</div>

							{/* Footer / Buttons */}
							<div className="col-span-1 mt-4 flex gap-3 border-gray-100 border-t-2 pt-4 md:col-span-2">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="flex-1 border-[3px] border-transparent py-3 font-black text-gray-500 uppercase transition-colors hover:bg-gray-100 disabled:opacity-50"
									disabled={isSubmitting}
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="flex flex-[2] items-center justify-center gap-2 border-[3px] border-black bg-[#ccff00] py-3 font-black text-black text-lg uppercase italic shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-[#bbe000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] disabled:cursor-not-allowed disabled:opacity-70"
								>
									{isSubmitting ? (
										<Loader2 className="h-5 w-5 animate-spin" />
									) : (
										<Plus strokeWidth={4} className="h-5 w-5" />
									)}
									{isSubmitting ? "Salvando..." : "Salvar Time"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
			{/* Custom Delete Modal */}
			{isDeleteModalOpen && teamToDelete && (
				<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="fade-in zoom-in-95 w-full max-w-md transform animate-in overflow-hidden border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] duration-200">
						{/* Header / Alert */}
						<div className="flex items-center gap-3 border-black border-b-[4px] bg-[#ff2e2e] p-4">
							<div className="border-[3px] border-black bg-white p-1">
								<Trash2 className="h-6 w-6 stroke-[3px] text-[#ff2e2e]" />
							</div>
							<h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">
								Confirmar Exclusão
							</h3>
						</div>

						<div className="p-6">
							<p className="mb-2 font-bold text-black text-lg">
								Tem certeza que deseja excluir este time?
							</p>
							<div className="mb-6 flex items-center gap-4 border-[3px] border-black bg-gray-100 p-4">
								{teamToDelete.name && (
									<div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-white font-black text-[#ff2e2e] text-xl italic">
										{teamToDelete.name[0]}
									</div>
								)}
								<div>
									<span className="block font-black text-[10px] text-gray-500 uppercase tracking-widest">
										Time Selecionado
									</span>
									<span className="block font-black text-black text-xl uppercase italic">
										{teamToDelete.name}
									</span>
								</div>
							</div>

							<div className="flex flex-col gap-3">
								<button
									onClick={confirmDelete}
									disabled={isSubmitting}
									className="flex w-full items-center justify-center gap-2 border-[4px] border-black bg-[#ff2e2e] py-4 font-black text-white uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#d41d1d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isSubmitting ? (
										<Loader2 className="h-6 w-6 animate-spin" />
									) : (
										"SIM, EXCLUIR TIME"
									)}
								</button>
								<button
									onClick={() => {
										setIsDeleteModalOpen(false);
										setTeamToDelete(null);
									}}
									disabled={isSubmitting}
									className="w-full border-[3px] border-black bg-white py-3 font-black text-black uppercase transition-colors hover:bg-gray-100 disabled:opacity-50"
								>
									Não, Cancelar
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

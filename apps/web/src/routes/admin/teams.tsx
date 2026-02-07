import { deleteTeam, getTeams, saveTeam } from "@/server/teams";
import { createFileRoute, useRouter } from "@tanstack/react-router";
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
    case "SA":
    default:
      return "bg-[#ffc700] text-black shadow-[1px_1px_0px_0px_#000]";
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

  return (
    <div className="min-h-screen bg-[#e6e6e6] font-sans pb-20">
      {/* HEADER */}
      <div className="bg-white border-b-4 border-black px-8 py-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-black transform skew-x-[-10deg]">
          ADMIN <span className="text-[#2e5cff]">TEAMS</span>
        </h1>
        <div className="flex items-center gap-4">
          {/* Sorting Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="bg-white border-[3px] border-black px-4 py-2 pr-10 font-bold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 relative min-w-[120px] text-black"
            >
              <span className="text-xs text-gray-400 mr-1">Sort:</span>
              {sortOrder === "recent"
                ? "Recents"
                : sortOrder === "name"
                  ? "A-Z"
                  : "Region"}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-[10px]">▼</span>
              </div>
            </button>

            {isSortDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 py-1">
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
                    className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-colors hover:bg-[#ccff00] text-black ${
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
          <div className="relative">
            <input
              type="text"
              placeholder="BUSCAR TIME..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-[3px] border-black px-4 py-2 w-64 font-bold text-sm uppercase placeholder-gray-400 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <button
            onClick={() => {
              setIsModalOpen(true);
              resetForm();
            }}
            className="flex items-center gap-2 bg-[#ccff00] hover:bg-[#bbe000] text-black border-[3px] border-black px-6 py-2 font-black italic uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            NOVO TIME
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="group bg-white border-[3px] border-black p-0 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 flex flex-col relative overflow-hidden"
            >
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#f0f0f0] border-l-[3px] border-b-[3px] border-black -mr-8 -mt-8 rotate-45 z-0 group-hover:bg-[#ffc700] transition-colors"></div>

              <div className="p-6 flex flex-col items-center gap-4 relative z-10 flex-1">
                {/* Logo Area */}
                <div className="w-32 h-32 bg-[#f0f0f0] border-[3px] border-black rounded-full flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <span className="text-4xl font-black text-gray-300 select-none">
                      ?
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="text-center w-full">
                  <h3
                    className="text-xl font-black uppercase italic tracking-tight truncate w-full text-black"
                    title={team.name}
                  >
                    {team.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                      {team.slug}
                    </span>
                    {team.region && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 border-2 border-black rounded-full ${getRegionColor(
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
              <div className="border-t-[3px] border-black p-3 bg-gray-50 flex gap-2 justify-center">
                <button
                  onClick={() => handleEdit(team)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-[#ccff00] text-black font-bold py-1.5 px-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] transition-all text-sm rounded-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  EDITAR
                </button>
                <button
                  onClick={() => handleDelete(team.id, team.name)}
                  className="px-3 py-1.5 bg-white hover:bg-[#ff2e2e] hover:text-white text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] transition-all rounded-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Empty State / Add New Card */}
          {filteredTeams.length === 0 && (
            <button
              onClick={handleOpenNew}
              className="flex flex-col items-center justify-center gap-4 bg-[#e6e6e6] border-[3px] border-black border-dashed p-8 shadow-inner opacity-60 hover:opacity-100 hover:bg-white hover:border-solid transition-all min-h-[300px]"
            >
              <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                <Plus className="w-8 h-8 text-gray-500" />
              </div>
              <span className="font-black italic uppercase text-gray-500">
                Adicionar Time
              </span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_#000] w-full max-w-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#2e5cff] p-4 flex justify-between items-center border-b-[4px] border-black">
              <h2 className="text-white font-black italic uppercase text-xl">
                {formData.id ? "EDITAR TIME" : "NOVO TIME"}
              </h2>
              <div className="flex items-center gap-2">
                {formData.id && ( // Only show delete button if editing an existing team
                  <button
                    onClick={() => handleDelete(formData.id!, formData.name)}
                    className="p-2 text-gray-400 hover:text-[#ff2e2e] transition-colors rounded-sm hover:bg-gray-100"
                    title="Excluir Time"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-black hover:bg-[#ff2e2e] text-white p-1 border-2 border-white rounded-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Left: Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
                    Nome do Time
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full border-[3px] border-black p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] focus:border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] text-black placeholder:text-gray-400"
                    placeholder="EX: LOUD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
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
                      className="w-full border-[3px] border-black p-3 pr-10 font-mono text-sm bg-gray-50 focus:outline-none focus:border-[#2e5cff] text-black"
                      placeholder="ex: loud-gg"
                    />
                    <Copy className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-black" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
                      Região
                    </label>

                    {/* Custom Dropdown Trigger */}
                    <button
                      type="button"
                      onClick={() =>
                        setIsRegionDropdownOpen(!isRegionDropdownOpen)
                      }
                      className="w-full border-[3px] border-black p-3 font-bold text-center uppercase focus:outline-none focus:ring-4 focus:ring-[#ffc700] focus:border-black text-black bg-white flex items-center justify-center gap-2 relative"
                    >
                      {formData.region || (
                        <span className="text-gray-400">--</span>
                      )}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <span className="text-[10px] leading-none">▼</span>
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isRegionDropdownOpen && (
                      <div className="absolute top-full left-0 w-full bg-white border-[3px] border-black border-t-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-48 overflow-y-auto">
                        {["SA", "NA", "EMEA", "EA", "SEA", "CN"].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, region: r });
                              setIsRegionDropdownOpen(false);
                            }}
                            className="w-full text-center py-2 font-bold hover:bg-[#ffc700] hover:text-black border-b-2 border-gray-100 last:border-0 transition-colors uppercase text-black"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Placeholder for future fields like color etc */}
                </div>
              </div>

              {/* Right: Preview & Logo */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
                    Logo URL (ou Upload)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={formData.logoUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            logoUrl: e.target.value,
                          })
                        }
                        className="w-full border-[3px] border-black p-2 pl-10 text-xs font-mono focus:outline-none focus:border-black text-black"
                        placeholder="https://..."
                      />
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
                      className="bg-black hover:bg-[#2e5cff] text-white px-3 border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all"
                      title="Upload Imagem"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-[#e6e6e6] border-[3px] border-black border-dashed flex items-center justify-center relative min-h-[160px] group">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Preview"
                      className="w-32 h-32 object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <span className="block text-4xl font-black opacity-20 mb-2">
                        LOGO
                      </span>
                      <span className="text-xs uppercase font-bold">
                        Preview da Imagem
                      </span>
                    </div>
                  )}

                  {/* Fake region badge preview */}
                  {formData.region && (
                    <span
                      className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 border-2 border-black rounded-full shadow-sm ${getRegionColor(
                        formData.region,
                      )}`}
                    >
                      {formData.region}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer / Buttons */}
              <div className="col-span-1 md:col-span-2 flex gap-3 mt-4 pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-black uppercase border-[3px] border-transparent hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-[#ccff00] hover:bg-[#bbe000] text-black text-lg py-3 font-black italic uppercase border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus strokeWidth={4} className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Alert */}
            <div className="bg-[#ff2e2e] border-b-[4px] border-black p-4 flex items-center gap-3">
              <div className="bg-white border-[3px] border-black p-1">
                <Trash2 className="w-6 h-6 text-[#ff2e2e] stroke-[3px]" />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                Confirmar Exclusão
              </h3>
            </div>

            <div className="p-6">
              <p className="text-black font-bold text-lg mb-2">
                Tem certeza que deseja excluir este time?
              </p>
              <div className="bg-gray-100 border-[3px] border-black p-4 mb-6 flex items-center gap-4">
                {teamToDelete.name && (
                  <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center font-black text-xl italic text-[#ff2e2e]">
                    {teamToDelete.name[0]}
                  </div>
                )}
                <div>
                  <span className="block text-[10px] uppercase font-black text-gray-500 tracking-widest">
                    Time Selecionado
                  </span>
                  <span className="block text-xl font-black uppercase text-black italic">
                    {teamToDelete.name}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="w-full bg-[#ff2e2e] hover:bg-[#d41d1d] text-white py-4 font-black italic uppercase border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
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
                  className="w-full bg-white hover:bg-gray-100 text-black py-3 font-black uppercase border-[3px] border-black transition-colors disabled:opacity-50"
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

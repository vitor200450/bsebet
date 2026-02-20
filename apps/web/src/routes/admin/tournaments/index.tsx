// Force HMR refresh
import {
  deleteTournament,
  getTournaments,
  saveTournament,
  copyTournament,
} from "@/server/tournaments";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
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
  StageBuilder,
  type Stage,
} from "../../../components/admin/StageBuilder";
import {
  CustomDatePicker,
  CustomSelect,
} from "../../../components/admin/CustomInputs";
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
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 border-[3px] border-black px-4 py-2 font-bold text-sm uppercase placeholder-gray-400 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
          className="flex items-center justify-center gap-2 bg-[#ccff00] hover:bg-[#bbe000] text-black border-[3px] border-black px-6 py-2 font-black italic uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all whitespace-nowrap w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" strokeWidth={3} />
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
    <div className="min-h-screen bg-paper bg-paper-texture font-sans pb-20">
      {/* LIST CONTENT */}
      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full md:min-w-[800px]">
              {/* Table Header - Hidden on small screens */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-black text-white text-sm font-black uppercase italic tracking-wider border-b-[4px] border-black">
                <div className="col-span-4">Tournament Info</div>
                <div className="col-span-2">Details</div>
                <div className="col-span-2">Dates</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table Rows */}
              {filteredTournaments.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center border-[3px] border-black border-dashed">
                    <Copy className="w-8 h-8 text-gray-400" />
                  </div>
                  <span className="font-black text-gray-400 uppercase italic text-lg">
                    No tournaments found
                  </span>
                </div>
              ) : (
                <div className="divide-y-[3px] divide-black">
                  {filteredTournaments.map((t, index) => (
                    <div
                      key={t.id}
                      className={`flex flex-col md:grid md:grid-cols-12 gap-4 px-6 py-4 items-start md:items-center transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]"
                      } hover:bg-[#ccff00]/10`}
                    >
                      {/* Tournament Info */}
                      <div className="w-full md:col-span-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-md bg-white border-[3px] border-black flex items-center justify-center overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt={t.name}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <ImageIcon className="text-gray-300 w-6 h-6" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-lg text-black uppercase italic leading-none break-words">
                            {t.name}
                          </h3>
                          <span className="text-xs font-bold text-gray-500 font-mono bg-gray-100 px-1 rounded border border-gray-300">
                            {t.slug}
                          </span>
                        </div>
                      </div>

                      {/* Details (Region, Format, Players) */}
                      <div className="w-full md:col-span-2 flex flex-row md:flex-col gap-2 md:gap-1 flex-wrap">
                        {t.region && (
                          <span className="text-xs font-bold uppercase text-black flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
                            {t.region}
                          </span>
                        )}
                        {t.format && (
                          <span
                            className="text-xs text-gray-600 font-bold uppercase truncate"
                            title={t.format}
                          >
                            <span className="md:hidden mr-1">Fmt:</span>
                            {t.format}
                          </span>
                        )}
                        {t.participantsCount && (
                          <span className="text-[10px] font-mono text-gray-500 bg-gray-200 px-1 rounded w-fit">
                            {t.participantsCount} Teams
                          </span>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="w-full md:col-span-2 text-sm font-bold text-gray-600 uppercase flex md:block gap-2">
                        {t.startDate ? (
                          <div className="flex flex-row md:flex-col gap-x-2">
                            <span>{formatDateUTC(t.startDate)}</span>
                            {t.endDate && (
                              <span className="text-xs text-gray-400">
                                <span className="md:hidden">-</span>
                                <span className="hidden md:inline">
                                  to
                                </span>{" "}
                                {formatDateUTC(t.endDate)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">TBD</span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="w-full md:col-span-2 flex justify-start md:justify-center">
                        <span
                          className={`text-[10px] font-black uppercase italic px-3 py-1 border-[2px] border-black whitespace-nowrap ${getStatusColor(
                            t.status || "upcoming",
                          )}`}
                        >
                          {t.status || "upcoming"}
                        </span>
                      </div>

                      <div className="w-full md:col-span-2 flex justify-start md:justify-end gap-2 mt-2 md:mt-0 flex-wrap">
                        <Link
                          to="/admin/tournaments/$tournamentId/matches"
                          params={{ tournamentId: String(t.id) }}
                          className="flex-1 md:flex-none flex items-center justify-center bg-white hover:bg-[#ccff00] hover:text-black text-black p-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          title="Match Scheduler"
                        >
                          <Calendar className="w-4 h-4" strokeWidth={2.5} />
                        </Link>
                        <button
                          onClick={() =>
                            handleDuplicate({ id: t.id, name: t.name })
                          }
                          className="flex-1 md:flex-none flex items-center justify-center bg-white hover:bg-[#ccff00] hover:text-black text-black p-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => handleEdit(t)}
                          className="flex-1 md:flex-none flex items-center justify-center bg-white hover:bg-[#2e5cff] hover:text-white text-black p-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="flex-1 md:flex-none flex items-center justify-center bg-white hover:bg-[#ff2e2e] hover:text-white text-black p-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                      {formData.logoUrl.startsWith("data:") && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 uppercase italic w-full">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_#000] w-full max-w-5xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#2e5cff] p-3 flex justify-between items-center border-b-[4px] border-black sticky top-0 z-50">
              <h2 className="text-white font-black italic uppercase text-lg">
                {formData.id ? "EDITAR TORNEIO" : "NOVO TORNEIO"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-black hover:bg-[#ff2e2e] text-white p-1 border-2 border-white rounded-sm transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
                    Tournament Name
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full border-[3px] border-black p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] focus:border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] text-black placeholder:text-gray-400"
                    placeholder="EX: WORLD FINALS 2025"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
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
                      className="w-full border-[3px] border-black p-3 pr-10 font-mono text-sm bg-white focus:outline-none focus:ring-4 focus:ring-[#ccff00] focus:border-black text-black"
                    />
                    <Copy className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-black" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
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
                      className="w-full border-[3px] border-black p-2 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] bg-white text-black"
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
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
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
                    className="w-full border-[3px] border-black p-3 font-bold uppercase focus:outline-none focus:ring-4 focus:ring-[#ccff00] bg-white text-black cursor-pointer"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>

                {/* Default Scoring Rules */}
                <div className="bg-gray-50 border-[3px] border-black p-4 space-y-3">
                  <h3 className="font-black uppercase text-sm flex items-center gap-2 text-black">
                    Default Scoring Rules
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
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
                        className="w-full border-2 border-black p-2 font-bold text-sm text-black bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 text-gray-500">
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
                        className="w-full border-2 border-black p-2 font-bold text-sm text-black bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className="block text-[10px] font-bold uppercase mb-1 text-gray-500"
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
                        className="w-full border-2 border-black p-2 font-bold text-sm text-black bg-white"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[10px] font-bold uppercase mb-1 text-gray-500"
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
                        className="w-full border-2 border-black p-2 font-bold text-sm text-black bg-white"
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
                  <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
                    Logo URL
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                        className={`w-full border-[3px] border-black p-2 pl-9 text-xs font-mono focus:outline-none focus:border-black text-black ${
                          formData.logoUrl.startsWith("data:")
                            ? "bg-gray-100 italic text-gray-400"
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white border-2 border-black p-0.5 hover:bg-red-50"
                        >
                          <X className="w-3 h-3 text-red-500" />
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
                      className="bg-black hover:bg-[#2e5cff] text-white px-3 border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px] transition-all"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.logoUrl && (
                    <div className="mt-2 flex justify-center border-2 border-black border-dashed p-4 bg-gray-50">
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
              <div className="col-span-1 md:col-span-2 flex gap-3 mt-8 pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 font-black uppercase border-[3px] border-transparent hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-[#ccff00] hover:bg-[#bbe000] text-black text-lg py-3 font-black italic uppercase border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  SAVE TOURNAMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="bg-[#ff2e2e] border-b-[4px] border-black p-4 flex items-center gap-3">
              <div className="bg-white border-[3px] border-black p-1">
                <Trash2 className="w-6 h-6 text-[#ff2e2e] stroke-[3px]" />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                DELETE TOURNAMENT
              </h3>
            </div>

            <div className="p-6">
              <p className="text-black font-bold text-lg mb-4">
                Are you sure you want to delete{" "}
                <span className="font-black italic">{itemToDelete.name}</span>?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="w-full bg-[#ff2e2e] hover:bg-[#d41d1d] text-white py-4 font-black italic uppercase border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "YES, DELETE IT"
                  )}
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full bg-white hover:bg-gray-100 text-black py-3 font-black uppercase border-[3px] border-black transition-colors"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="bg-[#ccff00] border-b-[4px] border-black p-4 flex items-center gap-3">
              <div className="bg-white border-[3px] border-black p-1">
                <Copy className="w-6 h-6 text-black stroke-[3px]" />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-black">
                DUPLICATE TOURNAMENT
              </h3>
            </div>

            <div className="p-6">
              <p className="text-black font-bold text-lg mb-4">
                Are you sure you want to duplicate{" "}
                <span className="font-black italic">
                  {itemToDuplicate.name}
                </span>
                ?
              </p>

              <div className="bg-yellow-50 border-2 border-yellow-200 p-3 mb-6 rounded text-sm text-yellow-800 font-bold">
                This will create a new tournament with the same settings, but
                <span className="underline ml-1">
                  without participants or logo
                </span>
                .
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDuplicate}
                  className="w-full bg-[#ccff00] hover:bg-[#bbe000] text-black py-4 font-black italic uppercase border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                >
                  Confirm Duplicate
                </button>
                <button
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="w-full bg-white hover:bg-gray-100 text-black py-3 font-black uppercase border-[3px] border-black transition-colors"
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

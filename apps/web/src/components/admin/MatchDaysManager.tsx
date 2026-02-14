import { Trash2, Plus, Loader2, Pencil, X, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createMatchDay,
  deleteMatchDay,
  updateMatchDay,
} from "@/server/match-days";
import { useRouter } from "@tanstack/react-router";
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
      toast.success("Dia criado com sucesso!");
      setNewDayLabel("");
      setNewDayDate("");
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao criar dia.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza? Isso vai desvincular as partidas deste dia."))
      return;
    try {
      await deleteMatchDay({ data: id });
      toast.success("Dia excluído.");
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao excluir dia.");
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
      toast.success("Match day atualizado!");
      cancelEditing();
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao atualizar match day.");
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

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border-[3px] border-blue-300 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="text-sm font-bold text-blue-900">
              O <strong>status do Match Day</strong> controla automaticamente as apostas:
            </p>
            <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4">
              <li>• <strong>Open</strong> = Apostas abertas para todas as partidas</li>
              <li>• <strong>Locked</strong> = Apostas fechadas (partidas em andamento)</li>
              <li>• <strong>Finished</strong> = Dia finalizado</li>
              <li>• <strong>Draft</strong> = Ainda não disponível</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create New Day */}
      <div className="bg-white border-[4px] border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
        <h3 className="font-black italic uppercase text-xl mb-4 text-black">
          Novo Dia de Jogo
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
              Nome do Dia (Ex: Dia 1 - Grupos)
            </label>
            <input
              type="text"
              value={newDayLabel}
              onChange={(e) => setNewDayLabel(e.target.value)}
              className="w-full border-[3px] border-black p-2 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] text-black"
              placeholder="Digite o nome..."
            />
          </div>
          <div className="w-48">
            <CustomDatePicker
              label="Data"
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
            className="bg-black text-white px-6 py-2 h-[46px] font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:bg-[#ccff00] hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" strokeWidth={3} />
            )}
            Criar
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
              className="bg-white border-[3px] border-black p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {isEditing ? (
                // EDIT MODE
                <div className="space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-black uppercase mb-1 ml-1 text-black">
                        Nome do Dia
                      </label>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full border-[3px] border-black p-2 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] text-black"
                      />
                    </div>
                    <div className="w-48">
                      <CustomDatePicker
                        label="Data"
                        value={editDate}
                        onChange={setEditDate}
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
                    <div className="w-48">
                      <CustomSelect
                        label="Status"
                        value={editStatus}
                        onChange={(val) => setEditStatus(val as MatchDay["status"])}
                        options={[
                          { value: "draft", label: "Draft" },
                          { value: "open", label: "Open (Apostas Ativas)" },
                          { value: "locked", label: "Locked (Apostas Fechadas)" },
                          { value: "finished", label: "Finished" },
                        ]}
                        placeholder="Selecione..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 font-black uppercase text-sm border-[3px] border-black bg-white text-black hover:bg-gray-100 transition-all flex items-center gap-2"
                    >
                      <X className="w-4 h-4" strokeWidth={3} />
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleUpdate(day.id)}
                      disabled={!editLabel || !editDate}
                      className="px-4 py-2 font-black uppercase text-sm border-[3px] border-black bg-black text-white hover:bg-[#ccff00] hover:text-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-black text-white px-3 py-1 font-black italic uppercase text-lg transform skew-x-[-10deg]">
                      {new Date(day.date).toLocaleDateString([], {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-lg leading-none text-black">
                        {day.label}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 border-2 rounded-full ${getStatusColor(
                            day.status,
                          )}`}
                        >
                          {day.status}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {day.matches.length} partidas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Betting Status Indicator - Based on Match Day Status */}
                    <div className="flex flex-col items-end mr-2">
                      {day.status === "open" ? (
                        <span className="text-[9px] font-black uppercase bg-[#ccff00] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">
                          APOSTAS ABERTAS
                        </span>
                      ) : day.status === "locked" ? (
                        <span className="text-[9px] font-black uppercase bg-[#ff2e2e] text-white px-1.5 py-0.5 border border-black">
                          APOSTAS FECHADAS
                        </span>
                      ) : day.status === "finished" ? (
                        <span className="text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5 border border-black">
                          FINALIZADO
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-400 px-1.5 py-0.5 border border-gray-300">
                          RASCUNHO
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => startEditing(day)}
                      className="p-2 border-2 border-black hover:bg-[#ccff00] text-black transition-colors"
                      title="Editar Match Day"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDelete(day.id)}
                      className="p-2 text-gray-300 hover:text-[#ff2e2e] transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {matchDays.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-bold uppercase">
            Nenhum dia criado.
          </div>
        )}
      </div>
    </div>
  );
}

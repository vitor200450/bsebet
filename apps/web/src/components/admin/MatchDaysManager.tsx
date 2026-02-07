import { Trash2, Plus, Loader2, Lock, Unlock, Zap, ZapOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createMatchDay,
  deleteMatchDay,
  updateMatchDayStatus,
  toggleMatchDayBetting,
} from "@/server/match-days";
import { useRouter } from "@tanstack/react-router";
import { CustomDatePicker } from "./CustomInputs"; // Need to ensure this is exported

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
}: {
  tournamentId: number;
  matchDays: MatchDay[];
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState("");
  const [newDayDate, setNewDayDate] = useState("");

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

  const handleStatusChange = async (id: number, status: MatchDay["status"]) => {
    try {
      await updateMatchDayStatus({ data: { id, status } });
      toast.success(`Status atualizado para ${status}`);
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao atualizar status.");
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

  const handleBettingToggle = async (id: number, enabled: boolean) => {
    try {
      await toggleMatchDayBetting({ data: { id, enabled } });
      toast.success(
        `Apostas ${enabled ? "ativadas" : "desativadas"} para este dia!`,
      );
      router.invalidate();
    } catch (e) {
      toast.error("Erro ao configurar apostas.");
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
        {matchDays.map((day) => (
          <div
            key={day.id}
            className="bg-white border-[3px] border-black p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
          >
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
              {day.status === "open" && (
                <button
                  onClick={() => handleStatusChange(day.id, "locked")}
                  className="p-2 border-2 border-black hover:bg-[#ff2e2e] hover:text-white text-black transition-colors"
                  title="Bloquear Apostas"
                >
                  <Lock className="w-5 h-5" />
                </button>
              )}
              {day.status === "locked" && (
                <button
                  onClick={() => handleStatusChange(day.id, "open")}
                  className="p-2 border-2 border-black hover:bg-[#ccff00] text-black transition-colors"
                  title="Reabrir"
                >
                  <Unlock className="w-5 h-5" />
                </button>
              )}

              <div className="w-[2px] h-8 bg-gray-200 mx-2" />

              {/* Betting Status Indicator */}
              <div className="flex flex-col items-end mr-2">
                {day.matches &&
                day.matches.some((m: any) => m.isBettingEnabled) ? (
                  <span className="text-[9px] font-black uppercase bg-[#ccff00] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">
                    BETS OPEN
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase bg-gray-100 text-gray-400 px-1.5 py-0.5 border border-gray-300">
                    BETS CLOSED
                  </span>
                )}
              </div>

              <div className="flex bg-gray-100 p-1 border-2 border-black gap-1">
                <button
                  onClick={() => handleBettingToggle(day.id, true)}
                  className="p-1 px-2 text-[10px] font-black uppercase flex items-center gap-1 text-black hover:bg-[#ccff00] transition-colors"
                  title="Ativar Apostas para todas as partidas"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  ON
                </button>
                <button
                  onClick={() => handleBettingToggle(day.id, false)}
                  className="p-1 px-2 text-[10px] font-black uppercase flex items-center gap-1 text-black hover:bg-[#ff2e2e] transition-colors"
                  title="Desativar Apostas para todas as partidas"
                >
                  <ZapOff className="w-3.5 h-3.5" />
                  OFF
                </button>
              </div>

              <div className="w-[2px] h-8 bg-gray-200 mx-2" />

              <button
                onClick={() => handleDelete(day.id)}
                className="p-2 text-gray-300 hover:text-[#ff2e2e] transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {matchDays.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-bold uppercase">
            Nenhum dia criado.
          </div>
        )}
      </div>
    </div>
  );
}

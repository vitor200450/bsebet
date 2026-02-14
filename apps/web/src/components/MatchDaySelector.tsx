import { Calendar, Check, Lock, Trophy } from "lucide-react";

interface MatchDay {
  id: number;
  label: string;
  date: Date | string;
  status: "draft" | "open" | "locked" | "finished";
  matchCount?: number;
}

interface MatchDaySelectorProps {
  matchDays: MatchDay[];
  activeMatchDayId: number | null;
  onSelect: (matchDayId: number) => void;
}

export function MatchDaySelector({
  matchDays,
  activeMatchDayId,
  onSelect,
}: MatchDaySelectorProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "open":
        return {
          color: "bg-green-500",
          textColor: "text-white",
          label: "Apostas Abertas",
          icon: Trophy,
          borderColor: "border-green-500",
        };
      case "locked":
        return {
          color: "bg-yellow-500",
          textColor: "text-black",
          label: "Apostas Fechadas",
          icon: Lock,
          borderColor: "border-yellow-500",
        };
      case "finished":
        return {
          color: "bg-blue-500",
          textColor: "text-white",
          label: "Concluído",
          icon: Check,
          borderColor: "border-blue-500",
        };
      default:
        return {
          color: "bg-gray-300",
          textColor: "text-gray-600",
          label: "Rascunho",
          icon: Calendar,
          borderColor: "border-gray-300",
        };
    }
  };

  // Sort: by date (earliest first), then by id if dates are the same
  const sortedMatchDays = [...matchDays].sort((a, b) => {
    // Parse dates safely
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();

    // Sort by date first
    if (dateA !== dateB) {
      return dateA - dateB;
    }

    // If dates are the same, sort by id (creation order)
    return a.id - b.id;
  });

  return (
    <div className="min-h-screen bg-paper bg-paper-texture flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#000] px-6 py-3 mb-4">
            <h1 className="font-display font-black text-3xl md:text-4xl italic uppercase tracking-tighter text-black">
              Selecione o Match Day
            </h1>
          </div>
          <p className="text-sm md:text-base font-bold text-gray-600 uppercase">
            Escolha qual dia de partidas você quer visualizar
          </p>
        </div>

        {/* Match Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedMatchDays.map((md) => {
            const isActive = md.id === activeMatchDayId;
            const statusInfo = getStatusInfo(md.status);
            const Icon = statusInfo.icon;

            return (
              <button
                key={md.id}
                onClick={() => onSelect(md.id)}
                className={`
                  relative bg-white border-[4px] border-black p-6
                  shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                  hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]
                  hover:-translate-x-1 hover:-translate-y-1
                  active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  active:translate-x-1 active:translate-y-1
                  transition-all duration-150
                  text-left
                  ${isActive ? "ring-4 ring-[#ccff00] ring-offset-4" : ""}
                `}
              >
                {/* Active Badge */}
                {isActive && (
                  <div className="absolute -top-3 -right-3 bg-[#ccff00] border-[3px] border-black px-3 py-1 shadow-[4px_4px_0px_0px_#000] rotate-12">
                    <span className="font-black text-xs uppercase text-black">
                      🔥 Ativo
                    </span>
                  </div>
                )}

                {/* Header with Icon and Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 ${statusInfo.color} border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]`}
                    >
                      <Icon
                        className={`w-6 h-6 ${statusInfo.textColor}`}
                        strokeWidth={3}
                      />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-2xl italic uppercase text-black tracking-tight">
                        {md.label}
                      </h3>
                      <p className="text-sm font-bold text-gray-500 uppercase">
                        {new Date(md.date).toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-block ${statusInfo.color} ${statusInfo.textColor} border-[2px] border-black px-3 py-1 text-xs font-black uppercase mb-3`}
                >
                  {statusInfo.label}
                </div>

                {/* Match Count */}
                {md.matchCount !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    {md.matchCount > 0 ? (
                      <>
                        <span className="material-symbols-outlined text-base text-gray-600">
                          sports_esports
                        </span>
                        <span className="font-bold text-gray-700">
                          {md.matchCount} partida{md.matchCount !== 1 ? "s" : ""}{" "}
                          disponível{md.matchCount !== 1 ? "eis" : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base text-red-500">
                          warning
                        </span>
                        <span className="font-bold text-red-500">
                          Nenhuma partida atribuída
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Arrow indicator */}
                <div className="absolute bottom-4 right-4">
                  <span className="material-symbols-outlined text-3xl text-black/20 group-hover:text-black/40 transition-colors">
                    arrow_forward
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* No Match Days Message */}
        {matchDays.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_#000] p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 border-[3px] border-black rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-gray-400" strokeWidth={3} />
              </div>
              <h3 className="font-display font-black text-xl italic uppercase text-black mb-2">
                Nenhum Match Day
              </h3>
              <p className="text-sm text-gray-600">
                Não há match days disponíveis para este torneio.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

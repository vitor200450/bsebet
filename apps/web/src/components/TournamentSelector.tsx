import { Trophy, Globe, Gamepad2, ArrowRight, Calendar } from "lucide-react";

export interface TournamentOption {
  id: number;
  name: string;
  logoUrl?: string | null;
  status: string;
  matchCount: number;
  startDate?: string | null;
  activeStage?: string;
  hasUserBets?: boolean;
}

interface TournamentSelectorProps {
  tournaments: TournamentOption[];
  onSelect: (tournamentId: number) => void;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; icon: React.ReactNode; label: string }
> = {
  active: {
    bg: "bg-[#ccff00]",
    icon: <span className="w-2 h-2 bg-black rounded-full animate-pulse" />,
    label: "ACTIVE",
  },
  upcoming: {
    bg: "bg-[#ffc700]",
    icon: <Calendar className="w-3.5 h-3.5" />,
    label: "UPCOMING",
  },
  finished: {
    bg: "bg-gray-300",
    icon: null,
    label: "FINISHED",
  },
};

const CARD_ICONS = [
  <Trophy className="w-40 h-40 text-black drop-shadow-md" />,
  <Globe className="w-40 h-40 text-black drop-shadow-md" />,
];

const CARD_BG_COLORS = ["bg-[#ccff00]/20", "bg-blue-100"];

const CARD_PATTERNS = [
  "radial-gradient(#000 1px, transparent 1px)",
  "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
];

export function TournamentSelector({
  tournaments,
  onSelect,
}: TournamentSelectorProps) {
  return (
    <div className="min-h-screen bg-paper bg-paper-texture flex flex-col items-center justify-between relative overflow-x-hidden">
      {/* Subtle Noise Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header Section */}
      <header className="w-full flex justify-center pt-24 pb-12 z-10 relative">
        <div className="transform -rotate-1">
          <div className="bg-black text-white px-8 py-4 border-b-4 border-[#ccff00] relative shadow-[6px_6px_0px_0px_#000]">
            <h1 className="font-display font-black text-3xl md:text-5xl italic tracking-tighter uppercase">
              Choose Your Tournament
            </h1>
            {/* Corner decorations */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#ccff00] border-2 border-black" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#ccff00] border-2 border-black" />
          </div>
        </div>
      </header>

      {/* Main Content: Tournament Cards */}
      <main className="flex-grow w-full max-w-7xl px-4 flex flex-col lg:flex-row items-stretch justify-center gap-8 md:gap-12 z-10 py-8">
        {tournaments.map((tournament, index) => {
          const statusStyle =
            STATUS_STYLES[tournament.status] || STATUS_STYLES.upcoming;
          const icon = tournament.logoUrl
            ? null
            : CARD_ICONS[index % CARD_ICONS.length];
          const bgColor = CARD_BG_COLORS[index % CARD_BG_COLORS.length];
          const pattern = CARD_PATTERNS[index % CARD_PATTERNS.length];

          return (
            <div
              key={tournament.id}
              className="group relative w-full max-w-md cursor-pointer"
              onClick={() => onSelect(tournament.id)}
            >
              <div className="bg-white border-4 border-black rounded-xl p-6 shadow-[6px_6px_0px_0px_#000] group-hover:shadow-[3px_3px_0px_0px_#000] transform group-hover:translate-x-[3px] group-hover:translate-y-[3px] transition-all duration-200 flex flex-col h-full relative overflow-hidden">
                {/* User Bets Badge */}
                {tournament.hasUserBets && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-[10px] px-2 py-1 border-2 border-black rounded-full shadow-[3px_3px_0px_0px_#000] uppercase flex items-center gap-1 z-20 animate-pulse">
                    <span>📊</span>
                    SUAS APOSTAS
                  </div>
                )}

                {/* Status Badge */}
                <div
                  className={`absolute top-4 right-4 ${statusStyle.bg} text-black font-bold text-sm px-3 py-1 border-2 border-black rounded-full shadow-[3px_3px_0px_0px_#000] uppercase flex items-center gap-1 z-20`}
                >
                  {statusStyle.icon}
                  {statusStyle.label}
                </div>

                {/* Card Hero */}
                <div
                  className={`w-full h-64 ${bgColor} rounded-lg border-2 border-black mb-6 flex items-center justify-center relative overflow-hidden`}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: pattern,
                      backgroundSize: "12px 12px",
                    }}
                  />
                  {tournament.logoUrl ? (
                    <img
                      src={tournament.logoUrl}
                      alt={tournament.name}
                      className="relative z-10 w-48 h-48 object-contain drop-shadow-2xl transform hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="relative z-10 transform hover:scale-110 transition-transform">
                      {icon}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-grow space-y-6">
                  <h2 className="text-3xl font-black uppercase leading-tight text-black border-l-4 border-black pl-4">
                    {tournament.name}
                  </h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                        Start Date
                      </span>
                      <div className="flex items-center gap-2 text-zinc-600 font-display text-sm font-bold bg-white border-2 border-zinc-200 px-3 py-1.5 rounded-lg">
                        <Calendar className="w-4 h-4 text-black" />
                        <span>
                          {tournament.startDate
                            ? new Date(tournament.startDate).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  timeZone: "UTC",
                                },
                              )
                            : "TBD"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                        Current Phase
                      </span>
                      <div className="flex items-center gap-2 text-zinc-600 font-display text-sm font-bold bg-[#ccff00]/10 border-2 border-[#ccff00] px-3 py-1.5 rounded-lg whitespace-nowrap overflow-hidden text-ellipsis">
                        <Trophy className="w-4 h-4 text-black min-w-[16px]" />
                        <span className="uppercase">
                          {tournament.activeStage || "Fase de Grupos"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-white font-display text-xs font-black bg-black w-fit px-4 py-1.5 rounded-full border-2 border-black shadow-[3px_3px_0px_0px_#ccff00]">
                    <Gamepad2 className="w-4 h-4" />
                    <span>{tournament.matchCount} MATCHES AVAILABLE</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-8">
                  <button className="w-full bg-black hover:bg-zinc-800 text-white font-bold uppercase py-3 px-6 rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_#000] group-hover:shadow-[1px_1px_0px_0px_#000] transform group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition-all duration-200 flex items-center justify-center gap-2">
                    {tournament.hasUserBets ? "Ver Apostas" : "Bet Now"}
                    <ArrowRight className="w-5 h-5 text-[#ccff00]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center z-10">
        <p className="font-body text-zinc-500 text-sm uppercase tracking-wide bg-white/50 inline-block px-4 py-1 rounded backdrop-blur-sm">
          // Pick a tournament to start betting //
        </p>
      </footer>

      {/* Decorative floating elements */}
      <div className="absolute top-1/4 left-10 w-12 h-12 border-4 border-black bg-[#ccff00] rounded-full hidden xl:block animate-bounce shadow-[3px_3px_0px_0px_#000] z-0" />
      <div className="absolute bottom-1/4 right-10 w-8 h-8 border-4 border-black bg-[#ffc700] transform rotate-45 hidden xl:block shadow-[3px_3px_0px_0px_#000] z-0" />
      <div className="absolute top-1/3 right-20 text-9xl text-black opacity-5 font-black italic select-none pointer-events-none z-0 rotate-12">
        VS
      </div>
    </div>
  );
}

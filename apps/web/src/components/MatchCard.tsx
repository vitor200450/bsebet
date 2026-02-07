import { useForm } from "@tanstack/react-form";
import { betSchema } from "../utils/validators";
import { clsx } from "clsx";

// Tipagem simples para o componente receber os dados
type Team = { id: number; name: string; logoUrl?: string; region?: string };
type Match = {
  id: number;
  labelTeamA?: string;
  labelTeamB?: string;
  teamA?: Team;
  teamB?: Team;
  format: "bo3" | "bo5" | "bo7";
  category: string; // Ex: "GRUPO A - PARTIDA DE ELIMINAÇÃO"
};

export function MatchCard({ match }: { match: Match }) {
  // Configuração do Formulário
  const form = useForm({
    defaultValues: {
      matchId: match.id,
      winnerId: 0,
      scoreA: 0,
      scoreB: 0,
      format: match.format,
    },
    validators: {
      onChange: betSchema,
    },
    onSubmit: async ({ value }) => {
      console.log("Enviando aposta:", value);
      // Aqui entraria a chamada da Server Function: await saveBetFn({ data: value })
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="relative w-full max-w-3xl mx-auto mb-8 font-sans"
    >
      {/* --- CABEÇALHO "GRUNGE" --- */}
      {/* Simulando a fita preta colada com leve rotação */}
      <div className="absolute -top-3 left-0 right-0 z-10 flex justify-center">
        <div className="bg-zinc-950 text-white px-6 py-1 -rotate-1 shadow-lg transform skew-x-[-10deg]">
          <span className="text-sm font-black tracking-widest uppercase italic block transform skew-x-[10deg]">
            {match.category}
          </span>
        </div>
      </div>

      {/* --- O CARTÃO (Fundo Papel) --- */}
      <div className="bg-zinc-100 border-2 border-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1 pt-8 relative overflow-hidden">
        {/* Assinatura do Estado (React Form) */}
        <form.Subscribe
          selector={(state) => ({ values: state.values, errors: state.errors })}
          children={({ values, errors }) => {
            const teamA = match.teamA;
            const teamB = match.teamB;
            // Verifica quem está selecionado como vencedor
            const winnerIsA = values.winnerId === teamA?.id;
            const winnerIsB = values.winnerId === teamB?.id;

            return (
              <div className="flex flex-col md:flex-row items-stretch">
                {/* --- LADO A (Esquerda) --- */}
                <div
                  // Se A for vencedor, fundo Verde Neon. Se não, cinza claro.
                  className={clsx(
                    "flex-1 p-4 transition-colors duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 border-b-2 md:border-b-0 md:border-r-2 border-zinc-900",
                    winnerIsA
                      ? "bg-[#ccff00] text-black"
                      : "bg-zinc-200 hover:bg-zinc-300",
                  )}
                  onClick={() =>
                    teamA && form.setFieldValue("winnerId", teamA.id)
                  }
                >
                  {/* Logo ou Placeholder */}
                  <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                    {teamA?.logoUrl ? (
                      <img
                        src={teamA.logoUrl}
                        alt={teamA.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-zinc-400">
                        ?
                      </span>
                    )}
                  </div>
                  <span className="font-black text-xl uppercase text-center leading-tight">
                    {teamA?.name || match.labelTeamA || "A Definir"}
                  </span>

                  {/* Feedback Visual de Seleção */}
                  {winnerIsA && (
                    <span className="bg-black text-[#ccff00] text-xs px-2 py-0.5 font-bold uppercase -rotate-2">
                      Vencedor
                    </span>
                  )}
                </div>

                {/* --- PLACAR CENTRAL (Inputs) --- */}
                <div className="w-full md:w-48 bg-white flex flex-col items-center justify-center p-4 gap-2 relative z-0">
                  {/* Fundo sutil de textura de papel se quiser */}
                  <div className="flex items-center gap-2">
                    {/* Input Score A */}
                    <form.Field
                      name="scoreA"
                      children={(field) => (
                        <input
                          type="number"
                          min={0}
                          max={3} // BO5
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                          className="w-16 h-16 text-center text-4xl font-black bg-zinc-100 border-2 border-zinc-300 focus:border-black focus:bg-[#ccff00] focus:text-black focus:ring-0 outline-none transition-all rounded-md"
                        />
                      )}
                    />

                    <span className="text-2xl font-black text-zinc-300">X</span>

                    {/* Input Score B */}
                    <form.Field
                      name="scoreB"
                      children={(field) => (
                        <input
                          type="number"
                          min={0}
                          max={3}
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                          className="w-16 h-16 text-center text-4xl font-black bg-zinc-100 border-2 border-zinc-300 focus:border-black focus:bg-[#ccff00] focus:text-black focus:ring-0 outline-none transition-all rounded-md"
                        />
                      )}
                    />
                  </div>

                  {/* Mensagem de Erro (Zod) */}
                  {errors.length > 0 && (
                    <div className="absolute -bottom-2 w-full text-center">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 shadow-sm">
                        {typeof errors[0] === "string"
                          ? errors[0]
                          : (errors[0] as any)?.message ||
                            (errors[0] as any)?.scoreA?.[0]?.message ||
                            (errors[0] as any)?.scoreB?.[0]?.message ||
                            "Placar inv\u00E1lido"}
                      </span>
                    </div>
                  )}
                </div>

                {/* --- LADO B (Direita) --- */}
                <div
                  className={clsx(
                    "flex-1 p-4 transition-colors duration-200 cursor-pointer flex flex-col items-center justify-center gap-2 border-t-2 md:border-t-0 md:border-l-2 border-zinc-900",
                    winnerIsB
                      ? "bg-[#ccff00] text-black"
                      : "bg-zinc-200 hover:bg-zinc-300",
                  )}
                  onClick={() =>
                    teamB && form.setFieldValue("winnerId", teamB.id)
                  }
                >
                  <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                    {teamB?.logoUrl ? (
                      <img
                        src={teamB.logoUrl}
                        alt={teamB.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-zinc-400">
                        ?
                      </span>
                    )}
                  </div>
                  <span className="font-black text-xl uppercase text-center leading-tight">
                    {teamB?.name || match.labelTeamB || "A Definir"}
                  </span>

                  {winnerIsB && (
                    <span className="bg-black text-[#ccff00] text-xs px-2 py-0.5 font-bold uppercase rotate-2">
                      Vencedor
                    </span>
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* --- BOTÃO DE AÇÃO (Estilo Brawl) --- */}
      <div className="flex justify-center -mt-4 relative z-20">
        <form.Subscribe
          selector={(state) => state.canSubmit}
          children={(canSubmit) => (
            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-black uppercase px-8 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Palpite
            </button>
          )}
        />
      </div>
    </form>
  );
}

import { z } from "zod";

// Enum para reutilizar no front e no back
// 'as const' é crucial para o TypeScript entender que são valores fixos
export const MATCH_FORMATS = ["bo3", "bo5", "bo7"] as const;

export const betSchema = z
	.object({
		matchId: z.number(),
		// O ID do time vencedor (obrigatório selecionar um)
		winnerId: z.number().min(1, "Selecione quem vai ganhar!"),

		// Placares
		scoreA: z.number().min(0, "O placar não pode ser negativo"),
		scoreB: z.number().min(0, "O placar não pode ser negativo"),

		// Campo oculto que diz qual é a regra (bo5, bo3)
		format: z.enum(MATCH_FORMATS),
	})
	.superRefine((data, ctx) => {
		const { scoreA, scoreB, format } = data;

		// Lógica para descobrir quantos sets precisa pra ganhar
		// bo5 (Melhor de 5) -> precisa de 3 vitórias
		const bestOfNumber = Number.parseInt(format.replace("bo", ""), 10);
		const winsNeeded = Math.ceil(bestOfNumber / 2);

		// Regra 1: Placar impossível (Ex: 4 a 0 numa MD5)
		if (scoreA > winsNeeded || scoreB > winsNeeded) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Máximo de ${winsNeeded} sets neste formato.`,
				path: scoreA > winsNeeded ? ["scoreA"] : ["scoreB"],
			});
		}

		// Regra 2: Alguém tem que ganhar (Validação final)
		// Se nenhum dos dois chegou no número mágico (winsNeeded), o jogo não acabou.
		if (scoreA < winsNeeded && scoreB < winsNeeded) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Alguém precisa vencer ${winsNeeded} sets.`,
				path: ["scoreA"], // Marca o erro genericamente no time A
			});
		}

		// Regra 3: Consistência Lógica
		// Se o usuário marcou que o winnerId é o Time A, o placar do Time A deve ser o vencedor
		// (Esta regra depende de sabermos qual ID é o A e qual é o B, o que pode ser complexo validar
		// aqui sem acesso ao banco, então focamos na matemática dos sets por enquanto).
	});

// Exporta o tipo TypeScript inferido automaticamente
export type BetInput = z.infer<typeof betSchema>;

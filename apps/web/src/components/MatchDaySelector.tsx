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
		<div className="flex min-h-screen items-center justify-center bg-paper bg-paper-texture p-6">
			<div className="w-full max-w-4xl">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="mb-4 inline-block border-[4px] border-black bg-white px-6 py-3 shadow-[8px_8px_0px_0px_#000]">
						<h1 className="font-black font-display text-3xl text-black uppercase italic tracking-tighter md:text-4xl">
							Selecione o Match Day
						</h1>
					</div>
					<p className="font-bold text-gray-600 text-sm uppercase md:text-base">
						Escolha qual dia de partidas você quer visualizar
					</p>
				</div>

				{/* Match Days Grid */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{sortedMatchDays.map((md) => {
						const isActive = md.id === activeMatchDayId;
						const statusInfo = getStatusInfo(md.status);
						const Icon = statusInfo.icon;

						return (
							<button
								key={md.id}
								onClick={() => onSelect(md.id)}
								className={`relative border-[4px] border-black bg-white p-6 text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isActive ? "ring-4 ring-[#ccff00] ring-offset-4" : ""}
                `}
							>
								{/* Active Badge */}
								{isActive && (
									<div className="absolute -top-3 -right-3 rotate-12 border-[3px] border-black bg-[#ccff00] px-3 py-1 shadow-[4px_4px_0px_0px_#000]">
										<span className="font-black text-black text-xs uppercase">
											🔥 Ativo
										</span>
									</div>
								)}

								{/* Header with Icon and Status */}
								<div className="mb-4 flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div
											className={`h-12 w-12 ${statusInfo.color} flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]`}
										>
											<Icon
												className={`h-6 w-6 ${statusInfo.textColor}`}
												strokeWidth={3}
											/>
										</div>
										<div>
											<h3 className="font-black font-display text-2xl text-black uppercase italic tracking-tight">
												{md.label}
											</h3>
											<p className="font-bold text-gray-500 text-sm uppercase">
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
									className={`inline-block ${statusInfo.color} ${statusInfo.textColor} mb-3 border-[2px] border-black px-3 py-1 font-black text-xs uppercase`}
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
													{md.matchCount} partida
													{md.matchCount !== 1 ? "s" : ""} disponível
													{md.matchCount !== 1 ? "eis" : ""}
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
								<div className="absolute right-4 bottom-4">
									<span className="material-symbols-outlined text-3xl text-black/20 transition-colors group-hover:text-black/40">
										arrow_forward
									</span>
								</div>
							</button>
						);
					})}
				</div>

				{/* No Match Days Message */}
				{matchDays.length === 0 && (
					<div className="py-12 text-center">
						<div className="inline-block border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000]">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-gray-200">
								<Calendar className="h-8 w-8 text-gray-400" strokeWidth={3} />
							</div>
							<h3 className="mb-2 font-black font-display text-black text-xl uppercase italic">
								Nenhum Match Day
							</h3>
							<p className="text-gray-600 text-sm">
								Não há match days disponíveis para este torneio.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Admin page for migrating logos to R2
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { migrateLogosToR2 } from "../../server/migrate-logos";

export const Route = createFileRoute("/admin/migrate-logos")({
	component: MigrateLogosPage,
});

interface MigrationResult {
	success: boolean;
	timestamp?: string;
	summary?: {
		teams: {
			success: number;
			failed: number;
			skipped: number;
		};
		tournaments: {
			success: number;
			failed: number;
			skipped: number;
		};
	};
	errors?: string[];
	error?: string;
}

function MigrateLogosPage() {
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<MigrationResult | null>(null);

	const runMigration = async () => {
		if (!confirm("Tem certeza que deseja migrar todas as logos para o R2?")) {
			return;
		}

		setLoading(true);
		setResult(null);

		try {
			const data = await migrateLogosToR2();
			setResult({
				success: data.success,
				timestamp: data.timestamp,
				summary: {
					teams: data.teams,
					tournaments: data.tournaments,
				},
				errors: data.errors,
			});
		} catch (error) {
			setResult({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#e6e6e6] p-8">
			<div className="mx-auto max-w-4xl">
				<h1 className="mb-6 border-black border-b-4 pb-2 font-black text-3xl">
					Migrar Logos para R2
				</h1>

				<div className="rounded-lg border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
					<div className="mb-6">
						<h2 className="mb-2 font-bold text-xl">O que será feito?</h2>
						<ul className="list-inside list-disc space-y-1 text-gray-700">
							<li>Buscar todas as logos em Base64 do banco de dados</li>
							<li>Fazer upload para o Cloudflare R2</li>
							<li>Atualizar as URLs no banco para apontar para o R2</li>
						</ul>
					</div>

					<div className="mb-6 rounded border-[3px] border-yellow-400 bg-yellow-50 p-4">
						<p className="font-bold text-yellow-800">⚠️ Atenção:</p>
						<p className="text-yellow-700">
							Este processo modifica o banco de dados. Faça backup antes de
							continuar.
						</p>
					</div>

					<button
						onClick={runMigration}
						disabled={loading}
						className={`rounded border-[3px] border-black px-6 py-3 font-bold ${
							loading
								? "cursor-not-allowed bg-gray-300"
								: "bg-[#ccff00] shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-[#b8e600] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
						}transition-all`}
					>
						{loading ? "⏳ Executando..." : "🚀 Iniciar Migração"}
					</button>

					{loading && (
						<div className="mt-6 flex items-center gap-3">
							<div className="h-6 w-6 animate-spin rounded-full border-4 border-black border-t-transparent" />
							<span className="font-medium">Migrando logos, aguarde...</span>
						</div>
					)}

					{result && (
						<div
							className={`mt-6 rounded-lg border-[3px] p-6 ${result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
						>
							<h3
								className={`mb-4 font-bold text-xl ${result.success ? "text-green-800" : "text-red-800"}`}
							>
								{result.success
									? "✅ Migração Concluída"
									: "❌ Erro na Migração"}
							</h3>

							{result.error && (
								<div className="mb-4 rounded bg-red-100 p-3">
									<p className="font-medium text-red-800">{result.error}</p>
								</div>
							)}

							{result.summary && (
								<div className="space-y-4">
									<div>
										<h4 className="mb-2 font-bold text-lg">Times:</h4>
										<div className="grid grid-cols-3 gap-4">
											<div className="rounded bg-green-100 p-3 text-center">
												<span className="block font-black text-2xl text-green-700">
													{result.summary.teams.success}
												</span>
												<span className="text-green-600 text-sm">Sucesso</span>
											</div>
											<div className="rounded bg-red-100 p-3 text-center">
												<span className="block font-black text-2xl text-red-700">
													{result.summary.teams.failed}
												</span>
												<span className="text-red-600 text-sm">Falhas</span>
											</div>
											<div className="rounded bg-gray-100 p-3 text-center">
												<span className="block font-black text-2xl text-gray-700">
													{result.summary.teams.skipped}
												</span>
												<span className="text-gray-600 text-sm">Pulados</span>
											</div>
										</div>
									</div>

									<div>
										<h4 className="mb-2 font-bold text-lg">Torneios:</h4>
										<div className="grid grid-cols-3 gap-4">
											<div className="rounded bg-green-100 p-3 text-center">
												<span className="block font-black text-2xl text-green-700">
													{result.summary.tournaments.success}
												</span>
												<span className="text-green-600 text-sm">Sucesso</span>
											</div>
											<div className="rounded bg-red-100 p-3 text-center">
												<span className="block font-black text-2xl text-red-700">
													{result.summary.tournaments.failed}
												</span>
												<span className="text-red-600 text-sm">Falhas</span>
											</div>
											<div className="rounded bg-gray-100 p-3 text-center">
												<span className="block font-black text-2xl text-gray-700">
													{result.summary.tournaments.skipped}
												</span>
												<span className="text-gray-600 text-sm">Pulados</span>
											</div>
										</div>
									</div>
								</div>
							)}

							{result.errors && result.errors.length > 0 && (
								<div className="mt-4">
									<h4 className="mb-2 font-bold text-lg text-red-800">
										Erros:
									</h4>
									<div className="max-h-40 overflow-y-auto rounded bg-red-100 p-3">
										<ul className="list-inside list-disc space-y-1 text-red-700 text-sm">
											{result.errors.map((error, index) => (
												<li key={index}>{error}</li>
											))}
										</ul>
									</div>
								</div>
							)}

							{result.timestamp && (
								<p className="mt-4 text-gray-500 text-sm">
									Concluído em: {new Date(result.timestamp).toLocaleString()}
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

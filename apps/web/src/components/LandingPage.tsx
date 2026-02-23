import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useSetHeader } from "./HeaderContext";

interface LandingPageProps {
	isAuthenticated: boolean;
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
	// Hide header for unauthenticated users (landing page has its own branding)
	useSetHeader(!isAuthenticated ? { hideHeader: true } : {});

	const ctaLink = isAuthenticated ? "/dashboard" : "/login";

	return (
		<div className="flex min-h-screen flex-col">
			{/* Hero Section - Dark Gradient */}
			<section className="relative flex min-h-[500px] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a0533] via-[#0d1b3e] to-[#0a0a2e] py-10 md:min-h-[600px] md:py-20">
				{/* Decorative floating shapes with animation */}
				<div className="absolute top-10 left-10 h-24 w-24 animate-pulse rounded-full bg-purple-500 opacity-40 blur-[60px] md:h-32 md:w-32 md:blur-[80px]" />
				<div
					className="absolute right-10 bottom-20 h-32 w-32 animate-pulse rounded-full bg-blue-500 opacity-30 blur-[80px] md:h-48 md:w-48 md:blur-[100px]"
					style={{ animationDelay: "2s" }}
				/>
				<div className="absolute top-1/2 left-1/4 h-16 w-16 rotate-45 bg-pink-500 opacity-30 blur-[40px] md:h-24 md:w-24 md:blur-[60px]" />

				{/* Hero Content */}
				<div className="relative z-10 mx-auto w-full max-w-6xl px-4 text-center">
					<motion.h1
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
						className="mb-4 font-black text-4xl text-white uppercase italic leading-[0.9] tracking-tighter sm:text-6xl md:mb-6 md:text-8xl lg:text-9xl"
						style={{
							textShadow: `
                2px 2px 0px #000,
                4px 4px 0px #000,
                6px 6px 0px #000
              `,
						}}
					>
						A ARENA DOS
						<br />
						PALPITES
					</motion.h1>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.3, duration: 0.8 }}
						className="mx-auto mb-4 max-w-2xl font-bold text-lg text-white/90 italic tracking-wide drop-shadow-lg md:text-3xl"
					>
						Faça seus palpites e suba no ranking
					</motion.p>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4, duration: 0.8 }}
						className="mb-8 md:mb-12"
					>
						<div className="inline-block rotate-2 transform border-[3px] border-black bg-brawl-yellow px-4 py-1 shadow-[4px_4px_0px_0px_#000] md:px-6 md:py-2">
							<span className="font-black text-black text-sm uppercase italic tracking-tighter md:text-lg">
								🏆 Competitivo de Brawl Stars
							</span>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.6, duration: 0.6 }}
					>
						<Link to={ctaLink}>
							<button className="group relative inline-block">
								<div className="absolute inset-0 translate-x-2 translate-y-2 -skew-x-12 transform rounded-lg bg-black" />
								<div className="relative -skew-x-12 transform rounded-lg border-4 border-black bg-[#ccff00] px-8 py-4 shadow-[8px_8px_0px_0px_#000] transition-all duration-200 hover:translate-x-1 hover:translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] md:px-12 md:py-6">
									<span className="block skew-x-12 transform font-black text-black text-xl uppercase italic tracking-tighter md:text-4xl">
										ENTRAR AGORA
									</span>
								</div>
							</button>
						</Link>
					</motion.div>
				</div>
			</section>

			{/* Features Section - Paper Background */}
			<section className="relative bg-[#f0f0f0] py-12 md:py-24">
				<div className="pointer-events-none absolute inset-0 bg-paper-texture opacity-40 mix-blend-multiply" />
				<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
						{/* Card 1 - PALPITE */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1, duration: 0.6 }}
							viewport={{ once: true }}
							className="group flex -rotate-1 transform flex-col items-center rounded-xl border-4 border-black bg-white p-6 text-center shadow-[6px_6px_0px_0px_#000] transition-all duration-300 hover:-translate-y-2 hover:rotate-0 md:p-8"
						>
							<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-brawl-blue shadow-[3px_3px_0px_0px_#000] transition-transform duration-300 group-hover:scale-110 md:mb-6 md:h-24 md:w-24">
								<span className="material-symbols-outlined font-black text-4xl text-white md:text-5xl">
									ads_click
								</span>
							</div>
							<h3 className="mb-2 font-black text-2xl text-black uppercase italic tracking-tighter md:mb-4 md:text-3xl">
								FAÇA SEUS
								<br />
								PALPITES
							</h3>
							<p className="font-bold text-gray-600 text-sm leading-relaxed md:text-base">
								Preveja os resultados das partidas de Brawl Stars e mostre que
								você entende do competitivo.
							</p>
						</motion.div>

						{/* Card 2 - SUBA DE ELO */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2, duration: 0.6 }}
							viewport={{ once: true }}
							className="group mt-4 flex rotate-1 transform flex-col items-center rounded-xl border-4 border-black bg-white p-6 text-center shadow-[6px_6px_0px_0px_#000] transition-all duration-300 hover:-translate-y-2 hover:rotate-0 md:mt-0 md:p-8"
						>
							<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-brawl-red shadow-[3px_3px_0px_0px_#000] transition-transform duration-300 group-hover:scale-110 md:mb-6 md:h-24 md:w-24">
								<span className="material-symbols-outlined font-black text-4xl text-white md:text-5xl">
									trending_up
								</span>
							</div>
							<h3 className="mb-2 font-black text-2xl text-black uppercase italic tracking-tighter md:mb-4 md:text-3xl">
								SUBA NO
								<br />
								RANKING
							</h3>
							<p className="font-bold text-gray-600 text-sm leading-relaxed md:text-base">
								Acumule pontos com seus palpites certeiros e escale até o topo
								do ranking de apostadores.
							</p>
						</motion.div>

						{/* Card 3 - PRÊMIOS */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3, duration: 0.6 }}
							viewport={{ once: true }}
							className="group mt-4 flex -rotate-1 transform flex-col items-center rounded-xl border-4 border-black bg-white p-6 text-center shadow-[6px_6px_0px_0px_#000] transition-all duration-300 hover:-translate-y-2 hover:rotate-0 md:mt-0 md:p-8"
						>
							<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-brawl-yellow shadow-[3px_3px_0px_0px_#000] transition-transform duration-300 group-hover:scale-110 md:mb-6 md:h-24 md:w-24">
								<span className="material-symbols-outlined font-black text-4xl text-white md:text-5xl">
									emoji_events
								</span>
							</div>
							<h3 className="mb-2 font-black text-2xl text-black uppercase italic tracking-tighter md:mb-4 md:text-3xl">
								GANHE
								<br />
								PRÊMIOS
							</h3>
							<p className="font-bold text-gray-600 text-sm leading-relaxed md:text-base">
								Os melhores apostadores ganham recompensas exclusivas e
								reconhecimento na comunidade.
							</p>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="relative border-black border-t-4 bg-black pt-16 pb-8 text-white">
				<div className="absolute top-0 left-0 flex h-2 w-full">
					<div className="w-1/2 bg-brawl-blue" />
					<div className="w-1/2 bg-brawl-red" />
				</div>
				<div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col items-center justify-center gap-4 border-zinc-800 border-t-2 pt-8 md:flex-row">
						<p className="font-bold text-sm text-zinc-500">
							© 2025 BSEBET. Todos os direitos reservados.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

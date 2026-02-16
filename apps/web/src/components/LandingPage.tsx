import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useSetHeader } from "./HeaderContext";

interface LandingPageProps {
  isAuthenticated: boolean;
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  // Hide header for unauthenticated users (landing page has its own branding)
  useSetHeader(!isAuthenticated ? { hideHeader: true } : {});

  const ctaLink = isAuthenticated ? "/leaderboard" : "/login";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section - Dark Gradient */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#1a0533] via-[#0d1b3e] to-[#0a0a2e] min-h-[500px] md:min-h-[600px] flex items-center justify-center py-10 md:py-20">
        {/* Decorative floating shapes with animation */}
        <div className="absolute top-10 left-10 w-24 h-24 md:w-32 md:h-32 bg-purple-500 rounded-full blur-[60px] md:blur-[80px] opacity-40 animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-32 h-32 md:w-48 md:h-48 bg-blue-500 rounded-full blur-[80px] md:blur-[100px] opacity-30 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 md:w-24 md:h-24 bg-pink-500 rotate-45 blur-[40px] md:blur-[60px] opacity-30" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto text-center px-4 w-full">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black italic uppercase text-white tracking-tighter mb-4 md:mb-6 leading-[0.9]"
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
            className="text-lg md:text-3xl font-bold text-white/90 italic tracking-wide mb-4 drop-shadow-lg max-w-2xl mx-auto"
          >
            Faça seus palpites e suba no ranking
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-8 md:mb-12"
          >
            <div className="inline-block bg-brawl-yellow border-[3px] border-black px-4 py-1 md:px-6 md:py-2 shadow-[4px_4px_0px_0px_#000] transform rotate-2">
              <span className="font-black italic uppercase text-black text-sm md:text-lg tracking-tighter">
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
                <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 transform -skew-x-12 rounded-lg" />
                <div className="relative bg-[#ccff00] border-4 border-black px-8 py-4 md:px-12 md:py-6 transform -skew-x-12 shadow-[8px_8px_0px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-200 rounded-lg">
                  <span className="block text-xl md:text-4xl font-black italic text-black uppercase tracking-tighter transform skew-x-12">
                    ENTRAR AGORA
                  </span>
                </div>
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Paper Background */}
      <section className="py-12 md:py-24 bg-[#f0f0f0] relative">
        <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-paper-texture pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
            {/* Card 1 - PALPITE */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#000] transform -rotate-1 hover:rotate-0 hover:-translate-y-2 transition-all duration-300 rounded-xl flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-brawl-blue border-4 border-black rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-[3px_3px_0px_0px_#000] group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-white font-black">
                  ads_click
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black italic uppercase text-black mb-2 md:mb-4 tracking-tighter">
                FAÇA SEUS
                <br />
                PALPITES
              </h3>
              <p className="font-bold text-gray-600 leading-relaxed text-sm md:text-base">
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
              className="bg-white border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#000] transform rotate-1 hover:rotate-0 hover:-translate-y-2 transition-all duration-300 rounded-xl flex flex-col items-center text-center group mt-4 md:mt-0"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-brawl-red border-4 border-black rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-[3px_3px_0px_0px_#000] group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-white font-black">
                  trending_up
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black italic uppercase text-black mb-2 md:mb-4 tracking-tighter">
                SUBA NO
                <br />
                RANKING
              </h3>
              <p className="font-bold text-gray-600 leading-relaxed text-sm md:text-base">
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
              className="bg-white border-4 border-black p-6 md:p-8 shadow-[6px_6px_0px_0px_#000] transform -rotate-1 hover:rotate-0 hover:-translate-y-2 transition-all duration-300 rounded-xl flex flex-col items-center text-center group mt-4 md:mt-0"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-brawl-yellow border-4 border-black rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-[3px_3px_0px_0px_#000] group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-white font-black">
                  emoji_events
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black italic uppercase text-black mb-2 md:mb-4 tracking-tighter">
                GANHE
                <br />
                PRÊMIOS
              </h3>
              <p className="font-bold text-gray-600 leading-relaxed text-sm md:text-base">
                Os melhores apostadores ganham recompensas exclusivas e
                reconhecimento na comunidade.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white pt-16 pb-8 border-t-4 border-black relative">
        <div className="absolute top-0 left-0 w-full h-2 flex">
          <div className="w-1/2 bg-brawl-blue" />
          <div className="w-1/2 bg-brawl-red" />
        </div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t-2 border-zinc-800 pt-8 flex flex-col md:flex-row justify-center items-center gap-4">
            <p className="font-bold text-zinc-500 text-sm">
              © 2025 BSEBET. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

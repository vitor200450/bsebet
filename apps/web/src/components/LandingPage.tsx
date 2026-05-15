import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLangLink } from "@/i18n/useLangLink";

interface LandingPageProps {
	isAuthenticated: boolean;
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
	const { t } = useTranslation("landing");
	const { routeTo } = useLangLink();

	const ctaLink = isAuthenticated ? "/dashboard" : "/login";

	const steps = [
		{ title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
		{ title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
		{ title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
	];

	return (
		<div className="flex min-h-screen flex-col">
			{/* ─── HERO SECTION (Broadcast Frame) ─── */}
			<section className="relative flex min-h-[500px] w-full items-center justify-center overflow-hidden bg-ink md:min-h-[600px]">
				{/* Broadcast frame — top bar: blue/red split */}
				<div className="absolute top-0 right-0 left-0 z-10 flex h-[6px]">
					<div className="w-1/2 bg-brawl-blue" />
					<div className="w-1/2 bg-brawl-red" />
				</div>

				{/* Broadcast frame — left blue rail */}
				<div className="absolute top-0 left-0 z-10 h-full w-[3px] bg-brawl-blue" />

				{/* Broadcast frame — right red rail */}
				<div className="absolute top-0 right-0 z-10 h-full w-[3px] bg-brawl-red" />

				{/* Paper texture overlay */}
				<div
					className="pointer-events-none absolute inset-0 opacity-40"
					style={{
						backgroundImage: "var(--background-image-noise)",
					}}
				/>

				{/* Hero Content */}
				<div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 text-center md:pt-16">
					{/* Main headline */}
					<motion.h1
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
						className="mb-4 font-black text-5xl text-white uppercase italic leading-[0.85] tracking-tighter sm:text-7xl md:mb-6 md:text-8xl lg:text-9xl"
						style={{
							textShadow: "3px 3px 0px #000, 6px 6px 0px #000",
						}}
					>
						{t("hero.arenaTitle")}
						<br />
						{t("hero.picksTitle")}
					</motion.h1>

					{/* Subtitle */}
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.3, duration: 0.8 }}
						className="mx-auto mb-6 max-w-2xl font-bold text-lg text-white/80 italic drop-shadow-lg md:text-2xl"
					>
						{t("hero.subtitle")}
					</motion.p>

					{/* Primary CTA */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.6, duration: 0.6 }}
						className="mb-4"
					>
						<Link {...routeTo(ctaLink)}>
							<button
								type="button"
								className="group relative inline-block cursor-pointer"
							>
								<div className="absolute inset-0 translate-x-2 translate-y-2 -skew-x-12 rounded-lg bg-black" />
								<div className="relative -skew-x-12 rounded-lg border-4 border-black bg-[#ccff00] px-8 py-4 shadow-[8px_8px_0px_0px_#000] transition-all duration-200 hover:translate-x-1 hover:translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-2 active:translate-y-2 active:shadow-[4px_4px_0px_0px_#000] md:px-12 md:py-6">
									<span className="block skew-x-12 font-black text-black text-xl uppercase italic tracking-tighter md:text-4xl">
										{t("hero.cta")}
									</span>
								</div>
							</button>
						</Link>
					</motion.div>

					{/* Secondary CTA (only for unauthenticated) */}
					{!isAuthenticated && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.8, duration: 0.5 }}
						>
							<Link
								{...routeTo("/login")}
								className="group inline-flex items-center gap-1.5"
							>
								<span className="font-bold text-sm text-zinc-400 uppercase tracking-[0.2em] transition-colors group-hover:text-white">
									{t("hero.secondaryCta")}
								</span>
								<span className="material-symbols-outlined text-base text-zinc-400 transition-colors group-hover:text-white">
									arrow_forward
								</span>
							</Link>
						</motion.div>
					)}
				</div>
			</section>

			{/* ─── FEATURES SECTION (Asymmetric) ─── */}
			<section className="relative bg-paper py-16 md:py-24">
				{/* Paper texture */}
				<div className="pointer-events-none absolute inset-0 bg-paper-texture opacity-40 mix-blend-multiply" />

				<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-8">
						{/* Big left card (3/5 width) */}
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							whileInView={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1, duration: 0.6 }}
							viewport={{ once: true }}
							className="group col-span-1 -rotate-1 overflow-hidden border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000] transition-all duration-300 hover:-translate-y-2 hover:rotate-0 md:col-span-3 md:p-10"
						>
							<div className="flex h-full flex-col items-center justify-center gap-5 text-center">
								<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-black bg-brawl-blue shadow-[3px_3px_0px_0px_#000] transition-transform duration-300 group-hover:scale-110 md:h-24 md:w-24">
									<span className="material-symbols-outlined font-black text-3xl text-white md:text-5xl">
										ads_click
									</span>
								</div>
								<div>
									<h3 className="mb-3 font-black text-3xl text-black uppercase italic tracking-tighter md:text-5xl">
										{t("features.predictTitle")}
										<br />
										{t("features.predictTitleSub")}
									</h3>
									<p className="mx-auto max-w-lg font-bold text-base text-gray-600 leading-relaxed md:text-lg">
										{t("features.predictDesc")}
									</p>
								</div>
							</div>
						</motion.div>

						{/* Right column (2/5 width) */}
						<div className="col-span-1 flex flex-col gap-6 md:col-span-2">
							{/* Card 2 – Rankings */}
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.2, duration: 0.6 }}
								viewport={{ once: true }}
								className="group flex rotate-1 items-center gap-4 border-[4px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000] transition-all duration-300 hover:-translate-y-2 hover:rotate-0 md:gap-6 md:p-8"
							>
								<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-black bg-brawl-red shadow-[3px_3px_0px_0px_#000] transition-transform duration-300 group-hover:scale-110 md:h-20 md:w-20">
									<span className="material-symbols-outlined font-black text-3xl text-white md:text-4xl">
										trending_up
									</span>
								</div>
								<div>
									<h3 className="mb-1 font-black text-black text-xl uppercase italic tracking-tighter md:text-2xl">
										{t("features.scoreTitle")}
										<br />
										{t("features.scoreTitleSub")}
									</h3>
									<p className="font-bold text-gray-600 text-sm leading-relaxed md:text-base">
										{t("features.scoreDesc")}
									</p>
								</div>
							</motion.div>

							{/* Card 3 – Prizes */}
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.3, duration: 0.6 }}
								viewport={{ once: true }}
								className="group -rotate-1 items-center gap-4 border-[4px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000] transition-all duration-300 hover:-translate-y-2 hover:rotate-0 md:flex md:gap-6 md:p-8"
							>
								<div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-black bg-brawl-yellow shadow-[3px_3px_0px_0px_#000] transition-transform duration-300 group-hover:scale-110 md:mb-0 md:h-20 md:w-20">
									<span className="material-symbols-outlined font-black text-3xl text-black md:text-4xl">
										emoji_events
									</span>
								</div>
								<div>
									<h3 className="mb-1 font-black text-black text-xl uppercase italic tracking-tighter md:text-2xl">
										{t("features.prizesTitle")}
										<br />
										{t("features.prizesTitleSub")}
									</h3>
									<p className="font-bold text-gray-600 text-sm leading-relaxed md:text-base">
										{t("features.prizesDesc")}
									</p>
								</div>
							</motion.div>
						</div>
					</div>
				</div>
			</section>

			{/* ─── HOW IT WORKS SECTION ─── */}
			<section className="relative border-black border-y-[3px] bg-tape py-16 md:py-20">
				{/* Connecting track behind the numbers */}
				<div className="pointer-events-none absolute top-1/2 right-0 left-0 z-0 mx-auto hidden h-[3px] w-full max-w-5xl -translate-y-1/2 bg-black/20 md:block" />

				<div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
					{/* Section heading */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						viewport={{ once: true }}
					>
						<h2 className="mb-4 inline-block -skew-x-12 bg-black px-6 py-2 font-black text-white text-xl uppercase italic tracking-tighter md:text-3xl">
							{t("howItWorks.title")}
						</h2>
					</motion.div>

					{/* Steps grid */}
					<div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
						{steps.map((step, i) => (
							<motion.div
								key={step.title}
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: i * 0.15, duration: 0.5 }}
								viewport={{ once: true }}
								className="group relative flex flex-col items-center"
							>
								{/* Step number */}
								<div className="mb-4 flex h-16 w-16 items-center justify-center border-4 border-black bg-white shadow-[4px_4px_0px_0px_#000] transition-transform duration-300 group-hover:-translate-y-1 md:h-20 md:w-20">
									<span className="font-black text-3xl text-black italic md:text-4xl">
										{i + 1}
									</span>
								</div>

								<h3 className="mb-2 font-black text-black text-lg uppercase italic tracking-tighter md:text-xl">
									{step.title}
								</h3>
								<p className="max-w-xs font-bold text-gray-600 text-sm leading-relaxed">
									{step.desc}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ─── FOOTER ─── */}
			<footer className="relative border-black border-t-4 bg-black pt-16 pb-8 text-white">
				{/* Blue/Red broadcast stripe */}
				<div className="absolute top-0 left-0 flex h-2 w-full">
					<div className="w-1/2 bg-brawl-blue" />
					<div className="w-1/2 bg-brawl-red" />
				</div>
				<div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col items-center justify-center border-zinc-800 border-t-2 pt-8">
						<p className="mx-auto max-w-2xl text-center font-bold text-xs text-zinc-600 leading-relaxed">
							{t("footer.disclaimer")}
						</p>
						<p className="mt-4 font-bold text-sm text-zinc-600">
							{t("footer.copyright")}
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

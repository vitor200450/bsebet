/**
 * Login · macrostructure: Asymmetric Broadcast Gate · genre: playful
 * tone: broadcast-competitive · DNA: LandingPage Z1 dark collage
 *
 * Redesign-preserve: charcoal + arena photo, paper auth panel,
 * electric-lime CTA, spray atmosphere - same kit as marketing landing.
 */
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InlineLoader } from "@/components/inline-loader";
import { useLangLink } from "@/i18n/useLangLink";
import { authClient } from "@/lib/auth-client";

function SpraySplat({
	variant,
	className,
}: {
	variant: "blue" | "red";
	className?: string;
}) {
	return (
		<img
			src={
				variant === "blue"
					? "/landing/spray-blue.png"
					: "/landing/spray-red.png"
			}
			alt=""
			aria-hidden="true"
			draggable={false}
			className={clsx(
				"pointer-events-none select-none object-contain",
				className,
			)}
		/>
	);
}

function GoogleMark({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path
				d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z"
				fill="#4285F4"
			/>
			<path
				d="M12.24 24.0008C15.4765 24.0008 18.2059 22.9382 20.19 21.1039L16.323 18.1056C15.2517 18.8375 13.8627 19.252 12.24 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.2764H1.5166V17.3744C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z"
				fill="#34A853"
			/>
			<path
				d="M5.50705 14.2764C5.00888 12.8096 5.00888 11.1961 5.50705 9.72931V6.63135H1.5166C-0.185516 10.0325 -0.185516 14.0004 1.5166 17.3744L5.50705 14.2764Z"
				fill="#FBBC05"
			/>
			<path
				d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.0016361C7.7029 0.0016361 3.55371 2.55909 1.5166 6.63135L5.50705 9.72931C6.45946 6.87244 9.10947 4.76773 12.24 4.74966Z"
				fill="#EA4335"
			/>
		</svg>
	);
}

const ease = [0.23, 1, 0.32, 1] as const;
const morphTransition = { duration: 0.16, ease };

const paperPanelStyle = {
	backgroundColor: "var(--color-paper)",
	backgroundImage: 'url("/landing/paper-crumple.jpg")',
	backgroundSize: "cover" as const,
	backgroundPosition: "center" as const,
};

interface LoginPageProps {
	lang: string;
}

export function LoginPage({ lang }: LoginPageProps) {
	const { t } = useTranslation("landing");
	const { routeTo } = useLangLink();
	const reduceMotion = useReducedMotion();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleGoogleLogin = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: `/${lang}/dashboard`,
			});

			if (result?.error) {
				console.error("Login failed", result.error);
				setError(t("login.error"));
				setIsLoading(false);
			}
		} catch (err) {
			console.error("Login failed", err);
			setError(t("login.error"));
			setIsLoading(false);
		}
	};

	return (
		<div
			className="relative flex min-h-[100dvh] w-full flex-1 flex-col overflow-hidden"
			style={{ background: "var(--color-charcoal)" }}
		>
			{/* Arena atmosphere - same kit as landing Z1 */}
			<img
				src="/landing/hero-arena.png"
				alt=""
				className="pointer-events-none absolute inset-0 h-full w-full object-cover"
				aria-hidden="true"
			/>
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(24,24,24,0.94)_0%,rgba(24,24,24,0.88)_50%,rgba(24,24,24,0.78)_100%)] md:bg-[linear-gradient(105deg,rgba(24,24,24,0.94)_0%,rgba(24,24,24,0.78)_48%,rgba(24,24,24,0.55)_100%)]" />
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					backgroundImage: "var(--background-image-noise)",
					opacity: 0.12,
				}}
			/>

			{/* Broadcast paint stripe */}
			<div className="absolute top-0 right-0 left-0 z-20 flex h-[5px]">
				<div className="flex-1 bg-brawl-blue" />
				<div className="flex-1 bg-bsen-red" />
			</div>

			<SpraySplat
				variant="red"
				className="absolute right-[-10%] bottom-[6%] z-[1] h-40 w-56 opacity-30 sm:h-52 sm:w-72 sm:opacity-45 md:right-[-4%] md:bottom-[10%] md:h-72 md:w-96"
			/>

			<div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6 md:px-10 md:py-20 lg:flex-row lg:items-center lg:gap-12 lg:px-12 xl:gap-16 xl:px-20">
				{/* Brand column */}
				<div className="relative flex min-w-0 flex-col justify-center lg:w-[52%] lg:shrink-0">
					<motion.div
						initial={
							reduceMotion
								? false
								: { opacity: 0, transform: "translateY(12px)" }
						}
						animate={{ opacity: 1, transform: "translateY(0px)" }}
						transition={{ duration: 0.28, delay: 0, ease }}
						className="relative mb-5 w-fit"
					>
						<SpraySplat
							variant="blue"
							className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-28 w-40 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-6 opacity-55 sm:h-36 sm:w-52"
						/>
						<img
							src="/logo-white.png"
							alt={t("common:appName")}
							className="relative z-10 h-11 w-auto object-contain sm:h-14 md:h-16"
						/>
					</motion.div>

					<motion.h1
						initial={
							reduceMotion
								? false
								: { opacity: 0, transform: "translateY(16px)" }
						}
						animate={{ opacity: 1, transform: "translateY(0px)" }}
						transition={{ duration: 0.28, delay: 0.05, ease }}
						className="max-w-full pb-1 font-black font-body text-white uppercase leading-[1.05] tracking-tight"
						style={{
							fontSize: "clamp(2.25rem, 1.8rem + 2.4vw, 4.5rem)",
						}}
					>
						<span className="block">{t("login.title")}</span>
						<span className="block text-electric-lime">
							{t("login.titleAccent")}
						</span>
					</motion.h1>

					<motion.p
						initial={reduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.28, delay: 0.1, ease }}
						className="mt-5 max-w-md font-black font-body text-[#A0A0A0] text-base leading-relaxed md:text-lg"
					>
						{t("login.subtitle")}
					</motion.p>
				</div>

				{/* Auth panel */}
				<motion.div
					initial={
						reduceMotion
							? false
							: { opacity: 0, transform: "translateY(16px) scale(0.98)" }
					}
					animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
					transition={{ duration: 0.28, delay: 0.15, ease }}
					className="relative w-full max-w-md lg:ml-auto lg:w-[42%] lg:max-w-lg"
				>
					<div
						className="relative border-[3px] border-black text-ink shadow-[8px_8px_0_#000]"
						style={paperPanelStyle}
					>
						{/* Skewed lime ticket tab */}
						<div className="absolute -top-3 left-5 z-10 -skew-x-12 border-[3px] border-black bg-electric-lime px-3 py-1 shadow-[3px_3px_0_#000]">
							<span className="block skew-x-12 font-black font-body text-[10px] text-black uppercase tracking-[0.18em]">
								{t("login.panelLabel")}
							</span>
						</div>

						<div className="relative space-y-6 p-6 pt-8 sm:p-8 sm:pt-10">
							<div className="space-y-2">
								<p className="font-bold font-body text-[11px] text-gray-500 uppercase tracking-widest">
									{t("login.panelHint")}
								</p>
								<div className="h-[3px] w-12 bg-bsen-red" aria-hidden="true" />
							</div>

							<button
								type="button"
								onClick={handleGoogleLogin}
								disabled={isLoading}
								aria-busy={isLoading}
								className={clsx(
									"login-google-cta group relative flex h-14 w-full cursor-pointer items-center justify-center",
									"border-[3px] border-black bg-electric-lime text-black",
									"font-black font-display uppercase",
									"focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-electric-lime/50",
									"disabled:cursor-not-allowed",
								)}
							>
								<span className="relative flex h-full w-full items-center justify-center overflow-hidden">
									<AnimatePresence mode="wait" initial={false}>
										{isLoading ? (
											<motion.span
												key="loading"
												initial={
													reduceMotion
														? false
														: { opacity: 0, filter: "blur(2px)" }
												}
												animate={{ opacity: 1, filter: "blur(0px)" }}
												exit={
													reduceMotion
														? undefined
														: { opacity: 0, filter: "blur(2px)" }
												}
												transition={morphTransition}
												className="absolute inset-0 flex items-center justify-center"
											>
												<InlineLoader size="md" />
											</motion.span>
										) : (
											<motion.span
												key="idle"
												initial={
													reduceMotion
														? false
														: { opacity: 0, filter: "blur(2px)" }
												}
												animate={{ opacity: 1, filter: "blur(0px)" }}
												exit={
													reduceMotion
														? undefined
														: { opacity: 0, filter: "blur(2px)" }
												}
												transition={morphTransition}
												className="flex items-center justify-center gap-3"
											>
												<span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white p-1">
													<GoogleMark className="h-full w-full" />
												</span>
												<span className="text-base tracking-wide md:text-lg">
													{t("loginWithGoogle")}
												</span>
											</motion.span>
										)}
									</AnimatePresence>
								</span>
							</button>

							<AnimatePresence initial={false}>
								{error ? (
									<motion.p
										key="login-error"
										role="alert"
										initial={
											reduceMotion
												? false
												: { opacity: 0, transform: "translateY(4px)" }
										}
										animate={{ opacity: 1, transform: "translateY(0px)" }}
										exit={
											reduceMotion
												? undefined
												: { opacity: 0, transform: "translateY(4px)" }
										}
										transition={{ duration: 0.18, ease }}
										className="border-2 border-black bg-bsen-red px-3 py-2 font-bold font-body text-white text-xs uppercase tracking-wide"
									>
										{error}
									</motion.p>
								) : null}
							</AnimatePresence>

							<Link
								{...routeTo("/landing")}
								className="inline-flex items-center gap-1.5 font-black font-body text-ink/55 text-sm uppercase tracking-[0.08em] transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-lime/50"
							>
								<span
									className="material-symbols-outlined text-sm"
									aria-hidden="true"
								>
									arrow_back
								</span>
								{t("login.backToLanding")}
							</Link>
						</div>
					</div>
				</motion.div>
			</div>

			{/* Bottom paint stripe */}
			<div className="absolute right-0 bottom-0 left-0 z-20 flex h-[5px]">
				<div className="flex-1 bg-brawl-blue" />
				<div className="flex-1 bg-bsen-red" />
			</div>
		</div>
	);
}

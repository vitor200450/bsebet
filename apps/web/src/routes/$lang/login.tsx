import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/$lang/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation("landing");
	const { lang } = Route.useParams();
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleLogin = async () => {
		setIsLoading(true);
		try {
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: `/${lang}/dashboard`,
			});

			if (result?.error) {
				console.error("Login failed", result.error);
				setIsLoading(false);
			}
		} catch (error) {
			console.error("Login failed", error);
			setIsLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-ink">
			{/* Broadcast frame — top bar: blue/red split */}
			<div className="absolute top-0 right-0 left-0 z-10 flex h-[6px]">
				<div className="w-1/2 bg-brawl-blue" />
				<div className="w-1/2 bg-brawl-red" />
			</div>

			{/* Broadcast frame — left blue rail */}
			<div className="absolute top-0 left-0 z-10 h-full w-[3px] bg-brawl-blue" />

			{/* Broadcast frame — right red rail */}
			<div className="absolute top-0 right-0 z-10 h-full w-[3px] bg-brawl-red" />

			{/* Noise texture */}
			<div
				className="pointer-events-none absolute inset-0 opacity-40"
				style={{
					backgroundImage: "var(--background-image-noise)",
				}}
			/>

			{/* Login Card */}
			<div className="relative z-20 w-full max-w-md border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_#000] md:p-10">
				{/* Logo area */}
				<div className="mb-8 flex justify-center">
					<div className="-skew-x-12 border-[3px] border-black bg-white px-5 py-2 shadow-[4px_4px_0px_#000]">
						<div className="flex skew-x-12 items-center gap-3">
							<img
								src="/logo-new.png"
								alt={t("common:appName")}
								className="h-7 object-contain md:h-8"
							/>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="space-y-6">
					<div className="space-y-2 text-center">
						<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter md:text-3xl">
							{t("welcome")}
						</h2>
						<p className="font-bold text-gray-500 text-xs uppercase tracking-[0.15em]">
							{t("heroSubtitle")}
						</p>
					</div>

					{/* Divider */}
					<div className="flex items-center gap-3">
						<div className="flex-1 border-black/10 border-t" />
					</div>

					{/* Google Button */}
					<button
						type="button"
						onClick={handleGoogleLogin}
						disabled={isLoading}
						className="group relative flex h-14 w-full cursor-pointer items-center justify-center overflow-hidden border-[3px] border-black bg-[#ccff00] shadow-[6px_6px_0px_0px_#000] transition-all duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
					>
						<div className="relative z-10 flex items-center gap-3">
							{isLoading ? (
								<Loader2 className="h-5 w-5 animate-spin text-black" />
							) : (
								<>
									<div className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-black bg-white p-1">
										<svg
											className="h-full w-full"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
										>
											<path
												d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z"
												fill="#ffff"
											/>
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
									</div>
									<span className="font-black text-base text-black uppercase italic tracking-wide md:text-lg">
										{t("loginWithGoogle")}
									</span>
								</>
							)}
						</div>
					</button>
				</div>
			</div>

			{/* Bottom broadcast stripe */}
			<div className="absolute right-0 bottom-0 left-0 z-10 flex h-[3px]">
				<div className="w-1/2 bg-brawl-blue" />
				<div className="w-1/2 bg-brawl-red" />
			</div>
		</div>
	);
}

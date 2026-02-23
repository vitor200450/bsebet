import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleLogin = async () => {
		setIsLoading(true);
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: "/dashboard",
			});
		} catch (error) {
			console.error("Login failed", error);
			setIsLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#E6E6E6] p-6 font-sans">
			{/* Background Texture Overlay */}
			<div
				className="pointer-events-none absolute inset-0 z-0 opacity-50 mix-blend-multiply"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
				}}
			/>

			{/* Dynamic decorative elements (Background Globs) */}
			<div className="pointer-events-none absolute top-1/4 left-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-[#CCFF00] opacity-20 blur-[120px]" />
			<div
				className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] animate-pulse rounded-full bg-blue-400 opacity-10 blur-[100px]"
				style={{ animationDelay: "1s" }}
			/>

			{/* Login Card (Centered) */}
			<div className="relative z-20 w-full max-w-md border-[4px] border-black bg-white p-8 shadow-[8px_8px_0px_#000] md:p-12">
				{/* Logo */}
				<div className="mb-10 flex justify-center">
					<div className="relative">
						<h1
							className="stroke-white font-black text-5xl text-black italic tracking-tighter md:text-6xl"
							style={{
								textShadow: "4px 4px 0px #000",
								WebkitTextStroke: "2px white",
							}}
						>
							BSEBET
						</h1>
						<div className="absolute -top-4 -right-6 rotate-12 transform">
							<span className="border-2 border-black bg-[#CCFF00] px-2 py-1 font-black text-black text-xs shadow-[2px_2px_0px_#000]">
								BETA
							</span>
						</div>
					</div>
				</div>

				{/* Form Content */}
				<div className="space-y-8">
					<div className="space-y-2 text-center">
						<h2 className="font-black text-2xl text-black uppercase italic tracking-tighter">
							BEM-VINDO
						</h2>
						<p className="font-bold text-gray-500 text-sm uppercase tracking-wider">
							Faça login para começar a apostar
						</p>
					</div>

					{/* Google Button */}
					<button
						onClick={handleGoogleLogin}
						disabled={isLoading}
						className="group relative flex h-16 w-full items-center justify-center overflow-hidden border-[3px] border-black bg-[#CCFF00] shadow-[6px_6px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
					>
						<div className="relative z-10 flex items-center gap-4">
							{isLoading ? (
								<Loader2 className="h-6 w-6 animate-spin text-black" />
							) : (
								<>
									<div className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-black bg-white p-1">
										<svg
											className="h-full w-full"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
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
									<span className="font-black text-black text-lg uppercase italic tracking-wide">
										Entrar com Google
									</span>
								</>
							)}
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Camera, Lock, Save, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageCropper } from "@/components/image-cropper";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import {
	getMyProfile,
	restoreGoogleAvatar,
	updateNickname,
	uploadUserAvatar,
} from "@/server/users";

export const Route = createFileRoute("/profile")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({ to: "/login" });
		}
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();

	const { data: profile, refetch } = useQuery({
		queryKey: ["myProfile"],
		queryFn: () => getMyProfile(),
		initialData: null,
	});

	const { refetch: refetchSession } = authClient.useSession();

	const user = (profile ?? session?.user) as {
		id: string;
		nickname?: string | null;
		image?: string | null;
		name?: string | null;
		email?: string | null;
	};

	const [mounted, setMounted] = useState(false);

	// Initialize with user.nickname if available (only on client to avoid mismatch)
	// SSR will use ""
	const [nickname, setNickname] = useState("");
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [isRestoring, setIsRestoring] = useState(false);
	const [croppingImage, setCroppingImage] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setMounted(true);
		// Initialize nickname once mounted
		if (user?.nickname) {
			setNickname(user.nickname);
		}
	}, []);

	// Sync nickname when user data loads/updates (only after mounted)
	useEffect(() => {
		if (mounted && user?.nickname !== undefined && user?.nickname !== null) {
			setNickname(user.nickname);
		}
	}, [user?.nickname, mounted]);

	async function handleRestoreGoogleAvatar() {
		setIsRestoring(true);
		try {
			const { pictureUrl } = await restoreGoogleAvatar();
			setAvatarPreview(pictureUrl);
			await Promise.all([refetch(), refetchSession()]);
			toast.success("Avatar do Google restaurado!");
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: "Não foi possível restaurar o avatar do Google.";
			toast.error(msg);
		} finally {
			setIsRestoring(false);
		}
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 2 * 1024 * 1024) {
			toast.error("Imagem muito grande. Máximo 2MB.");
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			const result = ev.target?.result as string;
			setCroppingImage(result);
			if (fileInputRef.current) {
				fileInputRef.current.value = ""; // Reset input so same file can be selected again
			}
		};
		reader.readAsDataURL(file);
	}

	function handleCropComplete(croppedImage: string) {
		setAvatarPreview(croppedImage);
		setAvatarBase64(croppedImage);
		setCroppingImage(null);
	}

	async function handleSave() {
		if (!user?.id) return;

		setIsSaving(true);
		try {
			// Execute updates sequentially to avoid race conditions
			if (avatarBase64) {
				await uploadUserAvatar({
					data: { userId: user.id, imageBase64: avatarBase64 },
				});
			}

			await updateNickname({
				data: { userId: user.id, nickname: nickname.trim() || null },
			});

			setAvatarBase64(null);
			await Promise.all([refetch(), refetchSession()]);
			toast.success("Perfil atualizado com sucesso!");
		} catch (err) {
			console.error(err);
			toast.error("Erro ao salvar. Tente novamente.");
		} finally {
			setIsSaving(false);
		}
	}

	const displayImage = avatarPreview ?? user?.image;

	return (
		<div className="relative min-h-screen bg-[#e6e6e6] pb-16">
			{/* Paper texture overlay */}
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.15] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			{/* Page Header */}
			<div className="relative overflow-hidden bg-black">
				<div className="relative z-10 mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-6 md:px-6 md:py-10">
					<div className="inline-block -skew-x-12 transform border-[3px] border-white bg-black px-6 py-3 text-white shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] md:px-8 md:py-4">
						<h1 className="skew-x-12 transform font-black text-3xl uppercase italic tracking-tighter md:text-5xl">
							MEU PERFIL
						</h1>
					</div>
					<div className="flex skew-x-0 transform items-center gap-2">
						<span className="material-symbols-outlined text-gray-500 text-xl">
							manage_accounts
						</span>
						<span className="font-bold text-gray-500 text-sm">
							Edite suas informações
						</span>
					</div>
				</div>
				{/* Split border rail */}
				<div className="absolute right-0 bottom-0 left-0 flex h-[4px] w-full">
					<div className="flex-1 bg-[#2e5cff]" />
					<div className="flex-1 bg-[#ff2e2e]" />
				</div>
			</div>

			{/* Content */}
			<div className="relative z-10 mx-auto flex max-w-[520px] flex-col gap-5 px-4 py-8 md:py-12">
				{/* Avatar Card */}
				<div className="flex flex-col items-center gap-4 border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
					<div className="mb-2 flex w-full items-center gap-3">
						<div className="rotate-3 transform border-2 border-black bg-[#2e5cff] p-2 shadow-[2px_2px_0_0_#000]">
							<Camera className="h-5 w-5 text-white" strokeWidth={3} />
						</div>
						<h2 className="font-black text-black text-xl uppercase italic tracking-tighter">
							FOTO DE PERFIL
						</h2>
					</div>

					{/* Avatar Frame */}
					<div className="relative">
						<div className="relative h-28 w-28 -skew-x-6 transform overflow-hidden border-[3px] border-black bg-[#e6e6e6] shadow-[4px_4px_0_0_#000]">
							<div className="absolute inset-0 flex items-center justify-center">
								{displayImage ? (
									<img
										src={displayImage}
										alt="Avatar"
										className="h-full w-full object-cover"
									/>
								) : (
									<User
										size={56}
										strokeWidth={1.5}
										className="skew-x-6 transform text-gray-400"
									/>
								)}
							</div>
						</div>

						{/* Camera badge */}
						<button
							onClick={() => fileInputRef.current?.click()}
							className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center border-[3px] border-black bg-[#ffc700] shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						>
							<Camera size={16} strokeWidth={3} className="text-black" />
						</button>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={() => fileInputRef.current?.click()}
							className="border-[2px] border-black px-4 py-1.5 font-black text-[10px] text-black uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
						>
							TROCAR FOTO
						</button>
						<button
							onClick={handleRestoreGoogleAvatar}
							disabled={isRestoring}
							title="Restaurar foto do Google"
							className="flex items-center gap-1.5 border-[2px] border-gray-400 px-4 py-1.5 font-black text-[10px] text-gray-600 uppercase tracking-widest transition-colors hover:border-black hover:text-black disabled:opacity-50"
						>
							<svg
								viewBox="0 0 24 24"
								className="h-3 w-3 fill-current"
								aria-hidden="true"
							>
								<path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
							</svg>
							{isRestoring ? "..." : "GOOGLE"}
						</button>
					</div>
					<p className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
						JPG, PNG — máx. 2MB
					</p>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={handleFileChange}
					/>
				</div>

				{/* Read-only Info Card */}
				<div className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
					<div className="mb-5 flex items-center gap-3">
						<div className="-rotate-3 transform border-2 border-black bg-[#ff2e2e] p-2 shadow-[2px_2px_0_0_#000]">
							<Lock className="h-5 w-5 text-white" strokeWidth={3} />
						</div>
						<h2 className="font-black text-black text-xl uppercase italic tracking-tighter">
							DADOS DA CONTA
						</h2>
					</div>

					<div className="flex flex-col gap-3">
						{/* Nome */}
						<div className="flex flex-col gap-1">
							<span className="flex items-center gap-1 font-black text-[9px] text-gray-500 uppercase tracking-widest">
								<Lock size={9} />
								NOME
							</span>
							<div className="flex items-center justify-between border-[2px] border-black/20 bg-[#e6e6e6] px-3 py-2.5">
								<span className="font-black text-black text-sm">
									{user?.name ?? "—"}
								</span>
								<Lock size={13} strokeWidth={2.5} className="text-gray-400" />
							</div>
						</div>

						{/* E-mail */}
						<div className="flex flex-col gap-1">
							<span className="flex items-center gap-1 font-black text-[9px] text-gray-500 uppercase tracking-widest">
								<Lock size={9} />
								E-MAIL
							</span>
							<div className="flex items-center justify-between border-[2px] border-black/20 bg-[#e6e6e6] px-3 py-2.5">
								<span className="truncate font-black text-black text-sm">
									{user?.email ?? "—"}
								</span>
								<Lock
									size={13}
									strokeWidth={2.5}
									className="ml-2 shrink-0 text-gray-400"
								/>
							</div>
						</div>
					</div>

					<p className="mt-4 font-bold text-[9px] text-gray-400 uppercase tracking-wider">
						Esses dados vêm da sua conta Google e não podem ser alterados.
					</p>
				</div>

				{/* Nickname Edit Card */}
				<div className="border-[3px] border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
					<div className="mb-5 flex items-center gap-3">
						<div className="rotate-2 transform border-2 border-black bg-[#ffc700] p-2 shadow-[2px_2px_0_0_#000]">
							<span className="material-symbols-outlined text-black text-xl">
								edit
							</span>
						</div>
						<h2 className="font-black text-black text-xl uppercase italic tracking-tighter">
							NICKNAME
						</h2>
					</div>

					<div className="flex flex-col gap-2">
						<label className="font-black text-[9px] text-black uppercase tracking-widest">
							SEU APELIDO NO RANKING
						</label>
						<div className="relative">
							<input
								type="text"
								value={nickname}
								onChange={(e) => setNickname(e.target.value.slice(0, 50))}
								placeholder="Digite seu nickname..."
								className="w-full border-[3px] border-black bg-white px-3 py-3 font-black text-black text-sm transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-[#ccff00] focus:shadow-[0_0_0_2px_#ccff00] focus:outline-none"
							/>
							<span className="absolute right-3 bottom-2 font-black font-mono text-[9px] text-gray-400">
								{nickname.length}/50
							</span>
						</div>
						<p className="font-bold text-[10px] text-gray-500">
							Seu nome de exibição no leaderboard
						</p>
					</div>
				</div>

				{/* Save Button */}
				<button
					onClick={handleSave}
					disabled={isSaving}
					className="group flex w-full -skew-x-12 transform items-center justify-center gap-3 border-[3px] border-black bg-[#ffc700] px-6 py-5 font-black text-base text-black uppercase italic tracking-wider shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Save
						size={20}
						strokeWidth={3}
						className="skew-x-12 transform transition-transform group-hover:scale-110"
					/>
					<span className="skew-x-12 transform">
						{isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
					</span>
				</button>

				{/* Ver Perfil Público */}
				{user?.id && (
					<Link
						to="/users/$userId"
						params={{ userId: user.id }}
						className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-6 py-4 font-black text-sm text-black uppercase italic tracking-wider shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000]"
					>
						<span className="material-symbols-outlined text-sm">public</span>
						Ver Perfil Público
					</Link>
				)}

				{/* Bottom decorative elements */}
				<div className="mt-4 flex items-center justify-center gap-3 opacity-40">
					<div className="h-1 w-12 -skew-x-12 transform bg-black" />
					<div className="h-3 w-3 rotate-45 border-2 border-black bg-[#ccff00]" />
					<div className="h-1 w-12 skew-x-12 transform bg-black" />
				</div>
			</div>

			{croppingImage && (
				<ImageCropper
					imageSrc={croppingImage!}
					onCropComplete={handleCropComplete}
					onCancel={() => setCroppingImage(null)}
				/>
			)}
		</div>
	);
}

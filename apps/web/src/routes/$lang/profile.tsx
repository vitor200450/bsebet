import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Camera, ChevronRight, Lock, Save, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImageCropper } from "@/components/image-cropper";
import { getUser } from "@/functions/get-user";
import { useLangLink } from "@/i18n/useLangLink";
import { authClient } from "@/lib/auth-client";
import {
	getMyProfile,
	restoreGoogleAvatar,
	updateNickname,
	uploadUserAvatar,
} from "@/server/users";

export const Route = createFileRoute("/$lang/profile")({
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

export function RouteComponent() {
	return <ProfilePageContent />;
}

export function ProfilePageContent({
	initialSession,
}: {
	initialSession?: Awaited<ReturnType<typeof getUser>>;
} = {}) {
	const { t } = useTranslation("profile");
	const { routeTo } = useLangLink();
	const { session } = initialSession
		? { session: initialSession }
		: Route.useRouteContext();

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

	const [nickname, setNickname] = useState("");
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [isRestoring, setIsRestoring] = useState(false);
	const [croppingImage, setCroppingImage] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setMounted(true);
		if (user?.nickname) {
			setNickname(user.nickname);
		}
	}, []);

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
			toast.success(t("toast.googleRestored"));
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : t("toast.avatarRestoreError");
			toast.error(msg);
		} finally {
			setIsRestoring(false);
		}
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 2 * 1024 * 1024) {
			toast.error(t("toast.imageTooLarge"));
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			const result = ev.target?.result as string;
			setCroppingImage(result);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
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
			toast.success(t("toast.saved"));
		} catch (err) {
			console.error(err);
			toast.error(t("toast.error"));
		} finally {
			setIsSaving(false);
		}
	}

	const displayImage = avatarPreview ?? user?.image;

	return (
		<div className="relative min-h-screen bg-[#f0f0f0] pb-12">
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.12] mix-blend-multiply"
				style={{
					backgroundImage:
						'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
					backgroundRepeat: "repeat",
				}}
			/>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-12">
				<div className="mb-8 md:mb-10">
					<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<h1 className="font-black text-4xl text-[#121212] uppercase italic tracking-tighter md:text-5xl">
								{t("title")}
							</h1>
							<p className="mt-2 font-bold text-gray-600 text-lg">
								{t("editInfo")}
							</p>
						</div>
						{user?.id && (
							<Link
								{...routeTo("/users/$userId")}
								params={{ userId: user.id }}
								className="group flex items-center gap-2 font-black text-[#2e5cff] text-sm uppercase tracking-wider transition-colors hover:text-[#121212]"
							>
								{t("viewPublic")}
								<ChevronRight
									className="h-4 w-4 transition-transform group-hover:translate-x-1"
									strokeWidth={3}
								/>
							</Link>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="lg:col-span-1">
						<div className="sticky top-6 space-y-6">
							<div className="rounded-lg border-2 border-black bg-white p-6 shadow-[3px_3px_0_0_#000]">
								<div className="mb-5 flex items-center gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2e5cff]">
										<Camera className="h-4 w-4 text-white" strokeWidth={2.5} />
									</div>
									<h2 className="font-black text-[#121212] text-lg uppercase tracking-tight">
										{t("avatarSection")}
									</h2>
								</div>

								<div className="flex flex-col items-center gap-5">
									<div className="relative">
										<div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border-[3px] border-black bg-[#e6e6e6] shadow-[4px_4px_0_0_#000]">
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
													className="text-gray-400"
												/>
											)}
										</div>
										<button
											onClick={() => fileInputRef.current?.click()}
											className="absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-md border-[3px] border-black bg-[#ffc700] shadow-[2px_2px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
										>
											<Camera
												size={16}
												strokeWidth={3}
												className="text-black"
											/>
										</button>
									</div>

									<div className="grid w-full grid-cols-1 gap-3">
										<button
											onClick={() => fileInputRef.current?.click()}
											className="rounded-lg border-2 border-black bg-[#2e5cff] px-4 py-3 font-black text-sm text-white uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none"
										>
											{t("changePhoto")}
										</button>
										<button
											onClick={handleRestoreGoogleAvatar}
											disabled={isRestoring}
											title={t("restoreGoogle")}
											className="flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-white px-4 py-3 font-black text-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] disabled:opacity-50"
										>
											<svg
												viewBox="0 0 24 24"
												className="h-3.5 w-3.5 fill-current"
												aria-hidden="true"
											>
												<path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
											</svg>
											{isRestoring ? t("loading") : t("google")}
										</button>
									</div>

									<p className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
										{t("avatarNote")}
									</p>

									<input
										ref={fileInputRef}
										type="file"
										accept="image/jpeg,image/png,image/webp"
										className="hidden"
										onChange={handleFileChange}
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-6 lg:col-span-2">
						<div className="rounded-lg border-2 border-black bg-white p-6 shadow-[3px_3px_0_0_#000]">
							<div className="mb-5 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ff2e2e]">
									<Lock className="h-4 w-4 text-white" strokeWidth={2.5} />
								</div>
								<h2 className="font-black text-[#121212] text-lg uppercase tracking-tight">
									{t("accountSection")}
								</h2>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<div className="rounded-lg border-2 border-black/10 bg-[#f0f0f0] px-4 py-3">
									<div className="mb-1 font-black text-[9px] text-gray-500 uppercase tracking-widest">
										{t("nameLabel")}
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="font-black text-black text-sm">
											{user?.name ?? "—"}
										</span>
										<Lock
											size={14}
											strokeWidth={2.5}
											className="shrink-0 text-gray-400"
										/>
									</div>
								</div>

								<div className="rounded-lg border-2 border-black/10 bg-[#f0f0f0] px-4 py-3">
									<div className="mb-1 font-black text-[9px] text-gray-500 uppercase tracking-widest">
										{t("emailLabel")}
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="truncate font-black text-black text-sm">
											{user?.email ?? "—"}
										</span>
										<Lock
											size={14}
											strokeWidth={2.5}
											className="shrink-0 text-gray-400"
										/>
									</div>
								</div>
							</div>

							<p className="mt-4 font-bold text-[9px] text-gray-400 uppercase tracking-wider">
								{t("googleAccountNote")}
							</p>
						</div>

						<div className="rounded-lg border-2 border-black bg-white p-6 shadow-[3px_3px_0_0_#000]">
							<div className="mb-5 flex items-center gap-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffc700]">
									<span className="material-symbols-outlined text-black text-lg">
										id_card
									</span>
								</div>
								<h2 className="font-black text-[#121212] text-lg uppercase tracking-tight">
									{t("nicknameSection")}
								</h2>
							</div>

							<div className="space-y-4">
								<div>
									<label className="mb-2 block font-black text-[10px] text-gray-500 uppercase tracking-widest">
										{t("nicknameLabel")}
									</label>
									<div className="relative">
										<input
											type="text"
											value={nickname}
											onChange={(e) => setNickname(e.target.value.slice(0, 50))}
											placeholder={t("nicknamePlaceholder")}
											className="h-12 w-full rounded-lg border-[3px] border-black bg-white px-4 font-black text-base text-black outline-none transition-shadow placeholder:font-normal placeholder:text-gray-400 focus:shadow-[3px_3px_0_0_#ffc700]"
										/>
										<span className="absolute right-3 bottom-2 font-black font-mono text-[9px] text-gray-400">
											{nickname.length}/50
										</span>
									</div>
									<p className="mt-2 font-bold text-[10px] text-gray-500 uppercase tracking-wider">
										{t("displayNameHint")}
									</p>
								</div>

								<button
									onClick={handleSave}
									disabled={isSaving}
									className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black bg-[#ffc700] px-5 py-3 font-black text-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:shadow-[2px_2px_0_0_#000] active:shadow-none disabled:opacity-60"
								>
									<Save className="h-4 w-4" strokeWidth={2.5} />
									{isSaving ? t("saving") : t("saveChanges")}
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-12 flex items-center justify-center gap-2 opacity-30">
					<div className="h-px w-16 bg-black" />
					<div className="h-2 w-2 rounded-sm bg-[#ccff00]" />
					<div className="h-px w-16 bg-black" />
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

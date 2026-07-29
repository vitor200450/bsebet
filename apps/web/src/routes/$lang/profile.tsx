import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Camera, ChevronRight, Lock, Save, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { bannerActionLinkClass } from "@/components/EntityDetailBanner";
import { DetailPanel } from "@/components/entity-detail-ui";
import { ImageCropper } from "@/components/image-cropper";
import { PublicPageShell } from "@/components/PublicPageShell";
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
	const previewName = nickname.trim() || user?.name || t("title");

	return (
		<PublicPageShell className="pb-20">
			<header className="surface-charcoal relative z-10 overflow-hidden border-black border-b-[3px]">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 opacity-[0.12]"
					style={{
						backgroundImage:
							"repeating-linear-gradient(-12deg, transparent, transparent 10px, rgba(255,255,255,0.25) 10px, rgba(255,255,255,0.25) 11px)",
					}}
				/>
				<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
					<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="mb-1 font-body font-bold text-[10px] text-white/70 uppercase tracking-widest">
								{t("editInfo")}
							</p>
							<h1 className="pb-1 font-black font-display text-3xl text-white uppercase italic leading-[1.1] tracking-tighter md:text-5xl">
								{t("title")}
							</h1>
						</div>
						{user?.id ? (
							<Link
								{...routeTo("/users/$userId")}
								params={{ userId: user.id }}
								className={bannerActionLinkClass}
							>
								{t("viewPublic")}
								<ChevronRight className="h-4 w-4" strokeWidth={3} />
							</Link>
						) : null}
					</div>

					<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
						<div className="flex h-24 w-24 items-center justify-center overflow-hidden border-[3px] border-black bg-white text-ink shadow-comic-md md:h-28 md:w-28">
							{displayImage ? (
								<img
									src={displayImage}
									alt={previewName}
									className="h-full w-full object-cover"
								/>
							) : (
								<User size={40} strokeWidth={1.5} className="text-gray-400" />
							)}
						</div>
						<div className="min-w-0 text-center sm:text-left">
							<p className="truncate pe-[0.35em] pb-0.5 font-black font-display text-2xl text-white uppercase italic leading-[1.15] tracking-tighter md:text-3xl">
								{previewName}
							</p>
							{user?.email ? (
								<p className="mt-1 truncate font-body font-bold text-[10px] text-white/70 uppercase tracking-widest">
									{user.email}
								</p>
							) : null}
						</div>
					</div>
				</div>
			</header>

			<div className="relative z-10 mx-auto max-w-[1400px] px-4 py-8 md:px-6 md:py-10">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="lg:col-span-1">
						<div className="sticky top-6">
							<DetailPanel
								title={t("avatarSection")}
								icon={
									<div className="surface-brawl-blue flex h-8 w-8 items-center justify-center border-2 border-black shadow-comic-sm">
										<Camera className="h-4 w-4 text-white" strokeWidth={2.5} />
									</div>
								}
							>
								<div className="flex flex-col items-center gap-5">
									<div className="relative">
										<div className="flex h-36 w-36 items-center justify-center overflow-hidden border-[3px] border-black bg-tape text-ink shadow-comic-md">
											{displayImage ? (
												<img
													src={displayImage}
													alt={previewName}
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
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="surface-yellow absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center border-[3px] border-black shadow-comic-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
											type="button"
											onClick={() => fileInputRef.current?.click()}
											className="surface-brawl-blue border-[3px] border-black px-4 py-3 font-black font-display text-sm uppercase tracking-wider shadow-comic-md transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
										>
											{t("changePhoto")}
										</button>
										<button
											type="button"
											onClick={handleRestoreGoogleAvatar}
											disabled={isRestoring}
											title={t("restoreGoogle")}
											className="flex items-center justify-center gap-2 border-[3px] border-black bg-white px-4 py-3 font-black font-display text-ink text-sm uppercase tracking-wider shadow-comic-md transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
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

									<p className="font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
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
							</DetailPanel>
						</div>
					</div>

					<div className="flex flex-col gap-6 lg:col-span-2">
						<DetailPanel
							title={t("accountSection")}
							icon={
								<div className="surface-brawl-red flex h-8 w-8 items-center justify-center border-2 border-black shadow-comic-sm">
									<Lock className="h-4 w-4 text-white" strokeWidth={2.5} />
								</div>
							}
						>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<div className="border-2 border-black/10 bg-paper px-4 py-3 text-ink">
									<div className="mb-1 font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
										{t("nameLabel")}
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="font-black font-display text-ink text-sm">
											{user?.name ?? "-"}
										</span>
										<Lock
											size={14}
											strokeWidth={2.5}
											className="shrink-0 text-gray-400"
										/>
									</div>
								</div>

								<div className="border-2 border-black/10 bg-paper px-4 py-3 text-ink">
									<div className="mb-1 font-body font-bold text-[9px] text-gray-500 uppercase tracking-widest">
										{t("emailLabel")}
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="truncate font-black font-display text-ink text-sm">
											{user?.email ?? "-"}
										</span>
										<Lock
											size={14}
											strokeWidth={2.5}
											className="shrink-0 text-gray-400"
										/>
									</div>
								</div>
							</div>

							<p className="mt-4 font-body font-bold text-[9px] text-gray-400 uppercase tracking-widest">
								{t("googleAccountNote")}
							</p>
						</DetailPanel>

						<DetailPanel
							title={t("nicknameSection")}
							icon={
								<div className="surface-yellow flex h-8 w-8 items-center justify-center border-2 border-black shadow-comic-sm">
									<span className="material-symbols-outlined text-black text-lg">
										id_card
									</span>
								</div>
							}
						>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="profile-nickname"
										className="mb-2 block font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest"
									>
										{t("nicknameLabel")}
									</label>
									<div className="relative">
										<input
											id="profile-nickname"
											type="text"
											value={nickname}
											onChange={(e) => setNickname(e.target.value.slice(0, 50))}
											placeholder={t("nicknamePlaceholder")}
											className="h-12 w-full border-[3px] border-black bg-white px-4 font-black font-display text-base text-ink outline-none transition-shadow placeholder:font-normal placeholder:text-gray-400 focus:shadow-[3px_3px_0_0_#ffc700]"
										/>
										<span className="absolute right-3 bottom-2 font-body font-bold text-[9px] text-gray-400 tabular-nums">
											{nickname.length}/50
										</span>
									</div>
									<p className="mt-2 font-body font-bold text-[10px] text-gray-500 uppercase tracking-widest">
										{t("displayNameHint")}
									</p>
								</div>

								<button
									type="button"
									onClick={handleSave}
									disabled={isSaving}
									className="surface-lime flex w-full items-center justify-center gap-2 border-[3px] border-black px-5 py-3 font-black font-display text-sm uppercase tracking-wider shadow-comic-md transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-comic-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
								>
									<Save className="h-4 w-4" strokeWidth={2.5} />
									{isSaving ? t("saving") : t("saveChanges")}
								</button>
							</div>
						</DetailPanel>
					</div>
				</div>
			</div>

			{croppingImage ? (
				<ImageCropper
					imageSrc={croppingImage}
					onCropComplete={handleCropComplete}
					onCancel={() => setCroppingImage(null)}
				/>
			) : null}
		</PublicPageShell>
	);
}

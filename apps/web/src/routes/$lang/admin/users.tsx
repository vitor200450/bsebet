import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	Copy,
	Edit2,
	Image as ImageIcon,
	Search,
	Shield,
	Trash2,
	Upload,
	User,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	AdminFormActions,
	AdminFormModal,
} from "@/components/admin/AdminFormModal";
import { ConfirmationModal } from "@/components/admin/ConfirmationModal";
import { useLangLink } from "@/i18n/useLangLink";
import {
	deleteUser,
	getUsers,
	toggleRole,
	updateUserDetails,
} from "@/server/users";
import { useSetHeader } from "../../../components/HeaderContext";

export const Route = createFileRoute("/$lang/admin/users")({
	loader: async () => await getUsers(),
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { t } = useTranslation("admin");
	const { linkTo } = useLangLink();
	const users = Route.useLoaderData();
	const router = useRouter();
	const [searchTerm, setSearchTerm] = useState("");

	// Edit Modal State
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<{
		id: string;
		name: string | null;
		nickname: string | null;
		image: string | null;
	} | null>(null);

	// Role Confirmation Modal State
	const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
	const [roleTargetUser, setRoleTargetUser] = useState<{
		id: string;
		name: string | null;
		nickname: string | null;
		image: string | null;
		currentRole: string;
	} | null>(null);

	// Form State
	const [nicknameInput, setNicknameInput] = useState("");
	const [imageInput, setImageInput] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Delete Confirmation Modal State
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [deleteTargetUser, setDeleteTargetUser] = useState<{
		id: string;
		name: string | null;
		nickname: string | null;
		image: string | null;
	} | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// OPEN CONFIRMATION MODAL
	const initiateRoleToggle = (u: any) => {
		setRoleTargetUser({
			id: u.id,
			name: u.name,
			nickname: u.nickname,
			image: u.image,
			currentRole: u.role,
		});
		setIsRoleModalOpen(true);
	};

	// EXECUTE ROLE TOGGLE
	const confirmRoleToggle = async () => {
		if (!roleTargetUser) return;

		setIsSubmitting(true);
		const newRole = roleTargetUser.currentRole === "admin" ? "user" : "admin";

		try {
			await toggleRole({
				data: {
					userId: roleTargetUser.id,
					newRole: newRole as "admin" | "user",
				},
			});
			toast.success(
				t("users.toast.roleChanged", {
					role: newRole === "admin" ? t("users.admin") : t("users.member"),
				}),
			);
			setIsRoleModalOpen(false);
			router.invalidate();
		} catch (err) {
			toast.error(t("users.toast.roleChangeError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const openEditModal = (u: any) => {
		setEditingUser({
			id: u.id,
			name: u.name,
			nickname: u.nickname,
			image: u.image,
		});
		setNicknameInput(u.nickname || "");
		setImageInput(u.image || "");
		setIsEditModalOpen(true);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setImageInput(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSaveDetails = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUser) return;

		setIsSubmitting(true);
		try {
			await updateUserDetails({
				data: {
					userId: editingUser.id,
					nickname: nicknameInput || null,
					image: imageInput || null,
				},
			});
			toast.success(t("users.toast.detailsUpdated"));
			setIsEditModalOpen(false);
			router.invalidate();
		} catch (err) {
			toast.error(t("users.toast.updateError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	// OPEN DELETE CONFIRMATION MODAL
	const initiateDelete = (u: any) => {
		setDeleteTargetUser({
			id: u.id,
			name: u.name,
			nickname: u.nickname,
			image: u.image,
		});
		setIsDeleteModalOpen(true);
	};

	// EXECUTE DELETE
	const confirmDelete = async () => {
		if (!deleteTargetUser) return;

		setIsSubmitting(true);
		try {
			await deleteUser({
				data: {
					userId: deleteTargetUser.id,
				},
			});
			toast.success(t("users.toast.deleted"));
			setIsDeleteModalOpen(false);
			router.invalidate();
		} catch (err) {
			toast.error(t("users.toast.deleteError"));
		} finally {
			setIsSubmitting(false);
		}
	};

	useSetHeader({
		title: t("common:nav.adminUsers"),
		actions: (
			<div className="flex h-11 w-full items-center gap-4 sm:w-auto">
				<div className="relative w-full sm:w-auto">
					<input
						type="text"
						placeholder={t("common:actions.search")}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="h-11 w-full border-[3px] border-black bg-white px-4 py-0 pr-10 font-body font-bold text-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:font-body placeholder:text-gray-400 placeholder:uppercase placeholder:tracking-widest hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-[#ccff00]/40 sm:w-96"
					/>
					<Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
				</div>
			</div>
		),
	});

	const filteredUsers = users.filter(
		(u) =>
			(u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
			u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(u.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
	);

	return (
		<div className="min-h-screen bg-paper bg-paper-texture pb-20 font-sans">
			{/* LIST CONTENT */}
			<div className="mx-auto max-w-[1600px] px-6 py-8">
				<div className="overflow-hidden border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)]">
					<div className="overflow-x-auto">
						<div className="min-w-full md:min-w-[800px]">
							{/* Table Header */}
							<div className="hidden grid-cols-12 gap-4 border-black border-b-[4px] bg-black px-6 py-4 font-body font-bold text-sm text-white uppercase tracking-widest md:grid">
								<div className="col-span-4">{t("users.tableUserIdentity")}</div>
								<div className="col-span-4">{t("users.tableContact")}</div>
								<div className="col-span-2 text-center">
									{t("users.tableRole")}
								</div>
								<div className="col-span-2 text-right">
									{t("users.tableActions")}
								</div>
							</div>

							{/* List Rows */}
							{filteredUsers.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<div className="flex h-20 w-20 items-center justify-center rounded-md border-[3px] border-black border-dashed bg-gray-200">
										<User className="h-8 w-8 text-gray-400" />
									</div>
									<span className="font-black text-gray-400 text-lg uppercase italic">
										{t("users.empty")}
									</span>
								</div>
							) : (
								<div className="divide-y-[3px] divide-black">
									{filteredUsers.map((u, index) => (
										<div
											key={u.id}
											className={clsx(
												"flex flex-col items-start gap-4 px-6 py-4 transition-colors hover:bg-[#ccff00]/10 md:grid md:grid-cols-12 md:items-center",
												index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]",
											)}
										>
											{/* User Info */}
											<div className="flex w-full items-center gap-4 md:col-span-4">
												<Link
													to={linkTo("/users/$userId")}
													params={{ userId: u.id }}
													className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border-[3px] border-black bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-transform hover:scale-105"
												>
													{u.image ? (
														<img
															src={u.image}
															alt={u.nickname || "User"}
															className="h-full w-full object-cover"
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center bg-[#e0e0e0] font-black text-black italic">
															{u.nickname?.[0]?.toUpperCase() || "?"}
														</div>
													)}
												</Link>
												<div>
													<Link
														to={linkTo("/users/$userId")}
														params={{ userId: u.id }}
														className="font-black text-[#2e5cff] text-lg uppercase italic leading-none hover:underline"
													>
														{u.nickname || t("users.noNickname")}
													</Link>
													{/* Removed Google Name Display for Privacy */}
												</div>
											</div>

											{/* Contact */}
											<div className="flex w-full flex-col justify-center md:col-span-4">
												<span className="flex items-center gap-2 break-all font-body font-bold text-gray-700 text-sm">
													{u.email}
													<Copy className="h-3 w-3 shrink-0 cursor-pointer text-gray-300 hover:text-black" />
												</span>
												<span className="font-body font-bold text-[10px] text-gray-400 uppercase tabular-nums tracking-widest">
													ID: {u.id.slice(0, 8)}...
												</span>
											</div>

											{/* Role Badge */}
											<div className="flex w-full justify-start md:col-span-2 md:justify-center">
												<button
													onClick={() => initiateRoleToggle(u)}
													className={clsx(
														"flex transform items-center gap-1 border-[2px] border-black px-3 py-1 font-black font-display text-[10px] uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
														u.role === "admin"
															? "-skew-x-6 bg-[#ccff00] text-black"
															: "-skew-x-6 bg-gray-200 text-gray-500",
													)}
												>
													{u.role === "admin" && <Shield className="h-3 w-3" />}
													{u.role}
												</button>
											</div>

											{/* Actions */}
											<div className="mt-2 flex w-full justify-start gap-2 md:col-span-2 md:mt-0 md:justify-end">
												<button
													onClick={() => openEditModal(u)}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#2e5cff] hover:text-white hover:shadow-none md:flex-none"
													title={t("users.editDetails")}
												>
													<Edit2 className="h-4 w-4" />
												</button>
												<button
													onClick={() => initiateDelete(u)}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ff2e2e] hover:text-white hover:shadow-none md:flex-none"
													title={t("users.deleteUser")}
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<AdminFormModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				title={t("users.editUser")}
				onSubmit={handleSaveDetails}
				size="sm"
				formId="user-edit-form"
				footer={
					<AdminFormActions
						onCancel={() => setIsEditModalOpen(false)}
						cancelLabel={t("common:actions.cancel")}
						submitLabel={t("users.saveChanges")}
						isSubmitting={isSubmitting}
					/>
				}
			>
				<div className="space-y-6">
					<div>
						<label className="mb-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
							{t("users.displayName")}
						</label>
						<input
							type="text"
							value={nicknameInput}
							onChange={(e) => setNicknameInput(e.target.value)}
							placeholder={t("users.nicknamePlaceholder")}
							className="w-full border-[3px] border-black bg-white p-3 font-black font-display text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4 focus:ring-electric-lime"
						/>
						<p className="mt-2 font-black font-display text-black text-xl uppercase italic">
							{editingUser?.nickname || "User"}
						</p>
					</div>

					<div>
						<label className="mb-1 block font-body font-bold text-black text-xs uppercase tracking-widest">
							{t("users.profilePicture")}
						</label>

						<div className="mb-4 flex justify-center">
							<div className="group relative h-24 w-24 overflow-hidden rounded-md border-[3px] border-black bg-paper shadow-sm">
								{imageInput ? (
									<img
										src={imageInput}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center text-gray-300">
										<ImageIcon className="h-8 w-8" />
									</div>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<div className="relative">
								<ImageIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
								<input
									type="url"
									value={imageInput}
									onChange={(e) => setImageInput(e.target.value)}
									className="w-full border-[3px] border-black bg-white p-2 pl-9 font-body text-black text-xs placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime"
									placeholder={t("users.imageUrlPlaceholder")}
								/>
							</div>

							<div className="flex items-center gap-2">
								<span className="font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest">
									{t("users.or")}
								</span>
								<div className="h-[1px] flex-1 bg-gray-200" />
							</div>

							<input
								type="file"
								accept="image/*"
								className="hidden"
								ref={fileInputRef}
								onChange={handleFileUpload}
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-white py-2 font-black font-display text-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all hover:bg-gray-100 active:translate-y-[1px] active:shadow-none"
							>
								<Upload className="h-3 w-3" />
								{t("users.uploadFromDevice")}
							</button>
						</div>
					</div>
				</div>
			</AdminFormModal>

			<ConfirmationModal
				isOpen={isRoleModalOpen && !!roleTargetUser}
				onClose={() => setIsRoleModalOpen(false)}
				onConfirm={confirmRoleToggle}
				title={
					roleTargetUser?.currentRole === "admin"
						? t("users.revokeAdmin")
						: t("users.promoteUser")
				}
				description={
					roleTargetUser
						? `${t("users.confirmRoleChange")} ${
								roleTargetUser.currentRole === "admin"
									? t("users.removePrivileges")
									: t("users.grantAdmin")
							} ${roleTargetUser.nickname || roleTargetUser.name || "User"}`
						: ""
				}
				confirmLabel={
					roleTargetUser?.currentRole === "admin"
						? t("users.yesDemote")
						: t("users.yesMakeAdmin")
				}
				cancelLabel={t("common:actions.cancel")}
				isLoading={isSubmitting}
				variant={roleTargetUser?.currentRole === "admin" ? "danger" : "warning"}
			/>

			<ConfirmationModal
				isOpen={isDeleteModalOpen && !!deleteTargetUser}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={confirmDelete}
				title={t("users.deleteUserTitle")}
				description={
					deleteTargetUser
						? `${t("users.confirmDelete")} ${deleteTargetUser.nickname || deleteTargetUser.name || "User"}. ${t("users.deleteWarning")}`
						: ""
				}
				confirmLabel={t("users.yesDelete")}
				cancelLabel={t("common:actions.cancel")}
				isLoading={isSubmitting}
				variant="danger"
			/>
		</div>
	);
}

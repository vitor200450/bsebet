import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
	AlertTriangle,
	Copy,
	Edit2,
	Image as ImageIcon,
	Loader2,
	Search,
	Shield,
	Trash2,
	Upload,
	User,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	deleteUser,
	getUsers,
	toggleRole,
	updateUserDetails,
} from "@/server/users";
import { useSetHeader } from "../../components/HeaderContext";

export const Route = createFileRoute("/admin/users")({
	loader: async () => await getUsers(),
	component: AdminUsersPage,
});

function AdminUsersPage() {
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
				`User is now ${newRole === "admin" ? "an ADMIN" : "a MEMBER"}`,
			);
			setIsRoleModalOpen(false);
			router.invalidate();
		} catch (err) {
			toast.error("Failed to change role");
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
			toast.success("User details updated!");
			setIsEditModalOpen(false);
			router.invalidate();
		} catch (err) {
			toast.error("Failed to update user");
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
			toast.success("User deleted successfully");
			setIsDeleteModalOpen(false);
			router.invalidate();
		} catch (err) {
			toast.error("Failed to delete user");
		} finally {
			setIsSubmitting(false);
		}
	};

	useSetHeader({
		title: "USERS",
		actions: (
			<div className="flex w-full items-center gap-4 sm:w-auto">
				<div className="relative w-full sm:w-auto">
					<input
						type="text"
						placeholder="SEARCH USERS..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full border-[3px] border-black px-4 py-2 font-bold text-black text-sm uppercase placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none sm:w-96"
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
							<div className="hidden grid-cols-12 gap-4 border-black border-b-[4px] bg-black px-6 py-4 font-black text-sm text-white uppercase italic tracking-wider md:grid">
								<div className="col-span-4">User Identity</div>
								<div className="col-span-4">Contact</div>
								<div className="col-span-2 text-center">Role</div>
								<div className="col-span-2 text-right">Actions</div>
							</div>

							{/* List Rows */}
							{filteredUsers.length === 0 ? (
								<div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
									<div className="flex h-20 w-20 items-center justify-center rounded-md border-[3px] border-black border-dashed bg-gray-200">
										<User className="h-8 w-8 text-gray-400" />
									</div>
									<span className="font-black text-gray-400 text-lg uppercase italic">
										No users found
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
													to="/users/$userId"
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
														to="/users/$userId"
														params={{ userId: u.id }}
														className="font-black text-[#2e5cff] text-lg uppercase italic leading-none hover:underline"
													>
														{u.nickname || "No Nickname"}
													</Link>
													{/* Removed Google Name Display for Privacy */}
												</div>
											</div>

											{/* Contact */}
											<div className="flex w-full flex-col justify-center md:col-span-4">
												<span className="flex items-center gap-2 break-all font-bold font-mono text-gray-700 text-sm">
													{u.email}
													<Copy className="h-3 w-3 shrink-0 cursor-pointer text-gray-300 hover:text-black" />
												</span>
												<span className="font-bold font-mono text-[10px] text-gray-400 uppercase">
													ID: {u.id.slice(0, 8)}...
												</span>
											</div>

											{/* Role Badge */}
											<div className="flex w-full justify-start md:col-span-2 md:justify-center">
												<button
													onClick={() => initiateRoleToggle(u)}
													className={clsx(
														"flex transform items-center gap-1 border-[2px] border-black px-3 py-1 font-black text-[10px] uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
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
													title="Edit Details"
												>
													<Edit2 className="h-4 w-4" />
												</button>
												<button
													onClick={() => initiateDelete(u)}
													className="flex flex-1 items-center justify-center border-[2px] border-black bg-white p-2 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#ff2e2e] hover:text-white hover:shadow-none md:flex-none"
													title="Delete User"
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

			{/* EDIT MODAL */}
			{isEditModalOpen && (
				<div className="fade-in fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="zoom-in-95 relative max-h-[90vh] w-full max-w-md animate-in overflow-y-auto border-[4px] border-black bg-white shadow-[10px_10px_0px_0px_#000] duration-200">
						<div className="sticky top-0 z-10 flex items-center justify-between border-black border-b-[4px] bg-[#2e5cff] p-3">
							<h2 className="font-black text-lg text-white uppercase italic">
								EDIT USER
							</h2>
							<button
								onClick={() => setIsEditModalOpen(false)}
								className="rounded-sm border-2 border-white bg-black p-1 text-white transition-colors hover:bg-[#ff2e2e]"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<form onSubmit={handleSaveDetails} className="space-y-6 p-6">
							{/* Nickname Field */}
							<div>
								<label className="mb-1 block font-black text-black text-xs uppercase">
									Display Name (Nickname)
								</label>
								<input
									type="text"
									value={nicknameInput}
									onChange={(e) => setNicknameInput(e.target.value)}
									placeholder="Enter custom nickname..."
									className="w-full border-[3px] border-black p-3 font-bold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
								/>
								<p className="mb-6 font-black text-black text-xl uppercase italic">
									{editingUser?.nickname || "User"}
								</p>
							</div>

							{/* Image Field */}
							<div>
								<label className="mb-1 block font-black text-black text-xs uppercase">
									Profile Picture
								</label>

								{/* Image Preview */}
								<div className="mb-4 flex justify-center">
									<div className="group relative h-24 w-24 overflow-hidden rounded-md border-[3px] border-black bg-gray-100 shadow-sm">
										{imageInput ? (
											<img
												src={imageInput}
												alt="Preview"
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
											className="w-full border-[3px] border-black bg-white p-2 pl-9 font-mono text-black text-xs placeholder:text-gray-400 focus:border-black focus:outline-none"
											placeholder="Paste image URL..."
										/>
									</div>

									<div className="flex items-center gap-2">
										<span className="font-bold text-[10px] text-gray-400 uppercase">
											OR
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
										className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-white py-2 font-bold text-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all hover:bg-gray-100 active:translate-y-[1px] active:shadow-none"
									>
										<Upload className="h-3 w-3" />
										Upload from Device
									</button>
								</div>
							</div>

							<div className="flex gap-2 border-gray-100 border-t-2 pt-4">
								<button
									type="button"
									onClick={() => setIsEditModalOpen(false)}
									className="flex-1 border-[3px] border-transparent py-3 font-black text-gray-500 uppercase hover:bg-gray-100"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="flex flex-[2] items-center justify-center gap-2 border-[3px] border-black bg-[#ccff00] py-3 font-black text-black uppercase italic shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-[#bbe000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000]"
								>
									{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
									SAVE CHANGES
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* NEW ROLE CONFIRMATION MODAL */}
			{isRoleModalOpen && roleTargetUser && (
				<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="zoom-in-95 w-full max-w-md transform animate-in overflow-hidden border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] duration-200">
						{/* Header */}
						<div
							className={clsx(
								"flex items-center gap-3 border-black border-b-[4px] p-4",
								roleTargetUser.currentRole === "admin"
									? "bg-[#ff2e2e]"
									: "bg-[#ccff00]",
							)}
						>
							<div className="border-[3px] border-black bg-white p-1">
								{roleTargetUser.currentRole === "admin" ? (
									<AlertTriangle className="h-6 w-6 stroke-[3px] text-[#ff2e2e]" />
								) : (
									<Shield className="h-6 w-6 bg-black stroke-[3px] text-[#ccff00]" />
								)}
							</div>
							<h3
								className={clsx(
									"font-black text-2xl uppercase italic tracking-tighter",
									roleTargetUser.currentRole === "admin"
										? "text-white"
										: "text-black",
								)}
							>
								{roleTargetUser.currentRole === "admin"
									? "REVOKE ADMIN?"
									: "PROMOTE USER?"}
							</h3>
						</div>

						{/* Content */}
						<div className="p-6 text-center">
							<div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-md border-[3px] border-black bg-gray-200 shadow-sm">
								{roleTargetUser.image ? (
									<img
										src={roleTargetUser.image}
										alt={roleTargetUser.name || "User"}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-[#e0e0e0] font-black text-2xl text-black italic">
										{roleTargetUser.nickname?.[0] ||
											roleTargetUser.name?.[0] ||
											"?"}
									</div>
								)}
							</div>

							<p className="mb-2 font-bold text-gray-800 text-lg">
								Are you sure you want to{" "}
								{roleTargetUser.currentRole === "admin"
									? "REMOVE privileges from"
									: "GRANT Admin power to"}
							</p>
							<p className="mb-6 font-black text-black text-xl uppercase italic">
								{roleTargetUser.nickname || "User"}
							</p>

							<div className="flex flex-col gap-3">
								<button
									onClick={confirmRoleToggle}
									disabled={isSubmitting}
									className={clsx(
										"flex w-full items-center justify-center gap-2 border-[4px] border-black py-4 font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
										roleTargetUser.currentRole === "admin"
											? "bg-[#ff2e2e] text-white hover:bg-[#d41d1d]"
											: "bg-[#ccff00] text-black hover:bg-[#bbe000]",
									)}
								>
									{isSubmitting ? (
										<Loader2 className="h-6 w-6 animate-spin" />
									) : (
										<>
											{roleTargetUser.currentRole === "admin"
												? "YES, DEMOTE USER"
												: "YES, MAKE ADMIN"}
										</>
									)}
								</button>
								<button
									onClick={() => setIsRoleModalOpen(false)}
									className="w-full border-[3px] border-black bg-white py-3 font-black text-black uppercase transition-colors hover:bg-gray-100"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* DELETE CONFIRMATION MODAL */}
			{isDeleteModalOpen && deleteTargetUser && (
				<div className="fade-in fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
					<div className="zoom-in-95 w-full max-w-md transform animate-in overflow-hidden border-[4px] border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] duration-200">
						{/* Header */}
						<div className="flex items-center gap-3 border-black border-b-[4px] bg-[#ff2e2e] p-4">
							<div className="border-[3px] border-black bg-white p-1">
								<AlertTriangle className="h-6 w-6 stroke-[3px] text-[#ff2e2e]" />
							</div>
							<h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">
								DELETE USER?
							</h3>
						</div>

						{/* Content */}
						<div className="p-6 text-center">
							<div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-md border-[3px] border-black bg-gray-200 shadow-sm">
								{deleteTargetUser.image ? (
									<img
										src={deleteTargetUser.image}
										alt={deleteTargetUser.name || "User"}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-[#e0e0e0] font-black text-2xl text-black italic">
										{deleteTargetUser.nickname?.[0] ||
											deleteTargetUser.name?.[0] ||
											"?"}
									</div>
								)}
							</div>

							<p className="mb-2 font-bold text-gray-800 text-lg">
								Are you sure you want to permanently delete
							</p>
							<p className="mb-2 font-black text-black text-xl uppercase italic">
								{deleteTargetUser.nickname || "User"}
							</p>
							<p className="mb-6 rounded border-2 border-yellow-300 bg-yellow-50 p-3 text-gray-600 text-sm">
								⚠️ This action cannot be undone. All user data will be
								permanently deleted.
							</p>

							<div className="flex flex-col gap-3">
								<button
									onClick={confirmDelete}
									disabled={isSubmitting}
									className="flex w-full items-center justify-center gap-2 border-[4px] border-black bg-[#ff2e2e] py-4 font-black text-white uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-[#d41d1d] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
								>
									{isSubmitting ? (
										<Loader2 className="h-6 w-6 animate-spin" />
									) : (
										<>YES, DELETE USER</>
									)}
								</button>
								<button
									onClick={() => setIsDeleteModalOpen(false)}
									className="w-full border-[3px] border-black bg-white py-3 font-black text-black uppercase transition-colors hover:bg-gray-100"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

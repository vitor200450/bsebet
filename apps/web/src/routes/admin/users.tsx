import {
  deleteUser,
  getUsers,
  toggleRole,
  updateUserDetails,
} from "@/server/users";
import { createFileRoute, useRouter } from "@tanstack/react-router";
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
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            placeholder="SEARCH USERS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-[3px] border-black px-4 py-2 w-full sm:w-96 font-bold text-sm uppercase placeholder-gray-400 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all text-black"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
    <div className="min-h-screen bg-paper bg-paper-texture font-sans pb-20">
      {/* LIST CONTENT */}
      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full md:min-w-[800px]">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-black text-white text-sm font-black uppercase italic tracking-wider border-b-[4px] border-black">
                <div className="col-span-4">User Identity</div>
                <div className="col-span-4">Contact</div>
                <div className="col-span-2 text-center">Role</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* List Rows */}
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center border-[3px] border-black border-dashed">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <span className="font-black text-gray-400 uppercase italic text-lg">
                    No users found
                  </span>
                </div>
              ) : (
                <div className="divide-y-[3px] divide-black">
                  {filteredUsers.map((u, index) => (
                    <div
                      key={u.id}
                      className={clsx(
                        "flex flex-col md:grid md:grid-cols-12 gap-4 px-6 py-4 items-start md:items-center transition-colors hover:bg-[#ccff00]/10",
                        index % 2 === 0 ? "bg-white" : "bg-[#f4f4f5]",
                      )}
                    >
                      {/* User Info */}
                      <div className="w-full md:col-span-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-gray-200 border-[3px] border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform flex-shrink-0">
                          {u.image ? (
                            <img
                              src={u.image}
                              alt={u.nickname || "User"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#e0e0e0] text-black font-black italic">
                              {u.nickname?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-black uppercase italic leading-none text-[#2e5cff]">
                            {u.nickname || "No Nickname"}
                          </h3>
                          {/* Removed Google Name Display for Privacy */}
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="w-full md:col-span-4 flex flex-col justify-center">
                        <span className="text-sm font-bold text-gray-700 font-mono flex items-center gap-2 break-all">
                          {u.email}
                          <Copy className="w-3 h-3 text-gray-300 hover:text-black cursor-pointer shrink-0" />
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 font-mono uppercase">
                          ID: {u.id.slice(0, 8)}...
                        </span>
                      </div>

                      {/* Role Badge */}
                      <div className="w-full md:col-span-2 flex justify-start md:justify-center">
                        <button
                          onClick={() => initiateRoleToggle(u)}
                          className={clsx(
                            "px-3 py-1 text-[10px] font-black uppercase italic border-[2px] border-black transform transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none flex items-center gap-1",
                            u.role === "admin"
                              ? "bg-[#ccff00] text-black -skew-x-6"
                              : "bg-gray-200 text-gray-500 -skew-x-6",
                          )}
                        >
                          {u.role === "admin" && <Shield className="w-3 h-3" />}
                          {u.role}
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="w-full md:col-span-2 flex justify-start md:justify-end gap-2 mt-2 md:mt-0">
                        <button
                          onClick={() => openEditModal(u)}
                          className="flex-1 md:flex-none flex items-center justify-center bg-white hover:bg-[#2e5cff] hover:text-white text-black p-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          title="Edit Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => initiateDelete(u)}
                          className="flex-1 md:flex-none flex items-center justify-center bg-white hover:bg-[#ff2e2e] hover:text-white text-black p-2 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_#000] w-full max-w-md relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-[#2e5cff] p-3 flex justify-between items-center border-b-[4px] border-black sticky top-0 z-10">
              <h2 className="text-white font-black italic uppercase text-lg">
                EDIT USER
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-black hover:bg-[#ff2e2e] text-white p-1 border-2 border-white rounded-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="p-6 space-y-6">
              {/* Nickname Field */}
              <div>
                <label className="block text-xs font-black uppercase mb-1 text-black">
                  Display Name (Nickname)
                </label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Enter custom nickname..."
                  className="w-full border-[3px] border-black p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#ccff00] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] text-black"
                />
                <p className="text-xl font-black italic uppercase text-black mb-6">
                  {editingUser?.nickname || "User"}
                </p>
              </div>

              {/* Image Field */}
              <div>
                <label className="block text-xs font-black uppercase mb-1 text-black">
                  Profile Picture
                </label>

                {/* Image Preview */}
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-md bg-gray-100 border-[3px] border-black overflow-hidden shadow-sm relative group">
                    {imageInput ? (
                      <img
                        src={imageInput}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      className="w-full border-[3px] border-black p-2 pl-9 text-xs font-mono focus:outline-none focus:border-black bg-white text-black placeholder:text-gray-400"
                      placeholder="Paste image URL..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      OR
                    </span>
                    <div className="h-[1px] bg-gray-200 flex-1"></div>
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
                    className="w-full bg-white hover:bg-gray-100 text-black py-2 border-[3px] border-black font-bold uppercase text-xs flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    Upload from Device
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 font-black uppercase hover:bg-gray-100 border-[3px] border-transparent text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-[#ccff00] hover:bg-[#bbe000] text-black py-3 font-black italic uppercase border-[3px] border-black shadow-[4px_4px_0px_0px_#000] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW ROLE CONFIRMATION MODAL */}
      {isRoleModalOpen && roleTargetUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div
              className={clsx(
                "p-4 flex items-center gap-3 border-b-[4px] border-black",
                roleTargetUser.currentRole === "admin"
                  ? "bg-[#ff2e2e]"
                  : "bg-[#ccff00]",
              )}
            >
              <div className="bg-white border-[3px] border-black p-1">
                {roleTargetUser.currentRole === "admin" ? (
                  <AlertTriangle className="w-6 h-6 text-[#ff2e2e] stroke-[3px]" />
                ) : (
                  <Shield className="w-6 h-6 text-[#ccff00] bg-black stroke-[3px]" />
                )}
              </div>
              <h3
                className={clsx(
                  "text-2xl font-black italic uppercase tracking-tighter",
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
              <div className="w-20 h-20 mx-auto rounded-md bg-gray-200 border-[3px] border-black mb-4 overflow-hidden shadow-sm">
                {roleTargetUser.image ? (
                  <img
                    src={roleTargetUser.image}
                    alt={roleTargetUser.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#e0e0e0] text-black font-black italic text-2xl">
                    {roleTargetUser.nickname?.[0] ||
                      roleTargetUser.name?.[0] ||
                      "?"}
                  </div>
                )}
              </div>

              <p className="text-lg font-bold text-gray-800 mb-2">
                Are you sure you want to{" "}
                {roleTargetUser.currentRole === "admin"
                  ? "REMOVE privileges from"
                  : "GRANT Admin power to"}
              </p>
              <p className="text-xl font-black italic uppercase text-black mb-6">
                {roleTargetUser.nickname || "User"}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmRoleToggle}
                  disabled={isSubmitting}
                  className={clsx(
                    "w-full py-4 font-black italic uppercase border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2",
                    roleTargetUser.currentRole === "admin"
                      ? "bg-[#ff2e2e] hover:bg-[#d41d1d] text-white"
                      : "bg-[#ccff00] hover:bg-[#bbe000] text-black",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
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
                  className="w-full bg-white hover:bg-gray-100 text-black py-3 font-black uppercase border-[3px] border-black transition-colors"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b-[4px] border-black bg-[#ff2e2e]">
              <div className="bg-white border-[3px] border-black p-1">
                <AlertTriangle className="w-6 h-6 text-[#ff2e2e] stroke-[3px]" />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                DELETE USER?
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-md bg-gray-200 border-[3px] border-black mb-4 overflow-hidden shadow-sm">
                {deleteTargetUser.image ? (
                  <img
                    src={deleteTargetUser.image}
                    alt={deleteTargetUser.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#e0e0e0] text-black font-black italic text-2xl">
                    {deleteTargetUser.nickname?.[0] ||
                      deleteTargetUser.name?.[0] ||
                      "?"}
                  </div>
                )}
              </div>

              <p className="text-lg font-bold text-gray-800 mb-2">
                Are you sure you want to permanently delete
              </p>
              <p className="text-xl font-black italic uppercase text-black mb-2">
                {deleteTargetUser.nickname || "User"}
              </p>
              <p className="text-sm text-gray-600 mb-6 bg-yellow-50 border-2 border-yellow-300 p-3 rounded">
                ⚠️ This action cannot be undone. All user data will be
                permanently deleted.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="w-full py-4 font-black italic uppercase border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 bg-[#ff2e2e] hover:bg-[#d41d1d] text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>YES, DELETE USER</>
                  )}
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full bg-white hover:bg-gray-100 text-black py-3 font-black uppercase border-[3px] border-black transition-colors"
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

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Lock, Camera, User, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { getMyProfile, updateNickname, uploadUserAvatar, restoreGoogleAvatar } from "@/server/users";

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

  const user = profile ?? session?.user;

  const [nickname, setNickname] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync nickname when profile loads
  useEffect(() => {
    if (profile?.nickname !== undefined) {
      setNickname(profile.nickname ?? "");
    }
  }, [profile?.nickname]);

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
      setAvatarPreview(result);
      setAvatarBase64(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Avatar and nickname are updated independently so they never interfere
      const tasks: Promise<unknown>[] = [
        updateNickname({
          data: { userId: user.id, nickname: nickname.trim() || null },
        }),
      ];

      if (avatarBase64) {
        tasks.push(
          uploadUserAvatar({
            data: { userId: user.id, imageBase64: avatarBase64 },
          }),
        );
      }

      await Promise.all(tasks);
      setAvatarBase64(null);
      await Promise.all([refetch(), refetchSession()]);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  const displayImage = avatarPreview ?? user?.image;

  return (
    <div className="min-h-screen bg-[#e6e6e6] pb-16 relative">
      {/* Paper texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
          backgroundRepeat: "repeat",
        }}
      />

      {/* Page Header */}
      <div className="relative bg-black overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-10 relative z-10 flex items-center gap-4">
          <div className="bg-black text-white px-6 py-3 md:px-8 md:py-4 border-[3px] border-white shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] transform -skew-x-12 inline-block">
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter transform skew-x-12">
              MEU PERFIL
            </h1>
          </div>
          <div className="flex items-center gap-2 transform skew-x-0">
            <span className="material-symbols-outlined text-gray-500 text-xl">
              manage_accounts
            </span>
            <span className="text-sm font-bold text-gray-500">
              Edite suas informações
            </span>
          </div>
        </div>
        {/* Split border rail */}
        <div className="absolute bottom-0 left-0 right-0 h-[4px] flex w-full">
          <div className="flex-1 bg-[#2e5cff]" />
          <div className="flex-1 bg-[#ff2e2e]" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[520px] mx-auto px-4 py-8 md:py-12 relative z-10 flex flex-col gap-5">
        {/* Avatar Card */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 w-full mb-2">
            <div className="bg-[#2e5cff] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform rotate-3">
              <Camera className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-black">
              FOTO DE PERFIL
            </h2>
          </div>

          {/* Avatar Frame */}
          <div className="relative">
            <div className="w-28 h-28 border-[3px] border-black shadow-[4px_4px_0_0_#000] transform -skew-x-6 overflow-hidden bg-[#e6e6e6] relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={56} strokeWidth={1.5} className="text-gray-400 transform skew-x-6" />
                )}
              </div>
            </div>

            {/* Camera badge */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#ffc700] border-[3px] border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              <Camera size={16} strokeWidth={3} className="text-black" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] font-black uppercase tracking-widest text-black border-[2px] border-black px-4 py-1.5 hover:bg-black hover:text-white transition-colors"
            >
              TROCAR FOTO
            </button>
            <button
              onClick={handleRestoreGoogleAvatar}
              disabled={isRestoring}
              title="Restaurar foto do Google"
              className="text-[10px] font-black uppercase tracking-widest text-gray-600 border-[2px] border-gray-400 px-4 py-1.5 hover:border-black hover:text-black transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              {isRestoring ? "..." : "GOOGLE"}
            </button>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
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
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-[#ff2e2e] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform -rotate-3">
              <Lock className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-black">
              DADOS DA CONTA
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {/* Nome */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                <Lock size={9} />
                NOME
              </span>
              <div className="bg-[#e6e6e6] border-[2px] border-black/20 px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-black text-black">
                  {user?.name ?? "—"}
                </span>
                <Lock size={13} strokeWidth={2.5} className="text-gray-400" />
              </div>
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                <Lock size={9} />
                E-MAIL
              </span>
              <div className="bg-[#e6e6e6] border-[2px] border-black/20 px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-black text-black truncate">
                  {user?.email ?? "—"}
                </span>
                <Lock
                  size={13}
                  strokeWidth={2.5}
                  className="text-gray-400 shrink-0 ml-2"
                />
              </div>
            </div>
          </div>

          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-4">
            Esses dados vêm da sua conta Google e não podem ser alterados.
          </p>
        </div>

        {/* Nickname Edit Card */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-[#ffc700] p-2 border-2 border-black shadow-[2px_2px_0_0_#000] transform rotate-2">
              <span className="material-symbols-outlined text-black text-xl">
                edit
              </span>
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-black">
              NICKNAME
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-black">
              SEU APELIDO NO RANKING
            </label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) =>
                  setNickname(e.target.value.slice(0, 50))
                }
                placeholder="Digite seu nickname..."
                className="w-full border-[3px] border-black px-3 py-3 text-sm font-black text-black bg-white focus:outline-none focus:border-[#ccff00] focus:shadow-[0_0_0_2px_#ccff00] placeholder:font-normal placeholder:text-gray-400 transition-all"
              />
              <span className="absolute bottom-2 right-3 text-[9px] font-black text-gray-400 font-mono">
                {nickname.length}/50
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-500">
              Seu nome de exibição no leaderboard
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#ffc700] text-black border-[3px] border-black shadow-[4px_4px_0_0_#000] px-6 py-5 font-black italic uppercase text-base tracking-wider flex items-center justify-center gap-3 transform -skew-x-12 group hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save
            size={20}
            strokeWidth={3}
            className="transform skew-x-12 group-hover:scale-110 transition-transform"
          />
          <span className="transform skew-x-12">
            {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
          </span>
        </button>

        {/* Bottom decorative elements */}
        <div className="flex items-center justify-center gap-3 opacity-40 mt-4">
          <div className="w-12 h-1 bg-black transform -skew-x-12" />
          <div className="w-3 h-3 bg-[#ccff00] border-2 border-black rotate-45" />
          <div className="w-12 h-1 bg-black transform skew-x-12" />
        </div>
      </div>
    </div>
  );
}

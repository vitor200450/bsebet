import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Trophy, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPoints } from "@/functions/get-user-points";
import { authClient } from "@/lib/auth-client";
import { getUserMedalCounts } from "@/server/user-profile";
import { getMyProfile } from "@/server/users";
import { MedalCountSummary } from "./MiniMedalBadge";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const { data: totalPoints } = useQuery({
    queryKey: ["userPoints", session?.user?.id],
    queryFn: () => getUserPoints(),
    enabled: !!session?.user?.id,
  });

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => getMyProfile(),
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const { data: medalCounts } = useQuery({
    queryKey: ["userMedalCounts", session?.user?.id],
    queryFn: () => getUserMedalCounts({ data: session?.user?.id || "" }),
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const displayName = profile?.nickname || session?.user?.name;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending || (session && isProfileLoading)) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton
            className={clsx(
              "h-3 w-20",
              variant === "dark" ? "bg-white/10" : "bg-black/10",
            )}
          />
          <Skeleton
            className={clsx(
              "h-2 w-12",
              variant === "dark" ? "bg-white/10" : "bg-black/10",
            )}
          />
        </div>
        <Skeleton
          className={clsx(
            "h-10 w-10 -skew-x-6 transform border-[3px]",
            variant === "dark" ? "border-white/20" : "border-black/20",
          )}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <Link to="/login">
        <button
          className={clsx(
            "-skew-x-12 transform border-[3px] px-6 py-2 font-black text-sm uppercase italic shadow-comic transition-all hover:shadow-comic-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            variant === "dark"
              ? "border-white bg-white text-black"
              : "border-black bg-[#ccff00] text-black",
          )}
        >
          <span className="inline-block skew-x-12 transform">Sign In</span>
        </button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <div className="group flex cursor-pointer items-center gap-3">
            <div className="flex flex-col items-end leading-none">
              <span
                className={clsx(
                  "whitespace-nowrap font-black font-display text-sm uppercase italic tracking-tighter",
                  variant === "dark" ? "text-white" : "text-black",
                )}
              >
                {displayName}
              </span>

              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-black text-[#ff2e2e] text-[9px] uppercase tracking-widest">
                  {totalPoints ?? 0} PTS
                </span>
                {medalCounts && medalCounts.total > 0 && (
                  <span className="flex items-center gap-0.5 font-black text-[#FFD700] text-[9px] uppercase tracking-widest">
                    <Trophy className="h-3 w-3" fill="#FFD700" />
                    {medalCounts.total}
                  </span>
                )}
              </div>
            </div>
            <div className="relative">
              <div
                className={clsx(
                  "relative h-10 w-10 -skew-x-6 transform overflow-hidden border-[3px] transition-transform group-hover:scale-105 group-active:translate-x-[2px] group-active:translate-y-[2px]",
                  variant === "dark"
                    ? "border-white bg-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                    : "border-black bg-white shadow-none",
                )}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {(profile?.image ?? session.user.image) ? (
                    <img
                      src={(profile?.image ?? session.user.image)!}
                      alt={displayName ?? "User"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User
                      size={40}
                      strokeWidth={2}
                      className={clsx(
                        "shrink-0",
                        variant === "dark" ? "text-white" : "text-black",
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        }
      />
      <DropdownMenuContent
        align="end"
        className="!text-black w-56 rounded-none border-[3px] border-black bg-white p-2 shadow-comic"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="!text-black pb-1 font-black font-display text-xs uppercase italic tracking-wider">
            Menu do Jogador
          </DropdownMenuLabel>
          <div className="mb-2 truncate border border-black/10 bg-gray-100 px-2 py-1 font-bold text-[10px] text-gray-400">
            {session.user.email}
          </div>
          <DropdownMenuSeparator className="h-[2px] bg-black/10" />

          {/* Medal Counts Section */}
          {medalCounts && medalCounts.total > 0 && (
            <>
              <div className="px-2 py-2">
                <div className="flex items-center justify-between border border-black/10 bg-gray-50 px-3 py-2">
                  <span className="flex items-center gap-1.5 font-black text-[10px] text-black/60 uppercase tracking-wider">
                    <Trophy
                      className="h-3.5 w-3.5 text-[#FFD700]"
                      fill="#FFD700"
                    />
                    Medalhas
                  </span>
                  <MedalCountSummary
                    gold={medalCounts.gold}
                    silver={medalCounts.silver}
                    bronze={medalCounts.bronze}
                    size="sm"
                  />
                </div>
              </div>
              <DropdownMenuSeparator className="h-[2px] bg-black/10" />
            </>
          )}

          <DropdownMenuItem
            className="focus:!text-black !text-black cursor-pointer p-2 font-black text-xs uppercase italic focus:bg-[#ccff00]"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <span className="material-symbols-outlined mr-2 text-sm">
              dashboard
            </span>
            Command Center
          </DropdownMenuItem>
          <DropdownMenuItem
            className="focus:!text-black !text-black cursor-pointer p-2 font-black text-xs uppercase italic focus:bg-[#ccff00]"
            onClick={() => navigate({ to: "/profile" })}
          >
            <span className="material-symbols-outlined mr-2 text-sm">
              person
            </span>
            Perfil do Usuário
          </DropdownMenuItem>
          <DropdownMenuItem
            className="focus:!text-black !text-black cursor-pointer p-2 font-black text-xs uppercase italic focus:bg-[#ccff00]"
            onClick={() =>
              navigate({
                to: "/users/$userId",
                params: { userId: session.user.id },
              })
            }
          >
            <span className="material-symbols-outlined mr-2 text-sm">
              public
            </span>
            Ver Perfil Público
          </DropdownMenuItem>
          <DropdownMenuItem
            className="focus:!text-black !text-black cursor-pointer p-2 font-black text-xs uppercase italic focus:bg-[#ccff00]"
            onClick={() => navigate({ to: "/my-bets" })}
          >
            <span className="material-symbols-outlined mr-2 text-sm">
              sports
            </span>
            Minhas Apostas
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black/10" />
          <DropdownMenuItem
            className="focus:!text-white !text-black cursor-pointer p-2 font-black text-xs uppercase italic focus:bg-[#ff2e2e]"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            Sair da Conta
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

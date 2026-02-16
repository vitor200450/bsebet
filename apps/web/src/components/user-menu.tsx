import { Link, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Skeleton } from "./ui/skeleton";
import { User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserPoints } from "@/functions/get-user-points";

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

  if (isPending) {
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
            "h-10 w-10 border-[3px] transform -skew-x-6",
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
            "px-6 py-2 font-black italic uppercase text-sm border-[3px] shadow-comic transition-all hover:shadow-comic-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transform -skew-x-12",
            variant === "dark"
              ? "bg-white text-black border-white"
              : "bg-[#ccff00] text-black border-black",
          )}
        >
          <span className="transform skew-x-12 inline-block">Sign In</span>
        </button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="flex flex-col items-end leading-none">
              <span
                className={clsx(
                  "font-display font-black text-sm italic uppercase tracking-tighter whitespace-nowrap",
                  variant === "dark" ? "text-white" : "text-black",
                )}
              >
                {session.user.name}
              </span>

              <span className="text-[9px] font-black text-[#ff2e2e] uppercase tracking-widest mt-0.5">
                {totalPoints ?? 0} PTS
              </span>
            </div>
            <div className="relative">
              <div
                className={clsx(
                  "w-10 h-10 border-[3px] overflow-hidden transition-transform group-hover:scale-105 group-active:translate-x-[2px] group-active:translate-y-[2px] transform -skew-x-6 relative",
                  variant === "dark"
                    ? "bg-black border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                    : "bg-white border-black shadow-none",
                )}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      className="w-full h-full object-cover"
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
              {/* Status dot */}
              <div className="absolute -top-1 -right-1 z-20 w-4 h-4 bg-[#ff2e2e] border-[2px] border-black rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[8px] font-black text-white">1</span>
              </div>
            </div>
          </div>
        }
      />
      <DropdownMenuContent
        align="end"
        className="bg-white border-[3px] border-black shadow-comic w-56 p-2 rounded-none !text-black"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-display font-black italic uppercase text-xs tracking-wider pb-1 !text-black">
            Menu do Jogador
          </DropdownMenuLabel>
          <div className="px-2 py-1 mb-2 bg-gray-100 border border-black/10 text-[10px] font-bold text-gray-400 truncate">
            {session.user.email}
          </div>
          <DropdownMenuSeparator className="bg-black/10 h-[2px]" />
          <DropdownMenuItem className="focus:bg-[#ccff00] focus:!text-black cursor-pointer font-black italic uppercase text-xs p-2 !text-black">
            Perfil do Usuário
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-[#ccff00] focus:!text-black cursor-pointer font-black italic uppercase text-xs p-2 !text-black">
            Minhas Apostas
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-black/10 h-[2px]" />
          <DropdownMenuItem
            className="focus:bg-[#ff2e2e] focus:!text-white cursor-pointer font-black italic uppercase text-xs p-2 !text-black"
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

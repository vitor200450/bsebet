import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import { User, Shield, ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

const TEST_USERS = [
  {
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
  },
  {
    name: "User 1",
    email: "user1@test.com",
    password: "password123",
    role: "user",
  },
  {
    name: "User 2",
    email: "user2@test.com",
    password: "password123",
    role: "user",
  },
  {
    name: "User 3",
    email: "user3@test.com",
    password: "password123",
    role: "user",
  },
  {
    name: "User 4",
    email: "user4@test.com",
    password: "password123",
    role: "user",
  },
];

export function DebugUserSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleLogin = async (email: string) => {
    const loadingToast = toast.loading(`Logging in as ${email}...`);
    try {
      await authClient.signIn.email({
        email,
        password: "password123",
        fetchOptions: {
          onSuccess: async () => {
            // Wait a bit to ensure session is fully updated
            await new Promise((resolve) => setTimeout(resolve, 200));

            toast.dismiss(loadingToast);
            toast.success(`Logged in as ${email}`);

            // Force a hard reload with cache busting to ensure all data is fresh
            window.location.href = window.location.pathname + '?_t=' + Date.now();
          },
          onError: (ctx) => {
            toast.dismiss(loadingToast);
            toast.error(ctx.error.message);
          },
        },
      });
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error("Failed to login");
    }
  };

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          // Wait a bit to ensure session is cleared
          await new Promise((resolve) => setTimeout(resolve, 200));

          toast.success("Logged out");

          // Force a hard reload with cache busting to clear all cached data
          window.location.href = window.location.pathname + '?_t=' + Date.now();
        },
      },
    });
  };

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {isOpen && (
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-64 animate-in slide-in-from-bottom-5 text-black">
          <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-gray-100">
            <h3 className="font-black text-sm uppercase">Debug Users</h3>
            {session && (
              <button
                onClick={handleLogout}
                className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
              >
                <LogOut size={12} /> Logout
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {TEST_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => handleLogin(u.email)}
                disabled={session?.user?.email === u.email}
                className={`w-full text-left p-2 border-2 text-xs font-bold transition-all
                        ${
                          session?.user?.email === u.email
                            ? "bg-[#ccff00] border-black cursor-default"
                            : "bg-gray-50 border-gray-200 hover:border-black hover:bg-gray-100 active:translate-y-0.5"
                        }
                     `}
              >
                <div className="flex items-center gap-2">
                  {u.role === "admin" ? (
                    <Shield size={12} className="text-blue-600" />
                  ) : (
                    <User size={12} />
                  )}
                  <span>{u.name}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {u.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors border-2 border-white"
        title="Debug Users"
      >
        {isOpen ? <ChevronDown size={20} /> : <User size={20} />}
      </button>
    </div>
  );
}

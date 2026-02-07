import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error("Login failed", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#E6E6E6] font-sans relative overflow-x-hidden flex items-center justify-center p-6">
      {/* Background Texture Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Dynamic decorative elements (Background Globs) */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#CCFF00] rounded-full blur-[120px] opacity-20 animate-pulse pointer-events-none" />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-400 rounded-full blur-[100px] opacity-10 animate-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      {/* Login Card (Centered) */}
      <div className="w-full max-w-md bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-8 md:p-12 relative z-20">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <h1
              className="text-5xl md:text-6xl font-black italic tracking-tighter text-black stroke-white"
              style={{
                textShadow: "4px 4px 0px #000",
                WebkitTextStroke: "2px white",
              }}
            >
              BSEBET
            </h1>
            <div className="absolute -right-6 -top-4 transform rotate-12">
              <span className="bg-[#CCFF00] text-black text-xs font-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_#000]">
                BETA
              </span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-black">
              BEM-VINDO
            </h2>
            <p className="font-bold text-gray-500 text-sm uppercase tracking-wider">
              Faça login para começar a apostar
            </p>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full h-16 bg-[#CCFF00] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden"
          >
            <div className="relative flex items-center gap-4 z-10">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-black" />
              ) : (
                <>
                  <div className="bg-white p-1 rounded-sm border-2 border-black flex items-center justify-center w-8 h-8">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z"
                        fill="#ffff"
                      />
                      <path
                        d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12.24 24.0008C15.4765 24.0008 18.2059 22.9382 20.19 21.1039L16.323 18.1056C15.2517 18.8375 13.8627 19.252 12.24 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.2764H1.5166V17.3744C3.55371 21.4434 7.7029 24.0008 12.24 24.0008Z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.50705 14.2764C5.00888 12.8096 5.00888 11.1961 5.50705 9.72931V6.63135H1.5166C-0.185516 10.0325 -0.185516 14.0004 1.5166 17.3744L5.50705 14.2764Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12.24 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.24 0.0016361C7.7029 0.0016361 3.55371 2.55909 1.5166 6.63135L5.50705 9.72931C6.45946 6.87244 9.10947 4.76773 12.24 4.74966Z"
                        fill="#EA4335"
                      />
                    </svg>
                  </div>
                  <span className="font-black text-black tracking-wide text-lg uppercase italic">
                    Entrar com Google
                  </span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

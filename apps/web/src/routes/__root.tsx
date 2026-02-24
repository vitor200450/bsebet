import type { AppRouter } from "@bsebet/api/routers/index";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { GlobalHeader } from "@/components/GlobalHeader";
import { HeaderProvider } from "@/components/HeaderContext";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/react";

import "../index.css";

export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "BSEBET",
      },
    ],
    links: [
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  const location = useLocation();
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <HeaderProvider>
          <div className="min-h-screen w-full overflow-x-hidden font-sans">
            <GlobalHeader />
            <Outlet />
          </div>
          <Toaster richColors />
          <Scripts />
          <SpeedInsights route={location.pathname} />
        </HeaderProvider>
      </body>
    </html>
  );
}

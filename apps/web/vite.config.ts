import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
// import alchemy from "alchemy/cloudflare/tanstack-start";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import dotenv from "dotenv";

// Explicitly load root .env to ensure variables are present
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      // @ts-expect-error - TanStack Start types sometimes lag behind the actual Nitro configuration support
      nitro: {
        preset: "node-server",
        output: {
          dir: "./dist",
        },
      },
    }),
    viteReact(),
    // alchemy(),
  ],
  server: {
    port: 3001,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },

  envDir: "../../",
  define: {
    "process.env.GOOGLE_CLIENT_ID": JSON.stringify(
      process.env.GOOGLE_CLIENT_ID,
    ),
    "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(
      process.env.GOOGLE_CLIENT_SECRET,
    ),
    "process.env.BETTER_AUTH_SECRET": JSON.stringify(
      process.env.BETTER_AUTH_SECRET,
    ),
    "process.env.BETTER_AUTH_URL": JSON.stringify(process.env.BETTER_AUTH_URL),
    "process.env.CORS_ORIGIN": JSON.stringify(process.env.CORS_ORIGIN),
    "process.env.DATABASE_URL": JSON.stringify(process.env.DATABASE_URL),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});

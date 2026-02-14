import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const baseURL = typeof window !== "undefined"
  ? window.location.origin
  : process.env.BETTER_AUTH_URL || "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
  fetchOptions: {
    credentials: "include",
  },
});

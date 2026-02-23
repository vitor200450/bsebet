import { db } from "@bsebet/db";
import * as schema from "@bsebet/db/schema/auth";
import { env } from "@bsebet/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN, env.BETTER_AUTH_URL],
	baseURL: env.BETTER_AUTH_URL,
	emailAndPassword: {
		enabled: false,
	},
	plugins: [tanstackStartCookies(), admin()],
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			// Explicit redirect URI
			redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
		},
	},
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
		},
		disableCSRFCheck: true,
	},
	cookies: {
		sessionToken: {
			sameSite: "none",
			secure: true,
		},
	},
});

import { auth } from "@bsebet/auth";
import { user, account } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  uploadLogoToR2,
  base64ToBuffer,
  isBase64DataUrl,
  getUserAvatarKey,
  deleteLogoFromR2,
  getPublicUrl,
} from "./r2";
import { authMiddleware } from "@/middleware/auth";

const getMyProfileFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db } = await import("@bsebet/db");

    if (!context.session?.user?.id) return null;

    const profile = await db.query.user.findFirst({
      where: eq(user.id, context.session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        nickname: true,
      },
    });

    return profile ?? null;
  });

export const getMyProfile = getMyProfileFn as unknown as () => Promise<{
  id: string;
  name: string;
  email: string;
  image: string | null;
  nickname: string | null;
} | null>;

/**
 * Fetch all users ordered by created_at desc
 */
export const getUsers = createServerFn({
  method: "GET",
}).handler(async () => {
  const { db } = await import("@bsebet/db");

  const users = await db.query.user.findMany({
    orderBy: [desc(user.createdAt)],
  });
  return users;
});

/**
 * Toggle user role between admin and user
 */
const toggleRoleSchema = z.object({
  userId: z.string(),
  newRole: z.enum(["admin", "user"]),
});

const toggleRoleFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");

    const data = toggleRoleSchema.parse(ctx.data);
    const { userId, newRole } = data;

    await db.update(user).set({ role: newRole }).where(eq(user.id, userId));
    return { success: true };
  },
);

export const toggleRole = toggleRoleFn as unknown as (opts: {
  data: { userId: string; newRole: "admin" | "user" };
}) => Promise<{ success: boolean }>;

/**
 * Update user details (nickname and image) — used by admin panel
 */
const updateUserDetailsSchema = z.object({
  userId: z.string(),
  nickname: z.string().max(50).nullable(),
  image: z.string().nullable(),
});

const updateUserDetailsFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");

    const data = updateUserDetailsSchema.parse(ctx.data);
    const { userId, nickname, image } = data;

    await db.update(user).set({ nickname, image }).where(eq(user.id, userId));
    return { success: true };
  },
);

export const updateUserDetails = updateUserDetailsFn as unknown as (opts: {
  data: { userId: string; nickname: string | null; image: string | null };
}) => Promise<{ success: boolean }>;

/**
 * Update only the nickname — safe to call without touching the image
 */
const updateNicknameFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");

    const data = z
      .object({ userId: z.string(), nickname: z.string().max(50).nullable() })
      .parse(ctx.data);

    await db
      .update(user)
      .set({ nickname: data.nickname })
      .where(eq(user.id, data.userId));
    return { success: true };
  },
);

export const updateNickname = updateNicknameFn as unknown as (opts: {
  data: { userId: string; nickname: string | null };
}) => Promise<{ success: boolean }>;

/**
 * Restore Google avatar.
 * Strategy 1: Decode idToken JWT payload (no API call needed).
 * Strategy 2: Call Google userinfo API using the stored accessToken (fallback).
 */
const restoreGoogleAvatarFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");

    const session = await auth.api.getSession({
      headers: ctx.request.headers,
    });

    if (!session?.user?.id) throw new Error("Não autenticado");

    const googleAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "google"),
      ),
      columns: { idToken: true, accessToken: true },
    });

    if (!googleAccount) throw new Error("Conta Google não encontrada");

    let pictureUrl: string | null = null;

    // Strategy 1: decode idToken JWT payload (fast, no network)
    if (googleAccount.idToken) {
      try {
        const parts = googleAccount.idToken.split(".");
        if (parts.length >= 2) {
          const padding = "=".repeat((4 - (parts[1].length % 4)) % 4);
          const payload = JSON.parse(
            Buffer.from(parts[1] + padding, "base64").toString("utf-8"),
          ) as { picture?: string };
          pictureUrl = payload.picture ?? null;
        }
      } catch {
        // fall through to strategy 2
      }
    }

    // Strategy 2: call Google userinfo API with the accessToken
    if (!pictureUrl && googleAccount.accessToken) {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${googleAccount.accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { picture?: string };
        pictureUrl = data.picture ?? null;
      }
    }

    if (!pictureUrl) {
      throw new Error(
        "Não foi possível obter o avatar do Google. Tente sair e entrar novamente.",
      );
    }

    await db
      .update(user)
      .set({ image: pictureUrl })
      .where(eq(user.id, session.user.id));

    return { pictureUrl };
  },
);

export const restoreGoogleAvatar =
  restoreGoogleAvatarFn as unknown as () => Promise<{
    pictureUrl: string;
  }>;

/**
 * Upload user avatar to R2 and update the user's image field
 */
const uploadUserAvatarSchema = z.object({
  userId: z.string(),
  imageBase64: z.string(),
});

const uploadUserAvatarFn = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { db } = await import("@bsebet/db");

    const data = uploadUserAvatarSchema.parse(ctx.data);
    const { userId, imageBase64 } = data;

    if (!isBase64DataUrl(imageBase64)) {
      throw new Error("Invalid image format");
    }

    // Delete old avatar if it exists on R2
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { image: true },
    });

    if (currentUser?.image) {
      const publicUrl = getPublicUrl();
      if (currentUser.image.startsWith(publicUrl)) {
        const oldKey = currentUser.image.slice(publicUrl.length + 1);
        await deleteLogoFromR2(oldKey).catch((err) => {
          console.error("Failed to delete old avatar:", err);
        });
      }
    }

    const { buffer, contentType } = base64ToBuffer(imageBase64);
    const extension = contentType.split("/")[1] || "png";
    const key = getUserAvatarKey(userId, extension);

    const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

    await db.update(user).set({ image: publicUrl }).where(eq(user.id, userId));

    return { publicUrl };
  },
);

export const uploadUserAvatar = uploadUserAvatarFn as unknown as (opts: {
  data: { userId: string; imageBase64: string };
}) => Promise<{ publicUrl: string }>;

/**
 * Delete a user
 */
const deleteUserSchema = z.object({
  userId: z.string(),
});

const deleteUserFn = createServerFn({
  method: "POST",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const data = deleteUserSchema.parse(ctx.data);

  await db.delete(user).where(eq(user.id, data.userId));
  return { success: true };
});

export const deleteUser = deleteUserFn as unknown as (opts: {
  data: { userId: string };
}) => Promise<{ success: boolean }>;

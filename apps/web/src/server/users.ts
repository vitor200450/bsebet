import { user } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

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
 * Update user details (nickname and image)
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

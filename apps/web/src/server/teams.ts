import { teams } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  uploadLogoToR2,
  base64ToBuffer,
  getTeamLogoKey,
  isBase64DataUrl,
} from "./r2";

// Schema for Team Input
const teamSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório"),
  logoUrl: z
    .string()
    .refine(
      (val) =>
        val === "" ||
        val === null ||
        val === undefined ||
        z.string().url().safeParse(val).success ||
        val.startsWith("data:image/"),
      "Deve ser uma URL válida ou imagem Base64",
    )
    .optional(),
  region: z.string().optional(),
});

type TeamInput = z.infer<typeof teamSchema>;

/**
 * Fetch all teams ordered by created_at desc
 */
export const getTeams = createServerFn({
  method: "GET",
}).handler(async () => {
  // Dynamic import to prevent client-side evaluation of DB connection
  const { db } = await import("@bsebet/db");
  const allTeams = await db.select().from(teams).orderBy(desc(teams.createdAt));
  return allTeams;
});

/**
 * Save (Create or Update) a team
 */
const saveTeamFn = createServerFn({
  method: "POST",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const data = ctx.data;
  const validData = teamSchema.parse(data);

  let finalLogoUrl = validData.logoUrl || null;

  if (validData.id) {
    // Handling existing team
    if (finalLogoUrl && isBase64DataUrl(finalLogoUrl)) {
      const { buffer, contentType } = base64ToBuffer(finalLogoUrl);
      const extension = contentType.split("/")[1] || "png";
      const key = getTeamLogoKey(validData.id, extension);
      const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);
      finalLogoUrl = publicUrl;
    }

    const updated = await db
      .update(teams)
      .set({
        name: validData.name,
        slug: validData.slug,
        logoUrl: finalLogoUrl,
        region: validData.region || null,
      })
      .where(eq(teams.id, validData.id))
      .returning();
    return updated[0];
  } else {
    // Handling new team - need ID first if we want to use it for the R2 key
    const inserted = await db
      .insert(teams)
      .values({
        name: validData.name,
        slug: validData.slug,
        logoUrl: null, // Temp null
        region: validData.region || null,
      })
      .returning();

    const newTeam = inserted[0];

    if (finalLogoUrl && isBase64DataUrl(finalLogoUrl)) {
      const { buffer, contentType } = base64ToBuffer(finalLogoUrl);
      const extension = contentType.split("/")[1] || "png";
      const key = getTeamLogoKey(newTeam.id, extension);
      const { publicUrl } = await uploadLogoToR2(key, buffer, contentType);

      // Update with the R2 URL
      const finalUpdate = await db
        .update(teams)
        .set({ logoUrl: publicUrl })
        .where(eq(teams.id, newTeam.id))
        .returning();
      return finalUpdate[0];
    }

    // If it was already a URL or empty, just update if needed or return
    if (finalLogoUrl) {
      const finalUpdate = await db
        .update(teams)
        .set({ logoUrl: finalLogoUrl })
        .where(eq(teams.id, newTeam.id))
        .returning();
      return finalUpdate[0];
    }

    return newTeam;
  }
});

export const saveTeam = saveTeamFn as unknown as (opts: {
  data: TeamInput;
}) => Promise<typeof teams.$inferSelect>;

/**
 * Delete a team
 */
const deleteTeamFn = createServerFn({
  method: "POST",
}).handler(async (ctx: any) => {
  const { db } = await import("@bsebet/db");
  const data = ctx.data;
  if (typeof data !== "number") throw new Error("Invalid ID");
  await db.delete(teams).where(eq(teams.id, data));
  return { success: true };
});

export const deleteTeam = deleteTeamFn as unknown as (opts: {
  data: number;
}) => Promise<{ success: boolean }>;

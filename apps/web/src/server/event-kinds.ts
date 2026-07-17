import { eventKinds, tournaments } from "@bsebet/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { asc, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { createServerT } from "@/i18n";
import type { SupportedLang } from "@/i18n/config";
import {
	canHardDeleteEventKind,
	PRESENTATION_THEMES,
} from "./event-kind-template";
import { saveTournamentStageSchema } from "./tournaments";

const scoringRulesSchema = z
	.object({
		winner: z.number(),
		exact: z.number(),
		underdog_25: z.number(),
		underdog_50: z.number(),
		underdog_tier1_max_pct: z.number().optional(),
		underdog_tier2_max_pct: z.number().optional(),
	})
	.nullable()
	.optional();

const createEventKindSchema = (t: (key: string) => string) =>
	z.object({
		id: z.number().optional(),
		name: z.string().min(1, t("validation:nameRequired")),
		slug: z.string().min(1, t("validation:slugRequired")),
		presentationTheme: z.enum(PRESENTATION_THEMES).default("default"),
		templateStages: z.array(saveTournamentStageSchema).default([]),
		templateScoringRules: scoringRulesSchema,
	});

type EventKindInput = z.input<ReturnType<typeof createEventKindSchema>>;

function resolveLang(data: unknown): SupportedLang {
	if (
		data &&
		typeof data === "object" &&
		"lang" in data &&
		((data as { lang?: string }).lang === "en" ||
			(data as { lang?: string }).lang === "pt")
	) {
		return (data as { lang: SupportedLang }).lang;
	}
	return "pt";
}

/**
 * Active (non-archived) Event Kinds for assignment on new tournaments.
 */
export const getEventKinds = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await import("@bsebet/db");
	return db
		.select()
		.from(eventKinds)
		.where(isNull(eventKinds.archivedAt))
		.orderBy(asc(eventKinds.name));
});

/**
 * All Event Kinds including archived (admin catalog).
 */
export const getAllEventKinds = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await import("@bsebet/db");
	return db.select().from(eventKinds).orderBy(asc(eventKinds.name));
});

const saveEventKindFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const data = ctx.data;
	const t = createServerT(resolveLang(data));
	const validData = createEventKindSchema(t).parse(data);

	const payload = {
		name: validData.name,
		slug: validData.slug,
		presentationTheme: validData.presentationTheme,
		templateStages: validData.templateStages,
		templateScoringRules: validData.templateScoringRules ?? null,
	};

	if (validData.id) {
		const updated = await db
			.update(eventKinds)
			.set(payload)
			.where(eq(eventKinds.id, validData.id))
			.returning();
		return updated[0];
	}

	const inserted = await db.insert(eventKinds).values(payload).returning();
	return inserted[0];
});

export const saveEventKind = saveEventKindFn as unknown as (opts: {
	data: EventKindInput;
}) => Promise<typeof eventKinds.$inferSelect>;

const archiveEventKindFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const t = createServerT(resolveLang(ctx.data));
	const id = Number(
		typeof ctx.data === "object" && ctx.data && "data" in ctx.data
			? (ctx.data as { data: unknown }).data
			: ctx.data,
	);
	if (!id) {
		throw new Error(t("errors:eventKindInvalidId"));
	}

	const updated = await db
		.update(eventKinds)
		.set({ archivedAt: new Date() })
		.where(eq(eventKinds.id, id))
		.returning();

	return updated[0];
});

export const archiveEventKind = archiveEventKindFn as unknown as (opts: {
	data: number;
}) => Promise<typeof eventKinds.$inferSelect>;

const restoreEventKindFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const t = createServerT(resolveLang(ctx.data));
	const id = Number(
		typeof ctx.data === "object" && ctx.data && "data" in ctx.data
			? (ctx.data as { data: unknown }).data
			: ctx.data,
	);
	if (!id) {
		throw new Error(t("errors:eventKindInvalidId"));
	}

	const updated = await db
		.update(eventKinds)
		.set({ archivedAt: null })
		.where(eq(eventKinds.id, id))
		.returning();

	return updated[0];
});

export const restoreEventKind = restoreEventKindFn as unknown as (opts: {
	data: number;
}) => Promise<typeof eventKinds.$inferSelect>;

const deleteEventKindFn = createServerFn({
	method: "POST",
}).handler(async (ctx: any) => {
	const { db } = await import("@bsebet/db");
	const t = createServerT(resolveLang(ctx.data));
	const id = Number(
		typeof ctx.data === "object" && ctx.data && "data" in ctx.data
			? (ctx.data as { data: unknown }).data
			: ctx.data,
	);
	if (!id) {
		throw new Error(t("errors:eventKindInvalidId"));
	}

	const [ref] = await db
		.select({ value: count() })
		.from(tournaments)
		.where(eq(tournaments.eventKindId, id));

	const referenceCount = Number(ref?.value ?? 0);
	if (!canHardDeleteEventKind(referenceCount)) {
		throw new Error("EVENT_KIND_IN_USE");
	}

	await db.delete(eventKinds).where(eq(eventKinds.id, id));
	return { success: true };
});

export const deleteEventKind = deleteEventKindFn as unknown as (opts: {
	data: number;
}) => Promise<{ success: boolean }>;

import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tickets, ticketMessages } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const ticketsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, ctx.user.id))
      .orderBy(desc(tickets.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, input.id), eq(tickets.userId, ctx.user.id)))
        .limit(1);
      return rows[0] ?? null;
    }),

  getMessages: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const ticket = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, input.ticketId), eq(tickets.userId, ctx.user.id)))
        .limit(1);
      if (!ticket[0]) return [];
      return db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, input.ticketId))
        .orderBy(ticketMessages.createdAt);
    }),

  create: protectedProcedure
    .input(
      z.object({
        subject: z.string().min(1).max(256),
        description: z.string().min(1).max(5000),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        category: z.string().default("general"),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ticketNumber = `TKT-${Date.now()}-${nanoid(4).toUpperCase()}`;
      await db.insert(tickets).values({
        ticketNumber,
        userId: ctx.user.id,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        category: input.category,
        projectId: input.projectId,
        status: "open",
      });
      return { success: true, ticketNumber };
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        ticketId: z.number(),
        content: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const ticket = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, input.ticketId), eq(tickets.userId, ctx.user.id)))
        .limit(1);
      if (!ticket[0]) throw new Error("Ticket not found");
      await db.insert(ticketMessages).values({
        ticketId: input.ticketId,
        userId: ctx.user.id,
        content: input.content,
        isStaff: false,
      });
      return { success: true };
    }),
});

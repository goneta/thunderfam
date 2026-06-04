import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, ctx.user.id));
    return { success: true };
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
    return rows.length;
  }),
});

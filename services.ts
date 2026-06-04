import { z } from "zod/v4";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { services } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const servicesRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.sortOrder, services.category);
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(services)
        .where(eq(services.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),
});

import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  projects,
  projectMilestones,
  projectComments,
  notifications,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(projects)
      .where(eq(projects.clientId, ctx.user.id))
      .orderBy(desc(projects.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.clientId, ctx.user.id)))
        .limit(1);
      return rows[0] ?? null;
    }),

  getMilestones: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Verify ownership
      const proj = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.clientId, ctx.user.id)))
        .limit(1);
      if (!proj[0]) return [];
      return db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, input.projectId))
        .orderBy(projectMilestones.sortOrder);
    }),

  getComments: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const proj = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.clientId, ctx.user.id)))
        .limit(1);
      if (!proj[0]) return [];
      return db
        .select()
        .from(projectComments)
        .where(eq(projectComments.projectId, input.projectId))
        .orderBy(desc(projectComments.createdAt));
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        content: z.string().min(1).max(2000),
        type: z
          .enum(["comment", "task_request", "recommendation", "approval", "rejection"])
          .default("comment"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const proj = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.clientId, ctx.user.id)))
        .limit(1);
      if (!proj[0]) throw new Error("Project not found");
      await db.insert(projectComments).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        content: input.content,
        type: input.type,
      });
      return { success: true };
    }),

  requestService: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        serviceId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const projectNumber = `TGL-${Date.now()}-${nanoid(4).toUpperCase()}`;
      await db.insert(projects).values({
        projectNumber,
        clientId: ctx.user.id,
        serviceId: input.serviceId,
        title: input.title,
        description: input.description,
        status: "pending",
        priority: "medium",
      });
      // Notify client
      await db.insert(notifications).values({
        userId: ctx.user.id,
        title: "Demande de projet reçue",
        content: `Votre demande "${input.title}" a bien été reçue. Notre équipe vous contactera sous 24h.`,
        type: "project_update",
      });
      return { success: true, projectNumber };
    }),
});

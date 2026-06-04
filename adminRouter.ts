import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  users,
  projects,
  payments,
  invoices,
  services,
  tickets,
  notifications,
  quotes,
  projectMilestones,
  auditLogs,
} from "../../drizzle/schema";
import { eq, desc, count, sum } from "drizzle-orm";
import { nanoid } from "nanoid";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // ── Dashboard stats ──────────────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalProjects] = await db.select({ count: count() }).from(projects);
    const [openTickets] = await db
      .select({ count: count() })
      .from(tickets)
      .where(eq(tickets.status, "open"));
    const [pendingPayments] = await db
      .select({ count: count() })
      .from(payments)
      .where(eq(payments.status, "pending"));
    const [completedPayments] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.status, "completed"));

    return {
      totalUsers: totalUsers?.count ?? 0,
      totalProjects: totalProjects?.count ?? 0,
      openTickets: openTickets?.count ?? 0,
      pendingPayments: pendingPayments?.count ?? 0,
      totalRevenue: completedPayments?.total ?? "0",
    };
  }),

  // ── Users ────────────────────────────────────────────────────────
  listUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(users).orderBy(desc(users.createdAt));
  }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "manager"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  toggleUserActive: adminProcedure
    .input(z.object({ userId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ── Projects ─────────────────────────────────────────────────────
  listProjects: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }),

  updateProject: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "review", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        progressPercent: z.number().min(0).max(100).optional(),
        managerId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      await db.update(projects).set(filtered).where(eq(projects.id, id));

      // Notify client if status changed
      if (updates.status) {
        const proj = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
        if (proj[0]) {
          await db.insert(notifications).values({
            userId: proj[0].clientId,
            title: "Mise à jour du projet",
            content: `Le statut de votre projet "${proj[0].title}" a été mis à jour : ${updates.status}.`,
            type: "project_update",
            relatedProjectId: id,
          });
        }
      }

      return { success: true };
    }),

  addMilestone: adminProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(projectMilestones).values({
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        sortOrder: input.sortOrder,
      });
      return { success: true };
    }),

  updateMilestone: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...updates } = input;
      const filtered: Record<string, unknown> = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      if (updates.status === "completed") {
        filtered.completedAt = new Date();
      }
      await db.update(projectMilestones).set(filtered).where(eq(projectMilestones.id, id));
      return { success: true };
    }),

  // ── Services ─────────────────────────────────────────────────────
  createService: adminProcedure
    .input(
      z.object({
        category: z.string().min(1).max(128),
        name: z.string().min(1).max(256),
        descriptionFr: z.string().optional(),
        descriptionEn: z.string().optional(),
        descriptionEs: z.string().optional(),
        basePrice: z.number().optional(),
        currency: z.string().default("EUR"),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(services).values({
        ...input,
        basePrice: input.basePrice ? String(input.basePrice) : undefined,
      });
      return { success: true };
    }),

  updateService: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        descriptionFr: z.string().optional(),
        basePrice: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...updates } = input;
      const filtered: Record<string, unknown> = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      if (updates.basePrice !== undefined) {
        filtered.basePrice = String(updates.basePrice);
      }
      await db.update(services).set(filtered).where(eq(services.id, id));
      return { success: true };
    }),

  deleteService: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(services).where(eq(services.id, input.id));
      return { success: true };
    }),

  // ── Payments ─────────────────────────────────────────────────────
  listPayments: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }),

  updatePaymentStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "processing", "completed", "failed", "refunded"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const updates: Record<string, unknown> = { status: input.status };
      if (input.status === "completed") updates.paidAt = new Date();
      await db.update(payments).set(updates).where(eq(payments.id, input.id));
      return { success: true };
    }),

  // ── Invoices ─────────────────────────────────────────────────────
  createInvoice: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        projectId: z.number().optional(),
        title: z.string().min(1).max(256),
        items: z.array(
          z.object({
            name: z.string(),
            qty: z.number(),
            unitPrice: z.number(),
            total: z.number(),
          })
        ),
        subtotal: z.number(),
        tax: z.number().default(0),
        total: z.number(),
        currency: z.string().default("EUR"),
        dueDate: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const invoiceNumber = `INV-${Date.now()}-${nanoid(4).toUpperCase()}`;
      await db.insert(invoices).values({
        invoiceNumber,
        userId: input.userId,
        projectId: input.projectId,
        title: input.title,
        items: input.items,
        subtotal: String(input.subtotal),
        tax: String(input.tax),
        total: String(input.total),
        currency: input.currency,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        notes: input.notes,
        status: "sent",
      });
      // Notify client
      await db.insert(notifications).values({
        userId: input.userId,
        title: "Nouvelle facture",
        content: `Une nouvelle facture "${invoiceNumber}" de ${input.total} ${input.currency} vous a été envoyée.`,
        type: "payment_due",
      });
      return { success: true, invoiceNumber };
    }),

  // ── Quotes ───────────────────────────────────────────────────────
  createQuote: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        serviceId: z.number().optional(),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        items: z.array(
          z.object({
            name: z.string(),
            qty: z.number(),
            unitPrice: z.number(),
            total: z.number(),
          })
        ),
        subtotal: z.number(),
        tax: z.number().default(0),
        total: z.number(),
        currency: z.string().default("EUR"),
        validUntil: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const quoteNumber = `QUO-${Date.now()}-${nanoid(4).toUpperCase()}`;
      await db.insert(quotes).values({
        quoteNumber,
        userId: input.userId,
        serviceId: input.serviceId,
        title: input.title,
        description: input.description,
        items: input.items,
        subtotal: String(input.subtotal),
        tax: String(input.tax),
        total: String(input.total),
        currency: input.currency,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        notes: input.notes,
        status: "sent",
      });
      return { success: true, quoteNumber };
    }),

  // ── Tickets ──────────────────────────────────────────────────────
  listTickets: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }),

  updateTicket: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...updates } = input;
      const filtered: Record<string, unknown> = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      if (updates.status === "resolved") filtered.resolvedAt = new Date();
      await db.update(tickets).set(filtered).where(eq(tickets.id, id));
      return { success: true };
    }),

  // ── Audit logs ───────────────────────────────────────────────────
  listAuditLogs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
  }),
});

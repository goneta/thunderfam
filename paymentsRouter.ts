import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { payments, invoices, notifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const paymentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(payments)
      .where(eq(payments.userId, ctx.user.id))
      .orderBy(desc(payments.createdAt));
  }),

  listInvoices: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, ctx.user.id))
      .orderBy(desc(invoices.createdAt));
  }),

  getInvoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, input.id), eq(invoices.userId, ctx.user.id)))
        .limit(1);
      return rows[0] ?? null;
    }),

  initiateMobileMoney: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number().optional(),
        projectId: z.number().optional(),
        amount: z.number().positive(),
        currency: z.string().default("XOF"),
        method: z.enum(["orange_money", "mtn_money", "moov_money", "wave", "djamo"]),
        phoneNumber: z.string().min(8).max(20),
        type: z.enum(["full", "installment"]).default("full"),
        installmentNumber: z.number().default(1),
        totalInstallments: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Create pending payment record
      const [pay] = await db
        .insert(payments)
        .values({
          invoiceId: input.invoiceId,
          userId: ctx.user.id,
          projectId: input.projectId,
          amount: String(input.amount),
          currency: input.currency,
          method: input.method,
          type: input.type,
          installmentNumber: input.installmentNumber,
          totalInstallments: input.totalInstallments,
          status: "pending",
          phoneNumber: input.phoneNumber,
          transactionId: `MM-${Date.now()}`,
        })
        .$returningId();

      // Notify user
      await db.insert(notifications).values({
        userId: ctx.user.id,
        title: "Paiement en cours",
        content: `Votre paiement de ${input.amount} ${input.currency} via ${input.method.replace("_", " ")} est en cours de traitement.`,
        type: "payment_due",
        relatedPaymentId: pay.id,
      });

      return {
        success: true,
        paymentId: pay.id,
        message: `Paiement initié. Vous allez recevoir une notification sur le ${input.phoneNumber} pour confirmer le paiement.`,
      };
    }),

  initiateStripe: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number().optional(),
        projectId: z.number().optional(),
        amount: z.number().positive(),
        currency: z.string().default("EUR"),
        type: z.enum(["full", "installment"]).default("full"),
        installmentNumber: z.number().default(1),
        totalInstallments: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [pay] = await db
        .insert(payments)
        .values({
          invoiceId: input.invoiceId,
          userId: ctx.user.id,
          projectId: input.projectId,
          amount: String(input.amount),
          currency: input.currency,
          method: "stripe",
          type: input.type,
          installmentNumber: input.installmentNumber,
          totalInstallments: input.totalInstallments,
          status: "pending",
        })
        .$returningId();

      return {
        success: true,
        paymentId: pay.id,
        // Stripe integration requires STRIPE_SECRET_KEY – will be wired when key is provided
        stripeClientSecret: null,
        message: "Stripe non configuré. Veuillez contacter l'administrateur pour activer les paiements par carte.",
      };
    }),

  confirmPayment: protectedProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(payments)
        .set({ status: "completed", paidAt: new Date() })
        .where(and(eq(payments.id, input.paymentId), eq(payments.userId, ctx.user.id)));

      await db.insert(notifications).values({
        userId: ctx.user.id,
        title: "Paiement confirmé",
        content: "Votre paiement a été confirmé avec succès. Merci !",
        type: "payment_received",
        relatedPaymentId: input.paymentId,
      });

      return { success: true };
    }),
});

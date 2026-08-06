import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { invoices, quotes } from "../../drizzle/schema";
import { permissionProcedure, ownershipFilter, assertCanAccessDocument } from "./rbac";
import { router } from "../_core/trpc";
import { generateDocumentPdf, type CommercialDocument } from "./documentPdf";
import { generateDocumentWord } from "./documentWord";
import { exportDocumentsToExcel } from "./documentExcel";
import { sendDocumentEmail, isEmailConfigured } from "./emailService";
import type { DocumentLineItem } from "@shared/documents";

// ============================================================
// Routeur des factures.
//
// Une facture est toujours issue d'un devis payé (voir
// quotes.markPaidAndInvoice) : il n'y a pas de création manuelle
// ici, ce qui garantit que toute facture est traçable jusqu'à son
// devis d'origine.
//
// Les champs amountPaid / paymentStatus / lastReminderAt sont déjà
// en place pour accueillir paiements partiels, relances et
// échéances sans refonte.
// ============================================================

function toLineItems(raw: unknown): DocumentLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any, i: number) => ({
    position: Number(r.position ?? i),
    name: String(r.name ?? ""),
    description: r.description ?? null,
    qty: Number(r.qty ?? 0),
    unit: String(r.unit ?? "unité"),
    unitPrice: Number(r.unitPrice ?? 0),
    discountPct: Number(r.discountPct ?? 0),
    taxPct: Number(r.taxPct ?? 0),
    total: r.total != null ? Number(r.total) : undefined,
  }));
}

function toCommercialDocument(row: any, quoteNumber?: string | null): CommercialDocument {
  return {
    kind: "FACTURE",
    number: row.invoiceNumber,
    relatedNumber: quoteNumber ?? null,
    date: row.createdAt ?? new Date(),
    dueDate: row.dueDate ?? null,
    clientName: row.clientName,
    clientAddress: row.clientAddress,
    title: row.title,
    description: row.description,
    items: toLineItems(row.items),
    subtotal: Number(row.subtotal ?? 0),
    discountTotal: Number(row.discountTotal ?? 0),
    taxTotal: Number(row.tax ?? 0),
    total: Number(row.total ?? 0),
    amountInWords: row.amountInWords,
    currency: row.currency ?? "FCFA",
    notes: row.notes,
    clientSignature: row.clientSignature,
    managerSignature: row.managerSignature,
    companyStamp: row.companyStamp,
  };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de données indisponible." });
  return db;
}

/** Charge la facture et le numéro du devis associé, en une fois. */
async function loadInvoice(db: any, id: number) {
  const rows = await db
    .select({ invoice: invoices, quoteNumber: quotes.quoteNumber })
    .from(invoices)
    .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
    .where(eq(invoices.id, id))
    .limit(1);
  if (!rows.length) return { invoice: null, quoteNumber: null };
  return { invoice: rows[0].invoice, quoteNumber: rows[0].quoteNumber };
}

export const invoicesRouter = router({
  list: permissionProcedure("invoices:read")
    .input(
      z.object({
        search: z.string().max(200).optional(),
        paymentStatus: z.enum(["pending", "partial", "paid", "overdue", "cancelled"]).optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
        sortBy: z.enum(["invoiceNumber", "createdAt", "total", "paymentStatus"]).default("createdAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions: any[] = [];

      const restrictTo = ownershipFilter(ctx);
      if (restrictTo !== null) conditions.push(eq(invoices.userId, restrictTo));

      if (input.search) {
        const p = `%${input.search}%`;
        conditions.push(or(like(invoices.invoiceNumber, p), like(invoices.title, p), like(invoices.clientName, p)));
      }
      if (input.paymentStatus) conditions.push(eq(invoices.paymentStatus, input.paymentStatus));

      const where = conditions.length ? and(...conditions) : undefined;
      const orderCol = (invoices as any)[input.sortBy];
      const order = input.sortDir === "asc" ? asc(orderCol) : desc(orderCol);

      // Jointure : la liste doit afficher le N° du devis associé.
      const items = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          quoteId: invoices.quoteId,
          quoteNumber: quotes.quoteNumber,
          createdAt: invoices.createdAt,
          clientName: invoices.clientName,
          title: invoices.title,
          total: invoices.total,
          currency: invoices.currency,
          paymentStatus: invoices.paymentStatus,
          amountPaid: invoices.amountPaid,
          dueDate: invoices.dueDate,
          userId: invoices.userId,
        })
        .from(invoices)
        .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
        .where(where)
        .orderBy(order)
        .limit(input.perPage)
        .offset((input.page - 1) * input.perPage);

      const countRows = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(where);

      return { items, total: Number(countRows[0]?.count ?? 0), page: input.page, perPage: input.perPage };
    }),

  byId: permissionProcedure("invoices:read")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { invoice, quoteNumber } = await loadInvoice(db, input.id);
      assertCanAccessDocument(ctx, invoice);
      return { ...invoice, quoteNumber };
    }),

  pdf: permissionProcedure("invoices:read")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { invoice, quoteNumber } = await loadInvoice(db, input.id);
      assertCanAccessDocument(ctx, invoice);
      const buf = await generateDocumentPdf(toCommercialDocument(invoice, quoteNumber));
      return { filename: `${invoice.invoiceNumber}.pdf`, base64: buf.toString("base64") };
    }),

  word: permissionProcedure("invoices:read")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { invoice, quoteNumber } = await loadInvoice(db, input.id);
      assertCanAccessDocument(ctx, invoice);
      const buf = await generateDocumentWord(toCommercialDocument(invoice, quoteNumber));
      return { filename: `${invoice.invoiceNumber}.docx`, base64: buf.toString("base64") };
    }),

  exportExcel: permissionProcedure("invoices:read").query(async ({ ctx }) => {
    const db = await requireDb();
    const restrictTo = ownershipFilter(ctx);
    const rows = await db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        quoteNumber: quotes.quoteNumber,
        createdAt: invoices.createdAt,
        clientName: invoices.clientName,
        title: invoices.title,
        total: invoices.total,
        currency: invoices.currency,
        paymentStatus: invoices.paymentStatus,
      })
      .from(invoices)
      .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
      .where(restrictTo !== null ? eq(invoices.userId, restrictTo) : undefined)
      .orderBy(desc(invoices.createdAt))
      .limit(5000);

    const buf = await exportDocumentsToExcel(
      rows.map((r: any) => ({
        number: r.invoiceNumber,
        relatedNumber: r.quoteNumber,
        date: r.createdAt,
        clientName: r.clientName,
        title: r.title,
        total: Number(r.total),
        currency: r.currency,
        status: r.paymentStatus,
        paymentStatus: r.paymentStatus,
      })),
      "FACTURE"
    );
    return { filename: `factures-${new Date().toISOString().slice(0, 10)}.xlsx`, base64: buf.toString("base64") };
  }),

  sendByEmail: permissionProcedure("invoices:send")
    .input(
      z.object({
        id: z.number().int(),
        to: z.string().email(),
        cc: z.string().email().optional().or(z.literal("")),
        message: z.string().max(5000).optional(),
        includeWord: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isEmailConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "L'envoi d'e-mail n'est pas configuré (SMTP_HOST manquant).",
        });
      }
      const db = await requireDb();
      const { invoice, quoteNumber } = await loadInvoice(db, input.id);
      assertCanAccessDocument(ctx, invoice);

      const doc = toCommercialDocument(invoice, quoteNumber);
      const pdf = await generateDocumentPdf(doc);
      const docx = input.includeWord ? await generateDocumentWord(doc) : null;

      await sendDocumentEmail({
        to: input.to,
        cc: input.cc || undefined,
        kind: "FACTURE",
        number: invoice.invoiceNumber,
        clientName: invoice.clientName,
        total: Number(invoice.total),
        currency: invoice.currency ?? "FCFA",
        customMessage: input.message ?? null,
        pdf,
        docx,
      });

      await db
        .update(invoices)
        .set({ lastReminderAt: new Date(), reminderCount: sql`${invoices.reminderCount} + 1` })
        .where(eq(invoices.id, input.id));

      return { success: true };
    }),

  /**
   * Enregistre un règlement. Gère nativement les paiements partiels :
   * le statut passe à `partial` tant que le total n'est pas atteint.
   */
  recordPayment: permissionProcedure("invoices:update")
    .input(z.object({ id: z.number().int(), amount: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { invoice } = await loadInvoice(db, input.id);
      assertCanAccessDocument(ctx, invoice);

      const alreadyPaid = Number(invoice.amountPaid ?? 0);
      const total = Number(invoice.total ?? 0);
      const newPaid = Math.min(total, alreadyPaid + input.amount);
      const paymentStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "pending";

      await db
        .update(invoices)
        .set({
          amountPaid: String(newPaid),
          paymentStatus,
          paidAt: paymentStatus === "paid" ? new Date() : invoice.paidAt,
        })
        .where(eq(invoices.id, input.id));

      return { amountPaid: newPaid, paymentStatus, remaining: Math.max(0, total - newPaid) };
    }),
});

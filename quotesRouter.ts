import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, desc, asc, eq, like, gte, lte, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { quotes, invoices, users, savedSignatures } from "../../drizzle/schema";
import { permissionProcedure, ownershipFilter, assertCanAccessDocument } from "./rbac";
import { router } from "../_core/trpc";
import { computeTotals, type DocumentLineItem } from "@shared/documents";
import { nextQuoteNumber, nextInvoiceNumber } from "./documentNumbering";
import { generateDocumentPdf, type CommercialDocument } from "./documentPdf";
import { generateDocumentWord } from "./documentWord";
import { exportDocumentsToExcel } from "./documentExcel";
import { sendDocumentEmail, isEmailConfigured } from "./emailService";
import { qrDataUrl } from "./qrService";

// ============================================================
// Routeur des devis.
//
// Règle constante : les montants envoyés par le client ne sont
// JAMAIS repris tels quels. computeTotals() recalcule tout à
// partir des lignes avant chaque écriture. Un client malveillant
// ne peut donc pas forger un total de 1 FCFA.
// ============================================================

const lineItemSchema = z.object({
  position: z.number().int().min(0).default(0),
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  qty: z.number().min(0).max(1_000_000_000),
  unit: z.string().max(30).default("unité"),
  unitPrice: z.number().min(0).max(1_000_000_000_000),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(100).default(0),
});

const quoteInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(5000).optional().nullable(),
  clientName: z.string().max(256).optional().nullable(),
  clientAddress: z.string().max(2000).optional().nullable(),
  clientEmail: z.string().email().max(320).optional().nullable().or(z.literal("")),
  serviceId: z.number().int().optional().nullable(),
  currency: z.string().max(8).default("FCFA"),
  validUntil: z.coerce.date().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  items: z.array(lineItemSchema).min(1).max(500),
});

/** Convertit une ligne de base (JSON) vers le type partagé. */
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

/** Assemble la structure commune aux générateurs PDF / Word. */
function toCommercialDocument(row: any, kind: "DEVIS" | "FACTURE", relatedNumber?: string | null): CommercialDocument {
  return {
    kind,
    number: kind === "FACTURE" ? row.invoiceNumber : row.quoteNumber,
    relatedNumber: relatedNumber ?? null,
    date: row.createdAt ?? new Date(),
    validityDays: row.validUntil
      ? Math.max(0, Math.round((new Date(row.validUntil).getTime() - new Date(row.createdAt).getTime()) / 86400000))
      : 30,
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
    paymentTerms: row.paymentTerms ?? null,
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

async function loadQuote(db: any, id: number) {
  const rows = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  return rows[0] ?? null;
}

export const quotesRouter = router({
  // ---------- Lecture ----------
  list: permissionProcedure("quotes:read")
    .input(
      z.object({
        search: z.string().max(200).optional(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "paid"]).optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
        sortBy: z.enum(["quoteNumber", "createdAt", "total", "status", "updatedAt"]).default("updatedAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions: any[] = [];

      const restrictTo = ownershipFilter(ctx);
      if (restrictTo !== null) conditions.push(eq(quotes.userId, restrictTo));

      if (input.search) {
        const p = `%${input.search}%`;
        conditions.push(
          or(like(quotes.quoteNumber, p), like(quotes.title, p), like(quotes.clientName, p))
        );
      }
      if (input.status) conditions.push(eq(quotes.status, input.status));
      if (input.dateFrom) conditions.push(gte(quotes.createdAt, input.dateFrom));
      if (input.dateTo) conditions.push(lte(quotes.createdAt, input.dateTo));

      const where = conditions.length ? and(...conditions) : undefined;
      const orderCol = (quotes as any)[input.sortBy];
      const order = input.sortDir === "asc" ? asc(orderCol) : desc(orderCol);

      const items = await db
        .select()
        .from(quotes)
        .where(where)
        .orderBy(order)
        .limit(input.perPage)
        .offset((input.page - 1) * input.perPage);

      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(where);

      return { items, total: Number(countRows[0]?.count ?? 0), page: input.page, perPage: input.perPage };
    }),

  byId: permissionProcedure("quotes:read")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const quote = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, quote);

      // Facture générée à partir de ce devis (navigation devis -> facture)
      const linked = await db
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.quoteId, quote.id))
        .limit(1);

      return { ...quote, linkedInvoice: linked[0] ?? null };
    }),

  /** Aperçu du QR Code pour l'éditeur, sans enregistrer. */
  qrPreview: permissionProcedure("quotes:read")
    .input(z.object({ number: z.string(), clientName: z.string().optional(), total: z.number(), currency: z.string().default("FCFA"), createdAt: z.string() }))
    .query(async ({ input }) => ({ dataUrl: await qrDataUrl(input) })),

  // ---------- Écriture ----------
  create: permissionProcedure("quotes:create")
    .input(quoteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const totals = computeTotals(input.items as DocumentLineItem[], input.currency);
      const quoteNumber = await nextQuoteNumber();

      const [result]: any = await db.insert(quotes).values({
        quoteNumber,
        userId: ctx.user.id,
        serviceId: input.serviceId ?? null,
        title: input.title,
        description: input.description ?? null,
        clientName: input.clientName ?? null,
        clientAddress: input.clientAddress ?? null,
        clientEmail: input.clientEmail || null,
        items: totals.lines,
        subtotal: String(totals.subtotal),
        discountTotal: String(totals.discountTotal),
        tax: String(totals.taxTotal),
        total: String(totals.total),
        amountInWords: totals.amountInWords,
        currency: input.currency,
        status: "draft",
        validUntil: input.validUntil ?? null,
        notes: input.notes ?? null,
      });

      const id = Number(result?.insertId ?? result?.[0]?.insertId);
      return { id, quoteNumber, ...totals };
    }),

  update: permissionProcedure("quotes:update")
    .input(z.object({ id: z.number().int() }).and(quoteInputSchema))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, existing);

      // Un devis déjà facturé ne doit plus être modifiable : la facture
      // émise ne correspondrait plus au devis accepté.
      if (existing.status === "paid") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ce devis a été facturé et ne peut plus être modifié.",
        });
      }

      const totals = computeTotals(input.items as DocumentLineItem[], input.currency);

      await db
        .update(quotes)
        .set({
          title: input.title,
          description: input.description ?? null,
          clientName: input.clientName ?? null,
          clientAddress: input.clientAddress ?? null,
          clientEmail: input.clientEmail || null,
          serviceId: input.serviceId ?? null,
          items: totals.lines,
          subtotal: String(totals.subtotal),
          discountTotal: String(totals.discountTotal),
          tax: String(totals.taxTotal),
          total: String(totals.total),
          amountInWords: totals.amountInWords,
          currency: input.currency,
          validUntil: input.validUntil ?? null,
          notes: input.notes ?? null,
        })
        .where(eq(quotes.id, input.id));

      // Le QR Code n'est pas stocké : il est régénéré à chaque export
      // à partir de ces nouvelles valeurs. Rien d'autre à invalider.
      return { id: input.id, ...totals };
    }),

  setStatus: permissionProcedure("quotes:update")
    .input(z.object({ id: z.number().int(), status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      assertCanAccessDocument(ctx, await loadQuote(db, input.id));
      await db.update(quotes).set({ status: input.status }).where(eq(quotes.id, input.id));
      return { success: true };
    }),

  remove: permissionProcedure("quotes:delete")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const linked = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.quoteId, input.id)).limit(1);
      if (linked.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ce devis a généré une facture ; il ne peut pas être supprimé.",
        });
      }
      await db.delete(quotes).where(eq(quotes.id, input.id));
      return { success: true };
    }),

  duplicate: permissionProcedure("quotes:create")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const src = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, src);

      const quoteNumber = await nextQuoteNumber();
      const [result]: any = await db.insert(quotes).values({
        quoteNumber,
        userId: ctx.user.id,
        serviceId: src.serviceId,
        title: src.title,
        description: src.description,
        clientName: src.clientName,
        clientAddress: src.clientAddress,
        clientEmail: src.clientEmail,
        items: src.items,
        subtotal: src.subtotal,
        discountTotal: src.discountTotal,
        tax: src.tax,
        total: src.total,
        amountInWords: src.amountInWords,
        currency: src.currency,
        status: "draft",
        notes: src.notes,
      });
      return { id: Number(result?.insertId ?? result?.[0]?.insertId), quoteNumber };
    }),

  // ---------- Signature électronique ----------
  sign: permissionProcedure("quotes:sign")
    .input(
      z.object({
        id: z.number().int(),
        clientSignature: z.string().max(2_000_000).optional().nullable(),
        managerSignature: z.string().max(2_000_000).optional().nullable(),
        companyStamp: z.string().max(2_000_000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      assertCanAccessDocument(ctx, await loadQuote(db, input.id));

      const patch: Record<string, unknown> = { signedAt: new Date() };
      if (input.clientSignature !== undefined) patch.clientSignature = input.clientSignature;
      if (input.managerSignature !== undefined) patch.managerSignature = input.managerSignature;
      if (input.companyStamp !== undefined) patch.companyStamp = input.companyStamp;

      await db.update(quotes).set(patch).where(eq(quotes.id, input.id));
      return { success: true };
    }),

  listSignatures: permissionProcedure("quotes:sign").query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(savedSignatures).where(eq(savedSignatures.userId, ctx.user.id));
  }),

  saveSignature: permissionProcedure("quotes:sign")
    .input(
      z.object({
        label: z.string().min(1).max(128),
        imageBase64: z.string().max(2_000_000),
        type: z.enum(["signature", "stamp"]).default("signature"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(savedSignatures).values({ ...input, userId: ctx.user.id });
      return { success: true };
    }),

  // ---------- Exports ----------
  pdf: permissionProcedure("quotes:read")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const quote = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, quote);
      const buf = await generateDocumentPdf(toCommercialDocument(quote, "DEVIS"));
      return { filename: `${quote.quoteNumber}.pdf`, base64: buf.toString("base64") };
    }),

  word: permissionProcedure("quotes:read")
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const quote = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, quote);
      const buf = await generateDocumentWord(toCommercialDocument(quote, "DEVIS"));
      return { filename: `${quote.quoteNumber}.docx`, base64: buf.toString("base64") };
    }),

  exportExcel: permissionProcedure("quotes:read")
    .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const restrictTo = ownershipFilter(ctx);
      const rows = await db
        .select()
        .from(quotes)
        .where(restrictTo !== null ? eq(quotes.userId, restrictTo) : undefined)
        .orderBy(desc(quotes.createdAt))
        .limit(5000);

      const buf = await exportDocumentsToExcel(
        rows.map((r: any) => ({
          number: r.quoteNumber,
          date: r.createdAt,
          clientName: r.clientName,
          title: r.title,
          total: Number(r.total),
          currency: r.currency,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
        "DEVIS"
      );
      return { filename: `devis-${new Date().toISOString().slice(0, 10)}.xlsx`, base64: buf.toString("base64") };
    }),

  // ---------- Envoi par e-mail ----------
  sendByEmail: permissionProcedure("quotes:send")
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
      const quote = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, quote);

      const doc = toCommercialDocument(quote, "DEVIS");
      const pdf = await generateDocumentPdf(doc);
      const docx = input.includeWord ? await generateDocumentWord(doc) : null;

      await sendDocumentEmail({
        to: input.to,
        cc: input.cc || undefined,
        kind: "DEVIS",
        number: quote.quoteNumber,
        clientName: quote.clientName,
        total: Number(quote.total),
        currency: quote.currency ?? "FCFA",
        customMessage: input.message ?? null,
        pdf,
        docx,
      });

      if (quote.status === "draft") {
        await db.update(quotes).set({ status: "sent" }).where(eq(quotes.id, input.id));
      }
      return { success: true };
    }),

  // ---------- Transformation en facture ----------
  /**
   * Marque le devis comme payé et génère automatiquement la facture
   * correspondante, sans ressaisie : client, lignes, montants, taxes,
   * conditions et signatures sont repris tels quels. La facture reçoit
   * son propre numéro (FAC-...) et reste liée au devis via quoteId,
   * ce qui permet de naviguer de l'un à l'autre.
   */
  markPaidAndInvoice: permissionProcedure("quotes:convert")
    .input(z.object({ id: z.number().int(), dueDays: z.number().int().min(0).max(365).default(30) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const quote = await loadQuote(db, input.id);
      assertCanAccessDocument(ctx, quote);

      // Idempotence : deux clics ne doivent pas produire deux factures.
      const existing = await db
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.quoteId, quote.id))
        .limit(1);
      if (existing.length) {
        return { alreadyExisted: true, invoiceId: existing[0].id, invoiceNumber: existing[0].invoiceNumber };
      }

      const invoiceNumber = await nextInvoiceNumber();
      const dueDate = new Date(Date.now() + input.dueDays * 86400000);

      const [result]: any = await db.insert(invoices).values({
        invoiceNumber,
        quoteId: quote.id,
        userId: quote.userId,
        title: quote.title,
        description: quote.description,
        clientName: quote.clientName,
        clientAddress: quote.clientAddress,
        clientEmail: quote.clientEmail,
        items: quote.items,
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        tax: quote.tax,
        total: quote.total,
        amountInWords: quote.amountInWords,
        currency: quote.currency,
        status: "sent",
        paymentStatus: "paid",
        amountPaid: quote.total,
        paidAt: new Date(),
        dueDate,
        notes: quote.notes,
        clientSignature: quote.clientSignature,
        managerSignature: quote.managerSignature,
        companyStamp: quote.companyStamp,
      });

      const invoiceId = Number(result?.insertId ?? result?.[0]?.insertId);

      await db
        .update(quotes)
        .set({ status: "paid", paidAt: new Date(), generatedInvoiceId: invoiceId })
        .where(eq(quotes.id, quote.id));

      return { alreadyExisted: false, invoiceId, invoiceNumber };
    }),
});

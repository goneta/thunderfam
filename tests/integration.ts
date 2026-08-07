/**
 * Tests d'intégration des routeurs tRPC contre une base MySQL réelle.
 *
 *   npm run test:integration
 *
 * Ces tests appellent les VRAIES procédures via createCaller — pas une
 * copie de la logique. Ils couvrent donc aussi le contrôle d'accès, la
 * validation Zod et le recalcul serveur des montants.
 */
import { strict as assert } from "node:assert";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { initTRPC } from "@trpc/server";

type Role = "user" | "manager" | "admin";
interface TestUser { id: number; email: string; role: Role; name?: string }

const ADMIN: TestUser   = { id: 1, email: "admin@thunderfam.com", role: "admin",   name: "Admin" };
const MANAGER: TestUser = { id: 2, email: "agent@thunderfam.com", role: "manager", name: "Agent" };
const CLIENT: TestUser  = { id: 3, email: "awa@client.ci",        role: "user",    name: "Awa" };
const CLIENT2: TestUser = { id: 4, email: "bob@client.ci",        role: "user",    name: "Bob" };

const LINES = [
  { position: 0, name: "Transport routier", qty: 12500, unit: "Tonne",  unitPrice: 70000, discountPct: 0, taxPct: 0 },
  { position: 1, name: "Manutention",       qty: 250,   unit: "Camion", unitPrice: 15000, discountPct: 5, taxPct: 18 },
];

let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch (e: any) { failed++; console.log(`FAIL  ${name}\n      ${e?.message ?? e}`); }
}

async function main() {
  const url = process.env.TEST_DATABASE_URL || "mysql://tf:tf@127.0.0.1/tf_int";
  // Un POOL, pas une connexion unique : c'est ce qu'utilise la
  // production, et c'est indispensable ici — des transactions
  // concurrentes sur une connexion unique s'entrelacent et ne
  // peuvent pas s'isoler, ce qui invaliderait le test de
  // numérotation concurrente.
  const conn = mysql.createPool({ uri: url, connectionLimit: 10 });

  const dbMod: any = await import("../db");
  dbMod.__setDb(drizzle(conn));

  const t = initTRPC.context<{ user: TestUser | null }>().create();
  const trpcMod: any = await import("../_core/trpc");
  trpcMod.__init(t);

  // Import APRÈS initialisation : les routeurs construisent leurs
  // procédures au chargement du module.
  const { quotesRouter } = await import("../routers/quotesRouter");
  const { invoicesRouter } = await import("../routers/invoicesRouter");
  const appRouter = t.router({ quotes: quotesRouter, invoices: invoicesRouter });
  const caller = (user: TestUser | null) => appRouter.createCaller({ user });

  let quoteId = 0, quoteNumber = "", invoiceId = 0, invoiceNumber = "";

  // ---------- Création & recalcul serveur ----------
  await test("manager peut créer un devis", async () => {
    const r: any = await caller(MANAGER).quotes.create({
      title: "Transport Abidjan-Bamako",
      clientName: "Inter Logistique & Transport",
      clientAddress: "Bamako, Mali",
      clientEmail: "contact@inter-logistique.ml",
      currency: "FCFA", items: LINES,
    });
    quoteId = r.id; quoteNumber = r.quoteNumber;
    assert.ok(quoteId > 0);
    assert.match(quoteNumber, /^DEV-TGL-CI-\d{4}-\d{6}$/);
  });

  await test("les totaux sont recalculés côté serveur", async () => {
    const q: any = await caller(MANAGER).quotes.byId({ id: quoteId });
    assert.equal(Number(q.subtotal), 878562500);
    assert.equal(Number(q.tax), 641250);
    assert.equal(Number(q.discountTotal), 187500);
    assert.ok(String(q.amountInWords).startsWith("Huit cent"), q.amountInWords);
  });

  await test("un total falsifié par le client est ignoré", async () => {
    const r: any = await caller(MANAGER).quotes.create({
      title: "Falsification", currency: "FCFA",
      items: [{ position: 0, name: "X", qty: 2, unit: "u", unitPrice: 1000, discountPct: 0, taxPct: 0 }],
      subtotal: 1, total: 1, tax: 0,
    } as any);
    const q: any = await caller(MANAGER).quotes.byId({ id: r.id });
    assert.equal(Number(q.total), 2000);
  });

  await test("un montant supérieur à 100 millions FCFA est accepté", async () => {
    // Régression : le schéma d'origine utilisait DECIMAL(10,2), qui
    // plafonnait à ~100 millions et rejetait tout devis en FCFA.
    const r: any = await caller(MANAGER).quotes.create({
      title: "Gros contrat", currency: "FCFA",
      items: [{ position: 0, name: "Tonnage", qty: 100000, unit: "Tonne", unitPrice: 70000, discountPct: 0, taxPct: 0 }],
    });
    const q: any = await caller(MANAGER).quotes.byId({ id: r.id });
    assert.equal(Number(q.total), 7000000000, "7 milliards FCFA doivent être stockés sans perte");
  });

  // ---------- Contrôle d'accès ----------
  await test("un client ne peut pas créer de devis", async () => {
    await assert.rejects(() => caller(CLIENT).quotes.create({
      title: "Interdit", currency: "FCFA",
      items: [{ position: 0, name: "X", qty: 1, unit: "u", unitPrice: 10, discountPct: 0, taxPct: 0 }],
    }), (e: any) => e.code === "FORBIDDEN");
  });

  await test("une requête sans utilisateur est rejetée", async () => {
    await assert.rejects(() => caller(null).quotes.list({}), (e: any) => e.code === "UNAUTHORIZED");
  });

  await test("un client ne voit pas le devis d'un autre (NOT_FOUND)", async () => {
    await assert.rejects(() => caller(CLIENT2).quotes.byId({ id: quoteId }),
      (e: any) => e.code === "NOT_FOUND");
  });

  await test("la liste d'un client ne contient que ses devis", async () => {
    const r: any = await caller(CLIENT2).quotes.list({ page: 1, perPage: 50 });
    assert.equal(r.items.length, 0);
  });

  await test("un manager ne peut pas supprimer un devis", async () => {
    await assert.rejects(() => caller(MANAGER).quotes.remove({ id: quoteId }),
      (e: any) => e.code === "FORBIDDEN");
  });

  // ---------- Validation ----------
  await test("un devis sans ligne est refusé", async () => {
    await assert.rejects(() => caller(MANAGER).quotes.create({ title: "Vide", currency: "FCFA", items: [] }));
  });
  await test("une quantité négative est refusée", async () => {
    await assert.rejects(() => caller(MANAGER).quotes.create({
      title: "Négatif", currency: "FCFA",
      items: [{ position: 0, name: "X", qty: -5, unit: "u", unitPrice: 100, discountPct: 0, taxPct: 0 }] }));
  });
  await test("une remise supérieure à 100% est refusée", async () => {
    await assert.rejects(() => caller(MANAGER).quotes.create({
      title: "Remise", currency: "FCFA",
      items: [{ position: 0, name: "X", qty: 1, unit: "u", unitPrice: 100, discountPct: 150, taxPct: 0 }] }));
  });

  // ---------- Signature & exports ----------
  await test("le manager peut signer le devis", async () => {
    await caller(MANAGER).quotes.sign({ id: quoteId, managerSignature: "data:image/png;base64,AAAA" });
    const q: any = await caller(MANAGER).quotes.byId({ id: quoteId });
    assert.equal(q.managerSignature, "data:image/png;base64,AAAA");
  });

  await test("le PDF généré est un vrai PDF", async () => {
    const r: any = await caller(MANAGER).quotes.pdf({ id: quoteId });
    const buf = Buffer.from(r.base64, "base64");
    assert.equal(buf.subarray(0, 4).toString(), "%PDF");
    assert.ok(buf.length > 5000, `trop court: ${buf.length}`);
    assert.equal(r.filename, `${quoteNumber}.pdf`);
  });

  await test("le Word généré est une archive valide", async () => {
    const r: any = await caller(MANAGER).quotes.word({ id: quoteId });
    assert.equal(Buffer.from(r.base64, "base64").subarray(0, 2).toString(), "PK");
  });

  await test("l'export Excel est généré", async () => {
    const r: any = await caller(MANAGER).quotes.exportExcel();
    assert.equal(Buffer.from(r.base64, "base64").subarray(0, 2).toString(), "PK");
  });

  // ---------- Conversion en facture ----------
  await test("la conversion reprend l'intégralité du devis", async () => {
    const r: any = await caller(MANAGER).quotes.markPaidAndInvoice({ id: quoteId, dueDays: 30 });
    invoiceId = r.invoiceId; invoiceNumber = r.invoiceNumber;
    assert.equal(r.alreadyExisted, false);
    assert.match(invoiceNumber, /^FAC-TGL-CI-\d{4}-\d{6}$/);

    const f: any = await caller(MANAGER).invoices.byId({ id: invoiceId });
    assert.equal(f.clientName, "Inter Logistique & Transport");
    assert.equal(Number(f.total), 879203750);
    assert.equal(f.quoteNumber, quoteNumber);
    assert.equal(f.managerSignature, "data:image/png;base64,AAAA");
    assert.equal((f.items as any[]).length, 2);
  });

  await test("la conversion est idempotente", async () => {
    const r: any = await caller(MANAGER).quotes.markPaidAndInvoice({ id: quoteId, dueDays: 30 });
    assert.equal(r.alreadyExisted, true);
    assert.equal(r.invoiceId, invoiceId);
  });

  await test("le devis facturé n'est plus modifiable", async () => {
    await assert.rejects(() => caller(MANAGER).quotes.update({
      id: quoteId, title: "Interdit", currency: "FCFA", items: LINES }),
      (e: any) => e.code === "CONFLICT");
  });

  await test("un devis facturé ne peut plus être supprimé", async () => {
    await assert.rejects(() => caller(ADMIN).quotes.remove({ id: quoteId }),
      (e: any) => e.code === "CONFLICT");
  });

  await test("le devis pointe vers sa facture", async () => {
    const q: any = await caller(MANAGER).quotes.byId({ id: quoteId });
    assert.equal(q.status, "paid");
    assert.equal(q.linkedInvoice?.invoiceNumber, invoiceNumber);
  });

  // ---------- Paiements ----------
  await test("un règlement partiel passe la facture en « partial »", async () => {
    await conn.query("UPDATE invoices SET amountPaid=0, paymentStatus='pending' WHERE id=?", [invoiceId]);
    const r: any = await caller(ADMIN).invoices.recordPayment({ id: invoiceId, amount: 100000 });
    assert.equal(r.paymentStatus, "partial");
    assert.equal(r.remaining, 879103750);
  });

  await test("le solde complet passe la facture en « paid »", async () => {
    const r: any = await caller(ADMIN).invoices.recordPayment({ id: invoiceId, amount: 879103750 });
    assert.equal(r.paymentStatus, "paid");
    assert.equal(r.remaining, 0);
  });

  await test("un trop-perçu est plafonné au total", async () => {
    const r: any = await caller(ADMIN).invoices.recordPayment({ id: invoiceId, amount: 999999 });
    assert.equal(r.amountPaid, 879203750);
  });

  await test("un client ne peut pas enregistrer un paiement", async () => {
    await assert.rejects(() => caller(CLIENT).invoices.recordPayment({ id: invoiceId, amount: 1000 }),
      (e: any) => e.code === "FORBIDDEN");
  });

  // ---------- Numérotation ----------
  await test("numéros uniques sous créations concurrentes", async () => {
    const res = await Promise.all(Array.from({ length: 15 }, (_, i) =>
      caller(MANAGER).quotes.create({
        title: `Concurrent ${i}`, currency: "FCFA",
        items: [{ position: 0, name: "X", qty: 1, unit: "u", unitPrice: 1000, discountPct: 0, taxPct: 0 }] })));
    const nums = res.map((r: any) => r.quoteNumber);
    assert.equal(new Set(nums).size, nums.length, `doublon: ${nums.join(", ")}`);
  });

  await test("devis et factures ont des séquences distinctes", async () => {
    assert.equal(quoteNumber.slice(-6), "000001");
    assert.equal(invoiceNumber.slice(-6), "000001");
  });

  // ---------- E-mail non configuré ----------
  await test("envoi refusé proprement si SMTP absent", async () => {
    const saved = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    await assert.rejects(() => caller(MANAGER).quotes.sendByEmail({ id: quoteId, to: "destinataire@exemple.com", includeWord: false }),
      (e: any) => e.code === "PRECONDITION_FAILED");
    if (saved) process.env.SMTP_HOST = saved;
  });

  await conn.end();
  console.log(`\n${passed} réussi(s), ${failed} échec(s)`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

import { getDb } from "../db";
import { documentCounters } from "../../drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { QUOTE_PREFIX, INVOICE_PREFIX } from "@shared/documents";

// ============================================================
// Numérotation chronologique atomique des documents commerciaux.
//
// Format : {PREFIXE}-{ANNÉE}-{SÉQUENCE sur 6 chiffres}
//   DEV-TGL-CI-2026-000001
//   FAC-TGL-CI-2026-000001
//
// Les devis et les factures ont chacun leur propre séquence.
//
// L'unicité en cas de créations simultanées repose sur un
// UPDATE atomique (`counter = counter + 1`) : MySQL sérialise les
// écritures concurrentes sur la même ligne, donc deux requêtes
// parallèles ne peuvent pas lire le même compteur. On lit ensuite
// la valeur avec LAST_INSERT_ID(), qui est propre à la connexion
// et donc insensible aux autres transactions en cours.
// ============================================================

async function nextSequence(prefix: string, year: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");

  // Crée la ligne du compteur si elle n'existe pas encore (première
  // émission de l'année). Sans effet si elle existe déjà.
  await db
    .insert(documentCounters)
    .values({ prefix, year, counter: 0 })
    .onDuplicateKeyUpdate({ set: { prefix: sql`prefix` } })
    .catch(async () => {
      // Certaines versions ne supportent pas onDuplicateKeyUpdate sans
      // index unique : on retombe sur une vérification explicite.
      const existing = await db
        .select()
        .from(documentCounters)
        .where(and(eq(documentCounters.prefix, prefix), eq(documentCounters.year, year)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(documentCounters).values({ prefix, year, counter: 0 });
      }
    });

  // Incrément atomique : LAST_INSERT_ID(expr) mémorise la nouvelle
  // valeur pour CETTE connexion uniquement.
  await db.execute(
    sql`UPDATE document_counters
        SET counter = LAST_INSERT_ID(counter + 1)
        WHERE prefix = ${prefix} AND year = ${year}`
  );

  const result: any = await db.execute(sql`SELECT LAST_INSERT_ID() AS seq`);
  // Le driver mysql2 renvoie [rows, fields] ; drizzle peut renvoyer rows directement.
  const rows = Array.isArray(result) ? result[0] : result;
  const seq = Number(rows?.[0]?.seq ?? rows?.seq);

  if (!seq || Number.isNaN(seq)) {
    throw new Error("Impossible de générer le numéro de document");
  }
  return seq;
}

function format(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}

/** Génère le prochain numéro de devis : DEV-TGL-CI-2026-000001 */
export async function nextQuoteNumber(year = new Date().getFullYear()): Promise<string> {
  return format(QUOTE_PREFIX, year, await nextSequence(QUOTE_PREFIX, year));
}

/** Génère le prochain numéro de facture : FAC-TGL-CI-2026-000001 */
export async function nextInvoiceNumber(year = new Date().getFullYear()): Promise<string> {
  return format(INVOICE_PREFIX, year, await nextSequence(INVOICE_PREFIX, year));
}

/**
 * Point d'extension pour les futurs documents (bons de commande,
 * bons de livraison, avoirs) : il suffit de passer leur préfixe.
 */
export async function nextDocumentNumber(
  prefix: string,
  year = new Date().getFullYear()
): Promise<string> {
  return format(prefix, year, await nextSequence(prefix, year));
}

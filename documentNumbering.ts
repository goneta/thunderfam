import { getDb } from "../db";
import { sql } from "drizzle-orm";
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
  // émission de l'année). INSERT IGNORE s'appuie sur l'index unique
  // (prefix, year) : sans effet si la ligne existe déjà.
  await db.execute(
    sql`INSERT IGNORE INTO document_counters (prefix, year, counter)
        VALUES (${prefix}, ${year}, 0)`
  );

  // L'incrément DOIT être atomique de bout en bout.
  //
  // Une première version faisait UPDATE ... LAST_INSERT_ID(counter+1)
  // puis SELECT LAST_INSERT_ID(). C'est correct tant que chaque appel
  // dispose de sa propre connexion, mais faux dès que l'application
  // partage une connexion unique : les deux requêtes de deux appels
  // concurrents s'entrelacent et renvoient le même numéro, ce qui
  // provoque une violation de clé unique. Un test de charge l'a
  // effectivement reproduit.
  //
  // La transaction avec SELECT ... FOR UPDATE verrouille la ligne du
  // compteur jusqu'au COMMIT : le second appel attend, quel que soit
  // le mode de connexion.
  return db.transaction(async (tx: any) => {
    const locked: any = await tx.execute(
      sql`SELECT counter FROM document_counters
          WHERE prefix = ${prefix} AND year = ${year}
          FOR UPDATE`
    );
    const rows = Array.isArray(locked) ? locked[0] : locked;
    const current = Number(rows?.[0]?.counter ?? rows?.counter ?? 0);
    const next = current + 1;

    await tx.execute(
      sql`UPDATE document_counters SET counter = ${next}
          WHERE prefix = ${prefix} AND year = ${year}`
    );

    return next;
  });
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

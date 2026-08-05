// ============================================================
// Types et logique de calcul partagés entre le frontend et le
// backend pour tous les documents commerciaux (devis, factures,
// et plus tard bons de commande, bons de livraison, avoirs).
//
// La logique de calcul vit ICI et nulle part ailleurs : le
// frontend l'utilise pour l'aperçu en direct, le backend la
// réutilise pour recalculer avant écriture en base. Une seule
// implémentation -> aucune divergence possible.
// ============================================================

export const COMPANY_INFO = {
  name: "THUNDERFAM GROUP LIMITED CÔTE D'IVOIRE (TGL-CI)",
  rccm: "CI-ABJ-03-2024-B22-00006",
  address: "Abidjan, Cocody, Boulevard de l'Université",
  addressLine2: "166 Logements, Bloc F3, Appartement, non loin de la RTI",
  phone1: "+225 05 00 78 23 04",
  phone2: "+225 07 08 53 47 84",
} as const;

export const QUOTE_PREFIX = "DEV-TGL-CI";
export const INVOICE_PREFIX = "FAC-TGL-CI";

/** Une ligne de prestation. `position` porte l'ordre (glisser-déposer). */
export interface DocumentLineItem {
  /** Identifiant local stable côté UI (non persisté en base). */
  uid?: string;
  position: number;
  name: string;
  description?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  /** Remise en pourcentage appliquée à la ligne (0-100). */
  discountPct: number;
  /** Taux de TVA en pourcentage appliqué à la ligne. */
  taxPct: number;
  /** Montant HT après remise — recalculé, jamais lu depuis le client. */
  total?: number;
}

export interface DocumentTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountInWords: string;
  lines: DocumentLineItem[];
}

/** Arrondi à 2 décimales, à l'abri des erreurs de virgule flottante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Montant HT d'une ligne, remise appliquée. */
export function lineTotal(line: DocumentLineItem): number {
  const gross = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
  const discount = gross * ((Number(line.discountPct) || 0) / 100);
  return round2(gross - discount);
}

/**
 * Recalcule l'intégralité d'un document à partir de ses lignes.
 * Source de vérité unique — le backend l'appelle systématiquement
 * avant enregistrement, sans jamais faire confiance aux totaux
 * transmis par le client.
 */
export function computeTotals(
  items: DocumentLineItem[],
  currency: string = "FCFA"
): DocumentTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  const lines = items.map((item, index) => {
    const gross = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
    const discount = gross * ((Number(item.discountPct) || 0) / 100);
    const net = round2(gross - discount);
    const tax = round2(net * ((Number(item.taxPct) || 0) / 100));

    subtotal += net;
    discountTotal += discount;
    taxTotal += tax;

    return { ...item, position: index, total: net };
  });

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxTotal = round2(taxTotal);
  const total = round2(subtotal + taxTotal);

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total,
    amountInWords: amountToWordsFr(total, currency),
    lines,
  };
}

/** Formate un montant avec séparateurs d'espace : 875000000 -> "875 000 000". */
export function formatAmount(n: number): string {
  return Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// ============================================================
// Conversion d'un nombre en toutes lettres (français)
// ============================================================

const UNITS = [
  "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const TENS = [
  "", "dix", "vingt", "trente", "quarante", "cinquante", "soixante",
  "soixante-dix", "quatre-vingt", "quatre-vingt-dix",
];

function convertTrio(n: number): string {
  if (n === 0) return "";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let words = "";

  if (hundreds > 0) {
    words += hundreds > 1 ? `${UNITS[hundreds]} cent` : "cent";
    if (hundreds > 1 && rest === 0) words += "s";
    if (rest > 0) words += " ";
  }

  if (rest > 0) {
    if (rest < 20) {
      words += UNITS[rest];
    } else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      if (t === 7 || t === 9) {
        // 70-79 et 90-99 se construisent sur soixante / quatre-vingt + 10..19.
        // Seul 71 prend le "et" de liaison ("soixante et onze") ;
        // 91 s'écrit "quatre-vingt-onze", sans "et".
        words += t === 7 && u === 1
          ? `${TENS[t - 1]} et ${UNITS[11]}`
          : `${TENS[t - 1]}-${UNITS[10 + u]}`;
      } else {
        words += TENS[t];
        if (t === 8 && u === 0) words += "s";
        if (u === 1 && t !== 8) words += " et un";
        else if (u > 0) words += `-${UNITS[u]}`;
      }
    }
  }

  return words.trim();
}

/** 875000000 -> "huit cent soixante-quinze millions" */
export function numberToWordsFr(value: number): string {
  const n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return "zéro";

  const scales = [
    { value: 1_000_000_000, singular: "milliard", plural: "milliards" },
    { value: 1_000_000, singular: "million", plural: "millions" },
    { value: 1_000, singular: "mille", plural: "mille" },
  ];

  let rest = n;
  const parts: string[] = [];

  for (const scale of scales) {
    const count = Math.floor(rest / scale.value);
    if (count > 0) {
      if (scale.value === 1000 && count === 1) {
        parts.push("mille");
      } else {
        parts.push(`${convertTrio(count)} ${count > 1 ? scale.plural : scale.singular}`);
      }
      rest -= count * scale.value;
    }
  }

  if (rest > 0 || parts.length === 0) parts.push(convertTrio(rest));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

const CURRENCY_WORDS: Record<string, string> = {
  FCFA: "francs CFA",
  XOF: "francs CFA",
  EUR: "euros",
  USD: "dollars américains",
};

/**
 * "Huit cent soixante-quinze millions de francs CFA (875 000 000 FCFA)"
 */
export function amountToWordsFr(amount: number, currency: string = "FCFA"): string {
  const words = numberToWordsFr(amount);
  const capitalised = words.charAt(0).toUpperCase() + words.slice(1);
  const currencyWords = CURRENCY_WORDS[currency] || currency;
  return `${capitalised} de ${currencyWords} (${formatAmount(amount)} ${currency})`;
}

// ============================================================
// Contenu du QR Code
// ============================================================

export interface DocumentQrPayload {
  company: string;
  rccm: string;
  invoiceNumber: string;
  client: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
}

/**
 * Construit le contenu structuré (JSON) du QR Code. Toujours dérivé
 * des données courantes du document : il n'y a rien à invalider, le
 * QR est régénéré à chaque export et reflète donc automatiquement
 * toute modification.
 */
export function buildQrPayload(doc: {
  number: string;
  clientName?: string | null;
  createdAt: string | Date;
  total: number;
  currency?: string | null;
}): DocumentQrPayload {
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.toISOString().slice(0, 10)
      : String(doc.createdAt).slice(0, 10);

  return {
    company: COMPANY_INFO.name,
    rccm: COMPANY_INFO.rccm,
    invoiceNumber: doc.number,
    client: doc.clientName || "",
    createdAt,
    totalAmount: doc.total,
    currency: doc.currency || "FCFA",
  };
}

export function buildQrContent(doc: Parameters<typeof buildQrPayload>[0]): string {
  return JSON.stringify(buildQrPayload(doc));
}

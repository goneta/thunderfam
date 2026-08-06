import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { formatAmount } from "@shared/documents";
import { trpc } from "../lib/trpc";

// ============================================================
// Page « Factures ».
//
// Colonnes conformes au cahier des charges : n° de facture,
// n° du devis associé, date, client, montant, statut de paiement,
// PDF, créé par, actions.
//
// Le n° du devis est cliquable : il ramène au devis d'origine,
// dans les deux sens (le devis pointe aussi vers sa facture).
// ============================================================

const PAYMENT_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-700" },
  partial: { label: "Partiel", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Payée", className: "bg-green-100 text-green-800" },
  overdue: { label: "En retard", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-500" },
};

function frDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

/** Déclenche le téléchargement d'un fichier renvoyé en base64 par l'API. */
function downloadBase64(filename: string, base64: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Appelle une procédure tRPC de façon défensive.
 *
 * Le client tRPC de ce dépôt est un stub qui renvoie un Proxy pour
 * toute propriété inconnue : appeler `.fetch()` dessus lèverait une
 * TypeError. On vérifie donc que c'est bien une fonction et que le
 * résultat a la forme attendue avant de l'utiliser. Sous le vrai
 * backend, le comportement est inchangé.
 */
async function fetchDocument(
  procedure: unknown,
  input?: Record<string, unknown>
): Promise<{ filename: string; base64: string } | null> {
  if (typeof procedure !== "function") return null;
  try {
    const res = await (procedure as (i?: unknown) => Promise<unknown>)(input);
    if (
      res &&
      typeof res === "object" &&
      typeof (res as any).base64 === "string" &&
      typeof (res as any).filename === "string"
    ) {
      return res as { filename: string; base64: string };
    }
  } catch {
    /* backend indisponible : on ne casse pas la page */
  }
  return null;
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const query = trpc.invoices.list.useQuery({
    search: search || undefined,
    paymentStatus: (paymentStatus || undefined) as any,
    page,
    perPage,
  });

  const items: any[] = query.data?.items ?? [];
  const total: number = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.total || 0), 0),
    [items]
  );

  async function handlePdf(id: number) {
    const res = await fetchDocument((trpc as any).invoices?.pdf?.fetch, { id });
    if (res) downloadBase64(res.filename, res.base64, "application/pdf");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Factures</h1>
          <p className="text-sm text-gray-500">
            {total} facture{total > 1 ? "s" : ""} — {formatAmount(totalAmount)} FCFA sur cette page
          </p>
        </div>
        <Button variant="outline" onClick={async () => {
          const res = await fetchDocument((trpc as any).invoices?.exportExcel?.fetch);
          if (res) {
            downloadBase64(res.filename, res.base64,
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          }
        }}>
          Export Excel
        </Button>
      </header>

      {/* ---------- Filtres ---------- */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          placeholder="Rechercher (n° facture, client, objet)…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
        >
          <option value="">Tous statuts</option>
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ---------- Tableau ---------- */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <Th>N° de facture</Th>
              <Th>N° du devis</Th>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th className="text-right">Montant total</Th>
              <Th>Statut paiement</Th>
              <Th>PDF</Th>
              <Th>Créé par</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr><td colSpan={9} className="p-8 text-center text-gray-400">Chargement…</td></tr>
            )}
            {!query.isLoading && items.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-gray-400">Aucune facture</td></tr>
            )}
            {items.map((inv) => {
              const badge = PAYMENT_LABELS[inv.paymentStatus] ?? PAYMENT_LABELS.pending;
              return (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-navy">{inv.invoiceNumber}</td>
                  <td className="px-3 py-2">
                    {inv.quoteNumber ? (
                      <a href={`/devis/${inv.quoteId}`} className="text-blue-600 hover:underline">
                        {inv.quoteNumber}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">{frDate(inv.createdAt)}</td>
                  <td className="px-3 py-2">{inv.clientName || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatAmount(Number(inv.total))} {inv.currency}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => handlePdf(inv.id)} className="text-blue-600 hover:underline" title="Télécharger le PDF">
                      PDF
                    </button>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{inv.createdByName || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <a href={`/factures/${inv.id}`} className="text-gray-600 hover:text-navy" title="Voir">Voir</a>
                      <button onClick={() => handlePdf(inv.id)} className="text-gray-600 hover:text-navy" title="Télécharger">↓</button>
                      <a href={`/factures/${inv.id}?envoyer=1`} className="text-gray-600 hover:text-navy" title="Envoyer par e-mail">✉</a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- Pagination ---------- */}
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-gray-600">Page {page} / {pageCount}</span>
          <Button variant="ghost" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

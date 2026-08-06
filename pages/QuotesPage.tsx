import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { formatAmount } from "@shared/documents";
import { trpc } from "../lib/trpc";

// ============================================================
// Page « Gestion des devis ».
//
// Recherche, filtres, tri, pagination, exports et actions.
// Le lien vers la facture générée apparaît dès qu'un devis est
// payé, pour naviguer devis <-> facture dans les deux sens.
// ============================================================

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Envoyé", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepté", className: "bg-green-100 text-green-800" },
  rejected: { label: "Refusé", className: "bg-red-100 text-red-800" },
  expired: { label: "Expiré", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Payé", className: "bg-emerald-100 text-emerald-800" },
};

function frDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

function downloadBase64(filename: string, base64: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Voir la note dans InvoicesPage : le client tRPC de ce dépôt est un stub. */
async function fetchDocument(
  procedure: unknown,
  input?: Record<string, unknown>
): Promise<{ filename: string; base64: string } | null> {
  if (typeof procedure !== "function") return null;
  try {
    const res = await (procedure as (i?: unknown) => Promise<unknown>)(input);
    if (
      res && typeof res === "object" &&
      typeof (res as any).base64 === "string" &&
      typeof (res as any).filename === "string"
    ) {
      return res as { filename: string; base64: string };
    }
  } catch {
    /* backend indisponible */
  }
  return null;
}

export default function QuotesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const query = trpc.quotes.list.useQuery({
    search: search || undefined,
    status: (status || undefined) as any,
    page,
    perPage,
  });

  const items: any[] = query.data?.items ?? [];
  const total: number = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const pageTotal = useMemo(
    () => items.reduce((s, q) => s + Number(q.total || 0), 0),
    [items]
  );

  async function handleExport(kind: "pdf" | "word", id: number) {
    const proc = kind === "pdf" ? (trpc as any).quotes?.pdf?.fetch : (trpc as any).quotes?.word?.fetch;
    const res = await fetchDocument(proc, { id });
    if (res) {
      downloadBase64(
        res.filename,
        res.base64,
        kind === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Gestion des devis</h1>
          <p className="text-sm text-gray-500">
            {total} devis — {formatAmount(pageTotal)} FCFA sur cette page
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => {
            const res = await fetchDocument((trpc as any).quotes?.exportExcel?.fetch);
            if (res) downloadBase64(res.filename, res.base64,
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          }}>
            Export Excel
          </Button>
          <a href="/devis/nouveau"><Button>+ Nouveau devis</Button></a>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none"
          placeholder="Rechercher (n° devis, client, objet)…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <Th>N° du devis</Th>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th>Objet</Th>
              <Th className="text-right">Montant total</Th>
              <Th>Statut</Th>
              <Th>Facture</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Chargement…</td></tr>
            )}
            {!query.isLoading && items.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Aucun devis</td></tr>
            )}
            {items.map((q) => {
              const badge = STATUS_LABELS[q.status] ?? STATUS_LABELS.draft;
              return (
                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-navy">{q.quoteNumber}</td>
                  <td className="px-3 py-2">{frDate(q.createdAt)}</td>
                  <td className="px-3 py-2">{q.clientName || "—"}</td>
                  <td className="px-3 py-2">{(q.title || "—").slice(0, 40)}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatAmount(Number(q.total))} {q.currency}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {q.generatedInvoiceId ? (
                      <a href={`/factures/${q.generatedInvoiceId}`} className="text-blue-600 hover:underline">
                        Voir la facture
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <a href={`/devis/${q.id}`} className="text-gray-600 hover:text-navy">Modifier</a>
                      <button onClick={() => handleExport("pdf", q.id)} className="text-gray-600 hover:text-navy">PDF</button>
                      <button onClick={() => handleExport("word", q.id)} className="text-gray-600 hover:text-navy">Word</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

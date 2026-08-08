import { useParams } from "wouter";
import { Button } from "../components/ui/button";
import { formatAmount } from "@shared/documents";
import { trpc } from "../lib/trpc";

// ============================================================
// Vue d'un devis en lecture seule, destinée aux clients (rôle
// « user »), qui disposent de quotes:read mais pas de quotes:update.
//
// Leur montrer l'éditeur serait trompeur : ils pourraient saisir des
// modifications que le serveur refuserait ensuite. Cette vue expose
// exactement ce qu'ils peuvent faire — consulter et télécharger.
//
// Le cloisonnement réel reste côté serveur : `assertCanAccessDocument`
// renvoie NOT_FOUND pour le devis d'un autre client.
// ============================================================

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-gray-100 text-gray-700" },
  sent: { label: "En attente de votre réponse", className: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepté", className: "bg-green-100 text-green-800" },
  rejected: { label: "Refusé", className: "bg-red-100 text-red-800" },
  expired: { label: "Expiré", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Payé", className: "bg-emerald-100 text-emerald-800" },
};

function frDate(v: any): string {
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

/** Le client tRPC de ce dépôt est un stub : on vérifie avant d'appeler. */
async function fetchDocument(procedure: unknown, input?: Record<string, unknown>) {
  if (typeof procedure !== "function") return null;
  try {
    const res = await (procedure as (i?: unknown) => Promise<unknown>)(input);
    if (
      res && typeof res === "object" &&
      typeof (res as any).base64 === "string" &&
      typeof (res as any).filename === "string"
    ) return res as { filename: string; base64: string };
  } catch { /* backend indisponible */ }
  return null;
}

export default function QuoteDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = trpc.quotes.byId.useQuery({ id });
  const quote: any = Array.isArray(query.data) ? null : query.data;

  if (!quote || !quote.quoteNumber) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-gray-500">
        {query.isLoading ? "Chargement…" : "Devis introuvable."}
      </div>
    );
  }

  const badge = STATUS_LABELS[quote.status] ?? STATUS_LABELS.draft;
  const items: any[] = Array.isArray(quote.items) ? quote.items : [];

  async function downloadPdf() {
    const res = await fetchDocument((trpc as any).quotes?.pdf?.fetch, { id });
    if (res) downloadBase64(res.filename, res.base64, "application/pdf");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-navy">{quote.quoteNumber}</h1>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          {quote.title && <p className="mt-1 text-sm text-gray-600">{quote.title}</p>}
          {quote.linkedInvoice && (
            <p className="mt-1 text-sm text-gray-500">
              Facturé sous{" "}
              <a href={`/factures/${quote.linkedInvoice.id}`} className="text-blue-600 hover:underline">
                {quote.linkedInvoice.invoiceNumber}
              </a>
            </p>
          )}
        </div>
        <Button variant="outline" onClick={downloadPdf}>Télécharger le PDF</Button>
      </header>

      <section className="mb-6 grid gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-2">
        <div>
          <Label>Émis par</Label>
          <p className="font-semibold text-navy">Thunderfam Group Limited Côte d'Ivoire</p>
          <p className="text-sm text-gray-600">RCCM : CI-ABJ-03-2024-B22-00006</p>
        </div>
        <div className="space-y-1 text-sm">
          <Row label="Date d'émission" value={frDate(quote.createdAt)} />
          <Row label="Valable jusqu'au" value={frDate(quote.validUntil)} />
          {quote.clientName && <Row label="Établi pour" value={quote.clientName} />}
        </div>
      </section>

      <section className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <Th>Désignation</Th>
              <Th className="text-right">Qté</Th>
              <Th>Unité</Th>
              <Th className="text-right">Prix unitaire</Th>
              <Th className="text-right">Montant HT</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2 text-right">{it.qty}</td>
                <td className="px-3 py-2">{it.unit}</td>
                <td className="px-3 py-2 text-right">{formatAmount(Number(it.unitPrice))}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {formatAmount(Number(it.total ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-200 p-4">
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <Row label="Sous-total HT" value={`${formatAmount(Number(quote.subtotal || 0))} ${quote.currency}`} />
            {Number(quote.discountTotal) > 0 && (
              <Row label="Remises" value={`${formatAmount(Number(quote.discountTotal))} ${quote.currency}`} />
            )}
            <Row label="TVA" value={`${formatAmount(Number(quote.tax || 0))} ${quote.currency}`} />
            <div className="mt-2 flex items-center justify-between rounded-lg bg-gold px-4 py-2 font-bold text-navy">
              <span>TOTAL</span>
              <span>{formatAmount(Number(quote.total || 0))} {quote.currency}</span>
            </div>
          </div>
          {quote.amountInWords && (
            <p className="mt-3 text-right text-xs italic text-gray-500">{quote.amountInWords}</p>
          )}
        </div>
      </section>

      {quote.notes && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <Label>Remarques</Label>
          <p className="whitespace-pre-line text-sm text-gray-700">{quote.notes}</p>
        </section>
      )}

      <p className="text-center text-xs text-gray-500">
        Pour toute question sur ce devis, contactez-nous au +225 05 00 78 23 04.
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-navy">{value}</span>
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

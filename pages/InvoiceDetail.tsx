import { useState } from "react";
import { useParams } from "wouter";
import { Button } from "../components/ui/button";
import { formatAmount } from "@shared/documents";
import { trpc } from "../lib/trpc";

// ============================================================
// Détail d'une facture : consultation, téléchargement, envoi par
// e-mail et enregistrement d'un règlement (paiements partiels
// compris).
// ============================================================

const PAYMENT_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-gray-100 text-gray-700" },
  partial: { label: "Partiel", className: "bg-amber-100 text-amber-800" },
  paid: { label: "Payée", className: "bg-green-100 text-green-800" },
  overdue: { label: "En retard", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-500" },
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

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const query = trpc.invoices.byId.useQuery({ id });
  const invoice: any = Array.isArray(query.data) ? null : query.data;

  const [emailTo, setEmailTo] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [includeWord, setIncludeWord] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const sendM = trpc.invoices.sendByEmail.useMutation();
  const payM = trpc.invoices.recordPayment.useMutation();

  async function download(kind: "pdf" | "word") {
    const proc = kind === "pdf" ? (trpc as any).invoices?.pdf?.fetch : (trpc as any).invoices?.word?.fetch;
    const res = await fetchDocument(proc, { id });
    if (res) {
      downloadBase64(res.filename, res.base64,
        kind === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await sendM.mutateAsync({ id, to: emailTo, message: emailMsg || undefined, includeWord });
      setFeedback({ type: "ok", text: `Facture envoyée à ${emailTo}.` });
      setEmailTo("");
      setEmailMsg("");
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Échec de l'envoi." });
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      const res: any = await payM.mutateAsync({ id, amount: Number(paymentAmount) });
      setFeedback({
        type: "ok",
        text: res?.remaining
          ? `Règlement enregistré. Reste dû : ${formatAmount(res.remaining)}.`
          : "Règlement enregistré. Facture soldée.",
      });
      setPaymentAmount("");
      query.refetch?.();
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Échec de l'enregistrement." });
    }
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-gray-500">
        {query.isLoading ? "Chargement…" : "Facture introuvable."}
      </div>
    );
  }

  const badge = PAYMENT_LABELS[invoice.paymentStatus] ?? PAYMENT_LABELS.pending;
  const items: any[] = Array.isArray(invoice.items) ? invoice.items : [];
  const remaining = Number(invoice.total || 0) - Number(invoice.amountPaid || 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-navy">{invoice.invoiceNumber}</h1>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          {invoice.quoteNumber && (
            <p className="mt-1 text-sm text-gray-500">
              Issue du devis{" "}
              <a href={`/devis/${invoice.quoteId}`} className="text-blue-600 hover:underline">
                {invoice.quoteNumber}
              </a>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download("pdf")}>PDF</Button>
          <Button variant="outline" onClick={() => download("word")}>Word</Button>
          <a href="/factures"><Button variant="ghost">← Factures</Button></a>
        </div>
      </header>

      <section className="mb-6 grid gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-2">
        <div>
          <Label>Client</Label>
          <p className="font-semibold text-navy">{invoice.clientName || "—"}</p>
          <p className="whitespace-pre-line text-sm text-gray-600">{invoice.clientAddress || ""}</p>
        </div>
        <div className="space-y-1 text-sm">
          <Row label="Date d'émission" value={frDate(invoice.createdAt)} />
          <Row label="Échéance" value={frDate(invoice.dueDate)} />
          <Row label="Objet" value={invoice.title || "—"} />
          <Row
            label="Réglé"
            value={`${formatAmount(Number(invoice.amountPaid || 0))} / ${formatAmount(Number(invoice.total || 0))} ${invoice.currency}`}
          />
          {remaining > 0 && (
            <Row label="Reste dû" value={`${formatAmount(remaining)} ${invoice.currency}`} />
          )}
        </div>
      </section>

      <section className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-navy text-white">
              <Th>Désignation</Th>
              <Th className="text-right">Qté</Th>
              <Th>Unité</Th>
              <Th className="text-right">P.U.</Th>
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
        <div className="border-t border-gray-200 p-4 text-right">
          <div className="inline-block rounded-lg bg-gold px-4 py-2 font-bold text-navy">
            TOTAL : {formatAmount(Number(invoice.total || 0))} {invoice.currency}
          </div>
          {invoice.amountInWords && (
            <p className="mt-2 text-xs italic text-gray-500">{invoice.amountInWords}</p>
          )}
        </div>
      </section>

      {feedback && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            feedback.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-bold text-navy">Envoyer par e-mail</h2>
          <form onSubmit={send} className="space-y-3">
            <input
              className={inputClass}
              type="email"
              placeholder="destinataire@exemple.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              required
            />
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Message (facultatif)"
              value={emailMsg}
              onChange={(e) => setEmailMsg(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={includeWord}
                onChange={(e) => setIncludeWord(e.target.checked)}
              />
              Joindre également la version Word
            </label>
            <Button type="submit" className="w-full">Envoyer</Button>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-bold text-navy">Enregistrer un règlement</h2>
          <form onSubmit={recordPayment} className="space-y-3">
            <input
              className={inputClass}
              type="number"
              min={0}
              step="any"
              placeholder={`Montant en ${invoice.currency}`}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              Les règlements partiels sont acceptés : le statut passe à « Partiel »
              tant que le total n'est pas atteint.
            </p>
            <Button type="submit" variant="outline" className="w-full">
              Enregistrer
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none";

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

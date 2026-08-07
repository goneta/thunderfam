import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { Button } from "../components/ui/button";
import { SignaturePad } from "../components/SignaturePad";
import { computeTotals, formatAmount, type DocumentLineItem } from "@shared/documents";
import { trpc } from "../lib/trpc";

// ============================================================
// Éditeur de devis — création et modification.
//
// Les totaux affichés sont calculés avec computeTotals(), la même
// fonction que le serveur : l'aperçu ne peut pas diverger de ce qui
// sera enregistré. Le serveur recalcule néanmoins tout avant
// écriture — l'affichage n'est jamais une source de vérité.
// ============================================================

interface EditableLine extends DocumentLineItem {
  uid: string;
}

const newUid = () => Math.random().toString(36).slice(2, 10);

function emptyLine(position: number): EditableLine {
  return {
    uid: newUid(), position, name: "", description: "",
    qty: 1, unit: "unité", unitPrice: 0, discountPct: 0, taxPct: 0,
  };
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

export default function QuoteEditor() {
  const params = useParams<{ id?: string }>();
  const quoteId = params.id && /^\d+$/.test(params.id) ? Number(params.id) : null;

  const [lines, setLines] = useState<EditableLine[]>([emptyLine(0)]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("FCFA");
  const [notes, setNotes] = useState("");
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [managerSignature, setManagerSignature] = useState<string | null>(null);

  const [loadedNumber, setLoadedNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [linkedInvoice, setLinkedInvoice] = useState<{ id: number; invoiceNumber: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const existing = trpc.quotes.byId.useQuery({ id: quoteId ?? 0 });

  const createM = trpc.quotes.create.useMutation();
  const updateM = trpc.quotes.update.useMutation();
  const signM = trpc.quotes.sign.useMutation();
  const sendM = trpc.quotes.sendByEmail.useMutation();
  const invoiceM = trpc.quotes.markPaidAndInvoice.useMutation();

  // Hydrate le formulaire quand un devis existant est chargé.
  useEffect(() => {
    if (quoteId === null) return;
    const data: any = Array.isArray(existing.data) ? null : existing.data;
    if (!data || !data.quoteNumber) return;

    setLoadedNumber(data.quoteNumber);
    setStatus(data.status ?? "draft");
    setTitle(data.title ?? "");
    setClientName(data.clientName ?? "");
    setClientAddress(data.clientAddress ?? "");
    setClientEmail(data.clientEmail ?? "");
    setCurrency(data.currency ?? "FCFA");
    setNotes(data.notes ?? "");
    setClientSignature(data.clientSignature ?? null);
    setManagerSignature(data.managerSignature ?? null);
    setLinkedInvoice(data.linkedInvoice ?? null);

    const items: any[] = Array.isArray(data.items) ? data.items : [];
    setLines(
      items.length
        ? items.map((it, i) => ({
            uid: newUid(),
            position: Number(it.position ?? i),
            name: it.name ?? "",
            description: it.description ?? "",
            qty: Number(it.qty ?? 0),
            unit: it.unit ?? "unité",
            unitPrice: Number(it.unitPrice ?? 0),
            discountPct: Number(it.discountPct ?? 0),
            taxPct: Number(it.taxPct ?? 0),
          }))
        : [emptyLine(0)]
    );
  }, [existing.data, quoteId]);

  const totals = useMemo(() => computeTotals(lines, currency), [lines, currency]);

  // Un devis facturé ne doit plus être modifiable : la facture émise
  // ne correspondrait plus au devis accepté.
  const locked = status === "paid";

  function updateLine(uid: string, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine(prev.length)]);
  }
  function removeLine(uid: string) {
    setLines((prev) => prev.filter((l) => l.uid !== uid).map((l, i) => ({ ...l, position: i })));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null); setOverIndex(null); return;
    }
    setLines((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((l, i) => ({ ...l, position: i }));
    });
    setDragIndex(null);
    setOverIndex(null);
  }

  function payload() {
    return {
      title: title || "Devis",
      clientName, clientAddress, clientEmail: clientEmail || null,
      currency, notes: notes || null,
      items: lines.map((l, i) => ({
        position: i, name: l.name, description: l.description || null,
        qty: l.qty, unit: l.unit, unitPrice: l.unitPrice,
        discountPct: l.discountPct, taxPct: l.taxPct,
      })),
    };
  }

  async function save() {
    setBusy(true); setFeedback(null);
    try {
      if (quoteId) {
        await updateM.mutateAsync({ id: quoteId, ...payload() });
        setFeedback({ type: "ok", text: "Devis enregistré." });
      } else {
        const res: any = await createM.mutateAsync(payload());
        setFeedback({ type: "ok", text: `Devis ${res?.quoteNumber ?? ""} créé.` });
        if (res?.id) window.location.href = `/devis/${res.id}`;
      }
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Échec de l'enregistrement." });
    } finally { setBusy(false); }
  }

  async function saveSignatures() {
    if (!quoteId) { setFeedback({ type: "err", text: "Enregistrez d'abord le devis." }); return; }
    setBusy(true);
    try {
      await signM.mutateAsync({ id: quoteId, clientSignature, managerSignature });
      setFeedback({ type: "ok", text: "Signatures enregistrées." });
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Échec." });
    } finally { setBusy(false); }
  }

  async function download(kind: "pdf" | "word") {
    if (!quoteId) { setFeedback({ type: "err", text: "Enregistrez d'abord le devis." }); return; }
    const proc = kind === "pdf" ? (trpc as any).quotes?.pdf?.fetch : (trpc as any).quotes?.word?.fetch;
    const res = await fetchDocument(proc, { id: quoteId });
    if (res) {
      downloadBase64(res.filename, res.base64,
        kind === "pdf" ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }
  }

  async function sendEmail() {
    if (!quoteId) { setFeedback({ type: "err", text: "Enregistrez d'abord le devis." }); return; }
    const to = clientEmail || window.prompt("Adresse du destinataire ?") || "";
    if (!to) return;
    setBusy(true);
    try {
      await sendM.mutateAsync({ id: quoteId, to, includeWord: false });
      setFeedback({ type: "ok", text: `Devis envoyé à ${to}.` });
      setStatus("sent");
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Échec de l'envoi." });
    } finally { setBusy(false); }
  }

  async function convertToInvoice() {
    if (!quoteId) return;
    if (!window.confirm(
      "Confirmer le paiement de ce devis ?\n\nUne facture sera générée automatiquement et le devis ne sera plus modifiable."
    )) return;
    setBusy(true);
    try {
      const res: any = await invoiceM.mutateAsync({ id: quoteId, dueDays: 30 });
      setFeedback({
        type: "ok",
        text: res?.alreadyExisted
          ? `Facture déjà existante : ${res.invoiceNumber}.`
          : `Facture ${res?.invoiceNumber ?? ""} générée.`,
      });
      if (res?.invoiceId) setLinkedInvoice({ id: res.invoiceId, invoiceNumber: res.invoiceNumber });
      setStatus("paid");
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Échec de la conversion." });
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{loadedNumber ?? "Nouveau devis"}</h1>
          {linkedInvoice && (
            <p className="mt-1 text-sm text-gray-500">
              Facturé sous{" "}
              <a href={`/factures/${linkedInvoice.id}`} className="text-blue-600 hover:underline">
                {linkedInvoice.invoiceNumber}
              </a>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={busy || locked}>Enregistrer</Button>
          <Button variant="outline" onClick={() => download("pdf")}>PDF</Button>
          <Button variant="outline" onClick={() => download("word")}>Word</Button>
          <Button variant="outline" onClick={sendEmail} disabled={busy}>Envoyer</Button>
          {quoteId && !linkedInvoice && (
            <Button variant="outline" onClick={convertToInvoice} disabled={busy}>
              Marquer payé → facture
            </Button>
          )}
          <a href="/devis"><Button variant="ghost">← Devis</Button></a>
        </div>
      </header>

      {locked && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ce devis a été facturé : il n'est plus modifiable, afin que la facture
          émise corresponde toujours au devis accepté.
        </div>
      )}
      {feedback && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${
          feedback.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        }`}>
          {feedback.text}
        </div>
      )}

      <section className="mb-6 grid gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Client">
            <input className={inputClass} value={clientName} disabled={locked}
              onChange={(e) => setClientName(e.target.value)} placeholder="Nom du client" />
          </Field>
          <Field label="Adresse">
            <textarea className={inputClass} rows={2} value={clientAddress} disabled={locked}
              onChange={(e) => setClientAddress(e.target.value)} />
          </Field>
          <Field label="E-mail du client">
            <input className={inputClass} type="email" value={clientEmail} disabled={locked}
              onChange={(e) => setClientEmail(e.target.value)} placeholder="client@exemple.com" />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="Objet du devis">
            <input className={inputClass} value={title} disabled={locked}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Transport de marchandises Abidjan — Bamako" />
          </Field>
          <Field label="Devise">
            <select className={inputClass} value={currency} disabled={locked}
              onChange={(e) => setCurrency(e.target.value)}>
              <option value="FCFA">FCFA</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea className={inputClass} rows={2} value={notes} disabled={locked}
              onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-navy">Prestations</h2>
          <Button size="sm" onClick={addLine} type="button" disabled={locked}>+ Ajouter une ligne</Button>
        </div>
        <p className="mb-2 text-xs text-gray-500">Glissez la poignée ⠿ pour réorganiser les lignes.</p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <Th className="w-8" /><Th>Désignation</Th>
                <Th className="w-24 text-right">Qté</Th><Th className="w-24">Unité</Th>
                <Th className="w-32 text-right">P.U.</Th><Th className="w-24 text-right">Remise %</Th>
                <Th className="w-24 text-right">TVA %</Th><Th className="w-36 text-right">Montant HT</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.uid}
                  onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
                  onDrop={() => handleDrop(index)}
                  className={`border-b border-gray-100 ${
                    overIndex === index && dragIndex !== null && dragIndex !== index
                      ? "bg-gold/20" : index % 2 ? "bg-gray-50" : ""
                  }`}>
                  <td draggable={!locked} onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                    className="cursor-grab select-none px-2 text-center text-gray-400 active:cursor-grabbing"
                    title="Glisser pour réordonner">⠿</td>
                  <td className="p-1">
                    <input className={cellClass} value={line.name} disabled={locked}
                      onChange={(e) => updateLine(line.uid, { name: e.target.value })} placeholder="Désignation" />
                  </td>
                  <td className="p-1">
                    <input type="number" min={0} step="any" className={`${cellClass} text-right`} disabled={locked}
                      value={line.qty} onChange={(e) => updateLine(line.uid, { qty: Number(e.target.value) })} />
                  </td>
                  <td className="p-1">
                    <input className={cellClass} value={line.unit} disabled={locked}
                      onChange={(e) => updateLine(line.uid, { unit: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min={0} step="any" className={`${cellClass} text-right`} disabled={locked}
                      value={line.unitPrice} onChange={(e) => updateLine(line.uid, { unitPrice: Number(e.target.value) })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min={0} max={100} step="any" className={`${cellClass} text-right`} disabled={locked}
                      value={line.discountPct} onChange={(e) => updateLine(line.uid, { discountPct: Number(e.target.value) })} />
                  </td>
                  <td className="p-1">
                    <input type="number" min={0} max={100} step="any" className={`${cellClass} text-right`} disabled={locked}
                      value={line.taxPct} onChange={(e) => updateLine(line.uid, { taxPct: Number(e.target.value) })} />
                  </td>
                  <td className="px-2 text-right font-semibold text-navy">
                    {formatAmount(totals.lines[index]?.total ?? 0)}
                  </td>
                  <td className="px-1 text-center">
                    <button type="button" onClick={() => removeLine(line.uid)}
                      className="text-red-500 hover:text-red-700" title="Supprimer la ligne"
                      disabled={lines.length === 1 || locked}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
          <TotalRow label="Sous-total HT" value={`${formatAmount(totals.subtotal)} ${currency}`} />
          <TotalRow label="Total remises" value={`${formatAmount(totals.discountTotal)} ${currency}`} />
          <TotalRow label="Total TVA" value={`${formatAmount(totals.taxTotal)} ${currency}`} />
          <div className="mt-2 flex items-center justify-between rounded-lg bg-gold px-4 py-3 font-bold text-navy">
            <span>TOTAL GÉNÉRAL</span>
            <span>{formatAmount(totals.total)} {currency}</span>
          </div>
          {totals.total > 0 && (
            <p className="pt-2 text-right text-xs italic text-gray-500">
              Montant en lettres : {totals.amountInWords}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-navy">Signatures</h2>
          <Button size="sm" variant="outline" type="button" onClick={saveSignatures} disabled={busy}>
            Enregistrer les signatures
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <SignaturePad label="Signature du client" value={clientSignature} onChange={setClientSignature} />
          <SignaturePad label="Signature du responsable" value={managerSignature} onChange={setManagerSignature} />
        </div>
      </section>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none";
const cellClass = "w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gold focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide ${className}`}>{children}</th>;
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { SignaturePad } from "../components/SignaturePad";
import {
  computeTotals,
  formatAmount,
  type DocumentLineItem,
} from "@shared/documents";

// ============================================================
// Éditeur de devis.
//
// Les totaux affichés sont calculés localement avec computeTotals(),
// la même fonction que le serveur : l'aperçu est instantané et
// toujours cohérent avec ce qui sera enregistré. Le serveur
// recalcule néanmoins tout avant écriture — l'affichage n'est
// jamais une source de vérité.
// ============================================================

interface EditableLine extends DocumentLineItem {
  uid: string;
}

function newUid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyLine(position: number): EditableLine {
  return {
    uid: newUid(),
    position,
    name: "",
    description: "",
    qty: 1,
    unit: "unité",
    unitPrice: 0,
    discountPct: 0,
    taxPct: 0,
  };
}

export default function QuoteEditor() {
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

  const totals = useMemo(() => computeTotals(lines, currency), [lines, currency]);

  function updateLine(uid: string, patch: Partial<EditableLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(prev.length)]);
  }

  function removeLine(uid: string) {
    setLines((prev) =>
      prev.filter((l) => l.uid !== uid).map((l, i) => ({ ...l, position: i }))
    );
  }

  // ---- Glisser-déposer : réordonne puis réindexe les positions ----
  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">Nouveau devis</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">Enregistrer</Button>
          <Button variant="outline">PDF</Button>
          <Button variant="outline">Word</Button>
          <Button>Envoyer par e-mail</Button>
        </div>
      </header>

      {/* ---------- Client & métadonnées ---------- */}
      <section className="mb-6 grid gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Client">
            <input
              className={inputClass}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom du client"
            />
          </Field>
          <Field label="Adresse">
            <textarea
              className={inputClass}
              rows={2}
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
            />
          </Field>
          <Field label="E-mail du client">
            <input
              className={inputClass}
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@exemple.com"
            />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="Objet du devis">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Transport de marchandises Abidjan — Bamako"
            />
          </Field>
          <Field label="Devise">
            <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="FCFA">FCFA</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </section>

      {/* ---------- Lignes de prestation ---------- */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-navy">Prestations</h2>
          <Button size="sm" onClick={addLine}>+ Ajouter une ligne</Button>
        </div>

        <p className="mb-2 text-xs text-gray-500">
          Glissez la poignée ⠿ pour réorganiser les lignes.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <Th className="w-8" />
                <Th>Désignation</Th>
                <Th className="w-24 text-right">Qté</Th>
                <Th className="w-24">Unité</Th>
                <Th className="w-32 text-right">P.U.</Th>
                <Th className="w-24 text-right">Remise %</Th>
                <Th className="w-24 text-right">TVA %</Th>
                <Th className="w-36 text-right">Montant HT</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr
                  key={line.uid}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={() => handleDrop(index)}
                  className={`border-b border-gray-100 ${
                    overIndex === index && dragIndex !== null && dragIndex !== index
                      ? "bg-gold/20"
                      : index % 2
                      ? "bg-gray-50"
                      : ""
                  }`}
                >
                  <td
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    className="cursor-grab select-none px-2 text-center text-gray-400 active:cursor-grabbing"
                    title="Glisser pour réordonner"
                  >
                    ⠿
                  </td>
                  <td className="p-1">
                    <input
                      className={cellClass}
                      value={line.name}
                      onChange={(e) => updateLine(line.uid, { name: e.target.value })}
                      placeholder="Désignation"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number" min={0} step="any"
                      className={`${cellClass} text-right`}
                      value={line.qty}
                      onChange={(e) => updateLine(line.uid, { qty: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      className={cellClass}
                      value={line.unit}
                      onChange={(e) => updateLine(line.uid, { unit: e.target.value })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number" min={0} step="any"
                      className={`${cellClass} text-right`}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.uid, { unitPrice: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number" min={0} max={100} step="any"
                      className={`${cellClass} text-right`}
                      value={line.discountPct}
                      onChange={(e) => updateLine(line.uid, { discountPct: Number(e.target.value) })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number" min={0} max={100} step="any"
                      className={`${cellClass} text-right`}
                      value={line.taxPct}
                      onChange={(e) => updateLine(line.uid, { taxPct: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 text-right font-semibold text-navy">
                    {formatAmount(totals.lines[index]?.total ?? 0)}
                  </td>
                  <td className="px-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.uid)}
                      className="text-red-500 hover:text-red-700"
                      title="Supprimer la ligne"
                      disabled={lines.length === 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---------- Totaux ---------- */}
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

      {/* ---------- Signatures ---------- */}
      <section className="grid gap-6 rounded-xl border border-gray-200 bg-white p-6 md:grid-cols-2">
        <SignaturePad label="Signature du client" value={clientSignature} onChange={setClientSignature} />
        <SignaturePad label="Signature du responsable" value={managerSignature} onChange={setManagerSignature} />
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none";
const cellClass =
  "w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gold focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>
  );
}

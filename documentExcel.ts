import ExcelJS from "exceljs";
import { formatAmount } from "@shared/documents";

// ============================================================
// Export Excel (.xlsx) des listes de documents commerciaux.
// Générique : la même fonction sert aux devis et aux factures,
// seules les colonnes changent.
// ============================================================

export interface ExportRow {
  number: string;
  relatedNumber?: string | null;
  date: string | Date;
  clientName?: string | null;
  title?: string | null;
  total: number;
  currency: string;
  status: string;
  paymentStatus?: string | null;
  createdBy?: string | null;
  updatedAt?: string | Date | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  paid: "Payé",
  cancelled: "Annulé",
  overdue: "En retard",
  pending: "En attente",
  partial: "Partiel",
};

export function statusLabel(status?: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] || status;
}

function toDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const iso = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export async function exportDocumentsToExcel(
  rows: ExportRow[],
  kind: "DEVIS" | "FACTURE"
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Thunderfam Group Limited Côte d'Ivoire";
  wb.created = new Date();

  const ws = wb.addWorksheet(kind === "FACTURE" ? "Factures" : "Devis", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const columns: Partial<ExcelJS.Column>[] =
    kind === "FACTURE"
      ? [
          { header: "N° de facture", key: "number", width: 24 },
          { header: "N° du devis", key: "relatedNumber", width: 24 },
          { header: "Date", key: "date", width: 13 },
          { header: "Client", key: "clientName", width: 32 },
          { header: "Objet", key: "title", width: 34 },
          { header: "Montant total", key: "total", width: 18 },
          { header: "Devise", key: "currency", width: 10 },
          { header: "Statut paiement", key: "paymentStatus", width: 18 },
          { header: "Créé par", key: "createdBy", width: 20 },
        ]
      : [
          { header: "N° du devis", key: "number", width: 24 },
          { header: "Date", key: "date", width: 13 },
          { header: "Client", key: "clientName", width: 32 },
          { header: "Objet", key: "title", width: 34 },
          { header: "Montant total", key: "total", width: 18 },
          { header: "Devise", key: "currency", width: 10 },
          { header: "Statut", key: "status", width: 15 },
          { header: "Modifié le", key: "updatedAt", width: 14 },
          { header: "Créé par", key: "createdBy", width: 20 },
        ];

  ws.columns = columns;

  // En-tête noir façon charte Thunderfam
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A0A0A" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  rows.forEach((r) => {
    ws.addRow({
      number: r.number,
      relatedNumber: r.relatedNumber || "—",
      date: toDate(r.date),
      clientName: r.clientName || "—",
      title: r.title || "—",
      total: Number(r.total) || 0,
      currency: r.currency,
      status: statusLabel(r.status),
      paymentStatus: statusLabel(r.paymentStatus),
      createdBy: r.createdBy || "—",
      updatedAt: toDate(r.updatedAt),
    });
  });

  // Montants en format numérique (triables et sommables dans Excel)
  const totalCol = ws.getColumn("total");
  totalCol.numFmt = "# ##0";
  totalCol.alignment = { horizontal: "right" };

  // Ligne de total général
  if (rows.length > 0) {
    const sum = rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
    const totalRow = ws.addRow({
      number: "TOTAL",
      total: sum,
      currency: rows[0].currency,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2B705" } };
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

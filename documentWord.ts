import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, BorderStyle, VerticalAlign, ImageRun,
} from "docx";
import { qrBuffer } from "./qrService";
import { COMPANY_INFO, formatAmount } from "@shared/documents";
import type { CommercialDocument } from "./documentPdf";

// ============================================================
// Générateur Word (.docx) — même contenu et même structure que
// le PDF, pour que les deux versions restent cohérentes.
// Réutilise le type CommercialDocument du générateur PDF : une
// seule forme de données pour tous les formats d'export.
// ============================================================

const DARK = "111111";
const GOLD = "F2B705";
const GREY = "555555";
const LIGHT = "F4F4F4";
const WHITE = "FFFFFF";
const BLACK = "0A0A0A";

const CONTENT_WIDTH = 10500;
type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

function noBorders() {
  const b = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: b, bottom: b, left: b, right: b };
}

function frDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const iso = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function decodeImage(b64?: string | null): Buffer | null {
  if (!b64) return null;
  try {
    const buf = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

export async function generateDocumentWord(doc: CommercialDocument): Promise<Buffer> {
  const qr = await qrBuffer({
    number: doc.number,
    clientName: doc.clientName,
    createdAt: doc.date,
    total: doc.total,
    currency: doc.currency,
  });

  const p = (text: string, opts: any = {}) =>
    new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: opts.spacing });

  // ---------- Titre ----------
  const title = new Paragraph({
    children: [new TextRun({ text: doc.kind, bold: true, size: 40, color: DARK })],
    spacing: { before: 200, after: 60 },
  });

  const subtitleParts: string[] = [];
  if (doc.title) subtitleParts.push(doc.title);
  if (doc.routeFrom && doc.routeTo) subtitleParts.push(`${doc.routeFrom} → ${doc.routeTo}`);
  const subtitle = new Paragraph({
    children: [new TextRun({ text: subtitleParts.join(" — "), size: 19, color: DARK })],
    spacing: { after: 200 },
  });

  // ---------- Client / méta avec QR ----------
  const clientCell = [
    p("CLIENT", { bold: true, size: 15, color: GREY }),
    p(doc.clientName || "—", { bold: true, size: 19, color: DARK }),
    p(doc.clientAddress || "", { size: 17, color: DARK }),
  ];

  const metaRow = (label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 2100, type: WidthType.DXA }, borders: noBorders(),
          children: [p(label, { bold: true, size: 15, color: GREY })],
        }),
        new TableCell({
          width: { size: 3500, type: WidthType.DXA }, borders: noBorders(),
          children: [p(value, { size: 17, color: DARK })],
        }),
      ],
    });

  // QR Code placé juste AU-DESSUS du numéro de document
  const qrRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2, width: { size: 5600, type: WidthType.DXA },
        borders: noBorders(), margins: { bottom: 80 },
        children: [
          new Paragraph({ children: [new ImageRun({ type: "png", data: qr, transformation: { width: 58, height: 58 } })] }),
          p("Scanner pour vérifier", { size: 11, color: GREY }),
        ],
      }),
    ],
  });

  const metaRows = [qrRow];
  metaRows.push(metaRow(doc.kind === "FACTURE" ? "N° de facture" : "N° du devis", doc.number));
  if (doc.kind === "FACTURE" && doc.relatedNumber) metaRows.push(metaRow("Devis associé", doc.relatedNumber));
  metaRows.push(metaRow("Date d'émission", frDate(doc.date)));
  if (doc.kind === "DEVIS") {
    metaRows.push(metaRow("Validité", `${doc.validityDays ?? 30} jours`));
    metaRows.push(metaRow("Délai d'exécution", doc.executionDelay || "À convenir"));
  } else if (doc.dueDate) {
    metaRows.push(metaRow("Échéance", frDate(doc.dueDate)));
  }

  const metaTable = new Table({
    width: { size: 5600, type: WidthType.DXA },
    columnWidths: [2100, 3500], borders: noBorders(), rows: metaRows,
  });

  const topBlock = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [4900, 5600], borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 4900, type: WidthType.DXA }, borders: noBorders(), children: clientCell }),
          new TableCell({ width: { size: 5600, type: WidthType.DXA }, borders: noBorders(), children: [metaTable] }),
        ],
      }),
    ],
  });

  // ---------- Tableau des prestations ----------
  const colW = [3300, 1100, 1200, 1700, 1200, 2000];
  const th = (t: string, w: number, align: Align = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: BLACK, color: "auto" },
      verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [new Paragraph({ alignment: align, children: [new TextRun({ text: t, bold: true, size: 16, color: WHITE })] })],
    });
  const td = (t: string, w: number, align: Align = AlignmentType.LEFT, fill = WHITE) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: "auto" },
      verticalAlign: VerticalAlign.CENTER, margins: { top: 70, bottom: 70, left: 80, right: 80 },
      children: [new Paragraph({ alignment: align, children: [new TextRun({ text: t, size: 16, color: DARK })] })],
    });

  const mainTable = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colW,
    rows: [
      new TableRow({
        children: [
          th("Désignation", colW[0]), th("Qté", colW[1], AlignmentType.RIGHT),
          th("Unité", colW[2]), th("P.U.", colW[3], AlignmentType.RIGHT),
          th("Remise", colW[4], AlignmentType.RIGHT), th("Montant HT", colW[5], AlignmentType.RIGHT),
        ],
      }),
      ...doc.items.map((item, i) => {
        const fill = i % 2 ? LIGHT : WHITE;
        return new TableRow({
          children: [
            td(item.name, colW[0], AlignmentType.LEFT, fill),
            td(String(item.qty), colW[1], AlignmentType.RIGHT, fill),
            td(item.unit || "", colW[2], AlignmentType.LEFT, fill),
            td(formatAmount(item.unitPrice), colW[3], AlignmentType.RIGHT, fill),
            td(item.discountPct ? `${item.discountPct}%` : "—", colW[4], AlignmentType.RIGHT, fill),
            td(formatAmount(item.total ?? 0), colW[5], AlignmentType.RIGHT, fill),
          ],
        });
      }),
    ],
  });

  // ---------- Totaux ----------
  const totalRow = (label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 2600, type: WidthType.DXA }, borders: noBorders(), children: [p(label, { size: 17, color: DARK })] }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA }, borders: noBorders(),
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, size: 17, color: DARK })] })],
        }),
      ],
    });

  const totalsTable = new Table({
    width: { size: 4800, type: WidthType.DXA }, columnWidths: [2600, 2200], borders: noBorders(),
    rows: [
      totalRow("Sous-total HT", `${formatAmount(doc.subtotal)} ${doc.currency}`),
      totalRow("Total remises", `${formatAmount(doc.discountTotal)} ${doc.currency}`),
      totalRow("Total TVA", `${formatAmount(doc.taxTotal)} ${doc.currency}`),
    ],
  });

  const grandTotal = new Table({
    width: { size: 4800, type: WidthType.DXA }, columnWidths: [2600, 2200], borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2600, type: WidthType.DXA }, borders: noBorders(),
            shading: { type: ShadingType.CLEAR, fill: GOLD, color: "auto" },
            margins: { top: 90, bottom: 90, left: 120, right: 60 },
            children: [p("TOTAL GÉNÉRAL", { bold: true, size: 19, color: DARK })],
          }),
          new TableCell({
            width: { size: 2200, type: WidthType.DXA }, borders: noBorders(),
            shading: { type: ShadingType.CLEAR, fill: GOLD, color: "auto" },
            margins: { top: 90, bottom: 90, left: 60, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${formatAmount(doc.total)} ${doc.currency}`, bold: true, size: 19, color: DARK })] })],
          }),
        ],
      }),
    ],
  });

  // ---------- Conditions de paiement ----------
  const paymentBox = doc.paymentTerms
    ? new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: [CONTENT_WIDTH],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
          left: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
          right: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: LIGHT, color: "auto" },
                margins: { top: 150, bottom: 150, left: 150, right: 150 },
                children: [
                  p("CONDITIONS DE PAIEMENT", { bold: true, size: 21, color: DARK }),
                  ...doc.paymentTerms.split("\n").map((l) => p(l, { size: 16, color: DARK })),
                ],
              }),
            ],
          }),
        ],
      })
    : null;

  // ---------- Signatures ----------
  const clientSig = decodeImage(doc.clientSignature);
  const managerSig = decodeImage(doc.managerSignature);
  const stamp = decodeImage(doc.companyStamp);

  const sigCell = (label: string, sig: Buffer | null, line: string, extra?: Buffer | null) => {
    const children: Paragraph[] = [p(label, { bold: true, size: 15, color: GREY })];
    if (sig) {
      children.push(new Paragraph({ children: [new ImageRun({ type: "png", data: sig, transformation: { width: 120, height: 40 } })] }));
    } else {
      children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
    }
    children.push(p(line, { size: 17, color: DARK }));
    if (extra) {
      children.push(new Paragraph({ children: [new ImageRun({ type: "png", data: extra, transformation: { width: 70, height: 70 } })] }));
    }
    return new TableCell({ width: { size: 5250, type: WidthType.DXA }, borders: noBorders(), children });
  };

  const sigTable = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: [5250, 5250], borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          sigCell("Bon pour accord — Le Client", clientSig, "Signature : _______________________"),
          sigCell("Pour Thunderfam Group Limited Côte d'Ivoire", managerSig, "Signature du responsable : ______________", stamp),
        ],
      }),
    ],
  });

  const children: any[] = [title, subtitle, topBlock, new Paragraph({ spacing: { after: 200 }, children: [] }), mainTable,
    new Paragraph({ spacing: { after: 150 }, children: [] }), totalsTable,
    new Paragraph({ spacing: { after: 40 }, children: [] }), grandTotal];

  if (doc.amountInWords) {
    children.push(p(`Montant en lettres : ${doc.amountInWords}`, { italics: true, size: 14, color: GREY, spacing: { before: 150, after: 40 } }));
  }
  if (doc.notes) {
    children.push(p(doc.notes, { italics: true, size: 14, color: GREY, spacing: { after: 150 } }));
  }
  if (paymentBox) {
    children.push(paymentBox);
  }
  children.push(new Paragraph({ spacing: { after: 250 }, children: [] }), sigTable);
  children.push(
    p(
      doc.legalMentions || `${COMPANY_INFO.name} — RCCM ${COMPANY_INFO.rccm} — ${COMPANY_INFO.address}, ${COMPANY_INFO.addressLine2}`,
      { italics: true, size: 13, color: GREY, spacing: { before: 250 } }
    )
  );

  const document = new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 700, bottom: 700, left: 700, right: 700 } } },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

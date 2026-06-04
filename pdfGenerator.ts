import PDFDocument from 'pdfkit';

export interface QuoteData {
  quoteId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  date: Date;
  dueDate: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

export interface InvoiceData extends QuoteData {
  invoiceId: string;
  invoiceDate: Date;
  paymentMethod?: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
}

export async function generateQuotePDF(data: QuoteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text(data.companyName, { align: 'left' });
    doc.fontSize(10).font('Helvetica').text(data.companyAddress, { align: 'left' });
    doc.text(data.companyPhone, { align: 'left' });
    doc.text(data.companyEmail, { align: 'left' });

    // Title
    doc.moveDown(1);
    doc.fontSize(18).font('Helvetica-Bold').text('DEVIS', { align: 'center' });

    // Quote number and dates
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`N° Devis: ${data.quoteId}`, { align: 'right' });
    doc.text(`Date: ${data.date.toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.text(`Date limite: ${data.dueDate.toLocaleDateString('fr-FR')}`, { align: 'right' });

    // Client info
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Client:');
    doc.fontSize(10).font('Helvetica');
    doc.text(data.clientName);
    doc.text(data.clientEmail);
    doc.text(data.clientPhone);
    doc.text(data.clientAddress);

    // Items table
    doc.moveDown(1);
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 300;
    const col3 = 400;
    const col4 = 500;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', col1, tableTop);
    doc.text('Quantité', col2, tableTop);
    doc.text('Prix unitaire', col3, tableTop);
    doc.text('Total', col4, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    let subtotal = 0;

    doc.font('Helvetica').fontSize(10);
    data.items.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      doc.text(item.description, col1, y);
      doc.text(item.quantity.toString(), col2, y);
      doc.text(`${item.unitPrice.toFixed(2)} XOF`, col3, y);
      doc.text(`${itemTotal.toFixed(2)} XOF`, col4, y);

      y += 25;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();

    // Totals
    y += 10;
    const tax = subtotal * 0.18; // 18% VAT
    const total = subtotal + tax;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Sous-total: ${subtotal.toFixed(2)} XOF`, col3, y);
    y += 20;
    doc.text(`TVA (18%): ${tax.toFixed(2)} XOF`, col3, y);
    y += 20;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`TOTAL: ${total.toFixed(2)} XOF`, col3, y);

    // Notes
    if (data.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(data.notes);
    }

    doc.end();
  });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text(data.companyName, { align: 'left' });
    doc.fontSize(10).font('Helvetica').text(data.companyAddress, { align: 'left' });
    doc.text(data.companyPhone, { align: 'left' });
    doc.text(data.companyEmail, { align: 'left' });

    // Title
    doc.moveDown(1);
    doc.fontSize(18).font('Helvetica-Bold').text('FACTURE', { align: 'center' });

    // Invoice number and dates
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`N° Facture: ${data.invoiceId}`, { align: 'right' });
    doc.text(`Date: ${data.invoiceDate.toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.text(`Date limite: ${data.dueDate.toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.text(`Statut: ${data.status}`, { align: 'right' });

    // Client info
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Client:');
    doc.fontSize(10).font('Helvetica');
    doc.text(data.clientName);
    doc.text(data.clientEmail);
    doc.text(data.clientPhone);
    doc.text(data.clientAddress);

    // Items table
    doc.moveDown(1);
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 300;
    const col3 = 400;
    const col4 = 500;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', col1, tableTop);
    doc.text('Quantité', col2, tableTop);
    doc.text('Prix unitaire', col3, tableTop);
    doc.text('Total', col4, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    let subtotal = 0;

    doc.font('Helvetica').fontSize(10);
    data.items.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      doc.text(item.description, col1, y);
      doc.text(item.quantity.toString(), col2, y);
      doc.text(`${item.unitPrice.toFixed(2)} XOF`, col3, y);
      doc.text(`${itemTotal.toFixed(2)} XOF`, col4, y);

      y += 25;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();

    // Totals
    y += 10;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    doc.fontSize(10).font('Helvetica');
    doc.text(`Sous-total: ${subtotal.toFixed(2)} XOF`, col3, y);
    y += 20;
    doc.text(`TVA (18%): ${tax.toFixed(2)} XOF`, col3, y);
    y += 20;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`TOTAL: ${total.toFixed(2)} XOF`, col3, y);

    // Payment method
    if (data.paymentMethod) {
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('Méthode de paiement:');
      doc.font('Helvetica').text(data.paymentMethod);
    }

    doc.end();
  });
}

import PDFDocument from "pdfkit";

const THEME = {
  primary: "#16a34a",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#f8fafc",
};

export interface ReportColumn {
  header: string;
  key: string;
  width: number; // relative weight
  align?: "left" | "right" | "center";
}

export function renderReportPdf(opts: {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  summary?: Array<{ label: string; value: string }>;
  company?: { name: string; email?: string; phone?: string };
}): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 40,
    info: { Title: opts.title, Author: opts.company?.name ?? "Loan Platform" },
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  /* ── Header band ── */
  doc.rect(left, 30, pageWidth, 50).fill(THEME.primary);
  doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold")
    .text(opts.company?.name ?? "Loan Platform", left + 12, 40);
  doc.fontSize(10).font("Helvetica").text(opts.title, left + 12, 62);

  /* ── Summary band ── */
  let y = 100;
  if (opts.summary?.length) {
    const colW = pageWidth / opts.summary.length;
    opts.summary.forEach((s, i) => {
      const x = left + i * colW;
      doc.roundedRect(x + 4, y, colW - 8, 50, 6).fillAndStroke(THEME.surface, THEME.border);
      doc.fillColor(THEME.muted).fontSize(8).font("Helvetica-Bold")
        .text(s.label.toUpperCase(), x + 12, y + 10, { width: colW - 24 });
      doc.fillColor(THEME.text).fontSize(14).font("Helvetica-Bold")
        .text(s.value, x + 12, y + 24, { width: colW - 24 });
    });
    y += 70;
  }

  /* ── Table ── */
  const totalWeight = opts.columns.reduce((sum, c) => sum + c.width, 0);
  const colWidths = opts.columns.map((c) => (c.width / totalWeight) * pageWidth);

  const drawHeader = () => {
    let x = left;
    doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
    opts.columns.forEach((c, i) => {
      doc.fillColor(THEME.muted).fontSize(8).font("Helvetica-Bold")
        .text(c.header.toUpperCase(), x + 6, y + 7, {
          width: colWidths[i] - 12,
          align: c.align ?? "left",
        });
      x += colWidths[i];
    });
    y += 22;
  };

  drawHeader();

  const rowHeight = 20;

  for (const row of opts.rows) {
    /* Page break */
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }

    let x = left;
    opts.columns.forEach((c, i) => {
      const raw = row[c.key];
      const value =
        raw === null || raw === undefined
          ? "—"
          : raw instanceof Date
            ? raw.toLocaleDateString()
            : String(raw);

      doc.fillColor(THEME.text).fontSize(8).font("Helvetica")
        .text(value, x + 6, y + 6, {
          width: colWidths[i] - 12,
          align: c.align ?? "left",
          ellipsis: true,
        });
      x += colWidths[i];
    });

    /* Row separator */
    doc.moveTo(left, y + rowHeight).lineTo(left + pageWidth, y + rowHeight)
      .strokeColor(THEME.border).lineWidth(0.5).stroke();

    y += rowHeight;
  }

  /* ── Footer ── */
  const footerY = doc.page.height - doc.page.margins.bottom - 15;
  doc.fillColor(THEME.muted).fontSize(7).font("Helvetica")
    .text(
      `Generated ${new Date().toLocaleString()} · ${opts.rows.length} rows`,
      left, footerY, { width: pageWidth, align: "center" },
    );

  doc.end();
  return doc;
}
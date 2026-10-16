// src/utils/pdfReport.ts
import PDFDocument from "pdfkit";
import { drawPdfHeader, PDF_BRAND } from "./logo.js";

/* ============================================================
 * THEME
 * ============================================================ */
const THEME = {
  primary: PDF_BRAND.teal,
  text: PDF_BRAND.text,
  muted: PDF_BRAND.muted,
  border: PDF_BRAND.border,
  surface: PDF_BRAND.surface,
};

/* ============================================================
 * TYPES
 * ============================================================ */
export interface ReportColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "right" | "center";
}

/* ============================================================
 * RENDER — REPORT PDF
 * ============================================================ */
export function renderReportPdf(opts: {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  summary?: Array<{ label: string; value: string }>;
  company?: { name: string; email?: string; phone?: string };
  logoBuffer?: Buffer | null;
}): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 40,
    info: {
      Title: opts.title,
      Author: opts.company?.name ?? "PesaMaishaCapital",
    },
  });

  /* ── Header band with logo ── */
  const header = drawPdfHeader(doc, {
    subtitle: opts.title,
    companyName: opts.company?.name,
    logoBuffer: opts.logoBuffer,
  });
  const { pageWidth, left, right } = header;
  let y = header.y + 8;

  /* ── Summary band ── */
  if (opts.summary?.length) {
    const colW = pageWidth / opts.summary.length;

    opts.summary.forEach((s, i) => {
      const x = left + i * colW;
      doc
        .roundedRect(x + 4, y, colW - 8, 50, 6)
        .fillAndStroke(THEME.surface, THEME.border);

      doc
        .fillColor(THEME.muted)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(s.label.toUpperCase(), x + 12, y + 10, {
          width: colW - 24,
          lineBreak: false,
        });

      doc
        .fillColor(THEME.text)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(s.value, x + 12, y + 24, {
          width: colW - 24,
          lineBreak: false,
        });
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
      doc
        .fillColor(THEME.muted)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(c.header.toUpperCase(), x + 6, y + 7, {
          width: colWidths[i] - 12,
          align: c.align ?? "left",
          lineBreak: false,
        });
      x += colWidths[i];
    });

    y += 22;
  };

  drawHeader();

  const rowHeight = 20;

  for (const row of opts.rows) {
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

      doc
        .fillColor(THEME.text)
        .fontSize(8)
        .font("Helvetica")
        .text(value, x + 6, y + 6, {
          width: colWidths[i] - 12,
          align: c.align ?? "left",
          ellipsis: true,
          lineBreak: false,
        });

      x += colWidths[i];
    });

    doc
      .moveTo(left, y + rowHeight)
      .lineTo(left + pageWidth, y + rowHeight)
      .strokeColor(THEME.border)
      .lineWidth(0.5)
      .stroke();

    y += rowHeight;
  }

  /* ── Footer ── */
  const footerY = doc.page.height - doc.page.margins.bottom - 15;
  doc
    .fillColor(THEME.muted)
    .fontSize(7)
    .font("Helvetica")
    .text(
      `Generated ${new Date().toLocaleString()} · ${opts.rows.length} rows`,
      left,
      footerY,
      { width: pageWidth, align: "center" },
    );

  doc.end();
  return doc;
}
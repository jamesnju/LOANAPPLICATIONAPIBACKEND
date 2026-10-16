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

/* ============================================================
 * UNSIGNED APPLICATION PDF
 * ============================================================
 * Same layout as the signed version but without the signature
 * block, hash, or audit trail. A watermark makes it clear this
 * is a preview, not an executed document.
 * ============================================================ */
/* ============================================================
 * RENDER — unsigned application
 * ============================================================
 * Same layout as the signed version, minus:
 *   - Signature block
 *   - Integrity hash
 *   - Terms & Conditions text
 *
 * Adds a diagonal "UNSIGNED" watermark so nobody mistakes it
 * for an executed agreement.
 * ============================================================ */
export function renderUnsignedApplicationPdf(input: {
  application: any;
  imageBuffers?: Map<string, Buffer>;
}): PDFKit.PDFDocument {
  const { application, imageBuffers } = input;

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `Loan Application ${application.applicationNumber}`,
      Author: "PesaMaishaCapital",
      Subject: "Loan Application (unsigned)",
    },
  });

  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  let y = 40;

  /* ── Header band ── */
  doc.rect(left, y, pageWidth, 60).fill(THEME.primary);
  doc
    .fillColor("#ffffff")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("PesaMaishaCapital", left + 16, y + 16);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("Loan Application (unsigned)", left + 16, y + 40);

  y += 80;

  /* ── Status pill ── */
  const statusLabel = `STATUS: ${application.status}`;
  const pillWidth = doc.widthOfString(statusLabel) + 24;
  doc
    .roundedRect(right - pillWidth, 50, pillWidth, 22, 11)
    .fillAndStroke("#fef3c7", "#fcd34d");
  doc
    .fillColor("#92400e")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(statusLabel, right - pillWidth, 56, {
      width: pillWidth,
      align: "center",
    });

  /* ── Diagonal watermark ── */
  doc.save();
  doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc
    .fillColor("#cbd5e1")
    .opacity(0.25)
    .fontSize(72)
    .font("Helvetica-Bold")
    .text("UNSIGNED", 0, doc.page.height / 2 - 40, {
      width: doc.page.width,
      align: "center",
    });
  doc.restore();
  doc.opacity(1);

  /* ── Meta row ── */
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(THEME.muted)
    .text("APPLICATION NUMBER", left, y);
  doc.text("DATE", right - 200, y, { width: 200, align: "right" });

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(THEME.text)
    .text(application.applicationNumber, left, y + 12);
  doc
    .font("Helvetica")
    .text(
      new Date(application.createdAt).toLocaleString(),
      right - 200,
      y + 12,
      { width: 200, align: "right" },
    );

  y += 50;

  /* ── Section helper ── */
  const section = (title: string, rows: [string, string][]) => {
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
    doc
      .fillColor(THEME.muted)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(title.toUpperCase(), left + 10, y + 7);
    y += 22;

    rows.forEach(([label, value]) => {
      doc
        .fillColor(THEME.muted)
        .fontSize(9)
        .font("Helvetica")
        .text(label, left + 10, y, { width: 180 });
      doc
        .fillColor(THEME.text)
        .fontSize(9)
        .font("Helvetica")
        .text(value || "—", left + 200, y, { width: pageWidth - 200 });

      const h = Math.max(
        doc.heightOfString(value || "—", { width: pageWidth - 200 }),
        12,
      );
      y += h + 6;
    });

    y += 8;
  };

  /* ── Image helpers ── */
  const imageSectionHeader = (title: string) => {
    if (y > doc.page.height - 220) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
    doc
      .fillColor(THEME.muted)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(title.toUpperCase(), left + 10, y + 7);
    y += 32;
  };

  const imageRow = (
    leftItem: { label: string; url?: string | null },
    rightItem?: { label: string; url?: string | null },
  ) => {
    const gap = 16;
    const boxWidth = (pageWidth - gap) / 2;
    const boxHeight = 140;

    if (y > doc.page.height - 200) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    drawImageBox(doc, {
      x: left,
      y,
      width: boxWidth,
      height: boxHeight,
      label: leftItem.label,
      url: leftItem.url,
      imageBuffers,
    });

    if (rightItem) {
      drawImageBox(doc, {
        x: left + boxWidth + gap,
        y,
        width: boxWidth,
        height: boxHeight,
        label: rightItem.label,
        url: rightItem.url,
        imageBuffers,
      });
    }

    y += boxHeight + 20;
  };

  /* ── Customer ── */
  section("Customer", [
    [
      "Full name",
      `${application.user.firstName} ${application.user.lastName}`,
    ],
    ["Email", application.user.email],
    ["Phone", application.user.phone ?? "—"],
    ["National ID", application.user.nationalId ?? "—"],
    [
      "Date of birth",
      application.user.dateOfBirth
        ? new Date(application.user.dateOfBirth).toLocaleDateString()
        : "—",
    ],
    ["Gender", application.user.gender ?? "—"],
    ["Employment", application.user.employmentType ?? "—"],
    ["Employer", application.user.employerName ?? "—"],
    [
      "Monthly income",
      application.user.monthlyIncome
        ? `KES ${Number(application.user.monthlyIncome).toLocaleString()}`
        : "—",
    ],
  ]);

  /* ── Customer National ID images ── */
  const customerFront = application.documents?.find(
    (d: any) => d.type === "NATIONAL_ID_FRONT" && d.status !== "REJECTED",
  );
  const customerBack = application.documents?.find(
    (d: any) => d.type === "NATIONAL_ID_BACK" && d.status !== "REJECTED",
  );

  if (customerFront || customerBack) {
    imageSectionHeader("Customer National ID");
    imageRow(
      { label: "Front of National ID", url: customerFront?.fileUrl },
      { label: "Back of National ID", url: customerBack?.fileUrl },
    );
  }

  /* ── Loan terms ── */
  section("Loan Terms", [
    ["Product", application.loanProduct.name],
    ["Product code", application.loanProduct.code],
    [
      "Amount",
      `KES ${Number(application.requestedAmount).toLocaleString()}`,
    ],
    ["Term", `${application.requestedDays} days`],
    [
      "Interest rate",
      `${Number(application.interestRate).toFixed(2)}% per term`,
    ],
    [
      "Processing fee",
      `KES ${Number(application.processingFee).toLocaleString()}`,
    ],
    ["Purpose", application.purpose ?? "—"],
    ["Description", application.description ?? "—"],
  ]);

  /* ── Guarantors ── */
  if (application.guarantors?.length) {
    const rows: [string, string][] = [];
    application.guarantors.forEach((g: any, i: number) => {
      rows.push([`Guarantor ${i + 1}`, `${g.firstName} ${g.lastName}`]);
      rows.push([
        "  Contact",
        `${g.phone}${g.email ? ` · ${g.email}` : ""}${
          g.relationship ? ` · ${g.relationship}` : ""
        }`,
      ]);
      rows.push(["  National ID", g.nationalId]);
      if (g.guaranteedAmount != null) {
        rows.push([
          "  Guaranteed amount",
          `KES ${Number(g.guaranteedAmount).toLocaleString()}`,
        ]);
      }
    });
    section("Guarantors", rows);

    application.guarantors.forEach((g: any, i: number) => {
      const front = g.documents?.find(
        (d: any) =>
          d.type === "GUARANTOR_ID_FRONT" && d.status !== "REJECTED",
      );
      const back = g.documents?.find(
        (d: any) =>
          d.type === "GUARANTOR_ID_BACK" && d.status !== "REJECTED",
      );

      if (!front && !back) return;

      imageSectionHeader(
        `Guarantor ${i + 1} — ${g.firstName} ${g.lastName} — National ID`,
      );
      imageRow(
        { label: `Guarantor ${i + 1} — Front`, url: front?.fileUrl },
        { label: `Guarantor ${i + 1} — Back`, url: back?.fileUrl },
      );
    });
  }

  /* ── Collateral ── */
  if (application.collateral?.length) {
    const rows: [string, string][] = [];
    application.collateral.forEach((c: any, i: number) => {
      rows.push([
        `Item ${i + 1}`,
        `${c.type.replace(/_/g, " ")} — ${c.description}`,
      ]);
      rows.push([
        "  Estimated value",
        `KES ${Number(c.estimatedValue).toLocaleString()}`,
      ]);
      if (c.registrationNumber) {
        rows.push(["  Registration", c.registrationNumber]);
      }
    });
    section("Collateral", rows);

    application.collateral.forEach((c: any, i: number) => {
      const photos = (c.documents ?? []).filter(
        (d: any) => d.fileUrl && /image\//.test(d.mimeType ?? ""),
      );

      if (photos.length === 0) return;

      imageSectionHeader(
        `Collateral ${i + 1} — ${c.description.slice(0, 60)}`,
      );

      for (let j = 0; j < photos.length; j += 2) {
        const first = photos[j];
        const second = photos[j + 1];

        imageRow(
          {
            label: first.fileName ?? `Photo ${j + 1}`,
            url: first.fileUrl,
          },
          second
            ? {
                label: second.fileName ?? `Photo ${j + 2}`,
                url: second.fileUrl,
              }
            : undefined,
        );
      }
    });
  }

  /* ── Notice ── */
  if (y > doc.page.height - 150) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y += 20;
  doc
    .rect(left, y, pageWidth, 60)
    .fillAndStroke("#fef3c7", "#fcd34d");
  doc
    .fillColor("#92400e")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("UNSIGNED DOCUMENT", left + 12, y + 10);
  doc
    .fillColor("#78350f")
    .fontSize(8)
    .font("Helvetica")
    .text(
      "This application has not yet been signed by the customer. It is a " +
        "preview generated for review purposes only and does not constitute " +
        "a legally binding agreement. To sign, the customer must complete " +
        "the electronic signature step in their account.",
      left + 12,
      y + 24,
      { width: pageWidth - 24 },
    );

  /* ── Footer ── */
  const footerY = doc.page.height - doc.page.margins.bottom - 20;
  doc
    .moveTo(left, footerY)
    .lineTo(right, footerY)
    .strokeColor(THEME.border)
    .lineWidth(0.5)
    .stroke();
  doc
    .fillColor(THEME.muted)
    .fontSize(7)
    .font("Helvetica")
    .text(
      `Generated ${new Date().toLocaleString()} · ${application.applicationNumber}`,
      left,
      footerY + 6,
      { width: pageWidth, align: "center" },
    );

  doc.end();
  return doc;
}
function drawImageBox(
  doc: PDFKit.PDFDocument,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    url?: string | null;
    imageBuffers?: Map<string, Buffer>;
  },
) {
  const { x, y, width, height, label, url, imageBuffers } = opts;

  doc
    .rect(x, y, width, height)
    .strokeColor(THEME.border)
    .lineWidth(0.5)
    .stroke();

  const buffer = url && imageBuffers ? imageBuffers.get(url) : undefined;

  if (buffer) {
    try {
      doc.image(buffer, x + 4, y + 4, {
        fit: [width - 8, height - 8],
        align: "center",
        valign: "center",
      });
    } catch (err) {
      console.warn("[drawImageBox] failed to draw image:", url, err);
      drawPlaceholder(doc, x, y, width, height, "Image failed to load");
    }
  } else {
    drawPlaceholder(doc, x, y, width, height, "Not available");
  }

  doc
    .fillColor(THEME.muted)
    .fontSize(7)
    .font("Helvetica")
    .text(label, x, y + height + 3, {
      width,
      align: "center",
    });
}

function drawPlaceholder(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
) {
  doc
    .fillColor("#e5e7eb")
    .rect(x + 4, y + 4, width - 8, height - 8)
    .fill();
  doc
    .fillColor(THEME.muted)
    .fontSize(7)
    .font("Helvetica")
    .text(text, x, y + height / 2 - 4, {
      width,
      align: "center",
    });
}
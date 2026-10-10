import PDFDocument from "pdfkit";

/* ============================================================
 * THEME
 * ============================================================ */
const THEME = {
  primary: "#16a34a",
  surface: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
};

/* ============================================================
 * TYPES
 * ============================================================ */
interface ReceiptInput {
  loan: {
    id: string;
    loanNumber: string;
    principalAmount: any;
    interestRate: any;
    interestAmount: any;
    processingFee: any;
    penaltyAmount: any;
    totalAmount: any;
    amountPaid: any;
    outstandingAmount: any;
    repaymentDays: number;
    disbursedAt: Date | null;
    maturityDate: Date | null;
    status: string;
    loanProduct?: { name: string; code: string } | null;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    nationalId: string | null;
  };
  disbursedBy: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  transaction?: {
    transactionNumber: string;
    reference: string | null;
    description: string | null;
    createdAt: Date;
  } | null;
  company?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}

/* ============================================================
 * RENDER (stream)
 * ============================================================ */
export function renderDisbursementReceipt(
  input: ReceiptInput,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `Disbursement Receipt — ${input.loan.loanNumber}`,
      Author: input.company?.name ?? "Loan Platform",
      Subject: "Loan Disbursement Receipt",
      CreationDate: new Date(),
    },
  });

  const company = input.company ?? {
    name: "PesaMaishaCapital",
    email: "support@pesamaishacapital.co.ke",
    phone: "+254 700 747 874",
  };

  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  /* ── Header band ── */
  doc.rect(left, 40, pageWidth, 70).fill(THEME.primary);
  doc
    .fillColor("#ffffff")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(company.name, left + 16, 56);
  doc
    .fontSize(11)
    .font("Helvetica")
    .text("Loan Disbursement Receipt", left + 16, 82);

  const statusLabel = prettifyStatus(input.loan.status);
  const pillWidth = doc.widthOfString(statusLabel) + 22;
  doc
    .roundedRect(right - pillWidth - 16, 60, pillWidth, 22, 11)
    .fill("#ffffff");
  doc
    .fillColor(THEME.primary)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(statusLabel, right - pillWidth - 16, 66, {
      width: pillWidth,
      align: "center",
    });

  doc.fillColor(THEME.text);

  /* ── Meta row ── */
  const metaTop = 140;
  doc.fontSize(9).font("Helvetica").fillColor(THEME.muted);
  doc.text("RECEIPT NUMBER", left, metaTop);
  doc.text("DATE ISSUED", right - 200, metaTop, { width: 200, align: "right" });

  const receiptNo =
    input.transaction?.transactionNumber ?? `RCPT-${input.loan.loanNumber}`;
  doc.fontSize(11).font("Helvetica-Bold").fillColor(THEME.text);
  doc.text(receiptNo, left, metaTop + 12);
  doc
    .font("Helvetica")
    .text(new Date().toLocaleString(), right - 200, metaTop + 12, {
      width: 200,
      align: "right",
    });

  /* ── Customer + loan cards ── */
  const cardTop = 190;
  const gap = 16;
  const cardWidth = (pageWidth - gap) / 2;
  const cardHeight = 118;

  doc
    .roundedRect(left, cardTop, cardWidth, cardHeight, 8)
    .fillAndStroke(THEME.surface, THEME.border);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(THEME.muted)
    .text("CUSTOMER", left + 14, cardTop + 12);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(THEME.text)
    .text(
      `${input.customer.firstName} ${input.customer.lastName}`,
      left + 14,
      cardTop + 28,
      { width: cardWidth - 28 },
    );

  doc.fontSize(10).font("Helvetica").fillColor(THEME.text);
  let cy = cardTop + 50;
  doc.text(input.customer.email, left + 14, cy, { width: cardWidth - 28 });
  cy += 14;
  if (input.customer.phone) {
    doc.text(`Phone: ${input.customer.phone}`, left + 14, cy, {
      width: cardWidth - 28,
    });
    cy += 14;
  }
  if (input.customer.nationalId) {
    doc.text(`ID: ${input.customer.nationalId}`, left + 14, cy, {
      width: cardWidth - 28,
    });
  }

  const loanX = left + cardWidth + gap;
  doc
    .roundedRect(loanX, cardTop, cardWidth, cardHeight, 8)
    .fillAndStroke(THEME.surface, THEME.border);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(THEME.muted)
    .text("LOAN", loanX + 14, cardTop + 12);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(THEME.text)
    .text(input.loan.loanNumber, loanX + 14, cardTop + 28, {
      width: cardWidth - 28,
    });

  doc.fontSize(10).font("Helvetica").fillColor(THEME.text);
  let ly = cardTop + 50;
  doc.text(`Product: ${input.loan.loanProduct?.name ?? "—"}`, loanX + 14, ly, {
    width: cardWidth - 28,
  });
  ly += 14;
  doc.text(`Term: ${input.loan.repaymentDays} days`, loanX + 14, ly, {
    width: cardWidth - 28,
  });
  ly += 14;
  doc.text(
    `Maturity: ${
      input.loan.maturityDate
        ? new Date(input.loan.maturityDate).toLocaleDateString()
        : "—"
    }`,
    loanX + 14,
    ly,
    { width: cardWidth - 28 },
  );

  /* ── Financial breakdown ── */
  let tableTop = cardTop + cardHeight + 30;
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(THEME.muted)
    .text("FINANCIAL BREAKDOWN", left, tableTop);
  tableTop += 18;

  const rows: Array<[string, string]> = [
    ["Principal amount", formatKES(input.loan.principalAmount)],
    [
      `Interest (${Number(input.loan.interestRate).toFixed(2)}%)`,
      formatKES(input.loan.interestAmount),
    ],
    ["Processing fee", formatKES(input.loan.processingFee)],
  ];
  if (Number(input.loan.penaltyAmount) > 0) {
    rows.push(["Penalty", formatKES(input.loan.penaltyAmount)]);
  }

  const rowHeight = 26;
  let ty = tableTop;
  rows.forEach(([label, value], i) => {
    doc.rect(left, ty, pageWidth, rowHeight).fill(THEME.surface);
    doc
      .fillColor(THEME.text)
      .fontSize(10)
      .font("Helvetica")
      .text(label, left + 12, ty + 8, { width: pageWidth - 24 });
    doc
      .font("Helvetica-Bold")
      .text(value, left + 12, ty + 8, {
        width: pageWidth - 24,
        align: "right",
      });
    ty += rowHeight;
    if (i < rows.length - 1) {
      doc
        .moveTo(left, ty)
        .lineTo(right, ty)
        .strokeColor(THEME.border)
        .lineWidth(0.5)
        .stroke();
    }
  });

  ty += 8;
  doc.rect(left, ty, pageWidth, rowHeight + 6).fill(THEME.primary);
  doc
    .fillColor("#ffffff")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Total payable", left + 12, ty + 10, { width: pageWidth - 24 });
  doc
    .text(formatKES(input.loan.totalAmount), left + 12, ty + 10, {
      width: pageWidth - 24,
      align: "right",
    });
  ty += rowHeight + 24;

  /* ── Disbursement details ── */
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(THEME.muted)
    .text("DISBURSEMENT DETAILS", left, ty);
  ty += 18;

  const disbursedAt =
    input.transaction?.createdAt ?? input.loan.disbursedAt ?? new Date();

  const details: Array<[string, string]> = [
    ["Disbursed on", new Date(disbursedAt).toLocaleString()],
    [
      "Disbursed by",
      input.disbursedBy
        ? `${input.disbursedBy.firstName} ${input.disbursedBy.lastName} (${input.disbursedBy.email})`
        : "—",
    ],
    ["Reference", input.transaction?.reference ?? "—"],
    ["Remarks", input.transaction?.description ?? "—"],
  ];

  details.forEach(([label, value]) => {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(THEME.muted)
      .text(`${label}:`, left, ty, { width: 130 });
    doc
      .fillColor(THEME.text)
      .text(value, left + 130, ty, { width: pageWidth - 130 });
    ty = doc.y + 6;
  });

  /* ── Notice box ── */
  ty += 16;
  doc
    .roundedRect(left, ty, pageWidth, 60, 8)
    .fillAndStroke("#fffbeb", "#fde68a");
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#b45309")
    .text("NOTE", left + 14, ty + 10);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#78350f")
    .text(
      "This receipt confirms that the loan amount above has been disbursed to you. " +
        "Repayment is due according to your repayment schedule. Please retain this " +
        "document for your records.",
      left + 14,
      ty + 24,
      { width: pageWidth - 28 },
    );

  /* ── Footer ── */
  const footerTop = doc.page.height - doc.page.margins.bottom - 30;
  doc
    .moveTo(left, footerTop)
    .lineTo(right, footerTop)
    .strokeColor(THEME.border)
    .lineWidth(0.5)
    .stroke();
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(THEME.muted)
    .text(
      [
        company.name,
        company.phone ? `Tel ${company.phone}` : null,
        company.email,
      ]
        .filter(Boolean)
        .join("  ·  "),
      left,
      footerTop + 8,
      { width: pageWidth, align: "center" },
    );
  doc.text(
    `Receipt generated ${new Date().toLocaleString()} · System-generated document — no signature required.`,
    left,
    footerTop + 22,
    { width: pageWidth, align: "center" },
  );

  doc.end();
  return doc;
}

/* ============================================================
 * RENDER (buffer) — for email attachments
 * ============================================================ */
export function renderReceiptToBuffer(input: ReceiptInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = renderDisbursementReceipt(input);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/* ============================================================
 * HELPERS
 * ============================================================ */
function formatKES(value: any): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "KES 0";
  return `KES ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function prettifyStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// import PDFDocument from "pdfkit";

// /* ============================================================
//  * THEME
//  * ============================================================
//  * Kept in one place so the receipt can be restyled by editing
//  * four values. Matches the frontend's CSS custom properties
//  * (primary, surface, border, text).
//  * ============================================================ */
// const THEME = {
//   primary: "#16a34a",     // match your --color-primary
//   surface: "#f8fafc",
//   border: "#e2e8f0",
//   text: "#0f172a",
//   muted: "#64748b",
//   danger: "#dc2626",
// };

// interface ReceiptInput {
//   loan: {
//     id: string;
//     loanNumber: string;
//     principalAmount: any;
//     interestRate: any;
//     interestAmount: any;
//     processingFee: any;
//     penaltyAmount: any;
//     totalAmount: any;
//     amountPaid: any;
//     outstandingAmount: any;
//     repaymentDays: number;
//     disbursedAt: Date | null;
//     maturityDate: Date | null;
//     status: string;
//     loanProduct?: { name: string; code: string } | null;
//   };
//   customer: {
//     id: string;
//     firstName: string;
//     lastName: string;
//     email: string;
//     phone: string | null;
//     nationalId: string | null;
//   };
//   disbursedBy: {
//     firstName: string;
//     lastName: string;
//     email: string;
//   } | null;
//   transaction?: {
//     transactionNumber: string;
//     reference: string | null;
//     description: string | null;
//     createdAt: Date;
//   } | null;
//   /** Company branding — change these to match your org. */
//   company?: {
//     name: string;
//     address?: string;
//     phone?: string;
//     email?: string;
//     website?: string;
//   };
// }

// /**
//  * Renders a disbursement receipt as a PDFDocument stream.
//  * Caller pipes it to a response or converts to a buffer.
//  */
// export function renderDisbursementReceipt(input: ReceiptInput): PDFKit.PDFDocument {
//   const doc = new PDFDocument({
//     size: "A4",
//     margin: 50,
//     info: {
//       Title: `Disbursement Receipt — ${input.loan.loanNumber}`,
//       Author: input.company?.name ?? "Loan Platform",
//       Subject: "Loan Disbursement Receipt",
//       CreationDate: new Date(),
//     },
//   });

//   const company = input.company ?? {
//     name: "PesaMaishaCapital",
//     email: "support@pesamaishacapital.co.ke",
//     phone: "+254 700 747 874",
//   };

//   const pageWidth =
//     doc.page.width - doc.page.margins.left - doc.page.margins.right;
//   const left = doc.page.margins.left;
//   const right = doc.page.width - doc.page.margins.right;

//   /* ============================================================
//    * HEADER BAND
//    * ============================================================ */
//   doc.rect(left, 40, pageWidth, 70).fill(THEME.primary);

//   doc
//     .fillColor("#ffffff")
//     .fontSize(20)
//     .font("Helvetica-Bold")
//     .text(company.name, left + 16, 56);

//   doc
//     .fontSize(11)
//     .font("Helvetica")
//     .fillColor("#ffffff")
//     .text("Loan Disbursement Receipt", left + 16, 82);

//   /* Status pill (top right of the band) */
//   const statusLabel = prettifyStatus(input.loan.status);
//   const pillWidth = doc.widthOfString(statusLabel) + 22;
//   doc
//     .roundedRect(right - pillWidth - 16, 60, pillWidth, 22, 11)
//     .fill("#ffffff");
//   doc
//     .fillColor(THEME.primary)
//     .fontSize(10)
//     .font("Helvetica-Bold")
//     .text(statusLabel, right - pillWidth - 16, 66, {
//       width: pillWidth,
//       align: "center",
//     });

//   /* Reset for body */
//   doc.fillColor(THEME.text);

//   /* ============================================================
//    * META ROW: Receipt number, date issued
//    * ============================================================ */
//   const metaTop = 140;
//   doc.fontSize(9).font("Helvetica").fillColor(THEME.muted);
//   doc.text("RECEIPT NUMBER", left, metaTop);
//   doc.text("DATE ISSUED", right - 200, metaTop, { width: 200, align: "right" });

//   doc.fontSize(11).font("Helvetica-Bold").fillColor(THEME.text);
//   const receiptNo =
//     input.transaction?.transactionNumber ?? `RCPT-${input.loan.loanNumber}`;
//   doc.text(receiptNo, left, metaTop + 12);

//   doc
//     .font("Helvetica")
//     .fillColor(THEME.text)
//     .text(new Date().toLocaleString(), right - 200, metaTop + 12, {
//       width: 200,
//       align: "right",
//     });

//   /* ============================================================
//    * CUSTOMER + LOAN SUMMARY (two cards side by side)
//    * ============================================================ */
//   const cardTop = 190;
//   const gap = 16;
//   const cardWidth = (pageWidth - gap) / 2;
//   const cardHeight = 118;

//   /* Card 1: Customer */
//   doc
//     .roundedRect(left, cardTop, cardWidth, cardHeight, 8)
//     .fillAndStroke(THEME.surface, THEME.border);

//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.muted)
//     .text("CUSTOMER", left + 14, cardTop + 12);

//   doc
//     .fontSize(12)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.text)
//     .text(
//       `${input.customer.firstName} ${input.customer.lastName}`,
//       left + 14,
//       cardTop + 28,
//       { width: cardWidth - 28 },
//     );

//   doc.fontSize(10).font("Helvetica").fillColor(THEME.text);
//   let cy = cardTop + 50;
//   doc.text(input.customer.email, left + 14, cy, { width: cardWidth - 28 });
//   cy += 14;
//   if (input.customer.phone) {
//     doc.text(`Phone: ${input.customer.phone}`, left + 14, cy, {
//       width: cardWidth - 28,
//     });
//     cy += 14;
//   }
//   if (input.customer.nationalId) {
//     doc.text(`ID: ${input.customer.nationalId}`, left + 14, cy, {
//       width: cardWidth - 28,
//     });
//   }

//   /* Card 2: Loan */
//   const loanX = left + cardWidth + gap;
//   doc
//     .roundedRect(loanX, cardTop, cardWidth, cardHeight, 8)
//     .fillAndStroke(THEME.surface, THEME.border);

//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.muted)
//     .text("LOAN", loanX + 14, cardTop + 12);

//   doc
//     .fontSize(12)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.text)
//     .text(input.loan.loanNumber, loanX + 14, cardTop + 28, {
//       width: cardWidth - 28,
//     });

//   doc.fontSize(10).font("Helvetica").fillColor(THEME.text);
//   let ly = cardTop + 50;
//   doc.text(
//     `Product: ${input.loan.loanProduct?.name ?? "—"}`,
//     loanX + 14,
//     ly,
//     { width: cardWidth - 28 },
//   );
//   ly += 14;
//   doc.text(`Term: ${input.loan.repaymentDays} days`, loanX + 14, ly, {
//     width: cardWidth - 28,
//   });
//   ly += 14;
//   doc.text(
//     `Maturity: ${
//       input.loan.maturityDate
//         ? new Date(input.loan.maturityDate).toLocaleDateString()
//         : "—"
//     }`,
//     loanX + 14,
//     ly,
//     { width: cardWidth - 28 },
//   );

//   /* ============================================================
//    * FINANCIAL BREAKDOWN TABLE
//    * ============================================================ */
//   let tableTop = cardTop + cardHeight + 30;

//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.muted)
//     .text("FINANCIAL BREAKDOWN", left, tableTop);

//   tableTop += 18;

//   const rows: Array<[string, string]> = [
//     ["Principal amount", formatKES(input.loan.principalAmount)],
//     [
//       `Interest (${Number(input.loan.interestRate).toFixed(2)}%)`,
//       formatKES(input.loan.interestAmount),
//     ],
//     ["Processing fee", formatKES(input.loan.processingFee)],
//   ];
//   if (Number(input.loan.penaltyAmount) > 0) {
//     rows.push(["Penalty", formatKES(input.loan.penaltyAmount)]);
//   }

//   /* Draw rows */
//   const rowHeight = 26;
//   const tableWidth = pageWidth;
//   let ty = tableTop;

//   doc.rect(left, ty, tableWidth, rowHeight).fill(THEME.surface);

//   rows.forEach(([label, value], i) => {
//     if (i > 0) {
//       doc.rect(left, ty, tableWidth, rowHeight).fill(THEME.surface);
//     }
//     doc
//       .fillColor(THEME.text)
//       .fontSize(10)
//       .font("Helvetica")
//       .text(label, left + 12, ty + 8, { width: tableWidth - 24 });
//     doc
//       .font("Helvetica-Bold")
//       .text(value, left + 12, ty + 8, { width: tableWidth - 24, align: "right" });

//     ty += rowHeight;

//     /* Separator line */
//     if (i < rows.length - 1) {
//       doc
//         .moveTo(left, ty)
//         .lineTo(right, ty)
//         .strokeColor(THEME.border)
//         .lineWidth(0.5)
//         .stroke();
//     }
//   });

//   /* Total row — emphasised */
//   ty += 8;
//   doc.rect(left, ty, tableWidth, rowHeight + 6).fill(THEME.primary);
//   doc
//     .fillColor("#ffffff")
//     .fontSize(11)
//     .font("Helvetica-Bold")
//     .text("Total payable", left + 12, ty + 10, { width: tableWidth - 24 });
//   doc
//     .font("Helvetica-Bold")
//     .text(formatKES(input.loan.totalAmount), left + 12, ty + 10, {
//       width: tableWidth - 24,
//       align: "right",
//     });

//   ty += rowHeight + 24;

//   /* ============================================================
//    * DISBURSEMENT DETAILS
//    * ============================================================ */
//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.muted)
//     .text("DISBURSEMENT DETAILS", left, ty);

//   ty += 18;

//   const disbursedAt =
//     input.transaction?.createdAt ?? input.loan.disbursedAt ?? new Date();

//   const details: Array<[string, string]> = [
//     ["Disbursed on", new Date(disbursedAt).toLocaleString()],
//     [
//       "Disbursed by",
//       input.disbursedBy
//         ? `${input.disbursedBy.firstName} ${input.disbursedBy.lastName} (${input.disbursedBy.email})`
//         : "—",
//     ],
//     ["Reference", input.transaction?.reference ?? "—"],
//     ["Remarks", input.transaction?.description ?? "—"],
//   ];

//   details.forEach(([label, value]) => {
//     doc
//       .fontSize(10)
//       .font("Helvetica")
//       .fillColor(THEME.muted)
//       .text(`${label}:`, left, ty, { width: 130 });
//     doc
//       .fillColor(THEME.text)
//       .font("Helvetica")
//       .text(value, left + 130, ty, { width: tableWidth - 130 });
//     ty = doc.y + 6;
//   });

//   /* ============================================================
//    * CUSTOMER ACKNOWLEDGEMENT
//    * ============================================================ */
//   ty += 16;
//   doc
//     .roundedRect(left, ty, pageWidth, 60, 8)
//     .fillAndStroke("#fffbeb", "#fde68a");

//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor("#b45309")
//     .text("NOTE", left + 14, ty + 10);
//   doc
//     .fontSize(9)
//     .font("Helvetica")
//     .fillColor("#78350f")
//     .text(
//       "This receipt confirms that the loan amount above has been disbursed to you. " +
//         "Repayment is due according to your repayment schedule. Please retain this " +
//         "document for your records.",
//       left + 14,
//       ty + 24,
//       { width: pageWidth - 28 },
//     );

//   /* ============================================================
//    * FOOTER
//    * ============================================================ */
//   const footerTop = doc.page.height - doc.page.margins.bottom - 30;
//   doc
//     .moveTo(left, footerTop)
//     .lineTo(right, footerTop)
//     .strokeColor(THEME.border)
//     .lineWidth(0.5)
//     .stroke();

//   doc
//     .fontSize(8)
//     .font("Helvetica")
//     .fillColor(THEME.muted)
//     .text(
//       [
//         company.name,
//         company.phone ? `Tel ${company.phone}` : null,
//         company.email,
//         company.website,
//       ]
//         .filter(Boolean)
//         .join("  ·  "),
//       left,
//       footerTop + 8,
//       { width: pageWidth, align: "center" },
//     );

//   doc.text(
//     `Receipt generated ${new Date().toLocaleString()} · System-generated document — no signature required.`,
//     left,
//     footerTop + 22,
//     { width: pageWidth, align: "center" },
//   );

//   doc.end();
//   return doc;
// }

// /* ============================================================
//  * HELPERS
//  * ============================================================ */
// function formatKES(value: any): string {
//   const n = Number(value);
//   if (!Number.isFinite(n)) return "KES 0";
//   return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// }

// function prettifyStatus(status: string): string {
//   return status
//     .split("_")
//     .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
//     .join(" ");
// }

// /**
//  * Renders the receipt and collects the PDF bytes into a Buffer.
//  * Used when the caller needs the whole thing in memory (email
//  * attachments, tests, S3 uploads, etc.).
//  */
// export function renderReceiptToBuffer(input: ReceiptInput): Promise<Buffer> {
//   return new Promise((resolve, reject) => {
//     const doc = renderDisbursementReceipt(input);
//     const chunks: Buffer[] = [];
//     doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
//     doc.on("end", () => resolve(Buffer.concat(chunks)));
//     doc.on("error", reject);
//   });
// }

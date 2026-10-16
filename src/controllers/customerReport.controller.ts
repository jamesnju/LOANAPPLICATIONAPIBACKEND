// src/controllers/customerReport.controller.ts
import type { Request, Response } from "express";

import {
  getCustomerAccountStatement,
  getCustomerLoanSummary,
  getCustomerPaymentHistory,
} from "../services/customerReport.service.js";
import { renderReportPdf } from "../utils/pdfReport.js";
import { toCsv } from "../utils/csv.js";
import { prisma } from "../config/prisma.js";
import { getLogoBuffer } from "../utils/logo.js";
import { customerReportQuerySchema } from "../schemas/customerReport.schema.js";

function handleError(error: unknown, res: Response) {
  return res.status(400).json({
    success: false,
    message: error instanceof Error ? error.message : "Failed",
  });
}

/* ============================================================
 * ACCOUNT STATEMENT — JSON / CSV / PDF
 * ============================================================ */
export async function getStatementController(req: Request, res: Response) {
  try {
    const query = customerReportQuerySchema.parse(req.query);
    const data = await getCustomerAccountStatement(req.user!.userId, {
      startDate: query.startDate,
      endDate: query.endDate,
      loanId: query.loanId,
    });

    if (query.format === "json") {
      return res.json({ success: true, data });
    }

    if (query.format === "csv") {
      const rows = data.transactions.map((t) => ({
        Date: t.createdAt.toISOString(),
        Loan: t.loanNumber,
        Type: t.type,
        Reference: t.reference ?? t.transactionNumber,
        Description: t.description ?? "",
        Amount: t.amount,
        BalanceAfter: t.balanceAfter,
      }));
      const csv = toCsv(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="statement-${Date.now()}.csv"`,
      );
      return res.send(csv);
    }

    /* PDF */
    const doc = renderReportPdf({
      title: "Account Statement",
      subtitle: data.customer
        ? `${data.customer.firstName} ${data.customer.lastName} · ${data.customer.email}`
        : undefined,
      logoBuffer: getLogoBuffer(),
      columns: [
        { header: "Date", key: "date", width: 12 },
        { header: "Loan", key: "loan", width: 12 },
        { header: "Type", key: "type", width: 12 },
        { header: "Description", key: "desc", width: 22 },
        { header: "Reference", key: "ref", width: 16 },
        { header: "Amount", key: "amount", width: 12, align: "right" },
        { header: "Balance", key: "balance", width: 12, align: "right" },
      ],
      rows: data.transactions.map((t) => ({
        date: t.createdAt.toLocaleDateString(),
        loan: t.loanNumber,
        type: t.type,
        desc: t.description ?? "",
        ref: t.payment?.receipt ?? t.reference ?? t.transactionNumber,
        amount: `${t.type === "DISBURSEMENT" ? "+" : "-"}KES ${t.amount.toLocaleString()}`,
        balance: `KES ${t.balanceAfter.toLocaleString()}`,
      })),
      summary: [
        {
          label: "Total Disbursed",
          value: `KES ${data.summary.totalDisbursed.toLocaleString()}`,
        },
        {
          label: "Total Repaid",
          value: `KES ${data.summary.totalRepaid.toLocaleString()}`,
        },
        {
          label: "Fees & Interest",
          value: `KES ${data.summary.totalFees.toLocaleString()}`,
        },
        {
          label: "Current Outstanding",
          value: `KES ${data.summary.currentOutstanding.toLocaleString()}`,
        },
      ],
      company: { name: "PesaMaishaCapital" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="statement-${Date.now()}.pdf"`,
    );
    doc.pipe(res);
  } catch (error) {
    handleError(error, res);
  }
}

/* ============================================================
 * LOAN SUMMARY — JSON / CSV / PDF
 * ============================================================ */
export async function getLoanSummaryController(req: Request, res: Response) {
  try {
    const query = customerReportQuerySchema.parse(req.query);
    const data = await getCustomerLoanSummary(req.user!.userId);

    if (query.format === "json") {
      return res.json({ success: true, data });
    }

    if (query.format === "csv") {
      const rows = data.map((l) => ({
        LoanNumber: l.loanNumber,
        Product: l.product,
        Status: l.status,
        Principal: l.principal,
        Total: l.total,
        Paid: l.paid,
        Outstanding: l.outstanding,
        Progress: `${l.paidPct.toFixed(1)}%`,
        DisbursedAt: l.disbursedAt?.toISOString() ?? "",
        MaturityDate: l.maturityDate?.toISOString() ?? "",
      }));
      const csv = toCsv(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="loans-summary-${Date.now()}.csv"`,
      );
      return res.send(csv);
    }

    const doc = renderReportPdf({
      title: "My Loans Summary",
      subtitle: "All your loans at a glance",
      logoBuffer: getLogoBuffer(),
      columns: [
        { header: "Loan #", key: "loanNumber", width: 12 },
        { header: "Product", key: "product", width: 14 },
        { header: "Status", key: "status", width: 10 },
        { header: "Principal", key: "principal", width: 12, align: "right" },
        { header: "Paid", key: "paid", width: 12, align: "right" },
        { header: "Outstanding", key: "outstanding", width: 12, align: "right" },
        { header: "Progress", key: "progress", width: 10, align: "right" },
        { header: "Matures", key: "matures", width: 12 },
      ],
      rows: data.map((l) => ({
        loanNumber: l.loanNumber,
        product: l.product,
        status: l.status,
        principal: `KES ${l.principal.toLocaleString()}`,
        paid: `KES ${l.paid.toLocaleString()}`,
        outstanding: `KES ${l.outstanding.toLocaleString()}`,
        progress: `${l.paidPct.toFixed(0)}%`,
        matures: l.maturityDate ? l.maturityDate.toLocaleDateString() : "—",
      })),
      summary: [
        { label: "Total Loans", value: String(data.length) },
        {
          label: "Total Borrowed",
          value: `KES ${data.reduce((s, l) => s + l.principal, 0).toLocaleString()}`,
        },
        {
          label: "Total Repaid",
          value: `KES ${data.reduce((s, l) => s + l.paid, 0).toLocaleString()}`,
        },
        {
          label: "Total Outstanding",
          value: `KES ${data.reduce((s, l) => s + l.outstanding, 0).toLocaleString()}`,
        },
      ],
      company: { name: "PesaMaishaCapital" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="loans-summary-${Date.now()}.pdf"`,
    );
    doc.pipe(res);
  } catch (error) {
    handleError(error, res);
  }
}

/* ============================================================
 * PAYMENT HISTORY — JSON / CSV / PDF
 * ============================================================ */
export async function getPaymentHistoryController(req: Request, res: Response) {
  try {
    const query = customerReportQuerySchema.parse(req.query);
    const data = await getCustomerPaymentHistory(req.user!.userId, {
      startDate: query.startDate,
      endDate: query.endDate,
      loanId: query.loanId,
    });

    if (query.format === "json") {
      return res.json({ success: true, data });
    }

    if (query.format === "csv") {
      const rows = data.payments.map((p) => ({
        Date: p.createdAt.toISOString(),
        Reference: p.reference,
        Loan: p.loanNumber,
        Amount: p.amount,
        Method: p.method,
        Status: p.status,
        Receipt: p.receipt ?? "",
      }));
      const csv = toCsv(rows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payments-${Date.now()}.csv"`,
      );
      return res.send(csv);
    }

    const doc = renderReportPdf({
      title: "Payment History",
      subtitle: "All payments you have made",
      logoBuffer: getLogoBuffer(),
      columns: [
        { header: "Date", key: "date", width: 12 },
        { header: "Reference", key: "ref", width: 18 },
        { header: "Loan", key: "loan", width: 12 },
        { header: "Amount", key: "amount", width: 12, align: "right" },
        { header: "Method", key: "method", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Receipt", key: "receipt", width: 18 },
      ],
      rows: data.payments.map((p) => ({
        date: p.createdAt.toLocaleDateString(),
        ref: p.reference,
        loan: p.loanNumber,
        amount: `KES ${p.amount.toLocaleString()}`,
        method: p.method,
        status: p.status,
        receipt: p.receipt ?? "—",
      })),
      summary: [
        { label: "Payments", value: String(data.summary.totalPayments) },
        { label: "Completed", value: String(data.summary.totalCompleted) },
        {
          label: "Total Paid",
          value: `KES ${data.summary.totalPaid.toLocaleString()}`,
        },
      ],
      company: { name: "PesaMaishaCapital" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="payments-${Date.now()}.pdf"`,
    );
    doc.pipe(res);
  } catch (error) {
    handleError(error, res);
  }
}


// import type { Request, Response } from "express";
// import {
//   getCustomerAccountStatement,
//   getCustomerLoanSummary,
//   getCustomerPaymentHistory,
// } from "../services/customerReport.service.js";
// import { renderReportPdf } from "../utils/pdfReport.js";
// import { toCsv } from "../utils/csv.js";
// import { prisma } from "../config/prisma.js";
// import { customerReportQuerySchema } from "../schemas/customerReport.schema.js";

// function handleError(error: unknown, res: Response) {
//   return res.status(400).json({
//     success: false,
//     message: error instanceof Error ? error.message : "Failed",
//   });
// }

// /* ============================================================
//  * STATEMENT
//  * ============================================================ */
// export async function getStatementController(req: Request, res: Response) {
//   try {
//     const query = customerReportQuerySchema.parse(req.query);
//     const data = await getCustomerAccountStatement(req.user!.userId, {
//       startDate: query.startDate,
//       endDate: query.endDate,
//       loanId: query.loanId,
//     });

//     if (query.format === "json") {
//       return res.json({ success: true, data });
//     }

//     if (query.format === "csv") {
//       const rows = data.transactions.map((t) => ({
//         Date: t.createdAt.toISOString(),
//         Loan: t.loanNumber,
//         Type: t.type,
//         Reference: t.reference ?? t.transactionNumber,
//         Description: t.description ?? "",
//         Amount: t.amount,
//         BalanceAfter: t.balanceAfter,
//       }));
//       const csv = toCsv(rows);
//       res.setHeader("Content-Type", "text/csv; charset=utf-8");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="statement-${Date.now()}.csv"`,
//       );
//       return res.send(csv);
//     }

//     /* PDF */
//     const doc = renderReportPdf({
//       title: "Account Statement",
//       subtitle: data.customer
//         ? `${data.customer.firstName} ${data.customer.lastName} · ${data.customer.email}`
//         : undefined,
//       columns: [
//         { header: "Date", key: "date", width: 12 },
//         { header: "Loan", key: "loan", width: 12 },
//         { header: "Type", key: "type", width: 12 },
//         { header: "Description", key: "desc", width: 22 },
//         { header: "Reference", key: "ref", width: 16 },
//         { header: "Amount", key: "amount", width: 12, align: "right" },
//         { header: "Balance", key: "balance", width: 12, align: "right" },
//       ],
//       rows: data.transactions.map((t) => ({
//         date: t.createdAt.toLocaleDateString(),
//         loan: t.loanNumber,
//         type: t.type,
//         desc: t.description ?? "",
//         ref: t.payment?.receipt ?? t.reference ?? t.transactionNumber,
//         amount: `${t.type === "DISBURSEMENT" ? "+" : "-"}KES ${t.amount.toLocaleString()}`,
//         balance: `KES ${t.balanceAfter.toLocaleString()}`,
//       })),
//       summary: [
//         { label: "Total Disbursed", value: `KES ${data.summary.totalDisbursed.toLocaleString()}` },
//         { label: "Total Repaid", value: `KES ${data.summary.totalRepaid.toLocaleString()}` },
//         { label: "Fees & Interest", value: `KES ${data.summary.totalFees.toLocaleString()}` },
//         { label: "Current Outstanding", value: `KES ${data.summary.currentOutstanding.toLocaleString()}` },
//       ],
//       company: { name: "PesaMaishaCapital" },
//     });

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `inline; filename="statement-${Date.now()}.pdf"`,
//     );
//     doc.pipe(res);
//   } catch (error) {
//     handleError(error, res);
//   }
// }

// /* ============================================================
//  * LOAN SUMMARY
//  * ============================================================ */
// export async function getLoanSummaryController(req: Request, res: Response) {
//   try {
//     const query = customerReportQuerySchema.parse(req.query);
//     const data = await getCustomerLoanSummary(req.user!.userId);

//     if (query.format === "json") {
//       return res.json({ success: true, data });
//     }

//     if (query.format === "csv") {
//       const rows = data.map((l) => ({
//         LoanNumber: l.loanNumber,
//         Product: l.product,
//         Status: l.status,
//         Principal: l.principal,
//         Total: l.total,
//         Paid: l.paid,
//         Outstanding: l.outstanding,
//         Progress: `${l.paidPct.toFixed(1)}%`,
//         DisbursedAt: l.disbursedAt?.toISOString() ?? "",
//         MaturityDate: l.maturityDate?.toISOString() ?? "",
//       }));
//       const csv = toCsv(rows);
//       res.setHeader("Content-Type", "text/csv; charset=utf-8");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="loans-summary-${Date.now()}.csv"`,
//       );
//       return res.send(csv);
//     }

//     const doc = renderReportPdf({
//       title: "My Loans Summary",
//       columns: [
//         { header: "Loan #", key: "loanNumber", width: 12 },
//         { header: "Product", key: "product", width: 14 },
//         { header: "Status", key: "status", width: 10 },
//         { header: "Principal", key: "principal", width: 12, align: "right" },
//         { header: "Paid", key: "paid", width: 12, align: "right" },
//         { header: "Outstanding", key: "outstanding", width: 12, align: "right" },
//         { header: "Progress", key: "progress", width: 10, align: "right" },
//         { header: "Matures", key: "matures", width: 12 },
//       ],
//       rows: data.map((l) => ({
//         loanNumber: l.loanNumber,
//         product: l.product,
//         status: l.status,
//         principal: `KES ${l.principal.toLocaleString()}`,
//         paid: `KES ${l.paid.toLocaleString()}`,
//         outstanding: `KES ${l.outstanding.toLocaleString()}`,
//         progress: `${l.paidPct.toFixed(0)}%`,
//         matures: l.maturityDate ? l.maturityDate.toLocaleDateString() : "—",
//       })),
//       summary: [
//         { label: "Total Loans", value: String(data.length) },
//         {
//           label: "Total Borrowed",
//           value: `KES ${data.reduce((s, l) => s + l.principal, 0).toLocaleString()}`,
//         },
//         {
//           label: "Total Repaid",
//           value: `KES ${data.reduce((s, l) => s + l.paid, 0).toLocaleString()}`,
//         },
//         {
//           label: "Total Outstanding",
//           value: `KES ${data.reduce((s, l) => s + l.outstanding, 0).toLocaleString()}`,
//         },
//       ],
//       company: { name: "PesaMaishaCapital" },
//     });
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `inline; filename="loans-summary-${Date.now()}.pdf"`,
//     );
//     doc.pipe(res);
//   } catch (error) {
//     handleError(error, res);
//   }
// }

// /* ============================================================
//  * PAYMENT HISTORY
//  * ============================================================ */
// export async function getPaymentHistoryController(req: Request, res: Response) {
//   try {
//     const query = customerReportQuerySchema.parse(req.query);
//     const data = await getCustomerPaymentHistory(req.user!.userId, {
//       startDate: query.startDate,
//       endDate: query.endDate,
//       loanId: query.loanId,
//     });

//     if (query.format === "json") {
//       return res.json({ success: true, data });
//     }

//     if (query.format === "csv") {
//       const rows = data.payments.map((p) => ({
//         Date: p.createdAt.toISOString(),
//         Reference: p.reference,
//         Loan: p.loanNumber,
//         Amount: p.amount,
//         Method: p.method,
//         Status: p.status,
//         Receipt: p.receipt ?? "",
//       }));
//       const csv = toCsv(rows);
//       res.setHeader("Content-Type", "text/csv; charset=utf-8");
//       res.setHeader(
//         "Content-Disposition",
//         `attachment; filename="payments-${Date.now()}.csv"`,
//       );
//       return res.send(csv);
//     }

//     const doc = renderReportPdf({
//       title: "Payment History",
//       columns: [
//         { header: "Date", key: "date", width: 12 },
//         { header: "Reference", key: "ref", width: 18 },
//         { header: "Loan", key: "loan", width: 12 },
//         { header: "Amount", key: "amount", width: 12, align: "right" },
//         { header: "Method", key: "method", width: 12 },
//         { header: "Status", key: "status", width: 12 },
//         { header: "Receipt", key: "receipt", width: 18 },
//       ],
//       rows: data.payments.map((p) => ({
//         date: p.createdAt.toLocaleDateString(),
//         ref: p.reference,
//         loan: p.loanNumber,
//         amount: `KES ${p.amount.toLocaleString()}`,
//         method: p.method,
//         status: p.status,
//         receipt: p.receipt ?? "—",
//       })),
//       summary: [
//         { label: "Payments", value: String(data.summary.totalPayments) },
//         { label: "Completed", value: String(data.summary.totalCompleted) },
//         {
//           label: "Total Paid",
//           value: `KES ${data.summary.totalPaid.toLocaleString()}`,
//         },
//       ],
//       company: { name: "PesaMaishaCapital" },
//     });
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `inline; filename="payments-${Date.now()}.pdf"`,
//     );
//     doc.pipe(res);
//   } catch (error) {
//     handleError(error, res);
//   }
// }

// /* ============================================================
//  * AUTH HELPER — unused here since access is userId-scoped, but
//  * exported for future use if you want customer reports accessible
//  * to admins too (pass a target userId).
//  * ============================================================ */
// export async function verifyCustomerAccess(customerId: string) {
//   const customer = await prisma.user.findFirst({
//     where: { id: customerId, role: "CUSTOMER" },
//     select: { id: true },
//   });
//   if (!customer) throw new Error("Not a customer");
//   return customer;
// }
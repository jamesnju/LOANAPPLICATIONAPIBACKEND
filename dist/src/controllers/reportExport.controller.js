import { reportDateQuerySchema } from "../schemas/report.schema.js";
import { getLoanPortfolioReport, getPaymentReport, getOverdueLoanReport, getApplicationReport, } from "../services/report.service.js";
import { toCsv } from "../utils/csv.js";
import { renderReportPdf } from "../utils/pdfReport.js";
import { getLogoBuffer } from "../utils/logo.js";
/* ============================================================
 * RESPONSE HELPERS
 * ============================================================ */
function sendCsv(res, filename, rows, columns) {
    const csv = toCsv(rows, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
}
function sendPdf(res, filename, doc) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
}
/* ============================================================
 * LOAN PORTFOLIO — CSV + PDF
 * ============================================================ */
export async function exportLoanPortfolioController(req, res) {
    try {
        const format = String(req.query.format ?? "csv").toLowerCase();
        const filters = reportDateQuerySchema.parse(req.query);
        const { loans } = await getLoanPortfolioReport(req.user.userId, {
            ...filters,
            page: 1,
            limit: 10_000,
        });
        const flat = loans.map((l) => ({
            LoanNumber: l.loanNumber,
            Customer: `${l.user.firstName} ${l.user.lastName}`,
            Email: l.user.email,
            Phone: l.user.phone ?? "",
            Product: l.loanProduct.name,
            Principal: Number(l.principalAmount),
            Outstanding: Number(l.outstandingAmount),
            Paid: Number(l.amountPaid),
            Status: l.status,
            DisbursedAt: l.disbursedAt
                ? l.disbursedAt.toISOString().slice(0, 10)
                : "",
            MaturityDate: l.maturityDate
                ? l.maturityDate.toISOString().slice(0, 10)
                : "",
        }));
        if (format === "pdf") {
            const doc = renderReportPdf({
                title: "Loan Portfolio Report",
                subtitle: "All loans on the platform",
                logoBuffer: getLogoBuffer(),
                columns: [
                    { header: "Loan #", key: "LoanNumber", width: 10 },
                    { header: "Customer", key: "Customer", width: 15 },
                    { header: "Product", key: "Product", width: 12 },
                    { header: "Principal", key: "Principal", width: 10, align: "right" },
                    { header: "Outstanding", key: "Outstanding", width: 10, align: "right" },
                    { header: "Paid", key: "Paid", width: 10, align: "right" },
                    { header: "Status", key: "Status", width: 10 },
                    { header: "Disbursed", key: "DisbursedAt", width: 10 },
                ],
                rows: flat,
                summary: [
                    { label: "Total Loans", value: String(flat.length) },
                    {
                        label: "Total Principal",
                        value: `KES ${flat
                            .reduce((s, r) => s + r.Principal, 0)
                            .toLocaleString()}`,
                    },
                    {
                        label: "Total Outstanding",
                        value: `KES ${flat
                            .reduce((s, r) => s + r.Outstanding, 0)
                            .toLocaleString()}`,
                    },
                    {
                        label: "Total Collected",
                        value: `KES ${flat
                            .reduce((s, r) => s + r.Paid, 0)
                            .toLocaleString()}`,
                    },
                ],
            });
            return sendPdf(res, `loan-portfolio-${Date.now()}.pdf`, doc);
        }
        return sendCsv(res, `loan-portfolio-${Date.now()}.csv`, flat);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Export failed",
        });
    }
}
/* ============================================================
 * PAYMENTS — CSV + PDF
 * ============================================================ */
export async function exportPaymentsController(req, res) {
    try {
        const format = String(req.query.format ?? "csv").toLowerCase();
        const filters = reportDateQuerySchema.parse(req.query);
        const { payments } = await getPaymentReport(req.user.userId, {
            ...filters,
            page: 1,
            limit: 10_000,
        });
        const flat = payments.map((p) => ({
            Reference: p.paymentReference,
            Loan: p.loan.loanNumber,
            Amount: Number(p.amount),
            Method: p.paymentMethod,
            Status: p.status,
            Receipt: p.transactionReference ?? "",
            ProcessedAt: p.processedAt ? p.processedAt.toISOString() : "",
            CreatedAt: p.createdAt.toISOString(),
        }));
        if (format === "pdf") {
            const doc = renderReportPdf({
                title: "Payment Report",
                subtitle: "All completed payments",
                logoBuffer: getLogoBuffer(),
                columns: [
                    { header: "Reference", key: "Reference", width: 15 },
                    { header: "Loan #", key: "Loan", width: 12 },
                    { header: "Amount", key: "Amount", width: 10, align: "right" },
                    { header: "Method", key: "Method", width: 10 },
                    { header: "Status", key: "Status", width: 10 },
                    { header: "Receipt", key: "Receipt", width: 15 },
                    { header: "Processed", key: "ProcessedAt", width: 15 },
                ],
                rows: flat,
                summary: [
                    { label: "Payments", value: String(flat.length) },
                    {
                        label: "Total",
                        value: `KES ${flat
                            .reduce((s, r) => s + r.Amount, 0)
                            .toLocaleString()}`,
                    },
                ],
            });
            return sendPdf(res, `payments-${Date.now()}.pdf`, doc);
        }
        return sendCsv(res, `payments-${Date.now()}.csv`, flat);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Export failed",
        });
    }
}
/* ============================================================
 * OVERDUE — CSV + PDF
 * ============================================================ */
export async function exportOverdueController(req, res) {
    try {
        const format = String(req.query.format ?? "csv").toLowerCase();
        const loans = await getOverdueLoanReport(req.user.userId);
        const flat = loans.map((l) => ({
            LoanNumber: l.loanNumber,
            Customer: `${l.user.firstName} ${l.user.lastName}`,
            Phone: l.user.phone ?? "",
            Product: l.loanProduct.name,
            Outstanding: Number(l.outstandingAmount),
            MaturityDate: l.maturityDate
                ? l.maturityDate.toISOString().slice(0, 10)
                : "",
            DaysOverdue: l.maturityDate
                ? Math.floor((Date.now() - l.maturityDate.getTime()) / 86400000)
                : 0,
        }));
        if (format === "pdf") {
            const doc = renderReportPdf({
                title: "Overdue Loans Report",
                subtitle: "Loans past their maturity date",
                logoBuffer: getLogoBuffer(),
                columns: [
                    { header: "Loan #", key: "LoanNumber", width: 12 },
                    { header: "Customer", key: "Customer", width: 18 },
                    { header: "Phone", key: "Phone", width: 12 },
                    { header: "Product", key: "Product", width: 15 },
                    { header: "Outstanding", key: "Outstanding", width: 12, align: "right" },
                    { header: "Maturity", key: "MaturityDate", width: 12 },
                    { header: "Days Overdue", key: "DaysOverdue", width: 10, align: "right" },
                ],
                rows: flat,
                summary: [
                    { label: "Overdue Loans", value: String(flat.length) },
                    {
                        label: "Total Overdue",
                        value: `KES ${flat
                            .reduce((s, r) => s + r.Outstanding, 0)
                            .toLocaleString()}`,
                    },
                ],
            });
            return sendPdf(res, `overdue-loans-${Date.now()}.pdf`, doc);
        }
        return sendCsv(res, `overdue-loans-${Date.now()}.csv`, flat);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Export failed",
        });
    }
}
/* ============================================================
 * APPLICATIONS — CSV + PDF
 * ============================================================ */
export async function exportApplicationsController(req, res) {
    try {
        const format = String(req.query.format ?? "csv").toLowerCase();
        const filters = reportDateQuerySchema.parse(req.query);
        const { applications } = await getApplicationReport(req.user.userId, {
            ...filters,
            page: 1,
            limit: 10_000,
        });
        const flat = applications.map((a) => ({
            ApplicationNumber: a.applicationNumber,
            Customer: `${a.user.firstName} ${a.user.lastName}`,
            Email: a.user.email,
            Product: a.loanProduct.name,
            RequestedAmount: Number(a.requestedAmount),
            RequestedDays: a.requestedDays,
            Status: a.status,
            SubmittedAt: a.submittedAt
                ? a.submittedAt.toISOString().slice(0, 10)
                : "",
        }));
        if (format === "pdf") {
            const doc = renderReportPdf({
                title: "Application Report",
                subtitle: "All loan applications",
                logoBuffer: getLogoBuffer(),
                columns: [
                    { header: "App #", key: "ApplicationNumber", width: 12 },
                    { header: "Customer", key: "Customer", width: 15 },
                    { header: "Product", key: "Product", width: 15 },
                    { header: "Amount", key: "RequestedAmount", width: 12, align: "right" },
                    { header: "Days", key: "RequestedDays", width: 8, align: "right" },
                    { header: "Status", key: "Status", width: 12 },
                    { header: "Submitted", key: "SubmittedAt", width: 12 },
                ],
                rows: flat,
                summary: [
                    { label: "Applications", value: String(flat.length) },
                    {
                        label: "Total Requested",
                        value: `KES ${flat
                            .reduce((s, r) => s + r.RequestedAmount, 0)
                            .toLocaleString()}`,
                    },
                ],
            });
            return sendPdf(res, `applications-${Date.now()}.pdf`, doc);
        }
        return sendCsv(res, `applications-${Date.now()}.csv`, flat);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Export failed",
        });
    }
}
//# sourceMappingURL=reportExport.controller.js.map
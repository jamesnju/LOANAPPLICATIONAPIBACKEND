// src/utils/applicationPdf.ts
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
 * RENDER — UNSIGNED APPLICATION
 * ============================================================ */
export function renderUnsignedApplicationPdf(input) {
    const { application, imageBuffers, logoBuffer } = input;
    const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
            Title: `Loan Application ${application.applicationNumber}`,
            Author: "PesaMaishaCapital",
            Subject: "Loan Application (unsigned)",
        },
    });
    /* ── Header band with logo ── */
    const header = drawPdfHeader(doc, {
        subtitle: "Loan Application (Unsigned)",
        logoBuffer,
    });
    const { pageWidth, left, right } = header;
    let y = header.y;
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
        .text(new Date(application.createdAt).toLocaleString(), right - 200, y + 12, { width: 200, align: "right" });
    y += 50;
    /* ── Section helper ── */
    const section = (title, rows) => {
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
            const h = Math.max(doc.heightOfString(value || "—", { width: pageWidth - 200 }), 12);
            y += h + 6;
        });
        y += 8;
    };
    /* ── Image helpers ── */
    const imageSectionHeader = (title) => {
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
    const imageRow = (leftItem, rightItem) => {
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
    const customerFront = application.documents?.find((d) => d.type === "NATIONAL_ID_FRONT" && d.status !== "REJECTED");
    const customerBack = application.documents?.find((d) => d.type === "NATIONAL_ID_BACK" && d.status !== "REJECTED");
    if (customerFront || customerBack) {
        imageSectionHeader("Customer National ID");
        imageRow({ label: "Front of National ID", url: customerFront?.fileUrl }, { label: "Back of National ID", url: customerBack?.fileUrl });
    }
    /* ── Loan terms ── */
    const amount = Number(application.requestedAmount);
    const interestRate = Number(application.interestRate);
    const processingFee = Number(application.processingFee);
    const interestAmount = amount * (interestRate / 100);
    const totalPayable = amount + interestAmount + processingFee;
    section("Loan Terms", [
        ["Product", application.loanProduct.name],
        ["Product code", application.loanProduct.code],
        [
            "Amount",
            `KES ${amount.toLocaleString()}`,
        ],
        ["Term", `${application.requestedDays} days`],
        [
            "Interest rate",
            `${interestRate.toFixed(2)}% per term`,
        ],
        [
            "Total payable",
            `KES ${totalPayable.toLocaleString()}`,
        ],
        [
            "Processing fee",
            `KES ${processingFee.toLocaleString()}`,
        ],
        ["Purpose", application.purpose ?? "—"],
        ["Description", application.description ?? "—"],
    ]);
    /* ── Guarantors ── */
    if (application.guarantors?.length) {
        const rows = [];
        application.guarantors.forEach((g, i) => {
            rows.push([`Guarantor ${i + 1}`, `${g.firstName} ${g.lastName}`]);
            rows.push([
                "  Contact",
                `${g.phone}${g.email ? ` · ${g.email}` : ""}${g.relationship ? ` · ${g.relationship}` : ""}`,
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
        application.guarantors.forEach((g, i) => {
            const front = g.documents?.find((d) => d.type === "GUARANTOR_ID_FRONT" && d.status !== "REJECTED");
            const back = g.documents?.find((d) => d.type === "GUARANTOR_ID_BACK" && d.status !== "REJECTED");
            if (!front && !back)
                return;
            imageSectionHeader(`Guarantor ${i + 1} — ${g.firstName} ${g.lastName} — National ID`);
            imageRow({ label: `Guarantor ${i + 1} — Front`, url: front?.fileUrl }, { label: `Guarantor ${i + 1} — Back`, url: back?.fileUrl });
        });
    }
    /* ── Collateral ── */
    if (application.collateral?.length) {
        const rows = [];
        application.collateral.forEach((c, i) => {
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
        application.collateral.forEach((c, i) => {
            const photos = (c.documents ?? []).filter((d) => d.fileUrl && /image\//.test(d.mimeType ?? ""));
            if (photos.length === 0)
                return;
            imageSectionHeader(`Collateral ${i + 1} — ${c.description.slice(0, 60)}`);
            for (let j = 0; j < photos.length; j += 2) {
                const first = photos[j];
                const second = photos[j + 1];
                imageRow({
                    label: first.fileName ?? `Photo ${j + 1}`,
                    url: first.fileUrl,
                }, second
                    ? {
                        label: second.fileName ?? `Photo ${j + 2}`,
                        url: second.fileUrl,
                    }
                    : undefined);
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
        .text("This application has not yet been signed by the customer. It is a " +
        "preview generated for review purposes only and does not constitute " +
        "a legally binding agreement. To sign, the customer must complete " +
        "the electronic signature step in their account.", left + 12, y + 24, { width: pageWidth - 24 });
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
        .text(`Generated ${new Date().toLocaleString()} · ${application.applicationNumber}`, left, footerY + 6, { width: pageWidth, align: "center" });
    doc.end();
    return doc;
}
/* ============================================================
 * RENDER — SIGNED APPLICATION
 * ============================================================ */
export function renderApplicationPdf(input) {
    const { application, signature, hash, imageBuffers, logoBuffer } = input;
    const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
            Title: `Loan Application ${application.applicationNumber}`,
            Author: "PesaMaishaCapital",
            Subject: "Signed Loan Application",
        },
    });
    /* ── Header band with logo ── */
    const header = drawPdfHeader(doc, {
        subtitle: "Signed Loan Application",
        logoBuffer,
    });
    const { pageWidth, left, right } = header;
    let y = header.y;
    /* ── Meta row ── */
    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(THEME.muted)
        .text("APPLICATION NUMBER", left, y);
    doc.text("DATE SIGNED", right - 200, y, { width: 200, align: "right" });
    doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(THEME.text)
        .text(application.applicationNumber, left, y + 12);
    doc
        .font("Helvetica")
        .text(new Date(signature.signedAt).toLocaleString(), right - 200, y + 12, {
        width: 200,
        align: "right",
    });
    y += 50;
    /* ── Section helper ── */
    const section = (title, rows) => {
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
            const h = Math.max(doc.heightOfString(value || "—", { width: pageWidth - 200 }), 12);
            y += h + 6;
        });
        y += 8;
    };
    /* ── Image section header ── */
    const imageSectionHeader = (title) => {
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
    /* ── Two-column image row ── */
    const imageRow = (leftItem, rightItem) => {
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
    const customerFront = application.documents?.find((d) => d.type === "NATIONAL_ID_FRONT" && d.status !== "REJECTED");
    const customerBack = application.documents?.find((d) => d.type === "NATIONAL_ID_BACK" && d.status !== "REJECTED");
    if (customerFront || customerBack) {
        imageSectionHeader("Customer National ID");
        imageRow({ label: "Front of National ID", url: customerFront?.fileUrl }, { label: "Back of National ID", url: customerBack?.fileUrl });
    }
    /* ── Loan terms ── */
    const amount = Number(application.requestedAmount);
    const interestRate = Number(application.interestRate);
    const processingFee = Number(application.processingFee);
    const interestAmount = amount * (interestRate / 100);
    const totalPayable = amount + interestAmount + processingFee;
    section("Loan Terms", [
        ["Product", application.loanProduct.name],
        ["Product code", application.loanProduct.code],
        [
            "Amount",
            `KES ${amount.toLocaleString()}`,
        ],
        ["Term", `${application.requestedDays} days`],
        [
            "Interest rate",
            `${interestRate.toFixed(2)}% per term`,
        ],
        [
            "Total payable",
            `KES ${totalPayable.toLocaleString()}`,
        ],
        [
            "Processing fee",
            `KES ${processingFee.toLocaleString()}`,
        ],
        ["Purpose", application.purpose ?? "—"],
        ["Description", application.description ?? "—"],
    ]);
    /* ── Guarantors ── */
    if (application.guarantors?.length) {
        const rows = [];
        application.guarantors.forEach((g, i) => {
            rows.push([`Guarantor ${i + 1}`, `${g.firstName} ${g.lastName}`]);
            rows.push([
                "  Contact",
                `${g.phone}${g.email ? ` · ${g.email}` : ""}${g.relationship ? ` · ${g.relationship}` : ""}`,
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
        application.guarantors.forEach((g, i) => {
            const front = g.documents?.find((d) => d.type === "GUARANTOR_ID_FRONT" && d.status !== "REJECTED");
            const back = g.documents?.find((d) => d.type === "GUARANTOR_ID_BACK" && d.status !== "REJECTED");
            if (!front && !back)
                return;
            imageSectionHeader(`Guarantor ${i + 1} — ${g.firstName} ${g.lastName} — National ID`);
            imageRow({ label: `Guarantor ${i + 1} — Front`, url: front?.fileUrl }, { label: `Guarantor ${i + 1} — Back`, url: back?.fileUrl });
        });
    }
    /* ── Collateral ── */
    if (application.collateral?.length) {
        const rows = [];
        application.collateral.forEach((c, i) => {
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
        application.collateral.forEach((c, i) => {
            const photos = (c.documents ?? []).filter((d) => d.fileUrl && /image\//.test(d.mimeType ?? ""));
            if (photos.length === 0)
                return;
            imageSectionHeader(`Collateral ${i + 1} — ${c.description.slice(0, 60)}`);
            for (let j = 0; j < photos.length; j += 2) {
                const first = photos[j];
                const second = photos[j + 1];
                imageRow({
                    label: first.fileName ?? `Photo ${j + 1}`,
                    url: first.fileUrl,
                }, second
                    ? {
                        label: second.fileName ?? `Photo ${j + 2}`,
                        url: second.fileUrl,
                    }
                    : undefined);
            }
        });
    }
    /* ── Terms & Conditions ── */
    if (signature.termsVersion) {
        if (y > doc.page.height - 300) {
            doc.addPage();
            y = doc.page.margins.top;
        }
        doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
        doc
            .fillColor(THEME.muted)
            .fontSize(8)
            .font("Helvetica-Bold")
            .text(`TERMS & CONDITIONS — VERSION ${signature.termsVersion}`, left + 10, y + 7);
        y += 30;
        const termsBody = signature.termsBody ?? "(Terms text attached separately)";
        doc
            .fillColor(THEME.text)
            .fontSize(8)
            .font("Helvetica")
            .text(termsBody, left, y, {
            width: pageWidth,
            align: "left",
            lineGap: 2,
        });
        y = doc.y + 20;
    }
    /* ── Signature block ── */
    if (y > doc.page.height - 150) {
        doc.addPage();
        y = doc.page.margins.top;
    }
    y += 20;
    doc
        .rect(left, y, pageWidth, 60)
        .fillAndStroke(THEME.surface, THEME.border);
    doc
        .fillColor(THEME.muted)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("ELECTRONIC SIGNATURE", left + 12, y + 10);
    doc
        .fillColor(THEME.text)
        .fontSize(14)
        .font("Helvetica-Oblique")
        .text(signature.signatureData ?? "—", left + 12, y + 26);
    doc
        .fillColor(THEME.muted)
        .fontSize(7)
        .font("Helvetica")
        .text(`Signed electronically on ${new Date(signature.signedAt).toLocaleString()} by ${application.user.email}`, left + 12, y + 46);
    y += 80;
    /* ── Integrity hash ── */
    doc
        .fillColor(THEME.muted)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("DOCUMENT INTEGRITY", left, y);
    y += 12;
    doc
        .fillColor(THEME.text)
        .fontSize(8)
        .font("Courier")
        .text(hash, left, y, { width: pageWidth });
    y += 20;
    doc
        .fillColor(THEME.muted)
        .fontSize(7)
        .font("Helvetica")
        .text("This document can be verified at any time using the SHA-256 hash above. " +
        "Any modification to the document or the underlying signed data will " +
        "invalidate the hash.", left, y, { width: pageWidth });
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
        .text(`Generated ${new Date().toLocaleString()} · ${application.applicationNumber}`, left, footerY + 6, { width: pageWidth, align: "center" });
    doc.end();
    return doc;
}
/* ============================================================
 * RENDER — BUFFER
 * ============================================================ */
export function renderApplicationPdfToBuffer(input) {
    return new Promise((resolve, reject) => {
        const doc = renderApplicationPdf(input);
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
    });
}
/* ============================================================
 * DRAW IMAGE OR PLACEHOLDER
 * ============================================================ */
function drawImageBox(doc, opts) {
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
        }
        catch (err) {
            console.warn("[drawImageBox] failed to draw image:", url, err);
            drawPlaceholder(doc, x, y, width, height, "Image failed to load");
        }
    }
    else {
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
function drawPlaceholder(doc, x, y, width, height, text) {
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
// // src/utils/applicationPdf.ts
// import PDFDocument from "pdfkit";
// import { drawPdfHeader, PDF_BRAND } from "./logo.js";
// /* ============================================================
//  * THEME
//  * ============================================================ */
// const THEME = {
//   primary: PDF_BRAND.teal,
//   text: PDF_BRAND.text,
//   muted: PDF_BRAND.muted,
//   border: PDF_BRAND.border,
//   surface: PDF_BRAND.surface,
// };
// /* ============================================================
//  * TYPES
//  * ============================================================ */
// export interface ApplicationPdfInput {
//   application: any;
//   signature: any;
//   hash: string;
//   imageBuffers?: Map<string, Buffer>;
//   logoBuffer?: Buffer | null;
// }
// export interface UnsignedApplicationPdfInput {
//   application: any;
//   imageBuffers?: Map<string, Buffer>;
//   logoBuffer?: Buffer | null;
// }
// /* ============================================================
//  * RENDER — UNSIGNED APPLICATION
//  * ============================================================ */
// export function renderUnsignedApplicationPdf(
//   input: UnsignedApplicationPdfInput,
// ): PDFKit.PDFDocument {
//   const { application, imageBuffers, logoBuffer } = input;
//   const doc = new PDFDocument({
//     size: "A4",
//     margin: 50,
//     info: {
//       Title: `Loan Application ${application.applicationNumber}`,
//       Author: "PesaMaishaCapital",
//       Subject: "Loan Application (unsigned)",
//     },
//   });
//   /* ── Header band with logo ── */
//   const header = drawPdfHeader(doc, {
//     subtitle: "Loan Application (Unsigned)",
//     logoBuffer,
//   });
//   const { pageWidth, left, right } = header;
//   let y = header.y;
//   /* ── Status pill ── */
//   const statusLabel = `STATUS: ${application.status}`;
//   const pillWidth = doc.widthOfString(statusLabel) + 24;
//   doc
//     .roundedRect(right - pillWidth, 50, pillWidth, 22, 11)
//     .fillAndStroke("#fef3c7", "#fcd34d");
//   doc
//     .fillColor("#92400e")
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .text(statusLabel, right - pillWidth, 56, {
//       width: pillWidth,
//       align: "center",
//     });
//   /* ── Diagonal watermark ── */
//   doc.save();
//   doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
//   doc
//     .fillColor("#cbd5e1")
//     .opacity(0.25)
//     .fontSize(72)
//     .font("Helvetica-Bold")
//     .text("UNSIGNED", 0, doc.page.height / 2 - 40, {
//       width: doc.page.width,
//       align: "center",
//     });
//   doc.restore();
//   doc.opacity(1);
//   /* ── Meta row ── */
//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.muted)
//     .text("APPLICATION NUMBER", left, y);
//   doc.text("DATE", right - 200, y, { width: 200, align: "right" });
//   doc
//     .fontSize(11)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.text)
//     .text(application.applicationNumber, left, y + 12);
//   doc
//     .font("Helvetica")
//     .text(
//       new Date(application.createdAt).toLocaleString(),
//       right - 200,
//       y + 12,
//       { width: 200, align: "right" },
//     );
//   y += 50;
//   /* ── Section helper ── */
//   const section = (title: string, rows: [string, string][]) => {
//     if (y > doc.page.height - 200) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
//     doc
//       .fillColor(THEME.muted)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text(title.toUpperCase(), left + 10, y + 7);
//     y += 22;
//     rows.forEach(([label, value]) => {
//       doc
//         .fillColor(THEME.muted)
//         .fontSize(9)
//         .font("Helvetica")
//         .text(label, left + 10, y, { width: 180 });
//       doc
//         .fillColor(THEME.text)
//         .fontSize(9)
//         .font("Helvetica")
//         .text(value || "—", left + 200, y, { width: pageWidth - 200 });
//       const h = Math.max(
//         doc.heightOfString(value || "—", { width: pageWidth - 200 }),
//         12,
//       );
//       y += h + 6;
//     });
//     y += 8;
//   };
//   /* ── Image helpers ── */
//   const imageSectionHeader = (title: string) => {
//     if (y > doc.page.height - 220) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
//     doc
//       .fillColor(THEME.muted)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text(title.toUpperCase(), left + 10, y + 7);
//     y += 32;
//   };
//   const imageRow = (
//     leftItem: { label: string; url?: string | null },
//     rightItem?: { label: string; url?: string | null },
//   ) => {
//     const gap = 16;
//     const boxWidth = (pageWidth - gap) / 2;
//     const boxHeight = 140;
//     if (y > doc.page.height - 200) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     drawImageBox(doc, {
//       x: left,
//       y,
//       width: boxWidth,
//       height: boxHeight,
//       label: leftItem.label,
//       url: leftItem.url,
//       imageBuffers,
//     });
//     if (rightItem) {
//       drawImageBox(doc, {
//         x: left + boxWidth + gap,
//         y,
//         width: boxWidth,
//         height: boxHeight,
//         label: rightItem.label,
//         url: rightItem.url,
//         imageBuffers,
//       });
//     }
//     y += boxHeight + 20;
//   };
//   /* ── Customer ── */
//   section("Customer", [
//     [
//       "Full name",
//       `${application.user.firstName} ${application.user.lastName}`,
//     ],
//     ["Email", application.user.email],
//     ["Phone", application.user.phone ?? "—"],
//     ["National ID", application.user.nationalId ?? "—"],
//     [
//       "Date of birth",
//       application.user.dateOfBirth
//         ? new Date(application.user.dateOfBirth).toLocaleDateString()
//         : "—",
//     ],
//     ["Gender", application.user.gender ?? "—"],
//     ["Employment", application.user.employmentType ?? "—"],
//     ["Employer", application.user.employerName ?? "—"],
//     [
//       "Monthly income",
//       application.user.monthlyIncome
//         ? `KES ${Number(application.user.monthlyIncome).toLocaleString()}`
//         : "—",
//     ],
//   ]);
//   /* ── Customer National ID images ── */
//   const customerFront = application.documents?.find(
//     (d: any) => d.type === "NATIONAL_ID_FRONT" && d.status !== "REJECTED",
//   );
//   const customerBack = application.documents?.find(
//     (d: any) => d.type === "NATIONAL_ID_BACK" && d.status !== "REJECTED",
//   );
//   if (customerFront || customerBack) {
//     imageSectionHeader("Customer National ID");
//     imageRow(
//       { label: "Front of National ID", url: customerFront?.fileUrl },
//       { label: "Back of National ID", url: customerBack?.fileUrl },
//     );
//   }
//   /* ── Loan terms ── */
//   section("Loan Terms", [
//     ["Product", application.loanProduct.name],
//     ["Product code", application.loanProduct.code],
//     [
//       "Amount",
//       `KES ${Number(application.requestedAmount).toLocaleString()}`,
//     ],
//     ["Term", `${application.requestedDays} days`],
//     [
//       "Interest rate",
//       `${Number(application.interestRate).toFixed(2)}% per term`,
//     ],
//     [
//       "Processing fee",
//       `KES ${Number(application.processingFee).toLocaleString()}`,
//     ],
//     ["Purpose", application.purpose ?? "—"],
//     ["Description", application.description ?? "—"],
//   ]);
//   /* ── Guarantors ── */
//   if (application.guarantors?.length) {
//     const rows: [string, string][] = [];
//     application.guarantors.forEach((g: any, i: number) => {
//       rows.push([`Guarantor ${i + 1}`, `${g.firstName} ${g.lastName}`]);
//       rows.push([
//         "  Contact",
//         `${g.phone}${g.email ? ` · ${g.email}` : ""}${
//           g.relationship ? ` · ${g.relationship}` : ""
//         }`,
//       ]);
//       rows.push(["  National ID", g.nationalId]);
//       if (g.guaranteedAmount != null) {
//         rows.push([
//           "  Guaranteed amount",
//           `KES ${Number(g.guaranteedAmount).toLocaleString()}`,
//         ]);
//       }
//     });
//     section("Guarantors", rows);
//     application.guarantors.forEach((g: any, i: number) => {
//       const front = g.documents?.find(
//         (d: any) =>
//           d.type === "GUARANTOR_ID_FRONT" && d.status !== "REJECTED",
//       );
//       const back = g.documents?.find(
//         (d: any) =>
//           d.type === "GUARANTOR_ID_BACK" && d.status !== "REJECTED",
//       );
//       if (!front && !back) return;
//       imageSectionHeader(
//         `Guarantor ${i + 1} — ${g.firstName} ${g.lastName} — National ID`,
//       );
//       imageRow(
//         { label: `Guarantor ${i + 1} — Front`, url: front?.fileUrl },
//         { label: `Guarantor ${i + 1} — Back`, url: back?.fileUrl },
//       );
//     });
//   }
//   /* ── Collateral ── */
//   if (application.collateral?.length) {
//     const rows: [string, string][] = [];
//     application.collateral.forEach((c: any, i: number) => {
//       rows.push([
//         `Item ${i + 1}`,
//         `${c.type.replace(/_/g, " ")} — ${c.description}`,
//       ]);
//       rows.push([
//         "  Estimated value",
//         `KES ${Number(c.estimatedValue).toLocaleString()}`,
//       ]);
//       if (c.registrationNumber) {
//         rows.push(["  Registration", c.registrationNumber]);
//       }
//     });
//     section("Collateral", rows);
//     application.collateral.forEach((c: any, i: number) => {
//       const photos = (c.documents ?? []).filter(
//         (d: any) => d.fileUrl && /image\//.test(d.mimeType ?? ""),
//       );
//       if (photos.length === 0) return;
//       imageSectionHeader(
//         `Collateral ${i + 1} — ${c.description.slice(0, 60)}`,
//       );
//       for (let j = 0; j < photos.length; j += 2) {
//         const first = photos[j];
//         const second = photos[j + 1];
//         imageRow(
//           {
//             label: first.fileName ?? `Photo ${j + 1}`,
//             url: first.fileUrl,
//           },
//           second
//             ? {
//                 label: second.fileName ?? `Photo ${j + 2}`,
//                 url: second.fileUrl,
//               }
//             : undefined,
//         );
//       }
//     });
//   }
//   /* ── Notice ── */
//   if (y > doc.page.height - 150) {
//     doc.addPage();
//     y = doc.page.margins.top;
//   }
//   y += 20;
//   doc
//     .rect(left, y, pageWidth, 60)
//     .fillAndStroke("#fef3c7", "#fcd34d");
//   doc
//     .fillColor("#92400e")
//     .fontSize(8)
//     .font("Helvetica-Bold")
//     .text("UNSIGNED DOCUMENT", left + 12, y + 10);
//   doc
//     .fillColor("#78350f")
//     .fontSize(8)
//     .font("Helvetica")
//     .text(
//       "This application has not yet been signed by the customer. It is a " +
//         "preview generated for review purposes only and does not constitute " +
//         "a legally binding agreement. To sign, the customer must complete " +
//         "the electronic signature step in their account.",
//       left + 12,
//       y + 24,
//       { width: pageWidth - 24 },
//     );
//   /* ── Footer ── */
//   const footerY = doc.page.height - doc.page.margins.bottom - 20;
//   doc
//     .moveTo(left, footerY)
//     .lineTo(right, footerY)
//     .strokeColor(THEME.border)
//     .lineWidth(0.5)
//     .stroke();
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica")
//     .text(
//       `Generated ${new Date().toLocaleString()} · ${application.applicationNumber}`,
//       left,
//       footerY + 6,
//       { width: pageWidth, align: "center" },
//     );
//   doc.end();
//   return doc;
// }
// /* ============================================================
//  * RENDER — SIGNED APPLICATION
//  * ============================================================ */
// export function renderApplicationPdf(
//   input: ApplicationPdfInput,
// ): PDFKit.PDFDocument {
//   const { application, signature, hash, imageBuffers, logoBuffer } = input;
//   const doc = new PDFDocument({
//     size: "A4",
//     margin: 50,
//     info: {
//       Title: `Loan Application ${application.applicationNumber}`,
//       Author: "PesaMaishaCapital",
//       Subject: "Signed Loan Application",
//     },
//   });
//   /* ── Header band with logo ── */
//   const header = drawPdfHeader(doc, {
//     subtitle: "Signed Loan Application",
//     logoBuffer,
//   });
//   const { pageWidth, left, right } = header;
//   let y = header.y;
//   /* ── Meta row ── */
//   doc
//     .fontSize(9)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.muted)
//     .text("APPLICATION NUMBER", left, y);
//   doc.text("DATE SIGNED", right - 200, y, { width: 200, align: "right" });
//   doc
//     .fontSize(11)
//     .font("Helvetica-Bold")
//     .fillColor(THEME.text)
//     .text(application.applicationNumber, left, y + 12);
//   doc
//     .font("Helvetica")
//     .text(new Date(signature.signedAt).toLocaleString(), right - 200, y + 12, {
//       width: 200,
//       align: "right",
//     });
//   y += 50;
//   /* ── Section helper ── */
//   const section = (title: string, rows: [string, string][]) => {
//     if (y > doc.page.height - 200) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
//     doc
//       .fillColor(THEME.muted)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text(title.toUpperCase(), left + 10, y + 7);
//     y += 22;
//     rows.forEach(([label, value]) => {
//       doc
//         .fillColor(THEME.muted)
//         .fontSize(9)
//         .font("Helvetica")
//         .text(label, left + 10, y, { width: 180 });
//       doc
//         .fillColor(THEME.text)
//         .fontSize(9)
//         .font("Helvetica")
//         .text(value || "—", left + 200, y, { width: pageWidth - 200 });
//       const h = Math.max(
//         doc.heightOfString(value || "—", { width: pageWidth - 200 }),
//         12,
//       );
//       y += h + 6;
//     });
//     y += 8;
//   };
//   /* ── Image section header ── */
//   const imageSectionHeader = (title: string) => {
//     if (y > doc.page.height - 220) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
//     doc
//       .fillColor(THEME.muted)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text(title.toUpperCase(), left + 10, y + 7);
//     y += 32;
//   };
//   /* ── Two-column image row ── */
//   const imageRow = (
//     leftItem: { label: string; url?: string | null },
//     rightItem?: { label: string; url?: string | null },
//   ) => {
//     const gap = 16;
//     const boxWidth = (pageWidth - gap) / 2;
//     const boxHeight = 140;
//     if (y > doc.page.height - 200) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     drawImageBox(doc, {
//       x: left,
//       y,
//       width: boxWidth,
//       height: boxHeight,
//       label: leftItem.label,
//       url: leftItem.url,
//       imageBuffers,
//     });
//     if (rightItem) {
//       drawImageBox(doc, {
//         x: left + boxWidth + gap,
//         y,
//         width: boxWidth,
//         height: boxHeight,
//         label: rightItem.label,
//         url: rightItem.url,
//         imageBuffers,
//       });
//     }
//     y += boxHeight + 20;
//   };
//   /* ── Customer ── */
//   section("Customer", [
//     [
//       "Full name",
//       `${application.user.firstName} ${application.user.lastName}`,
//     ],
//     ["Email", application.user.email],
//     ["Phone", application.user.phone ?? "—"],
//     ["National ID", application.user.nationalId ?? "—"],
//     [
//       "Date of birth",
//       application.user.dateOfBirth
//         ? new Date(application.user.dateOfBirth).toLocaleDateString()
//         : "—",
//     ],
//     ["Gender", application.user.gender ?? "—"],
//     ["Employment", application.user.employmentType ?? "—"],
//     ["Employer", application.user.employerName ?? "—"],
//     [
//       "Monthly income",
//       application.user.monthlyIncome
//         ? `KES ${Number(application.user.monthlyIncome).toLocaleString()}`
//         : "—",
//     ],
//   ]);
//   /* ── Customer National ID images ── */
//   const customerFront = application.documents?.find(
//     (d: any) => d.type === "NATIONAL_ID_FRONT" && d.status !== "REJECTED",
//   );
//   const customerBack = application.documents?.find(
//     (d: any) => d.type === "NATIONAL_ID_BACK" && d.status !== "REJECTED",
//   );
//   if (customerFront || customerBack) {
//     imageSectionHeader("Customer National ID");
//     imageRow(
//       { label: "Front of National ID", url: customerFront?.fileUrl },
//       { label: "Back of National ID", url: customerBack?.fileUrl },
//     );
//   }
//   /* ── Loan terms ── */
//   section("Loan Terms", [
//     ["Product", application.loanProduct.name],
//     ["Product code", application.loanProduct.code],
//     [
//       "Amount",
//       `KES ${Number(application.requestedAmount).toLocaleString()}`,
//     ],
//     ["Term", `${application.requestedDays} days`],
//     [
//       "Interest rate",
//       `${Number(application.interestRate).toFixed(2)}% per term`,
//     ],
//     [
//       "Processing fee",
//       `KES ${Number(application.processingFee).toLocaleString()}`,
//     ],
//     ["Purpose", application.purpose ?? "—"],
//     ["Description", application.description ?? "—"],
//   ]);
//   /* ── Guarantors ── */
//   if (application.guarantors?.length) {
//     const rows: [string, string][] = [];
//     application.guarantors.forEach((g: any, i: number) => {
//       rows.push([`Guarantor ${i + 1}`, `${g.firstName} ${g.lastName}`]);
//       rows.push([
//         "  Contact",
//         `${g.phone}${g.email ? ` · ${g.email}` : ""}${
//           g.relationship ? ` · ${g.relationship}` : ""
//         }`,
//       ]);
//       rows.push(["  National ID", g.nationalId]);
//       if (g.guaranteedAmount != null) {
//         rows.push([
//           "  Guaranteed amount",
//           `KES ${Number(g.guaranteedAmount).toLocaleString()}`,
//         ]);
//       }
//     });
//     section("Guarantors", rows);
//     application.guarantors.forEach((g: any, i: number) => {
//       const front = g.documents?.find(
//         (d: any) =>
//           d.type === "GUARANTOR_ID_FRONT" && d.status !== "REJECTED",
//       );
//       const back = g.documents?.find(
//         (d: any) =>
//           d.type === "GUARANTOR_ID_BACK" && d.status !== "REJECTED",
//       );
//       if (!front && !back) return;
//       imageSectionHeader(
//         `Guarantor ${i + 1} — ${g.firstName} ${g.lastName} — National ID`,
//       );
//       imageRow(
//         { label: `Guarantor ${i + 1} — Front`, url: front?.fileUrl },
//         { label: `Guarantor ${i + 1} — Back`, url: back?.fileUrl },
//       );
//     });
//   }
//   /* ── Collateral ── */
//   if (application.collateral?.length) {
//     const rows: [string, string][] = [];
//     application.collateral.forEach((c: any, i: number) => {
//       rows.push([
//         `Item ${i + 1}`,
//         `${c.type.replace(/_/g, " ")} — ${c.description}`,
//       ]);
//       rows.push([
//         "  Estimated value",
//         `KES ${Number(c.estimatedValue).toLocaleString()}`,
//       ]);
//       if (c.registrationNumber) {
//         rows.push(["  Registration", c.registrationNumber]);
//       }
//     });
//     section("Collateral", rows);
//     application.collateral.forEach((c: any, i: number) => {
//       const photos = (c.documents ?? []).filter(
//         (d: any) => d.fileUrl && /image\//.test(d.mimeType ?? ""),
//       );
//       if (photos.length === 0) return;
//       imageSectionHeader(
//         `Collateral ${i + 1} — ${c.description.slice(0, 60)}`,
//       );
//       for (let j = 0; j < photos.length; j += 2) {
//         const first = photos[j];
//         const second = photos[j + 1];
//         imageRow(
//           {
//             label: first.fileName ?? `Photo ${j + 1}`,
//             url: first.fileUrl,
//           },
//           second
//             ? {
//                 label: second.fileName ?? `Photo ${j + 2}`,
//                 url: second.fileUrl,
//               }
//             : undefined,
//         );
//       }
//     });
//   }
//   /* ── Terms & Conditions ── */
//   if (signature.termsVersion) {
//     if (y > doc.page.height - 300) {
//       doc.addPage();
//       y = doc.page.margins.top;
//     }
//     doc.rect(left, y, pageWidth, 22).fill(THEME.surface);
//     doc
//       .fillColor(THEME.muted)
//       .fontSize(8)
//       .font("Helvetica-Bold")
//       .text(
//         `TERMS & CONDITIONS — VERSION ${signature.termsVersion}`,
//         left + 10,
//         y + 7,
//       );
//     y += 30;
//     const termsBody =
//       (signature as any).termsBody ?? "(Terms text attached separately)";
//     doc
//       .fillColor(THEME.text)
//       .fontSize(8)
//       .font("Helvetica")
//       .text(termsBody, left, y, {
//         width: pageWidth,
//         align: "left",
//         lineGap: 2,
//       });
//     y = doc.y + 20;
//   }
//   /* ── Signature block ── */
//   if (y > doc.page.height - 150) {
//     doc.addPage();
//     y = doc.page.margins.top;
//   }
//   y += 20;
//   doc
//     .rect(left, y, pageWidth, 60)
//     .fillAndStroke(THEME.surface, THEME.border);
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(8)
//     .font("Helvetica-Bold")
//     .text("ELECTRONIC SIGNATURE", left + 12, y + 10);
//   doc
//     .fillColor(THEME.text)
//     .fontSize(14)
//     .font("Helvetica-Oblique")
//     .text(signature.signatureData ?? "—", left + 12, y + 26);
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica")
//     .text(
//       `Signed electronically on ${new Date(signature.signedAt).toLocaleString()} by ${application.user.email}`,
//       left + 12,
//       y + 46,
//     );
//   y += 80;
//   /* ── Integrity hash ── */
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica-Bold")
//     .text("DOCUMENT INTEGRITY", left, y);
//   y += 12;
//   doc
//     .fillColor(THEME.text)
//     .fontSize(8)
//     .font("Courier")
//     .text(hash, left, y, { width: pageWidth });
//   y += 20;
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica")
//     .text(
//       "This document can be verified at any time using the SHA-256 hash above. " +
//         "Any modification to the document or the underlying signed data will " +
//         "invalidate the hash.",
//       left,
//       y,
//       { width: pageWidth },
//     );
//   /* ── Footer ── */
//   const footerY = doc.page.height - doc.page.margins.bottom - 20;
//   doc
//     .moveTo(left, footerY)
//     .lineTo(right, footerY)
//     .strokeColor(THEME.border)
//     .lineWidth(0.5)
//     .stroke();
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica")
//     .text(
//       `Generated ${new Date().toLocaleString()} · ${application.applicationNumber}`,
//       left,
//       footerY + 6,
//       { width: pageWidth, align: "center" },
//     );
//   doc.end();
//   return doc;
// }
// /* ============================================================
//  * RENDER — BUFFER
//  * ============================================================ */
// export function renderApplicationPdfToBuffer(
//   input: ApplicationPdfInput,
// ): Promise<Buffer> {
//   return new Promise((resolve, reject) => {
//     const doc = renderApplicationPdf(input);
//     const chunks: Buffer[] = [];
//     doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
//     doc.on("end", () => resolve(Buffer.concat(chunks)));
//     doc.on("error", reject);
//   });
// }
// /* ============================================================
//  * DRAW IMAGE OR PLACEHOLDER
//  * ============================================================ */
// function drawImageBox(
//   doc: PDFKit.PDFDocument,
//   opts: {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//     label: string;
//     url?: string | null;
//     imageBuffers?: Map<string, Buffer>;
//   },
// ) {
//   const { x, y, width, height, label, url, imageBuffers } = opts;
//   doc
//     .rect(x, y, width, height)
//     .strokeColor(THEME.border)
//     .lineWidth(0.5)
//     .stroke();
//   const buffer = url && imageBuffers ? imageBuffers.get(url) : undefined;
//   if (buffer) {
//     try {
//       doc.image(buffer, x + 4, y + 4, {
//         fit: [width - 8, height - 8],
//         align: "center",
//         valign: "center",
//       });
//     } catch (err) {
//       console.warn("[drawImageBox] failed to draw image:", url, err);
//       drawPlaceholder(doc, x, y, width, height, "Image failed to load");
//     }
//   } else {
//     drawPlaceholder(doc, x, y, width, height, "Not available");
//   }
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica")
//     .text(label, x, y + height + 3, {
//       width,
//       align: "center",
//     });
// }
// function drawPlaceholder(
//   doc: PDFKit.PDFDocument,
//   x: number,
//   y: number,
//   width: number,
//   height: number,
//   text: string,
// ) {
//   doc
//     .fillColor("#e5e7eb")
//     .rect(x + 4, y + 4, width - 8, height - 8)
//     .fill();
//   doc
//     .fillColor(THEME.muted)
//     .fontSize(7)
//     .font("Helvetica")
//     .text(text, x, y + height / 2 - 4, {
//       width,
//       align: "center",
//     });
// }
//# sourceMappingURL=applicationPdf.js.map
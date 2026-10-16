// src/utils/logo.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
/* ============================================================
 * LOGO PATH
 * ============================================================
 * Resolved at module load. Tries two locations:
 *   1. <backend root>/assets/pesamaishalogo.png
 *   2. <src>/assets/pesamaishalogo.png (fallback for projects
 *      that keep the file under src)
 *
 * Whichever exists first is used.
 * ============================================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CANDIDATE_PATHS = [
    path.resolve(__dirname, "..", "..", "assets", "pesamaishalogo.png"),
    path.resolve(__dirname, "..", "assets", "pesamaishalogo.png"),
];
/* ============================================================
 * LOGO LOADER
 * ============================================================
 * Reads the logo file once, caches the buffer, returns null if
 * nothing is found. Callers should pass the result to the PDF
 * renderers via the `logoBuffer` parameter.
 * ============================================================ */
let cachedLogo = null;
let cacheAttempted = false;
export function getLogoBuffer() {
    if (cacheAttempted)
        return cachedLogo;
    cacheAttempted = true;
    for (const candidate of CANDIDATE_PATHS) {
        try {
            cachedLogo = fs.readFileSync(candidate);
            console.log(`✅ [logo] Loaded from ${candidate} (${cachedLogo.length} bytes)`);
            return cachedLogo;
        }
        catch {
            /* Try the next path */
        }
    }
    console.warn(`❌ [logo] NOT FOUND. Tried:\n  - ${CANDIDATE_PATHS.join("\n  - ")}`);
    return null;
}
/* ============================================================
 * BRAND COLORS
 * ============================================================ */
export const PDF_BRAND = {
    teal: "#0d9488",
    navy: "#0f1e2e",
    gold: "#d4a017",
    text: "#0f1e2e",
    muted: "#64748b",
    border: "#e2e8f0",
    surface: "#f7f9fb",
};
/* ============================================================
 * DRAW PDF HEADER
 * ============================================================
 * Renders the branded header band at the top of a PDF page.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │ [logo]  PesaMaishaCapital                         │
 *   │         {subtitle}                                │
 *   └──────────────────────────────────────────────────┘
 *
 * Returns the y-coordinate immediately below the band, plus the
 * pageWidth / left / right measurements so callers don't have to
 * recompute them.
 * ============================================================ */
export function drawPdfHeader(doc, opts) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const companyName = opts.companyName ?? "PesaMaishaCapital";
    const bandHeight = 72;
    const bandTop = 30;
    /* ── Header band ── */
    doc.rect(left, bandTop, pageWidth, bandHeight).fill(PDF_BRAND.teal);
    /* ── Logo ── */
    const logoSize = 48;
    const logoPadding = 4;
    const logoX = left + 14;
    const logoY = bandTop + (bandHeight - logoSize) / 2;
    const logo = opts.logoBuffer ?? null;
    if (logo) {
        /* White rounded backing behind the logo */
        doc
            .roundedRect(logoX - logoPadding, logoY - logoPadding, logoSize + logoPadding * 2, logoSize + logoPadding * 2, 8)
            .fill("#ffffff");
        try {
            doc.image(logo, logoX, logoY, {
                fit: [logoSize, logoSize],
                align: "center",
                valign: "center",
            });
        }
        catch (err) {
            console.warn("[drawPdfHeader] failed to draw logo:", err);
        }
    }
    /* ── Company name ── */
    const textX = logoX + logoSize + logoPadding * 2 + 16;
    const textWidth = right - textX - 12;
    doc
        .fillColor("#ffffff")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(companyName, textX, bandTop + 20, {
        width: textWidth,
        lineBreak: false,
    });
    if (opts.subtitle) {
        doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("rgba(255,255,255,0.85)")
            .text(opts.subtitle, textX, bandTop + 44, {
            width: textWidth,
            lineBreak: false,
        });
    }
    return {
        y: bandTop + bandHeight + 20,
        pageWidth,
        left,
        right,
    };
}
//# sourceMappingURL=logo.js.map
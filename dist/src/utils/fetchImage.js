import { URL } from "node:url";
/* ============================================================
 * DOWNLOAD IMAGE BUFFER
 * ============================================================
 * Fetches an image URL and returns a Buffer, or null on any
 * failure. Never throws — a missing photo should never break
 * PDF generation.
 *
 * Timeouts at 8 seconds so a slow CDN can't hang the request.
 * ============================================================ */
export async function fetchImageBuffer(url) {
    if (!url || typeof url !== "string")
        return null;
    try {
        /* Validate the URL is HTTP/HTTPS before fetching. */
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return null;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
            console.warn("[fetchImageBuffer] non-OK response:", url, res.status);
            return null;
        }
        const arrayBuffer = await res.arrayBuffer();
        return {
            buffer: Buffer.from(arrayBuffer),
            mimeType: res.headers.get("content-type") ?? "image/jpeg",
        };
    }
    catch (err) {
        console.warn("[fetchImageBuffer] failed:", url, err);
        return null;
    }
}
/* ============================================================
 * BATCH FETCH
 * ============================================================
 * Fetches multiple URLs in parallel. Returns a Map keyed by URL.
 * ============================================================ */
export async function fetchImageBuffers(urls) {
    const unique = Array.from(new Set(urls.filter((u) => typeof u === "string" && u.length > 0)));
    const results = await Promise.all(unique.map(async (url) => {
        const result = await fetchImageBuffer(url);
        return [url, result?.buffer];
    }));
    const map = new Map();
    for (const [url, buffer] of results) {
        if (buffer)
            map.set(url, buffer);
    }
    return map;
}
//# sourceMappingURL=fetchImage.js.map
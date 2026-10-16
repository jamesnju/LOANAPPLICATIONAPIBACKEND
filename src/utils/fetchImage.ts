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
export async function fetchImageBuffer(
  url: string | null | undefined,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!url || typeof url !== "string") return null;

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
  } catch (err) {
    console.warn("[fetchImageBuffer] failed:", url, err);
    return null;
  }
}

/* ============================================================
 * BATCH FETCH
 * ============================================================
 * Fetches multiple URLs in parallel. Returns a Map keyed by URL.
 * ============================================================ */
export async function fetchImageBuffers(
  urls: (string | null | undefined)[],
): Promise<Map<string, Buffer>> {
  const unique = Array.from(
    new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0)),
  );

  const results = await Promise.all(
    unique.map(async (url) => {
      const result = await fetchImageBuffer(url);
      return [url, result?.buffer] as const;
    }),
  );

  const map = new Map<string, Buffer>();
  for (const [url, buffer] of results) {
    if (buffer) map.set(url, buffer);
  }
  return map;
}
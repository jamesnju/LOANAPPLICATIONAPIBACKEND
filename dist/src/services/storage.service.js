// src/services/storage.service.ts
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const PUBLIC_PREFIX = "/uploads";
export async function uploadBufferToStorage({ buffer, mimetype, originalname, folder, }) {
    const ext = path.extname(originalname) || mimeToExt(mimetype);
    const key = `${folder}/${crypto.randomUUID()}${ext}`;
    const fullPath = path.join(UPLOAD_ROOT, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { url: `${PUBLIC_PREFIX}/${key}`, key };
}
function mimeToExt(mime) {
    switch (mime) {
        case "image/jpeg":
        case "image/jpg":
            return ".jpg";
        case "image/png":
            return ".png";
        case "image/webp":
            return ".webp";
        default:
            return "";
    }
}
//# sourceMappingURL=storage.service.js.map
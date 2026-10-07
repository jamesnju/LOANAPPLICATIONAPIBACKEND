// src/services/storage.service.ts
import crypto from "node:crypto";
import { uploadImage } from "./cloudinary.service.js";

/**
 * Uploads a buffer to Cloudinary.
 * Kept as a thin adapter so existing callers (loan.controller.ts,
 * guarantor upload paths, etc.) don't need to change.
 */
export async function uploadBufferToStorage({
  buffer,
  mimetype,
  originalname,
  folder,
}: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  folder: string;
}): Promise<{ url: string; key: string }> {
  // Cloudinary uses public_id as the unique key. Preserve extension-stripping
  // so re-uploads don't collide and so Cloudinary doesn't append its own ext.
  const baseName = originalname.replace(/\.[^.]+$/, "") || "file";
  const uniqueName = `${baseName}-${crypto.randomUUID()}`;

  // Map your local folder convention onto a Cloudinary folder namespace.
  // e.g. "loan-applications/4cbb67ec-..." -> "loan-platform/loan-applications/4cbb67ec-..."
  const cloudinaryFolder = `loan-platform/${folder}`;

  const { secure_url, public_id } = await uploadImage(
    buffer,
    uniqueName,
    cloudinaryFolder
  );

  return { url: secure_url, key: public_id };
}

// // src/services/storage.service.ts
// import fs from "node:fs/promises";
// import path from "node:path";
// import crypto from "node:crypto";

// const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
// const PUBLIC_PREFIX = "/uploads";

// export async function uploadBufferToStorage({
//   buffer,
//   mimetype,
//   originalname,
//   folder,
// }: {
//   buffer: Buffer;
//   mimetype: string;
//   originalname: string;
//   folder: string;
// }): Promise<{ url: string; key: string }> {
//   const ext = path.extname(originalname) || mimeToExt(mimetype);
//   const key = `${folder}/${crypto.randomUUID()}${ext}`;
//   const fullPath = path.join(UPLOAD_ROOT, key);

//   await fs.mkdir(path.dirname(fullPath), { recursive: true });
//   await fs.writeFile(fullPath, buffer);

//   return { url: `${PUBLIC_PREFIX}/${key}`, key };
// }

// function mimeToExt(mime: string) {
//   switch (mime) {
//     case "image/jpeg":
//     case "image/jpg":
//       return ".jpg";
//     case "image/png":
//       return ".png";
//     case "image/webp":
//       return ".webp";
//     default:
//       return "";
//   }
// }
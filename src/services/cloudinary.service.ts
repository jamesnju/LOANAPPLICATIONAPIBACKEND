// backend/src/services/cloudinary.service.ts
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARYCLOUDNAME,
  api_key: env.CLOUDINARYAPIKEY,
  api_secret: env.CLOUDINARYAPISECRET,
});

/* Existing DOCX upload — unchanged */
export async function uploadDocument(buffer: Buffer, fileName: string) {
  return new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "loan-platform/application-documents",
          public_id: fileName.replace(/\.docx$/i, ""),
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      upload.end(buffer);
    }
  );
}

/* NEW — image upload (JPG/PNG/WEBP) for ID photos */
export async function uploadImage(
  buffer: Buffer,
  fileName: string,
  folder = "loan-platform/id-photos"
) {
  return new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder,
          public_id: fileName.replace(/\.[^.]+$/, ""),
          // Optional: auto-optimize
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary image upload failed"));
            return;
          }
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      upload.end(buffer);
    }
  );
}

// import { v2 as cloudinary } from "cloudinary";

// import { env } from "../config/env.js";

// cloudinary.config({
//   cloud_name:
//     env.CLOUDINARYCLOUDNAME,

//   api_key:
//     env.CLOUDINARYAPIKEY,

//   api_secret:
//     env.CLOUDINARYAPISECRET,
// });

// /*
//  * Upload a DOCX buffer to Cloudinary.
//  */
// export async function uploadDocument(
//   buffer: Buffer,
//   fileName: string,
// ) {
//   return new Promise<{
//     secure_url: string;
//     public_id: string;
//   }>((resolve, reject) => {
//     const upload =
//       cloudinary.uploader.upload_stream(
//         {
//           resource_type: "raw",

//           folder:
//             "loan-platform/application-documents",

//           public_id: fileName.replace(
//             /\.docx$/i,
//             "",
//           ),
//         },

//         (error, result) => {
//           if (error || !result) {
//             reject(
//               error ??
//                 new Error(
//                   "Cloudinary upload failed",
//                 ),
//             );

//             return;
//           }

//           resolve({
//             secure_url:
//               result.secure_url,

//             public_id:
//               result.public_id,
//           });
//         },
//       );

//     upload.end(buffer);
//   });
// }
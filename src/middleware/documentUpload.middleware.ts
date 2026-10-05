// backend/src/middleware/upload.middleware.ts
import multer from "multer";

const storage = multer.memoryStorage();

const docxFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Only Microsoft Word DOCX files are allowed."));
    return;
  }
  cb(null, true);
};
const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Only JPG, PNG, or WEBP images are allowed."));
    return;
  }
  cb(null, true);
};

export const applicationDocumentUpload = multer({
  storage,
  fileFilter: docxFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const idPhotoUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const docOrImageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Only DOCX or image files are allowed."));
    return;
  }
  cb(null, true);
};

export const applicationUploadAny = multer({
  storage,
  fileFilter: docOrImageFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
export const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// import multer from "multer";

// /*
//  * Store the uploaded file in memory.
//  *
//  * We do this because the completed application
//  * document will eventually be uploaded to
//  * Cloudinary/object storage rather than permanently
//  * stored on the API server.
//  */
// const storage = multer.memoryStorage();

// /*
//  * Only allow DOCX files for the loan application form.
//  */
// const fileFilter: multer.Options["fileFilter"] = (
//   _req,
//   file,
//   callback,
// ) => {
//   const allowedMimeTypes = [
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//   ];

//   if (!allowedMimeTypes.includes(file.mimetype)) {
//     callback(
//       new Error(
//         "Only Microsoft Word DOCX files are allowed.",
//       ),
//     );

//     return;
//   }

//   callback(null, true);
// };

// export const applicationDocumentUpload =
//   multer({
//     storage,

//     fileFilter,

//     limits: {
//       /*
//        * Maximum application document size:
//        * 10 MB.
//        */
//       fileSize: 10 * 1024 * 1024,

//       files: 1,
//     },
//   });
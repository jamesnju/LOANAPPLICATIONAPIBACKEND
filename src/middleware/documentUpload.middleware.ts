import multer from "multer";

/*
 * Store the uploaded file in memory.
 *
 * We do this because the completed application
 * document will eventually be uploaded to
 * Cloudinary/object storage rather than permanently
 * stored on the API server.
 */
const storage = multer.memoryStorage();

/*
 * Only allow DOCX files for the loan application form.
 */
const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback,
) => {
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    callback(
      new Error(
        "Only Microsoft Word DOCX files are allowed.",
      ),
    );

    return;
  }

  callback(null, true);
};

export const applicationDocumentUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      /*
       * Maximum application document size:
       * 10 MB.
       */
      fileSize: 10 * 1024 * 1024,

      files: 1,
    },
  });
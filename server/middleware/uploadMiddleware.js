import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function handleUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return;
    next();
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(413).json({ error: "Files must be 25 MB or smaller." });
    }
    return res.status(400).json({ error: error.message });
  });
}

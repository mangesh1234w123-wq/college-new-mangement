const express = require("express");
const fs = require("fs");
const path = require("path");
let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch (_err) {
  // pdfkit not installed — we'll fall back to saving images directly
  PDFDocument = null;
}

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Save a base64 image as a PDF and return download URL
router.post("/save", (req, res) => {
  const { filename = "export.pdf", imageData } = req.body || {};
  if (!imageData) return res.status(400).json({ message: "imageData (base64) is required." });

  const uploadsDir = path.join(__dirname, "..", "uploads", "reports");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // prefer PDF if pdfkit is available, otherwise save PNG
  const baseName = `${Date.now()}-${String(filename).replace(/[^a-z0-9_.-]/gi, "_")}`;

  try {
    const buffer = Buffer.from(String(imageData).replace(/^data:image\/\w+;base64,?/, ""), "base64");

    if (PDFDocument) {
      const outPath = path.join(uploadsDir, `${baseName}.pdf`);
      const doc = new PDFDocument({ autoFirstPage: false });
      const stream = fs.createWriteStream(outPath);
      doc.pipe(stream);

      const img = doc.openImage(buffer);
      doc.addPage({ size: [img.width, img.height] });
      doc.image(img, 0, 0);
      doc.end();

      stream.on("finish", () => {
        const publicUrl = `/uploads/reports/${baseName}.pdf`;
        res.json({ url: publicUrl, filename: `${baseName}.pdf` });
      });

      stream.on("error", (err) => {
        console.error(err);
        res.status(500).json({ message: "Failed to write PDF file." });
      });
      return;
    }

    // Fallback: save raw PNG
    const outPath = path.join(uploadsDir, `${baseName}.png`);
    fs.writeFile(outPath, buffer, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to save image." });
      }

      const publicUrl = `/uploads/reports/${baseName}.png`;
      res.json({ url: publicUrl, filename: `${baseName}.png` });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate report." });
  }
});

module.exports = router;

// Download endpoint to force browser download of saved reports
router.get("/download/:name", (req, res) => {
  const name = req.params.name;
  if (!name) return res.status(400).json({ message: "Filename required." });

  const filePath = path.join(__dirname, "..", "uploads", "reports", name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found." });

  res.download(filePath, name, (err) => {
    if (err) {
      console.error("Download error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Failed to send file." });
    }
  });
});

// List saved reports
router.get("/list", (req, res) => {
  const uploadsDir = path.join(__dirname, "..", "uploads", "reports");
  if (!fs.existsSync(uploadsDir)) return res.json({ reports: [] });

  const files = fs.readdirSync(uploadsDir).map((name) => {
    const stat = fs.statSync(path.join(uploadsDir, name));
    return {
      name,
      url: `/uploads/reports/${name}`,
      size: stat.size,
      mtime: stat.mtime
    };
  });

  files.sort((a, b) => b.mtime - a.mtime);
  res.json({ reports: files });
});

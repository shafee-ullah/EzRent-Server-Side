// routes/experienceRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure uploads directory exists
// const uploadDir = "uploads/";
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
// const uploadDir = "/tmp/uploads";
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// 📸 Upload route
router.post("/upload", upload.array("photos", 5), (req, res) => {
  // Fix URL generation to use proper path format with forward slashes
  const urls = req.files.map((file) => {
    // Normalize path with forward slashes for URLs
    const normalizedPath = file.path.replace(/\\/g, '/');
    return `http://localhost:5000/${normalizedPath}`;
  });
  console.log("Generated photo URLs:", urls);
  res.json({ urls });
});

module.exports = router;

const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads", // folder name in Cloudinary
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

// const upload = multer({ storage });

// router.post("/upload", upload.array("photos", 5), (req, res) => {
//   const urls = req.files.map(
//     (file) =>
//       `http://localhost:5000/${file.path}`
//   );
//   res.json({ urls });
// });

const upload = multer({ storage });

router.post("/upload", upload.array("photos", 5), (req, res) => {
  // Use the 'url' or 'secure_url' property from Cloudinary
  const urls = req.files.map((file) => file.path);
  
  // Or for secure HTTPS URLs (recommended):
  // const urls = req.files.map((file) => file.secure_url);
  
  res.json({ urls });
});

module.exports = router;

const express = require("express");
const productController = require("../Controllers/productController");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Increased to 20MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    console.log("File details:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname).toLowerCase(),
    });

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error(`Only JPEG, JPG, PNG, or WEBP images are allowed. Got ${file.mimetype}`));
  },
});

const router = express.Router();

router
  .route("/")
  .post(upload.array("images", 7), productController.createProduct)
  .get(productController.getAllProducts);

router
  .route("/:id")
  .get(productController.getProductById)
  .put(upload.array("images", 7), productController.updateProduct)
  .delete(productController.deleteProduct);

module.exports = router;
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
  limits: { fileSize: 20 * 1024 * 1024 }, // Increased to 20MB
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
}).array("images", 7);

const productController = {
  createProduct: async (req, res) => {
    try {
      console.log("Incoming body:", req.body);
      console.log("Uploaded files:", req.files);

      const { name, description, details, amount, dimension, sku } = req.body;

      if (!name || !description || !amount) {
        return res.status(400).json({ error: "Name, description, and amount are required." });
      }

      if (!req.files || req.files.length < 1 || req.files.length > 7) {
        return res.status(400).json({ error: "1 to 7 images are required." });
      }

      const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);

      const product = new Product({
        name,
        description,
        details,
        amount: Number(amount),
        dimension,
        sku,
        images: imagePaths,
      });

      await product.save();
      console.log("Product saved successfully:", product);
      res.status(201).json({ message: "Product created successfully", product });
    } catch (error) {
      console.error("Server error while creating product:", error);
      res.status(500).json({ error: error.message || "Server error while creating product" });
    }
  },

  getAllProducts: async (req, res) => {
    try {
      const products = await Product.find();
      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: "Server error while fetching products" });
    }
  },

  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(200).json(product);
    } catch (error) {
      res.status(500).json({ error: "Server error while fetching product" });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { name, description, details, amount, dimension, existingImages, sku } = req.body;
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (name) product.name = name;
      if (description) product.description = description;
      if (details) product.details = details;
      if (amount) product.amount = Number(amount);
      if (dimension) product.dimension = dimension;
      if (sku) product.sku = sku;


      // Parse existing images (if sent)
      let currentImages = [];
      if (existingImages) {
        try {
          currentImages = Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages);
        } catch (e) {
          console.error("Invalid existingImages format:", e);
        }
      }

      // Handle new images
      let newImagePaths = [];
      if (req.files && req.files.length > 0) {
        newImagePaths = req.files.map((file) => `/uploads/${file.filename}`);
      }

      // Combine existing and new images, ensure no duplicates
      product.images = [...new Set([...currentImages, ...newImagePaths])];

      // Validate total images
      if (product.images.length > 7) {
        return res.status(400).json({ error: "Maximum 7 images allowed." });
      }

      await product.save();
      res.status(200).json({ message: "Product updated successfully", product });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: error.message || "Server error while updating product" });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      product.images.forEach((image) => {
        const relativePath = image.startsWith("/") ? image.slice(1) : image;
        const imagePath = path.join(__dirname, "..", relativePath);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });

      await Product.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Server error while deleting product" });
    }
  },
};

module.exports = productController;
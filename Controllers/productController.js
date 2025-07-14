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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
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

      const { name, description, details, amount, dimension, sku, stock } = req.body;

      if (!name || !description || !amount || stock === undefined) {
        return res.status(400).json({ error: "Name, description, amount, and stock are required." });
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
        stock: Number(stock),
        soldStock: 0, // Initialize soldStock
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

  getInventory: async (req, res) => {
    try {
      const products = await Product.find({}, 'name stock soldStock');
      res.status(200).json(products);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Server error while fetching inventory" });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { name, description, details, amount, dimension, existingImages, sku, stock, imagesToDelete } = req.body;
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
      if (stock !== undefined) product.stock = Number(stock);

      // Parse existing images (if sent)
      let currentImages = [];
      if (existingImages) {
        try {
          currentImages = Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages);
        } catch (e) {
          console.error("Invalid existingImages format:", e);
        }
      }

      // Handle images to delete
      if (imagesToDelete) {
        try {
          const imagesToDeleteArray = Array.isArray(imagesToDelete) ? imagesToDelete : JSON.parse(imagesToDelete);
          imagesToDeleteArray.forEach(imagePath => {
            const relativePath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
            const fullPath = path.join(__dirname, "..", relativePath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          });
          currentImages = currentImages.filter(img => !imagesToDeleteArray.includes(img));
        } catch (e) {
          console.error("Error processing imagesToDelete:", e);
        }
      }

      // Handle new images
      if (req.files && req.files.length > 0) {
        const newImagePaths = req.files.map(file => `/uploads/${file.filename}`);
        for (let i = 0; i < currentImages.length; i++) {
          if (currentImages[i] === null && newImagePaths.length > 0) {
            currentImages[i] = newImagePaths.shift();
          }
        }
        currentImages = [...currentImages, ...newImagePaths];
      }

      // Filter out null values and ensure unique images
      product.images = [...new Set(currentImages.filter(img => img !== null))];

      // Validate total images
      if (product.images.length > 7) {
        return res.status(400).json({ error: "Maximum 7 images allowed." });
      }

      // Validate stock
      if (product.stock < 0) {
        return res.status(400).json({ error: "Stock cannot be negative." });
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

  checkStock: async (req, res) => {
    try {
      const { items } = req.body; // Array of { productId, quantity }
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Product not found: ${item.productId}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }
      }
      res.status(200).json({ available: true });
    } catch (error) {
      console.error("Error checking stock:", error);
      res.status(500).json({ error: "Server error while checking stock" });
    }
  },


    updateStock: async (req, res) => {
    try {
      const { items } = req.body; // Array of { productId, quantity }
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Product not found: ${item.productId}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }
        product.stock -= item.quantity;
        product.soldStock = (product.soldStock || 0) + item.quantity;
        await product.save();
      }
      res.status(200).json({ message: "Stock updated successfully" });
    } catch (error) {
      console.error("Error updating stock:", error);
      res.status(500).json({ error: "Server error while updating stock" });
    }
  },
};

module.exports = productController;
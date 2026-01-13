const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT');
const multer = require('multer');

// Guardará solo el buffer de imagen si quieres usarlo en el futuro
const upload = multer({ storage: multer.memoryStorage() });

// ===========================================
// GET: Obtener lista de productos
// ===========================================
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos', error: error.message });
  }
});

// ===========================================
// GET: Obtener un producto por ID
// ===========================================
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producto', error: error.message });
  }
});

// ===========================================
// POST: Crear producto (SIN CLOUDINARY)
// ===========================================
router.post('/', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const data = req.body;

    // Procesar precio
    if (data.price) data.price = parseFloat(data.price);

    // Si quieres guardar imágenes más adelante,
    // aquí puedes asignar una imagen local temporal
    data.image = data.image || "/img/default-product.png";

    const product = new Product(data);
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    console.error('Error crear producto:', error);
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
});

// ===========================================
// PUT: Editar producto (SIN CLOUDINARY)
// ===========================================
router.put('/:id', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const data = req.body;

    if (data.price) data.price = parseFloat(data.price);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(product);

  } catch (error) {
    console.error('Error actualizar producto:', error);
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
});

// ===========================================
// DELETE: Eliminar producto
// ===========================================
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado exitosamente' });

  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
});

module.exports = router;

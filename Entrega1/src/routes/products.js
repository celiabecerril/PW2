const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const config = require('../config');

// Asegurar que existe el directorio de uploads
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de Multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware de verificación de Admin
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de administrador' });
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// POST /api/products - Crear producto
router.post('/', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;
        
        const product = new Product({
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock),
            category,
            image: req.file ? `/uploads/${req.file.filename}` : ''
        });

        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear el producto' });
    }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;
        
        const updateData = {
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock),
            category
        };

        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar el producto' });
    }
});

module.exports = router;
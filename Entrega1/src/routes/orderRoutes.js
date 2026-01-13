const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT');

// ==========================================
// GET: Obtener pedidos del usuario actual
// ==========================================
router.get('/my-orders', authenticateJWT, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener pedidos', 
      error: error.message 
    });
  }
});

// ==========================================
// GET: Obtener todos los pedidos (Admin)
// ==========================================
router.get('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener pedidos', 
      error: error.message 
    });
  }
});

// ==========================================
// GET: Obtener un pedido específico
// ==========================================
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    // Los usuarios solo pueden ver sus propios pedidos
    if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener pedido', 
      error: error.message 
    });
  }
});

// ==========================================
// POST: Crear un nuevo pedido
// ==========================================
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { items, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'El pedido debe contener al menos un producto' });
    }
    
    // Procesar items del pedido
    const orderItems = [];
    let total = 0;
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({ 
          message: `Producto ${item.productId} no encontrado` 
        });
      }
      
      // Verificar stock
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` 
        });
      }
      
      const subtotal = product.price * item.quantity;
      
      orderItems.push({
        productId: product._id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal
      });
      
      total += subtotal;
      
      // Reducir stock
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Crear el pedido
    const order = new Order({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      items: orderItems,
      total,
      notes: notes || '',
      status: 'pending'
    });
    
    await order.save();
    
    res.status(201).json(order);
    
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ 
      message: 'Error al crear pedido', 
      error: error.message 
    });
  }
});

// ==========================================
// PUT: Actualizar estado de pedido (Admin)
// ==========================================
router.put('/:id/status', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al actualizar pedido', 
      error: error.message 
    });
  }
});

// ==========================================
// DELETE: Eliminar pedido (Admin)
// ==========================================
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    res.json({ message: 'Pedido eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al eliminar pedido', 
      error: error.message 
    });
  }
});

module.exports = router;
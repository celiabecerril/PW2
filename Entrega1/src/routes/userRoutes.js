const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT');

// ==========================================
// GET: Obtener todos los usuarios (Admin)
// ==========================================
router.get('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener usuarios', 
      error: error.message 
    });
  }
});

// ==========================================
// GET: Obtener un usuario específico (Admin)
// ==========================================
router.get('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener usuario', 
      error: error.message 
    });
  }
});

// ==========================================
// PUT: Actualizar usuario (Admin)
// ==========================================
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { email, name, role, password } = req.body;
    
    const updateData = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role && ['user', 'admin'].includes(role)) updateData.role = role;
    
    // Si se proporciona una nueva contraseña, hashearla
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El email ya está en uso' });
    }
    res.status(500).json({ 
      message: 'Error al actualizar usuario', 
      error: error.message 
    });
  }
});

// ==========================================
// DELETE: Eliminar usuario (Admin)
// ==========================================
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    // No permitir que el admin se elimine a sí mismo
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al eliminar usuario', 
      error: error.message 
    });
  }
});

// ==========================================
// GET: Obtener perfil del usuario actual
// ==========================================
router.get('/me/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error al obtener perfil', 
      error: error.message 
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { authenticateJWT, isAdmin } = require('../middleware/authenticateJWT');


router.get('/my-chat', authenticateJWT, async (req, res) => {
  try {
    let chat = await Chat.findOne({ userId: req.user.id, status: 'active' });
    
    if (!chat) {
      chat = new Chat({
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email
      });
      await chat.save();
    }
    
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener chat', error: error.message });
  }
});


router.get('/:chatId/messages', authenticateJWT, async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mensajes', error: error.message });
  }
});


router.get('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const chats = await Chat.find().sort({ lastMessageTime: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener chats', error: error.message });
  }
});

module.exports = router;
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const path = require('path');
const config = require('./config');

// Importar modelos para el Chat
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const User = require('./models/User');

// Importar rutas REST
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

// Importar esquemas y resolvers
const typeDefs = require('./models/schema');
const resolvers = require('./models/resolvers');

const app = express();
const httpServer = http.createServer(app);

// Configuración de Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Usar rutas REST
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Conexión a MongoDB
mongoose.connect(config.mongoUri)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Función para iniciar Apollo Server
async function startServer() {
  try {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    await server.start();

    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization || '';
        if (token) {
          try {
            const actualToken = token.replace('Bearer ', '');
            const user = jwt.verify(actualToken, config.jwtSecret);
            return { user };
          } catch (err) {
            // Token inválido
          }
        }
        return {};
      },
    }));

    // Middleware de autenticación para Socket.IO
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        // Buscamos el usuario en la BD para asegurar tener el nombre actualizado
        const user = await User.findById(decoded.id);
        if (!user) return next(new Error('User not found'));
        
        socket.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    // Manejo de Sockets
    io.on('connection', async (socket) => {
      console.log(`Usuario conectado al chat: ${socket.user.name} (${socket.user.role})`);

      // Lógica de inicialización según rol
      if (socket.user.role === 'admin') {
        socket.join('admins'); // Sala global para admins
        // Enviar lista inicial de chats
        const chats = await Chat.find().sort({ lastMessageTime: -1 });
        socket.emit('admin_chat_list', chats.map(c => ({...c.toObject(), id: c._id.toString()})));
      } else {
        // Usuario normal: Buscar o crear su chat y unirse a su sala
        let chat = await Chat.findOne({ userId: socket.user.id });
        if (!chat) {
          chat = new Chat({
            userId: socket.user.id,
            userName: socket.user.name,
            userEmail: socket.user.email
          });
          await chat.save();
        }
        const chatId = chat._id.toString();
        socket.join(chatId);
        socket.emit('chat_ready', { chatId });
      }

      // Evento: Enviar mensaje
      socket.on('send_message', async (data) => {
        try {
          const { chatId, message } = data;
          
          // Seguridad: Verificar que el usuario solo escriba en su chat
          if (socket.user.role === 'user') {
            const chat = await Chat.findById(chatId);
            if (!chat || chat.userId.toString() !== socket.user.id) return;
          }

          const newMessage = new Message({
            chatId,
            senderId: socket.user.id,
            senderName: socket.user.name,
            message,
            isAdmin: socket.user.role === 'admin'
          });
          await newMessage.save();

          await Chat.findByIdAndUpdate(chatId, {
            lastMessage: message,
            lastMessageTime: new Date(),
            status: 'active'
          });

          // Emitir a la sala específica del chat (lo reciben el usuario y el admin que esté mirando)
          io.to(chatId).emit('receive_message', {
            chatId,
            senderId: socket.user.id,
            senderName: socket.user.name,
            message,
            createdAt: newMessage.createdAt
          });

          // Si escribe un usuario, notificar a todos los admins para actualizar la lista
          if (socket.user.role === 'user') {
            const chats = await Chat.find().sort({ lastMessageTime: -1 });
            io.to('admins').emit('admin_chat_list', chats.map(c => ({...c.toObject(), id: c._id.toString()})));
            io.to('admins').emit('new_user_message', { chatId });
          }
        } catch (err) {
          console.error('Error en chat:', err);
        }
      });

      // Evento Admin: Obtener historial de un chat
      socket.on('get_messages', async ({ chatId }) => {
        if (socket.user.role !== 'admin') return;
        socket.join(chatId); // El admin se une a la sala para escuchar en tiempo real
        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        socket.emit('chat_history', messages);
      });

      // Evento Admin: Refrescar lista de chats manualmente
      socket.on('get_chats', async () => {
        if (socket.user.role !== 'admin') return;
        const chats = await Chat.find().sort({ lastMessageTime: -1 });
        socket.emit('admin_chat_list', chats.map(c => ({...c.toObject(), id: c._id.toString()})));
      });
    });

    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🚀 GraphQL listo en http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
  }
}

startServer();
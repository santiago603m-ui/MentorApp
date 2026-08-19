require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const initChatSocket = require('./sockets/chat.socket');
const { corsOptions } = require('./config/cors');

const PORT = process.env.PORT || 5000;

// 1. Conectar a MongoDB
connectDB();

// 2. Crear servidor HTTP que envuelve la app Express
const server = http.createServer(app);

// 3. Configurar WebSockets (Socket.io) con la misma política de CORS
const io = new Server(server, {
    cors: {
        origin: corsOptions.origin,
        methods: ['GET', 'POST'],
        allowedHeaders: corsOptions.allowedHeaders,
        credentials: true
    }
});

// 4. Inicializar eventos de Socket.io
initChatSocket(io);

// 5. Iniciar el servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
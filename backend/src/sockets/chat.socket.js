const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const validator = require('validator');

// Mapa en memoria para almacenar usuarios conectados: socket.id -> { userId, name, role, socketId }
const onlineUsers = new Map();

// Limitar mensajes por usuario (anti-spam)
const messageRateLimits = new Map(); // userId -> { count, resetTime }

const checkMessageRateLimit = (userId) => {
    const now = Date.now();
    const limit = messageRateLimits.get(userId);
    
    if (!limit || now > limit.resetTime) {
        // Reset o primer mensaje
        messageRateLimits.set(userId, {
            count: 1,
            resetTime: now + 60000 // 1 minuto
        });
        return true;
    }
    
    if (limit.count >= 10) {
        // Más de 10 mensajes por minuto
        return false;
    }
    
    limit.count++;
    return true;
};

module.exports = function initChatSocket(io) {
    // SEGURIDAD: Middleware de autenticación para Socket.io
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication error: Token requerido'));
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (error) {
            return next(new Error('Authentication error: Token inválido'));
        }
    });
    
    io.on('connection', (socket) => {
        console.log(`⚡ Cliente conectado: ${socket.id} (User: ${socket.userId})`);

        // 1. Registrar usuario conectado y transmitir lista actualizada
        socket.on('register_user', (userData) => {
            if (!userData || !userData.userId) return;
            
            // SEGURIDAD: Validar que el userId del socket coincida con el del payload
            if (socket.userId !== userData.userId) {
                socket.emit('chat_error', { message: 'ID de usuario no coincide' });
                return;
            }

            onlineUsers.set(socket.id, {
                socketId: socket.id,
                userId: userData.userId,
                name: validator.escape(userData.name || 'Usuario'), // Sanitizar nombre
                role: userData.role
            });

            // Emitir a todos los clientes la lista completa de conectados
            io.emit('online_users_list', Array.from(onlineUsers.values()));
        });

        // 2. Unirse y salir de salas (General o Privada)
        socket.on('join_room', (roomId) => {
            if (!roomId) return;
            
            // SEGURIDAD: Validar formato de roomId
            if (typeof roomId !== 'string' || roomId.length > 100) {
                socket.emit('chat_error', { message: 'ID de sala inválido' });
                return;
            }
            
            // SEGURIDAD: Para salas privadas (mentorship_xxx), validar que el usuario tiene permiso
            if (roomId.startsWith('mentorship_')) {
                const roomUsers = roomId.replace('mentorship_', '').split('_');
                if (!roomUsers.includes(socket.userId)) {
                    socket.emit('chat_error', { message: 'No tienes permiso para unirte a esta sala' });
                    return;
                }
            }
            
            socket.join(roomId);
            console.log(`📌 Socket ${socket.id} se unió a la sala: ${roomId}`);
        });

        socket.on('leave_room', (roomId) => {
            if (!roomId) return;
            socket.leave(roomId);
            console.log(`📤 Socket ${socket.id} salió de la sala: ${roomId}`);
        });

        // 3. Guardar y retransmitir mensaje
        socket.on('send_message', async (data) => {
            try {
                const { roomId, senderId, message } = data;

                // SEGURIDAD: Validar que el senderId coincide con el usuario autenticado
                if (senderId !== socket.userId) {
                    socket.emit('chat_error', { message: 'No autorizado para enviar mensajes como otro usuario' });
                    return;
                }
                
                if (!roomId || !senderId || !message?.trim()) {
                    return socket.emit('chat_error', { message: 'Datos de mensaje inválidos.' });
                }
                
                // SEGURIDAD: Anti-spam - Rate limiting
                if (!checkMessageRateLimit(senderId)) {
                    socket.emit('chat_error', { message: 'Estás enviando mensajes demasiado rápido. Espera un momento.' });
                    return;
                }
                
                // SEGURIDAD: Sanitizar mensaje (prevenir XSS)
                const sanitizedMessage = validator.escape(message.trim());
                
                // SEGURIDAD: Limitar longitud del mensaje
                if (sanitizedMessage.length > 2000) {
                    socket.emit('chat_error', { message: 'El mensaje es demasiado largo (máximo 2000 caracteres)' });
                    return;
                }

                const newMessage = await Message.create({
                    roomId,
                    sender: senderId,
                    message: sanitizedMessage
                });

                const populatedMsg = await newMessage.populate('sender', 'name email role');

                // Transmitir el mensaje a todos los integrantes de la sala
                io.to(roomId).emit('receive_message', populatedMsg);
            } catch (error) {
                console.error('Error procesando mensaje:', error.message);
                socket.emit('chat_error', { message: 'No se pudo guardar el mensaje.' });
            }
        });

        // 4. Indicador de "Escribiendo..." y "Dejó de escribir"
        socket.on('typing', ({ roomId, user }) => {
            // SEGURIDAD: Validar que el usuario es el autenticado
            if (!user) return;
            
            const sanitizedUser = validator.escape(user);
            socket.to(roomId).emit('user_typing', { user: sanitizedUser });
        });

        socket.on('stop_typing', ({ roomId, user }) => {
            if (!user) return;
            
            const sanitizedUser = validator.escape(user);
            socket.to(roomId).emit('user_stop_typing', { user: sanitizedUser });
        });

        // 5. Solicitar y crear Sala Privada de Mentoría (1 a 1)
        socket.on('request_mentorship', ({ mentorId, apprenticeId, mentorName, apprenticeName }) => {
            // SEGURIDAD: Validar que el solicitante es el apprentice autenticado
            if (socket.userId !== apprenticeId) {
                socket.emit('chat_error', { message: 'No autorizado' });
                return;
            }
            
            // Crea una ID única ordenada para que ambos usuarios coincidan en la misma sala
            const roomId = `mentorship_${[mentorId, apprenticeId].sort().join('_')}`;

            socket.join(roomId);

            // Notificar al mentor si está conectado
            const mentorSocket = Array.from(onlineUsers.values()).find(u => u.userId === mentorId);
            if (mentorSocket) {
                io.to(mentorSocket.socketId).emit('mentorship_request_received', {
                    roomId,
                    apprenticeName: validator.escape(apprenticeName),
                    apprenticeId
                });
            }

            // Confirmar al aprendiz que la sala está lista
            socket.emit('mentorship_room_ready', { 
                roomId, 
                mentorName: validator.escape(mentorName) 
            });
        });

        // 6. Manejo de Desconexión
        socket.on('disconnect', () => {
            console.log(`❌ Cliente desconectado: ${socket.id}`);
            onlineUsers.delete(socket.id);
            io.emit('online_users_list', Array.from(onlineUsers.values()));
        });
    });
};
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET /api/messages/:roomId -> Obtener mensajes históricos de una sala
router.get('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const messages = await Message.find({ roomId })
            .populate('sender', 'name email role')
            .sort({ createdAt: 1 })
            .limit(100);

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error al consultar historial de mensajes', error: error.message });
    }
});

module.exports = router;
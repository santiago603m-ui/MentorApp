const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
require('dotenv').config();

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'El historial de mensajes es obligatorio' });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({ message: 'Falta configurar GROQ_API_KEY en el archivo .env del backend' });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const groqMessages = [
            {
                role: 'system',
                content: 'Eres un mentor de desarrollo de software para la plataforma MentorSync AI. Guía a los aprendices en resolución de errores, arquitectura y buenas prácticas.'
            },
            ...messages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }))
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages: groqMessages,
            model: 'openai/gpt-oss-20b',
            temperature: 0.7,
            max_tokens: 1200
        });

        const reply = chatCompletion.choices[0]?.message?.content || 'No se obtuvo respuesta de la IA.';

        res.json({ reply });
    } catch (error) {
        console.error('Error en servicio Groq:', error);
        res.status(500).json({ message: 'Error al comunicarse con la IA', error: error.message });
    }
});

module.exports = router;
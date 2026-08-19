const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { protect, authorize } = require('../middlewares/auth');
const { sanitizeBotQuery } = require('../middlewares/sanitize');
const { uploadDocument, askBot } = require('../controllers/bot.controller');

// SEGURIDAD: Rate limiting específico para bot
const rateLimit = require('express-rate-limit');
const botQueryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 10, // 10 preguntas por minuto
    message: 'Demasiadas consultas al bot, por favor espera un momento.'
});

router.post('/upload', protect, authorize('mentor', 'admin'), upload.single('file'), uploadDocument);
router.post('/query', protect, botQueryLimiter, sanitizeBotQuery, askBot);

module.exports = router;
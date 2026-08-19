const validator = require('validator');

/**
 * Sanitiza texto para prevenir XSS
 */
const sanitizeText = (text) => {
    if (!text) return text;
    
    // Escapar caracteres HTML peligrosos
    return validator.escape(text.toString());
};

/**
 * Middleware para sanitizar inputs de mensajes de chat
 */
exports.sanitizeChatMessage = (req, res, next) => {
    if (req.body.message) {
        // Sanitizar el mensaje
        req.body.message = sanitizeText(req.body.message);
        
        // Limitar longitud del mensaje
        if (req.body.message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'El mensaje es demasiado largo (máximo 2000 caracteres)'
            });
        }
    }
    
    next();
};

/**
 * Middleware para sanitizar queries al bot de IA
 */
exports.sanitizeBotQuery = (req, res, next) => {
    if (req.body.question) {
        // Sanitizar la pregunta
        req.body.question = sanitizeText(req.body.question);
        
        // Limitar longitud
        if (req.body.question.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'La pregunta es demasiado larga (máximo 1000 caracteres)'
            });
        }
        
        // Detectar intentos de prompt injection básicos
        const dangerousPatterns = [
            /ignore previous instructions/i,
            /ignore all previous/i,
            /forget everything/i,
            /new instructions:/i,
            /system prompt/i,
            /you are now/i,
            /act as if/i,
            /pretend you are/i
        ];
        
        const hasDangerousPattern = dangerousPatterns.some(pattern => 
            pattern.test(req.body.question)
        );
        
        if (hasDangerousPattern) {
            console.warn(`⚠️ Posible prompt injection detectado: ${req.body.question}`);
            return res.status(400).json({
                success: false,
                message: 'Tu pregunta contiene patrones no permitidos. Por favor reformúlala.'
            });
        }
    }
    
    next();
};

/**
 * Middleware para sanitizar contenido de cursos
 */
exports.sanitizeCourseContent = (req, res, next) => {
    if (req.body.title) {
        req.body.title = sanitizeText(req.body.title);
    }
    
    if (req.body.description) {
        req.body.description = sanitizeText(req.body.description);
    }
    
    // Sanitizar arrays si existen
    ['tags', 'requirements', 'whatYouWillLearn', 'targetAudience'].forEach(field => {
        if (Array.isArray(req.body[field])) {
            req.body[field] = req.body[field].map(item => sanitizeText(item));
        }
    });
    
    next();
};

module.exports = exports;

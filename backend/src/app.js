const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const { corsOptions } = require('./config/cors');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const messageRoutes = require('./routes/message.routes');
const aiRoutes = require('./routes/ai.routes');
const botRoutes = require('./routes/bot.routes');
const courseRoutes = require('./routes/course.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');

const app = express();

// 1. SEGURIDAD: Helmet - Headers de seguridad HTTP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// 2. SEGURIDAD: CORS con lista blanca de orígenes (ver config/cors.js)
app.use(cors(corsOptions));
// Responder explícitamente a los preflight de cualquier ruta.
app.options('*', cors(corsOptions));

// 3. SEGURIDAD: Rate limiting global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// 4. SEGURIDAD: Rate limiting estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos
    message: 'Demasiados intentos de login, por favor intenta de nuevo en 15 minutos.',
    skipSuccessfulRequests: true
});

// 5. SEGURIDAD: Body parsers con límite de tamaño
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. SEGURIDAD: Sanitización contra NoSQL Injection
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`⚠️ Intento de NoSQL injection detectado en ${key}`);
    }
}));

// Montar endpoints
app.use('/api/auth', authLimiter, authRoutes);

// Endpoints Message
app.use('/api/messages', messageRoutes);

// Endpoints AI
app.use('/api/ai', aiRoutes);

// Endpoints Bot RAG
app.use('/api/bot', botRoutes);

// Endpoints Cursos
app.use('/api/courses', courseRoutes);

// Endpoints Inscripciones
app.use('/api/enrollments', enrollmentRoutes);

// Ruta de prueba base
app.get('/', (req, res) => {
    res.send('API de MentorSync funcionando correctamente 🚀');
});


// 7. Manejo de errores global (no exponer stack traces en producción)
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';
    
    // En producción, no exponer detalles del error
    if (process.env.NODE_ENV === 'production') {
        res.status(statusCode).json({
            success: false,
            message: statusCode === 500 ? 'Error interno del servidor' : message
        });
    } else {
        // En desarrollo, incluir stack trace para debugging
        res.status(statusCode).json({
            success: false,
            message,
            stack: err.stack
        });
    }
});


module.exports = app;
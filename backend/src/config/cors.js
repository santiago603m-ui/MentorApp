/**
 * Configuración de CORS compartida entre Express y Socket.io.
 *
 * Orígenes permitidos:
 *  - Los definidos en CLIENT_URL (separados por coma).
 *  - Los puertos de desarrollo habituales de Angular.
 *  - Túneles de desarrollo (*.loca.lt, *.ngrok-free.app, *.trycloudflare.com),
 *    útiles cuando se expone el frontend para probar desde otro dispositivo.
 *
 * No se usa '*' porque la app envía credenciales.
 */

const DEV_ORIGINS = [
    'http://localhost:4200',
    'http://localhost:4300',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:4300'
];

const TUNNEL_PATTERNS = [
    /^https:\/\/[a-z0-9-]+\.loca\.lt$/i,
    /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i,
    /^https:\/\/[a-z0-9-]+\.ngrok\.io$/i,
    /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i
];

const configuredOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...configuredOrigins, ...DEV_ORIGINS])];

const isAllowedOrigin = (origin) => {
    // Peticiones sin Origin (curl, health checks, apps móviles) se permiten.
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    return TUNNEL_PATTERNS.some(pattern => pattern.test(origin));
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        console.warn(`⛔ CORS: origen bloqueado -> ${origin}`);
        return callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        // localtunnel muestra una página de aviso si falta esta cabecera.
        'bypass-tunnel-reminder',
        // ngrok tiene su equivalente.
        'ngrok-skip-browser-warning'
    ]
};

module.exports = { corsOptions, isAllowedOrigin, allowedOrigins };

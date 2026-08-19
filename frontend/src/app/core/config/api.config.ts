/**
 * Punto único de configuración del backend.
 *
 * Cambiar `API_BASE_URL` aquí actualiza todos los servicios HTTP
 * (auth, courses, enrollments, messages, ai, bot) y la conexión de Socket.io.
 *
 * Valores según el entorno:
 *   Producción (Render):  https://mentorapp-a1n8.onrender.com
 *   Desarrollo local:     http://localhost:5000
 *   Túnel temporal:       la URL que entregue localtunnel / ngrok
 */
export const API_BASE_URL = 'https://mentorapp-a1n8.onrender.com';

/** Origen para Socket.io (mismo host que la API). */
export const SOCKET_URL = API_BASE_URL;

/** Raíz de los endpoints REST. */
export const API_URL = `${API_BASE_URL}/api`;

/**
 * Punto único de configuración del backend.
 *
 * Cambiar `API_BASE_URL` aquí actualiza todos los servicios HTTP y la
 * conexión de Socket.io.
 *
 * Para desarrollo local:  http://localhost:5000
 * Para túnel (localtunnel/ngrok): la URL pública que entrega la herramienta.
 */
export const API_BASE_URL = 'https://quick-pants-slide.loca.lt';

/** Origen para Socket.io (mismo host que la API). */
export const SOCKET_URL = API_BASE_URL;

/** Raíz de los endpoints REST. */
export const API_URL = `${API_BASE_URL}/api`;

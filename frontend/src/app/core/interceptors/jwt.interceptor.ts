import { HttpInterceptorFn } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';

/**
 * Añade el JWT y, cuando el backend está detrás de un túnel de desarrollo,
 * las cabeceras que evitan su página de advertencia.
 *
 * Sin `bypass-tunnel-reminder`, localtunnel responde HTML a las peticiones
 * del navegador y las llamadas a la API fallan al parsear el JSON.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const headers: Record<string, string> = {};

    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (isTunnelUrl(req.url)) {
        headers['bypass-tunnel-reminder'] = 'true';
        headers['ngrok-skip-browser-warning'] = 'true';
    }

    if (Object.keys(headers).length === 0) {
        return next(req);
    }

    return next(req.clone({ setHeaders: headers }));
};

const TUNNEL_HOSTS = ['.loca.lt', '.ngrok-free.app', '.ngrok.io', '.trycloudflare.com'];

function isTunnelUrl(url: string): boolean {
    // Se comprueba también la base configurada: cubre las rutas relativas.
    const target = url.startsWith('http') ? url : API_BASE_URL;
    return TUNNEL_HOSTS.some(host => target.includes(host));
}

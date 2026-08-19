import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { API_URL } from '../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${API_URL}/auth`;

    private currentUserSubject = new BehaviorSubject<User | null>(this.readStoredUser());
    public currentUser = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) { }

    register(userData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
            tap((res) => this.persistSession(res))
        );
    }

    login(credentials: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
            tap((res) => this.persistSession(res))
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    getCurrentUser(): User | null {
        return this.currentUserSubject.value;
    }

    /** Id del usuario actual, tolerante a `_id` o `id`. */
    getCurrentUserId(): string | null {
        const user = this.currentUserSubject.value as any;
        return user?._id || user?.id || null;
    }

    isLoggedIn(): boolean {
        return !!this.getToken() && !!this.getCurrentUserId();
    }

    /**
     * El backend responde con el usuario en el nivel raíz:
     *   { _id, name, email, role, token }
     * pero también toleramos formatos anidados ({ user }, { data: { user } })
     * para no romper si el contrato cambia.
     */
    private persistSession(res: any): void {
        if (!res) return;

        if (res.token) {
            localStorage.setItem('token', res.token);
        }

        const source = res.user ?? res.data?.user ?? res.userData ?? res;

        const id = source?._id ?? source?.id;
        if (!id) {
            // Sin id no hay sesión utilizable: los sockets rechazarían cada evento.
            console.error('[AuthService] La respuesta de autenticación no incluye el id del usuario.', res);
            return;
        }

        const user: User = {
            _id: id,
            name: source.name,
            email: source.email,
            role: source.role
        };

        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
    }

    private readStoredUser(): User | null {
        try {
            const raw = localStorage.getItem('user');
            if (!raw || raw === 'undefined') return null;

            const parsed = JSON.parse(raw);
            // Sesiones guardadas por versiones anteriores pueden venir incompletas.
            return parsed && (parsed._id || parsed.id) ? parsed : null;
        } catch {
            localStorage.removeItem('user');
            return null;
        }
    }
}

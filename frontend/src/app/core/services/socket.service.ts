import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Message } from '../../models/message.model';
import { SOCKET_URL } from '../config/api.config';

export interface OnlineUser {
    socketId: string;
    userId: string;
    name: string;
    role: string;
}

export interface SocketIdentity {
    userId: string;
    name: string;
    role: string;
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected'
 | 'error';
const TUNNEL_HOSTS: string[] = ['loca.lt', 'ngrok-free.app', 'trycloudflare.com'];
@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket?: Socket;
    private readonly url = SOCKET_URL;

    /**
     * Los eventos se publican en Subjects de larga vida y los handlers de
     * socket.io se registran UNA sola vez al crear el socket. Así una
     * reconexión no deja a los componentes con listeners huérfanos.
     */
    private readonly onlineUsers$ = new BehaviorSubject<OnlineUser[]>([]);
    private readonly message$ = new Subject<Message>();
    private readonly typing$ = new Subject<{ user: string }>();
    private readonly stopTyping$ = new Subject<{ user: string }>();
    private readonly error$ = new Subject<{ message: string }>();
    private readonly mentorshipReady$ = new Subject<{ roomId: string; mentorName: string }>();
    private readonly mentorshipRequested$ = new Subject<{ roomId: string; apprenticeName: string; apprenticeId: string }>();
    private readonly state$ = new BehaviorSubject<ConnectionState>('idle');

    /** Se reenvían al servidor tras cada (re)conexión. */
    private identity: SocketIdentity | null = null;
    private joinedRooms = new Set<string>();
    /** Distingue la primera conexión de las reconexiones. */
    private hasConnectedOnce = false;

    // ---------------------------------------------------------------
    // Ciclo de vida
    // ---------------------------------------------------------------

    /** Idempotente: llamarlo varias veces no abre conexiones extra. */
    connect(identity?: SocketIdentity): void {
        if (identity) {
            this.identity = identity;
        }

        if (this.socket) {
            // Ya existe: sólo reactivar si se cayó y re-anunciar identidad.
            if (!this.socket.connected) {
                this.socket.connect();
            } else if (identity) {
                this.announce();
            }
            return;
        }

        this.state$.next('connecting');

        const throughTunnel = TUNNEL_HOSTS.some(host => this.url.includes(host));

        this.socket = io(this.url, {
            auth: { token: localStorage.getItem('token') },
            /**
             * Detrás de un túnel arrancamos con `polling`: es el único
             * transporte del navegador que admite cabeceras propias, y
             * necesitamos la de bypass en el handshake. Luego socket.io
             * hace el upgrade a websocket por su cuenta.
             */
            transports: throughTunnel ? ['polling', 'websocket'] : ['websocket', 'polling'],
            extraHeaders: throughTunnel
                ? {
                    'bypass-tunnel-reminder': 'true',
                    'ngrok-skip-browser-warning': 'true'
                }
                : undefined,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 800,
            reconnectionDelayMax: 5000
        });

        this.bindHandlers(this.socket);
    }

    /** Registra los listeners una única vez por instancia de socket. */
    private bindHandlers(socket: Socket): void {
        socket.on('connect', () => {
            this.state$.next('connected');
            this.announce();

            // Sólo en reconexiones: el servidor perdió el estado del socket
            // anterior, hay que volver a entrar a las salas. En la primera
            // conexión el propio componente ya emite su `join_room`.
            if (this.hasConnectedOnce) {
                this.joinedRooms.forEach(roomId => socket.emit('join_room', roomId));
            }
            this.hasConnectedOnce = true;
        });

        socket.on('disconnect', () => this.state$.next('disconnected'));

        socket.on('connect_error', (error: Error) => {
            this.state$.next('error');
            const isAuth = error.message?.includes('Authentication error');
            this.error$.next({
                message: isAuth
                    ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
                    : 'Sin conexión con el servidor de chat.'
            });
        });

        socket.on('online_users_list', (users: OnlineUser[]) => {
            this.onlineUsers$.next(users ?? []);
        });

        socket.on('receive_message', (msg: Message) => this.message$.next(msg));
        socket.on('user_typing', (data: { user: string }) => this.typing$.next(data));
        socket.on('user_stop_typing', (data: { user: string }) => this.stopTyping$.next(data));
        socket.on('chat_error', (data: { message: string }) => this.error$.next(data));
        socket.on('mentorship_room_ready', (data: any) => this.mentorshipReady$.next(data));
        socket.on('mentorship_request_received', (data: any) => this.mentorshipRequested$.next(data));
    }

    private announce(): void {
        if (this.identity?.userId) {
            this.socket?.emit('register_user', this.identity);
        }
    }

    /** Cierra la conexión y limpia el estado. Sólo al cerrar sesión. */
    disconnect(): void {
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = undefined;

        this.identity = null;
        this.joinedRooms.clear();
        this.hasConnectedOnce = false;
        this.onlineUsers$.next([]);
        this.state$.next('idle');
    }

    // ---------------------------------------------------------------
    // Presencia
    // ---------------------------------------------------------------

    registerUser(identity: SocketIdentity): void {
        this.identity = identity;
        this.announce();
    }

    onOnlineUsers(): Observable<OnlineUser[]> {
        return this.onlineUsers$.asObservable();
    }

    onConnectionState(): Observable<ConnectionState> {
        return this.state$.asObservable();
    }

    get isConnected(): boolean {
        return !!this.socket?.connected;
    }

    // ---------------------------------------------------------------
    // Salas
    // ---------------------------------------------------------------

    joinRoom(roomId: string): void {
        if (!roomId) return;
        this.joinedRooms.add(roomId);
        this.socket?.emit('join_room', roomId);
    }

    leaveRoom(roomId: string): void {
        if (!roomId) return;
        this.joinedRooms.delete(roomId);
        this.socket?.emit('leave_room', roomId);
    }

    // ---------------------------------------------------------------
    // Mensajería
    // ---------------------------------------------------------------

    sendMessage(data: { roomId: string; senderId: string; message: string }): void {
        this.socket?.emit('send_message', data);
    }

    onReceiveMessage(): Observable<Message> {
        return this.message$.asObservable();
    }

    // ---------------------------------------------------------------
    // Indicadores de escritura
    // ---------------------------------------------------------------

    sendTyping(roomId: string, user: string): void {
        this.socket?.emit('typing', { roomId, user });
    }

    sendStopTyping(roomId: string, user: string): void {
        this.socket?.emit('stop_typing', { roomId, user });
    }

    onUserTyping(): Observable<{ user: string }> {
        return this.typing$.asObservable();
    }

    onUserStopTyping(): Observable<{ user: string }> {
        return this.stopTyping$.asObservable();
    }

    // ---------------------------------------------------------------
    // Mentorías 1 a 1
    // ---------------------------------------------------------------

    requestMentorship(mentorId: string, apprenticeId: string, mentorName: string, apprenticeName: string): void {
        this.socket?.emit('request_mentorship', { mentorId, apprenticeId, mentorName, apprenticeName });
    }

    onMentorshipRoomReady(): Observable<{ roomId: string; mentorName: string }> {
        return this.mentorshipReady$.asObservable();
    }

    onMentorshipRequested(): Observable<{ roomId: string; apprenticeName: string; apprenticeId: string }> {
        return this.mentorshipRequested$.asObservable();
    }

    // ---------------------------------------------------------------
    // Errores
    // ---------------------------------------------------------------

    onChatError(): Observable<{ message: string }> {
        return this.error$.asObservable();
    }
}

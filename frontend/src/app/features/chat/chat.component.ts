import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    NgZone,
    ChangeDetectorRef,
    AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService, OnlineUser, ConnectionState } from '../../core/services/socket.service';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { Message } from '../../models/message.model';
import { User } from '../../models/user.model';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
    @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

    messages: Message[] = [];
    onlineUsers: OnlineUser[] = [];
    newMessage = '';
    typingUser = '';
    currentRoom = 'general';
    roomTitle = 'Sala General';

    loadingHistory = false;
    errorMessage = '';
    connectionState: ConnectionState = 'idle';

    private currentUser: User | null = null;
    private currentUserId: string | null = null;

    private typingSubject = new Subject<void>();
    private subs = new Subscription();

    /** Evita duplicar mensajes si el servidor reenvía el mismo `_id`. */
    private seenIds = new Set<string>();

    private typingTimer?: number;
    private shouldScroll = false;

    constructor(
        private socketService: SocketService,
        private messageService: MessageService,
        private authService: AuthService,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.currentUser = this.authService.getCurrentUser();
        this.currentUserId = this.authService.getCurrentUserId();

        if (!this.currentUserId) {
            this.errorMessage = 'No pudimos identificar tu sesión. Vuelve a iniciar sesión.';
            return;
        }

        // 1. Suscribirse ANTES de conectar: los Subjects del servicio son
        //    de larga vida, así no se pierde ningún evento inicial.
        this.subs.add(
            this.socketService.onConnectionState().subscribe(state => {
                this.ngZone.run(() => {
                    this.connectionState = state;
                    if (state === 'connected') {
                        this.errorMessage = '';
                    }
                    this.cdr.markForCheck();
                });
            })
        );

        this.subs.add(
            this.socketService.onOnlineUsers().subscribe(users => {
                this.ngZone.run(() => {
                    // Un mismo usuario puede tener varias pestañas abiertas.
                    const unique = new Map<string, OnlineUser>();
                    users.forEach(u => unique.set(u.userId, u));
                    this.onlineUsers = Array.from(unique.values());
                    this.cdr.markForCheck();
                });
            })
        );

        this.subs.add(
            this.socketService.onReceiveMessage().subscribe(msg => {
                this.ngZone.run(() => {
                    this.appendMessage(msg);
                    this.cdr.markForCheck();
                });
            })
        );

        this.subs.add(
            this.socketService.onChatError().subscribe(({ message }) => {
                this.ngZone.run(() => {
                    this.errorMessage = message;
                    this.cdr.markForCheck();
                });
            })
        );

        this.subs.add(
            this.socketService.onUserTyping().subscribe(({ user }) => {
                if (user === this.currentUser?.name) return;
                this.ngZone.run(() => {
                    this.typingUser = user;
                    this.armTypingTimeout();
                    this.cdr.markForCheck();
                });
            })
        );

        this.subs.add(
            this.socketService.onUserStopTyping().subscribe(() => {
                this.ngZone.run(() => {
                    this.clearTyping();
                    this.cdr.markForCheck();
                });
            })
        );

        // Avisa "dejó de escribir" cuando el usuario se detiene.
        this.subs.add(
            this.typingSubject.pipe(debounceTime(1200)).subscribe(() => {
                this.socketService.sendStopTyping(this.currentRoom, this.currentUser?.name || '');
            })
        );

        // 2. Conectar anunciando la identidad. El servicio la reenvía
        //    automáticamente en cada reconexión.
        this.socketService.connect({
            userId: this.currentUserId,
            name: this.currentUser?.name || 'Usuario',
            role: this.currentUser?.role || 'student'
        });

        // 3. Entrar a la sala y cargar el historial.
        this.changeRoom('general', 'Sala General');
    }

    ngAfterViewChecked(): void {
        // Hacer scroll aquí garantiza que el nodo ya está en el DOM.
        if (this.shouldScroll) {
            this.shouldScroll = false;
            this.scrollToBottom();
        }
    }

    get connectionLabel(): string {
        const labels: Record<ConnectionState, string> = {
            idle: 'Desconectado',
            connecting: 'Conectando…',
            connected: 'En línea',
            disconnected: 'Reconectando…',
            error: 'Sin conexión'
        };
        return labels[this.connectionState];
    }

    /** Tooltip con los nombres de los conectados. */
    get onlineNames(): string {
        return this.onlineUsers.map(u => u.name).join(', ');
    }

    ngOnDestroy(): void {
        this.socketService.leaveRoom(this.currentRoom);
        // Importante: NO desconectar el socket. Es un singleton compartido
        // con el resto de la app; se cierra sólo al cerrar sesión.
        this.subs.unsubscribe();
        window.clearTimeout(this.typingTimer);
    }

    changeRoom(newRoomId: string, title: string): void {
        if (this.currentRoom && this.currentRoom !== newRoomId) {
            this.socketService.leaveRoom(this.currentRoom);
        }

        this.currentRoom = newRoomId;
        this.roomTitle = title;
        this.messages = [];
        this.seenIds.clear();
        this.clearTyping();

        this.socketService.joinRoom(newRoomId);
        this.loadHistory(newRoomId);
    }

    /** Recarga manual (botón de reintento). */
    reload(): void {
        this.errorMessage = '';
        this.socketService.connect();
        this.socketService.joinRoom(this.currentRoom);
        this.loadHistory(this.currentRoom);
    }

    onInputChange(): void {
        this.socketService.sendTyping(this.currentRoom, this.currentUser?.name || '');
        this.typingSubject.next();
    }

    sendMessage(): void {
        const text = this.newMessage.trim();
        if (!text) return;

        if (!this.currentUserId) {
            this.errorMessage = 'Tu sesión no es válida. Vuelve a iniciar sesión.';
            return;
        }

        this.errorMessage = '';

        this.socketService.sendMessage({
            roomId: this.currentRoom,
            senderId: this.currentUserId,
            message: text
        });

        // El servidor reemite a la sala (incluido el emisor), así que el
        // mensaje aparece cuando confirma que se guardó.
        this.newMessage = '';
        this.socketService.sendStopTyping(this.currentRoom, this.currentUser?.name || '');
    }

    isMyMessage(sender: unknown): boolean {
        if (!sender || !this.currentUserId) return false;

        const senderId = typeof sender === 'object'
            ? (sender as any)._id ?? (sender as any).id
            : sender;

        return senderId === this.currentUserId;
    }

    getSenderName(msg: Message): string {
        const sender = msg.sender as any;
        if (this.isMyMessage(msg.sender)) return 'Tú';
        return sender?.name || 'Usuario';
    }

    /** `trackBy` evita repintar toda la lista en cada mensaje nuevo. */
    trackMessage(index: number, msg: Message): string {
        return msg._id ?? `${index}`;
    }

    private loadHistory(roomId: string): void {
        this.loadingHistory = true;

        this.messageService.getMessagesByRoom(roomId).subscribe({
            next: (data) => {
                this.ngZone.run(() => {
                    // Descarta la respuesta si el usuario ya cambió de sala.
                    if (this.currentRoom !== roomId) return;

                    this.seenIds.clear();
                    this.messages = [];
                    (data ?? []).forEach(msg => this.appendMessage(msg));

                    this.loadingHistory = false;
                    this.cdr.markForCheck();
                });
            },
            error: (err) => {
                this.ngZone.run(() => {
                    this.loadingHistory = false;
                    this.errorMessage =
                        err?.error?.message || 'No pudimos cargar el historial de mensajes.';
                    this.cdr.markForCheck();
                });
            }
        });
    }

    private appendMessage(raw: Message): void {
        const msg = this.normalize(raw);

        // Ignora mensajes de otras salas y duplicados.
        if (msg.roomId && msg.roomId !== this.currentRoom) return;
        if (msg._id) {
            if (this.seenIds.has(msg._id)) return;
            this.seenIds.add(msg._id);
        }

        this.messages.push(msg);
        this.shouldScroll = true;
    }

    /** El documento guarda `message`; la vista usa `content`. */
    private normalize(msg: Message): Message {
        const content = this.decodeEntities(msg.message ?? msg.content ?? '');

        if (typeof msg.sender === 'string') {
            return {
                ...msg,
                content,
                sender: {
                    _id: msg.sender,
                    name: 'Usuario',
                    email: '',
                    role: 'student'
                } as User
            };
        }

        const sender = msg.sender
            ? { ...(msg.sender as User), name: this.decodeEntities((msg.sender as User).name) }
            : msg.sender;

        return { ...msg, content, sender };
    }

    /**
     * El backend guarda el texto con `validator.escape()` como defensa en
     * profundidad. Angular ya escapa al interpolar, así que aquí hay que
     * revertir las entidades o se verían literales ("it&#x27;s", "https:&#x2F;&#x2F;").
     */
    private decodeEntities(value: string): string {
        if (!value || !value.includes('&')) return value;

        return value
            .replace(/&#x2F;/gi, '/')
            .replace(/&#x5C;/gi, '\\')
            .replace(/&#x27;/gi, "'")
            .replace(/&#96;/g, '`')
            .replace(/&quot;/gi, '"')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            // `&amp;` va al final para no re-decodificar entidades anidadas.
            .replace(/&amp;/gi, '&');
    }

    private armTypingTimeout(): void {
        window.clearTimeout(this.typingTimer);
        // Red de seguridad: si el evento `stop_typing` se pierde,
        // el indicador no se queda pegado para siempre.
        this.typingTimer = window.setTimeout(() => {
            this.ngZone.run(() => {
                this.typingUser = '';
                this.cdr.markForCheck();
            });
        }, 3000);
    }

    private clearTyping(): void {
        window.clearTimeout(this.typingTimer);
        this.typingUser = '';
    }

    private scrollToBottom(): void {
        const el = this.scrollContainer?.nativeElement;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }
}

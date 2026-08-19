import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { ChatComponent } from '../chat/chat.component';
import { AiAssistantComponent } from '../ai-assistant/ai-assistant.component';

type TabId = 'chat' | 'ai';

interface Tab {
    id: TabId;
    label: string;
    icon: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, ChatComponent, AiAssistantComponent],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    activeTab: TabId = 'chat';

    userName = 'Usuario';
    userInitial = 'U';

    readonly tabs: Tab[] = [
        { id: 'chat', label: 'Chat general', icon: '💬' },
        { id: 'ai', label: 'Asistente IA', icon: '🤖' }
    ];

    constructor(
        private authService: AuthService,
        private socketService: SocketService,
        private router: Router
    ) { }

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        const userId = this.authService.getCurrentUserId();

        this.userName = user?.name || 'Usuario';
        this.userInitial = this.userName.charAt(0).toUpperCase();

        // Anunciar presencia en cuanto entra al panel. `connect` es
        // idempotente, así que el chat puede volver a llamarlo sin abrir
        // una segunda conexión.
        if (userId) {
            this.socketService.connect({
                userId,
                name: this.userName,
                role: user?.role || 'student'
            });
        }
    }

    logout(): void {
        this.socketService.disconnect();
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}

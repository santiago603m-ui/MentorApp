import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';

interface NavLink {
    label: string;
    path: string;
    fragment?: string;
}

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
    isLoggedIn = false;
    isMenuOpen = false;
    isScrolled = false;

    userName = 'Usuario';
    userInitial = 'U';

    readonly navLinks: NavLink[] = [
        { label: 'Cursos', path: '/courses' },
        { label: 'Clases en vivo', path: '/', fragment: 'vivo' },
        { label: 'Bot mentor', path: '/', fragment: 'bot' },
        { label: 'Comunidad', path: '/', fragment: 'comunidad' }
    ];

    private subs = new Subscription();

    constructor(
        private authService: AuthService,
        private socketService: SocketService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.subs.add(
            this.authService.currentUser.subscribe(user => {
                this.isLoggedIn = !!user;
                this.userName = user?.name || 'Usuario';
                this.userInitial = this.userName.charAt(0).toUpperCase();
            })
        );

        // Cierra el menú móvil al navegar
        this.subs.add(
            this.router.events
                .pipe(filter(e => e instanceof NavigationEnd))
                .subscribe(() => this.closeMenu())
        );

        this.updateScrollState();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
        document.body.style.removeProperty('overflow');
    }

    @HostListener('window:scroll')
    onScroll(): void {
        this.updateScrollState();
    }

    @HostListener('window:resize')
    onResize(): void {
        if (window.innerWidth > 900 && this.isMenuOpen) {
            this.closeMenu();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isMenuOpen) {
            this.closeMenu();
        }
    }

    toggleMenu(): void {
        this.isMenuOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu(): void {
        this.isMenuOpen = true;
        // Evita el scroll del fondo con el panel abierto
        document.body.style.overflow = 'hidden';
    }

    closeMenu(): void {
        this.isMenuOpen = false;
        document.body.style.removeProperty('overflow');
    }

    logout(): void {
        this.closeMenu();
        // Cerrar el socket antes de limpiar el token: el servidor debe
        // sacar al usuario de la lista de conectados.
        this.socketService.disconnect();
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    private updateScrollState(): void {
        this.isScrolled = window.scrollY > 12;
    }
}

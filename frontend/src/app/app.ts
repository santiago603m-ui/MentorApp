import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar.component';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <canvas id="particles-canvas" aria-hidden="true"></canvas>
    <div class="app-container">
      <app-navbar></app-navbar>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class App implements AfterViewInit, OnDestroy {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private frameId = 0;

  private nodes: Node[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;

  /** Distancia máxima para dibujar una conexión entre nodos. */
  private linkDist = 150;
  /** Radio de influencia del cursor. */
  private readonly mouseRadius = 150;

  private mouseX = -9999;
  private mouseY = -9999;

  private reduceMotion = false;
  private resizeTimer?: number;

  // Referencias estables para poder desuscribir en ngOnDestroy
  private readonly onResize = () => this.scheduleResize();
  private readonly onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };
  private readonly onMouseLeave = () => {
    this.mouseX = -9999;
    this.mouseY = -9999;
  };

  ngAfterViewInit(): void {
    this.canvas = document.getElementById('particles-canvas') as HTMLCanvasElement | null ?? undefined;
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.resize();

    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('mouseleave', this.onMouseLeave, { passive: true });

    this.draw();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseleave', this.onMouseLeave);
  }

  /** Evita recrear los nodos en cada evento de resize. */
  private scheduleResize(): void {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => this.resize(), 180);
  }

  private resize(): void {
    if (!this.canvas || !this.ctx) return;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Nitidez en pantallas HiDPI, con techo para no castigar el rendimiento
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.seedNodes();
  }

  private seedNodes(): void {
    const isMobile = this.width < 768;
    const isTablet = this.width < 1200;

    // Menos nodos en móvil: el coste real está en el bucle de conexiones O(n²)
    const count = isMobile ? 24 : isTablet ? 45 : 68;
    this.linkDist = isMobile ? 110 : 150;

    this.nodes = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      r: Math.random() * 1.6 + 0.8
    }));
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Movimiento
    if (!this.reduceMotion) {
      for (const n of this.nodes) {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x <= 0 || n.x >= this.width) {
          n.vx *= -1;
          n.x = Math.max(0, Math.min(this.width, n.x));
        }
        if (n.y <= 0 || n.y >= this.height) {
          n.vy *= -1;
          n.y = Math.max(0, Math.min(this.height, n.y));
        }

        // Deriva suave hacia el cursor (atracción sutil, sin sacudidas)
        const dx = this.mouseX - n.x;
        const dy = this.mouseY - n.y;
        if (Math.abs(dx) < this.mouseRadius && Math.abs(dy) < this.mouseRadius) {
          const dist = Math.hypot(dx, dy);
          if (dist < this.mouseRadius && dist > 0) {
            n.x -= dx * 0.004;
            n.y -= dy * 0.004;
          }
        }
      }
    }

    // 2. Conexiones
    ctx.lineWidth = 1;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;

        // Descarte rápido antes de la raíz cuadrada
        if (Math.abs(dx) > this.linkDist || Math.abs(dy) > this.linkDist) continue;

        const dist = Math.hypot(dx, dy);
        if (dist >= this.linkDist) continue;

        ctx.strokeStyle = `rgba(79, 217, 240, ${(1 - dist / this.linkDist) * 0.18})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // 3. Nodos (se iluminan cerca del cursor)
    for (const n of this.nodes) {
      const near = Math.hypot(this.mouseX - n.x, this.mouseY - n.y) < this.mouseRadius;
      ctx.fillStyle = near ? 'rgba(140, 233, 245, 0.9)' : 'rgba(79, 217, 240, 0.45)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, near ? n.r * 2 : n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    this.frameId = requestAnimationFrame(() => this.draw());
  }
}

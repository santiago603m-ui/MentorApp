import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Stat {
  num: string;
  label: string;
}

interface FeaturedCourse {
  title: string;
  description: string;
  level: string;
  isLive: boolean;
  mentor: string;
  sessions: number;
}

interface BotFeature {
  icon: string;
  title: string;
  description: string;
}

interface CommunityGroup {
  name: string;
  members: number;
  online: number;
}

interface ChatMessage {
  isBot: boolean;
  author?: string;
  text: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  readonly year = new Date().getFullYear();

  readonly stats: Stat[] = [
    { num: '180+', label: 'Rutas de aprendizaje' },
    { num: '42', label: 'Clases en vivo esta semana' },
    { num: '24/7', label: 'Mentores + bot disponible' }
  ];

  readonly liveClass = {
    title: 'Angular avanzado: Signals y Zoneless',
    mentor: 'Camila Ruiz',
    viewers: 214
  };

  readonly courses: FeaturedCourse[] = [
    {
      title: 'Node.js + MongoDB desde cero',
      description: 'Construye una API REST completa con autenticación y validaciones.',
      level: 'Intermedio',
      isLive: true,
      mentor: 'Daniel Ortiz',
      sessions: 6
    },
    {
      title: 'Fundamentos de Angular',
      description: 'Componentes, servicios y routing, con proyecto final guiado.',
      level: 'Principiante',
      isLive: false,
      mentor: 'Camila Ruiz',
      sessions: 10
    },
    {
      title: 'Arquitectura de microservicios',
      description: 'Diseño, comunicación entre servicios y despliegue en la nube.',
      level: 'Avanzado',
      isLive: false,
      mentor: 'Julián Prada',
      sessions: 8
    }
  ];

  readonly botFeatures: BotFeature[] = [
    {
      icon: '⚙',
      title: 'Personalidad configurable',
      description: 'Cada mentor define el tono y los límites de lo que su bot puede responder.'
    },
    {
      icon: '◆',
      title: 'Transparencia total',
      description: 'Siempre queda claro cuándo hablas con el bot y cuándo con el mentor real.'
    },
    {
      icon: '↻',
      title: 'Aprende del curso',
      description: 'Responde con base en el contenido real de la clase, no de forma genérica.'
    }
  ];

  readonly communityGroups: CommunityGroup[] = [
    { name: 'Grupo Node.js Bogotá', members: 312, online: 18 },
    { name: 'Angular avanzado', members: 204, online: 9 },
    { name: 'Primeros pasos en dev', members: 540, online: 41 },
    { name: 'Mentoría entre pares', members: 96, online: 6 }
  ];

  readonly chatMessages: ChatMessage[] = [
    {
      isBot: false,
      text: '¿Cuándo usar Signals en vez de RxJS?'
    },
    {
      isBot: true,
      author: 'Bot de Camila:',
      text: 'Para estado local simple, Signals. Si necesitas combinar streams asíncronos complejos, RxJS sigue siendo mejor opción.'
    }
  ];

  readonly isTyping = true;
}

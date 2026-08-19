import { Component, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, AiMessage } from '../../core/services/ai.service';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  prompt = '';
  loading = false;
  messages: AiMessage[] = [
    { sender: 'ai', text: '¡Hola! Soy tu **Mentor AI** alimentado por Groq. Puedes preguntarme sobre errores en tu código, consultas SQL, modelos de MongoDB o cómo conectar tu frontend con el backend.' }
  ];

  constructor(
    private aiService: AiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  sendPrompt(): void {
    if (!this.prompt.trim() || this.loading) return;

    const userMessage = this.prompt;
    this.messages.push({ sender: 'user', text: userMessage });
    this.prompt = '';
    this.loading = true;
    this.scrollToBottom();

    this.aiService.askAi(this.messages).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.messages.push({ sender: 'ai', text: res.reply });
          this.loading = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.messages.push({ sender: 'ai', text: 'Hubo un error al conectar con Groq. Revisa tu `GROQ_API_KEY`.' });
          this.loading = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      }
    });
  }

  clearChat(): void {
    this.messages = [
      { sender: 'ai', text: 'Conversación reiniciada. ¿En qué te puedo colaborar ahora?' }
    ];
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      } catch (err) { }
    }, 50);
  }
}
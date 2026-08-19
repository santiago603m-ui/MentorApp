import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { parse } from 'marked';

@Pipe({
    name: 'markdown',
    standalone: true
})
export class MarkdownPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) { }

    transform(value: string): SafeHtml {
        if (!value) return '';
        // Convierte el texto Markdown a HTML
        const rawHtml = parse(value) as string;
        // Permite que Angular renderice el HTML de forma segura
        return this.sanitizer.bypassSecurityTrustHtml(rawHtml);
    }
} 
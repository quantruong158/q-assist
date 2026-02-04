import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
})
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  private initialized = false;

  transform(value: string): SafeHtml {
    if (!value) return '';

    if (!this.initialized) {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      this.initialized = true;
    }

    const html = marked.parse(value, { async: false }) as string;

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { OpencodeStateStore } from '../opencode-state.store';
import { OpencodeTextPartComponent } from './opencode-text-part.component';
import { OpencodeReasoningPartComponent } from './opencode-reasoning-part.component';
import { OpencodeToolPartComponent } from './opencode-tool-part.component';
import { OpencodeStepPartComponent } from './opencode-step-part.component';
import type { Message, Part } from '../opencode.types';

@Component({
  selector: 'opencode-message-item',
  imports: [
    DatePipe,
    HlmBadgeImports,
    OpencodeTextPartComponent,
    OpencodeReasoningPartComponent,
    OpencodeToolPartComponent,
    OpencodeStepPartComponent,
  ],
  template: `
    <div class="mb-2">
      @if (message().role === 'assistant') {
        <div class="mb-2 flex items-center gap-2">
          <span class="text-xs text-muted-foreground">
            {{ message().time.created | date: 'medium' }}
          </span>
          @if (hasError()) {
            <hlm-badge variant="destructive" class="text-xs select-none">Error</hlm-badge>
          }
        </div>
      }

      <div class="flex flex-col">
        @for (partId of partIds(); track partId) {
          @if (getPart(partId); as part) {
            <div
              [class]="message().role === 'assistant' ? 'px-3' : 'p-0'"
              [class.hidden]="part.type === 'step-start' || part.type === 'step-finish'"
              [class.py-3]="message().role === 'assistant' && part.type !== 'reasoning'"
            >
              @switch (part.type) {
                @case ('text') {
                  <opencode-text-part [text]="part.text" [role]="message().role" />
                }
                @case ('reasoning') {
                  <opencode-reasoning-part [text]="part.text" />
                }
                @case ('tool') {
                  <opencode-tool-part [part]="part" />
                }
                @case ('step-start') {
                  <opencode-step-part [part]="asStepStart(part)" />
                }
                @case ('step-finish') {
                  <opencode-step-part [part]="asStepFinish(part)" />
                }
                @default {
                  <p class="text-xs text-muted-foreground">[{{ part.type }}]</p>
                }
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeMessageItemComponent {
  readonly store = inject(OpencodeStateStore);
  readonly message = input.required<Message>();
  readonly partIds = input.required<string[]>();

  hasError(): boolean {
    const msg = this.message();
    return msg.role === 'assistant' && !!msg.error;
  }

  getPart(partId: string): Part | null {
    return this.store.partsById()[partId] ?? null;
  }

  asStepStart(part: Part) {
    return part as Part & { type: 'step-start'; snapshot?: string };
  }

  asStepFinish(part: Part) {
    return part as Part & { type: 'step-finish'; reason: string };
  }
}

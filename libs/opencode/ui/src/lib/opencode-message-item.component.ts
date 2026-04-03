import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeTextPartComponent } from './opencode-text-part.component';
import { OpencodeReasoningPartComponent } from './opencode-reasoning-part.component';
import { OpencodeToolPartComponent } from './opencode-tool-part.component';
import { OpencodeStepPartComponent } from './opencode-step-part.component';
import { OpencodeFilePartComponent } from './opencode-file-part.component';
import type { Message, Part } from '@qos/opencode/data-access';

@Component({
  selector: 'opencode-message-item',
  imports: [
    DatePipe,
    HlmBadgeImports,
    OpencodeTextPartComponent,
    OpencodeReasoningPartComponent,
    OpencodeToolPartComponent,
    OpencodeStepPartComponent,
    OpencodeFilePartComponent,
  ],
  template: `
    <div>
      @if (message().role === 'assistant') {
        <div class="mb-2 flex items-center gap-2 mt-8">
          <span class="text-xs text-muted-foreground">{{
            message().time.created | date: 'medium'
          }}</span>
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
              [class.py-2]="message().role === 'assistant' && part.type !== 'reasoning'"
            >
              @switch (part.type) {
                @case ('text') {
                  @if (!part.synthetic) {
                    <opencode-text-part [text]="part.text" [role]="message().role" />
                  }
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
                @case ('file') {
                  <opencode-file-part [part]="part" />
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
  private readonly store = inject(OpencodeStateStore);
  readonly message = input.required<Message>();
  readonly partIds = input.required<string[]>();

  protected readonly hasError = computed(() => {
    const msg = this.message();
    return msg.role === 'assistant' && !!msg.error;
  });

  protected getPart(partId: string): Part | null {
    return this.store.partsById()[partId] ?? null;
  }
  protected asStepStart(part: Part) {
    return part as Part & { type: 'step-start'; snapshot?: string };
  }
  protected asStepFinish(part: Part) {
    return part as Part & { type: 'step-finish'; reason: string };
  }
}

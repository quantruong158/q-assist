import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeTextPartComponent } from './opencode-text-part';
import { OpencodeReasoningPartComponent } from './opencode-reasoning-part';
import { OpencodeToolPartComponent } from './opencode-tool-part';
import { OpencodeStepPartComponent } from './opencode-step-part';
import { OpencodeFilePartComponent } from './opencode-file-part';
import type { Message, Part } from '@qos/opencode/data-access';
import { OpencodeMessageErrorComponent } from './opencode-messsage-error';

@Component({
  selector: 'opencode-message-item',
  imports: [
    HlmBadgeImports,
    OpencodeTextPartComponent,
    OpencodeReasoningPartComponent,
    OpencodeToolPartComponent,
    OpencodeStepPartComponent,
    OpencodeFilePartComponent,
    OpencodeMessageErrorComponent,
  ],
  template: `
    <div>
      <div class="flex flex-col" [class.mt-8]="message().role === 'assistant'">
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
                  <opencode-reasoning-part [part]="part" />
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
      @if (error()) {
        <opencode-message-error [error]="error()!" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeMessageItemComponent {
  private readonly store = inject(OpencodeStateStore);
  readonly message = input.required<Message>();
  readonly partIds = input.required<string[]>();

  protected readonly error = computed(() => {
    const msg = this.message();
    return msg.role === 'assistant' ? msg.error : undefined;
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

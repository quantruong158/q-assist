import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeReasoningPartComponent } from './opencode-reasoning-part';
import { OpencodeToolPartComponent } from './opencode-tool-part';
import { OpencodeStepPartComponent } from './opencode-step-part';
import { OpencodeFilePartComponent } from './opencode-file-part';
import type { Message, Part } from '@qos/opencode/data-access';
import { OpencodeMessageErrorComponent } from './opencode-messsage-error';
import { OpencodeUserTextPartComponent } from './opencode-user-text-part';
import { OpencodeAssistantTextPartComponent } from './opencode-assistant-text-part';

@Component({
  selector: 'opencode-message-item',
  imports: [
    HlmBadgeImports,
    OpencodeUserTextPartComponent,
    OpencodeAssistantTextPartComponent,
    OpencodeReasoningPartComponent,
    OpencodeToolPartComponent,
    OpencodeStepPartComponent,
    OpencodeFilePartComponent,
    OpencodeMessageErrorComponent,
  ],
  template: `
    <div>
      <div class="flex flex-col" [class.mt-8]="isAssistant()">
        @if (partIds().length === 0 && isAssistant() && !error()) {
          <span
            class="pl-3 shimmer shimmer-spread-150 shimmer-repeat-delay-200 text-muted-foreground shimmer-duration-1000 w-fit"
          >
            Thinking...
          </span>
        }
        @for (part of parts(); track part.id) {
          <div
            [class]="isAssistant() ? 'px-3' : 'p-0'"
            [class.hidden]="
              part.type === 'step-start' || part.type === 'step-finish' || part.type === 'patch'
            "
            [class.py-2]="isAssistant() && part.type !== 'reasoning'"
          >
            @switch (part.type) {
              @case ('text') {
                @if (!part.synthetic) {
                  @if (isAssistant()) {
                    <opencode-assistant-text-part
                      [text]="part.text"
                      [isStreaming]="isMessageStreaming()"
                    />
                  } @else {
                    <opencode-user-text-part
                      [text]="part.text"
                      [highlightIndexes]="highlightIndexes()"
                    />
                  }
                }
              }
              @case ('reasoning') {
                <opencode-reasoning-part [part]="part" [isStreaming]="isMessageStreaming()" />
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

  protected readonly isAssistant = computed(() => {
    return this.message().role === 'assistant';
  });

  protected readonly error = computed(() => {
    const msg = this.message();
    return msg.role === 'assistant' ? msg.error : undefined;
  });

  protected readonly isMessageStreaming = computed(() => {
    if (!this.store.isStreaming() || !this.isAssistant()) {
      return false;
    }

    const lastMessage = this.store.activeSessionMessages().at(-1);
    return lastMessage?.role === 'assistant' && lastMessage.id === this.message().id;
  });

  protected readonly parts = computed(() => {
    return this.partIds()
      .map((partId) => this.getPart(partId))
      .filter((part) => part !== null);
  });

  protected highlightIndexes = computed(() => {
    if (this.isAssistant()) {
      return [];
    }

    return this.parts().reduce<{ start: number; end: number }[]>((acc, part) => {
      if (part.type === 'file') {
        if (!part.source) {
          return acc;
        }

        acc.push({ start: part.source.text.start, end: part.source.text.end });
      }
      return acc;
    }, []);
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

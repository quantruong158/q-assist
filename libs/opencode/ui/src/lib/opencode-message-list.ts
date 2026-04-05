import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeMessageItemComponent } from './opencode-message-item';

@Component({
  selector: 'opencode-message-list',
  imports: [HlmSpinnerImports, OpencodeMessageItemComponent],
  template: `
    @if (isLoading() && store.activeSessionMessages().length === 0) {
      <div class="flex flex-1 flex-col items-center justify-center text-muted-foreground">
        <hlm-spinner class="mb-4 text-2xl" />
        <p class="text-sm">Loading session...</p>
      </div>
    } @else if (store.activeSessionMessages().length === 0) {
      <div class="flex flex-1 flex-col items-center justify-center text-muted-foreground">
        <p class="text-sm">No messages in this session</p>
      </div>
    } @else {
      <div class="flex-1 overflow-y-auto p-4 max-w-300 mx-auto text-sm">
        @for (message of store.activeSessionMessages(); track message.id) {
          <opencode-message-item [message]="message" [partIds]="getPartIds(message.id)" />
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeMessageListComponent {
  readonly store = inject(OpencodeStateStore);
  readonly isLoading = input<boolean>(false);

  private readonly partsByMessageId = computed(() => {
    const parts = this.store.partsById();
    const byMessageId: Record<string, string[]> = {};
    for (const partId of Object.keys(parts)) {
      const part = parts[partId];
      if (!byMessageId[part.messageID]) byMessageId[part.messageID] = [];
      byMessageId[part.messageID].push(partId);
    }
    return byMessageId;
  });

  protected getPartIds(messageId: string): string[] {
    return this.partsByMessageId()[messageId] ?? [];
  }
}

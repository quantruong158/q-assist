import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeMessageItemComponent } from './opencode-message-item';

@Component({
  selector: 'opencode-message-list',
  imports: [HlmSpinnerImports, OpencodeMessageItemComponent],
  template: `
    <div
      class="flex-1 overflow-y-auto p-3 pb-[calc(100px+var(--safe-area-bottom))] max-[600px]:pb-[calc(80px+var(--safe-area-bottom))] max-w-250 mx-auto text-sm"
    >
      @for (message of store.activeSessionMessages(); track message.id) {
        <opencode-message-item [message]="message" [partIds]="getPartIds(message.id)" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeMessageListComponent {
  readonly store = inject(OpencodeStateStore);

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

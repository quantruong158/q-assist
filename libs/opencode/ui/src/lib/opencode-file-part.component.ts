import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeFile01 } from '@ng-icons/huge-icons';
import type { FilePart } from '@qos/opencode/data-access';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
@Component({
  selector: 'opencode-file-part',
  imports: [HlmBadgeImports, NgIcon],
  providers: [provideIcons({ hugeFile01 })],
  template: `
    <span hlmBadge variant="outline" class="ml-auto flex mt-1">
      <ng-icon name="hugeFile01" class="mr-1"></ng-icon>
      {{ part().source?.path ?? 'unknown' }}</span
    >
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeFilePartComponent {
  readonly part = input.required<FilePart>();
}

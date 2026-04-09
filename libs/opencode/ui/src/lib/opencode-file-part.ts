import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeFile01, hugeFolder01 } from '@ng-icons/huge-icons';
import type { FilePart } from '@qos/opencode/data-access';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

@Component({
  selector: 'opencode-file-part',
  imports: [HlmBadgeImports, NgIcon],
  providers: [provideIcons({ hugeFile01, hugeFolder01 })],
  template: `
    <div
      dir="rtl"
      hlmBadge
      variant="outline"
      class="ml-auto flex flex-row-reverse mt-1 py-3 max-w-full min-w-0"
    >
      <ng-icon [name]="isFolder() ? 'hugeFolder01' : 'hugeFile01'" class="mr-1 shrink-0"></ng-icon>
      <span class="shrink block min-w-0 max-w-full truncate">
        {{ sourcePath() }}
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeFilePartComponent {
  readonly part = input.required<FilePart>();

  protected readonly sourcePath = computed(() => {
    const source = this.part().source;
    if (!source) return 'unknown';
    if ('path' in source) return source.path;
    return 'unknown';
  });

  protected readonly isFolder = computed(() => {
    const source = this.part().source;
    return source && 'path' in source && source.path.endsWith('/');
  });
}

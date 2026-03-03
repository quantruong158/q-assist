import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeDelete02 } from '@ng-icons/huge-icons';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';

@Component({
  selector: 'app-delete-sheet',
  imports: [HlmButtonImports, HlmSheetImports, NgIcon],
  providers: [provideIcons({ hugeDelete02 })],
  template: `
    <hlm-sheet>
      <hlm-sheet-content>
        <div class="flex flex-col gap-2">
          <button hlmBtn variant="destructive" (click)="deleteConversation()">
            <ng-icon hlm name="hugeDelete02" />
            Delete
          </button>
        </div>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class DeleteSheet {
  private readonly _dialogRef = inject(BrnDialogRef<unknown>);

  deleteConversation(): void {
    this._dialogRef.close(true);
  }
}

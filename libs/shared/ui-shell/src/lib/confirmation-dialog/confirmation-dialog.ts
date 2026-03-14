import { Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'shell-confirmation-dialog',
  imports: [HlmDialogImports, HlmButtonImports],
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ data.title }}</h2>
      <p hlmDialogDescription>{{ data.message }}</p>
    </hlm-dialog-header>
    <hlm-dialog-footer class="justify-end gap-2">
      <button hlmBtn variant="ghost" (click)="close()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button hlmBtn variant="destructive" (click)="confirm()">
        {{ data.confirmText || 'Delete' }}
      </button>
    </hlm-dialog-footer>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ConfirmationDialog {
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  readonly data = injectBrnDialogContext<ConfirmationDialogData>();

  protected close(): void {
    this.dialogRef.close();
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}

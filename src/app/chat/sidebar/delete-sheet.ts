import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeDelete02 } from '@ng-icons/huge-icons';

@Component({
  selector: 'app-delete-sheet',
  imports: [MatButtonModule, MatIconModule, MatListModule, NgIcon],
  providers: [provideIcons({ hugeDelete02 })],
  template: `
    <mat-nav-list autoFocus="false">
      <a role="button" mat-list-item (click)="deleteConversation()" tabindex="0">
        <mat-icon matListItemIcon><ng-icon name="hugeDelete02" /></mat-icon>
        <span matListItemTitle>Delete</span>
      </a>
    </mat-nav-list>
  `,
  styles: `
    mat-nav-list {
      padding-top: 0;
      padding-bottom: 0;
    }
  `,
})
export class DeleteSheet {
  private readonly _bottomSheetRef = inject<MatBottomSheetRef<DeleteSheet>>(MatBottomSheetRef);

  deleteConversation(): void {
    this._bottomSheetRef.dismiss(true);
  }
}

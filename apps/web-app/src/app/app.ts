import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

import { AuthStore } from '@qos/shared/auth/data-access';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmSpinnerImports],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly authStore = inject(AuthStore);
}

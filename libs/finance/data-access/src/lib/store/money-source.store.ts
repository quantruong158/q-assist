import { computed, Injectable, inject, resource } from '@angular/core';
import { AuthStore } from '@qos/shared/auth/data-access';
import { MoneySourceService } from '../services/money-source.service';
import { MoneySource } from '@qos/finance/shared-models';

@Injectable({ providedIn: 'root' })
export class MoneySourceStore {
  private readonly authStore = inject(AuthStore);
  private readonly moneySourceService = inject(MoneySourceService);

  readonly sourcesResource = resource({
    params: () => {
      const user = this.authStore.currentUser();
      return user ? { userId: user.uid } : undefined;
    },
    loader: async ({ params }) => {
      return await this.moneySourceService.getSources(params.userId);
    },
    defaultValue: [],
  });
  readonly sources = computed<MoneySource[]>(() => this.sourcesResource.value());
  readonly isLoading = computed(() => this.sourcesResource.isLoading());
}

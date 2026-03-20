import { computed, Injectable, inject } from '@angular/core';
import { AuthStore } from '@qos/shared/auth/data-access';
import { MoneySourceService } from '../services/money-source.service';
import { MoneySource } from '@qos/finance/shared-models';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class MoneySourceStore {
  private readonly authStore = inject(AuthStore);
  private readonly moneySourceService = inject(MoneySourceService);

  private readonly sourcesResource = rxResource({
    params: () => {
      const user = this.authStore.currentUser();
      return user ? { userId: user.uid } : undefined;
    },
    stream: ({ params }) => {
      return this.moneySourceService.getRealtimeSources(params.userId);
    },
    defaultValue: [],
  });
  readonly sources = computed<MoneySource[]>(() => this.sourcesResource.value());
  readonly isLoading = computed(() => this.sourcesResource.isLoading());
}

import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MoneySource } from '@qos/finance/shared-models';
import { AuthStore } from '@qos/shared/auth/data-access';
import { MoneySourceService } from '../services/money-source.service';

interface OptimisticSourcesState {
  userId: string;
  revision: number;
  sources: MoneySource[];
}

@Injectable({ providedIn: 'root' })
export class MoneySourceStore {
  private readonly authStore = inject(AuthStore);
  private readonly moneySourceService = inject(MoneySourceService);
  private optimisticRevision = 0;

  private readonly sourcesResource = rxResource({
    params: () => {
      const user = this.authStore.currentUser();
      return user ? { userId: user.uid } : undefined;
    },
    stream: ({ params }) => this.moneySourceService.getRealtimeSources(params.userId),
    defaultValue: [],
  });

  private readonly optimisticSources = signal<OptimisticSourcesState | null>(null);

  readonly sources = computed<MoneySource[]>(() => {
    const userId = this.authStore.currentUser()?.uid;
    const optimistic = this.optimisticSources();
    const sources = optimistic && optimistic.userId === userId ? optimistic.sources : this.sourcesResource.value();

    return this.normalizeSources(sources);
  });

  readonly isLoading = computed(() => this.sourcesResource.isLoading());

  constructor() {
    effect(() => {
      const optimistic = this.optimisticSources();
      const userId = this.authStore.currentUser()?.uid;
      const remoteSources = this.normalizeSources(this.sourcesResource.value());

      if (!optimistic || optimistic.userId !== userId) {
        if (optimistic) {
          this.optimisticSources.set(null);
        }
        return;
      }

      if (this.sourcesMatch(this.normalizeSources(optimistic.sources), remoteSources)) {
        this.optimisticSources.set(null);
      }
    });
  }

  async togglePin(sourceId: string, isPinned: boolean): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    const revision = this.applyOptimisticUpdate(user.uid, (sources) =>
      sources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              isPinned,
            }
          : source,
      ),
    );

    try {
      await this.moneySourceService.togglePin(user.uid, sourceId, isPinned);
    } catch (error) {
      this.rollbackOptimisticUpdate(revision);
      console.error('Failed to toggle money source pin:', error);
    }
  }

  async updateSource(
    sourceId: string,
    data: Partial<Pick<MoneySource, 'name' | 'type' | 'balance' | 'isPinned'>>,
  ): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    const revision = this.applyOptimisticUpdate(user.uid, (sources) =>
      sources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              ...data,
            }
          : source,
      ),
    );

    try {
      await this.moneySourceService.updateSource(user.uid, sourceId, data);
    } catch (error) {
      this.rollbackOptimisticUpdate(revision);
      console.error('Failed to update money source:', error);
    }
  }

  async updateBalance(sourceId: string, balance: number): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    const revision = this.applyOptimisticUpdate(user.uid, (sources) =>
      sources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              balance,
            }
          : source,
      ),
    );

    try {
      await this.moneySourceService.updateBalance(user.uid, sourceId, balance);
    } catch (error) {
      this.rollbackOptimisticUpdate(revision);
      console.error('Failed to update balance:', error);
    }
  }

  async addSource(
    data: Omit<MoneySource, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    await this.moneySourceService.addSource(user.uid, data);
  }

  async deleteSource(sourceId: string): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    const revision = this.applyOptimisticUpdate(user.uid, (sources) =>
      sources.filter((source) => source.id !== sourceId),
    );

    try {
      await this.moneySourceService.deleteSource(user.uid, sourceId);
    } catch (error) {
      this.rollbackOptimisticUpdate(revision);
      console.error('Failed to delete money source:', error);
    }
  }

  async reorderPinned(sourceIds: string[]): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    const revision = this.applyOptimisticUpdate(user.uid, (sources) =>
      this.reorderSourcesLocally(sources, sourceIds, true),
    );

    try {
      await this.moneySourceService.reorderSources(user.uid, sourceIds, true);
    } catch (error) {
      this.rollbackOptimisticUpdate(revision);
      console.error('Failed to reorder pinned money sources:', error);
    }
  }

  async reorderUnpinned(sourceIds: string[]): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) return;

    const revision = this.applyOptimisticUpdate(user.uid, (sources) =>
      this.reorderSourcesLocally(sources, sourceIds, false),
    );

    try {
      await this.moneySourceService.reorderSources(user.uid, sourceIds, false);
    } catch (error) {
      this.rollbackOptimisticUpdate(revision);
      console.error('Failed to reorder unpinned money sources:', error);
    }
  }

  private applyOptimisticUpdate(
    userId: string,
    updater: (sources: MoneySource[]) => MoneySource[],
  ): number {
    const revision = ++this.optimisticRevision;
    this.optimisticSources.set({
      userId,
      revision,
      sources: this.normalizeSources(updater(this.sources())),
    });

    return revision;
  }

  private rollbackOptimisticUpdate(revision: number): void {
    const optimistic = this.optimisticSources();
    if (optimistic?.revision === revision) {
      this.optimisticSources.set(null);
    }
  }

  private reorderSourcesLocally(
    sources: MoneySource[],
    sourceIds: string[],
    isPinned: boolean,
  ): MoneySource[] {
    const sourceIndexById = new Map(sourceIds.map((id, index) => [id, index]));

    return sources.map((source) => {
      const nextIndex = sourceIndexById.get(source.id);
      if (nextIndex === undefined) {
        return source;
      }

      return {
        ...source,
        isPinned,
        order: nextIndex,
      };
    });
  }

  private normalizeSources(sources: MoneySource[]): MoneySource[] {
    return [...sources].sort((a, b) => this.compareSources(a, b));
  }

  private compareSources(a: MoneySource, b: MoneySource): number {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return b.createdAt.localeCompare(a.createdAt);
  }

  private sourcesMatch(a: MoneySource[], b: MoneySource[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((source, index) => this.sameSource(source, b[index]));
  }

  private sameSource(a: MoneySource | undefined, b: MoneySource | undefined): boolean {
    if (!a || !b) {
      return false;
    }

    return (
      a.id === b.id &&
      a.userId === b.userId &&
      a.name === b.name &&
      a.type === b.type &&
      a.balance === b.balance &&
      a.currency === b.currency &&
      a.isActive === b.isActive &&
      a.isPinned === b.isPinned &&
      a.order === b.order &&
      a.accountNumber === b.accountNumber &&
      a.createdAt === b.createdAt
    );
  }
}

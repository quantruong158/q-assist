import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  collectionData,
  writeBatch,
  deleteDoc,
} from '@angular/fire/firestore';
import { MoneySource } from '@qos/finance/shared-models';
import { convertTimestamp } from '@qos/shared/util-angular';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MoneySourceService {
  private readonly firestore = inject(Firestore);

  getRealtimeSources(userId: string): Observable<MoneySource[]> {
    const sourcesRef = collection(this.firestore, `users/${userId}/money-sources`);
    const q = query(
      sourcesRef,
      orderBy('isPinned', 'desc'),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc'),
    );

    return (
      collectionData(q, {
        idField: 'id',
      }) as Observable<MoneySource[]>
    ).pipe(
      map((sources) =>
        sources.map(
          (source) =>
            ({
              ...source,
              createdAt: convertTimestamp(source.createdAt),
              updatedAt: convertTimestamp(source.updatedAt),
            }) as MoneySource,
        ),
      ),
    );
  }

  async addSource(
    userId: string,
    data: Omit<MoneySource, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const sourcesRef = collection(this.firestore, `users/${userId}/money-sources`);
    await addDoc(sourcesRef, {
      ...data,
      userId,
      isPinned: data.isPinned ?? false,
      order: data.order ?? Date.now(),
      createdAt: serverTimestamp(),
    });
  }

  async updateBalance(userId: string, sourceId: string, balance: number): Promise<void> {
    const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
    await updateDoc(sourceRef, {
      balance,
      updatedAt: serverTimestamp(),
    });
  }

  async togglePin(userId: string, sourceId: string, isPinned: boolean): Promise<void> {
    const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
    await updateDoc(sourceRef, {
      isPinned,
      updatedAt: serverTimestamp(),
    });
  }

  async updateSource(
    userId: string,
    sourceId: string,
    data: Partial<Pick<MoneySource, 'name' | 'type' | 'balance' | 'isPinned'>>,
  ): Promise<void> {
    const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
    await updateDoc(sourceRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteSource(userId: string, sourceId: string): Promise<void> {
    const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
    await deleteDoc(sourceRef);
  }

  async reorderSources(userId: string, sourceIds: string[], isPinned: boolean): Promise<void> {
    const batch = writeBatch(this.firestore);
    sourceIds.forEach((id, index) => {
      const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${id}`);
      batch.update(sourceRef, {
        order: index,
        isPinned,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

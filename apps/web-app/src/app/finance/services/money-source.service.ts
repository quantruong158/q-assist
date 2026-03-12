import { Injectable, inject, resource, computed } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
} from '@angular/fire/firestore';
import { MoneySource } from '../models/money-source.model';
import { AuthService } from '../../services/auth.service';
import { convertTimestamp } from '../../shared/utils/time.utils';

@Injectable({ providedIn: 'root' })
export class MoneySourceService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);

  readonly sourcesResource = resource({
    params: () => {
      return this.authService.currentUser()?.uid;
    },
    loader: async ({ params }) => {
      const userId = params;
      if (!userId) return [];
      return await this.getSources(userId);
    },
    defaultValue: [],
  });
  readonly sources = computed<MoneySource[]>(() => this.sourcesResource.value());
  readonly isLoading = computed(() => this.sourcesResource.isLoading());

  async getSources(userId: string): Promise<MoneySource[]> {
    const sourcesRef = collection(this.firestore, `users/${userId}/money-sources`);
    const q = query(sourcesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const sources = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data()['createdAt']),
      updatedAt: convertTimestamp(doc.data()['updatedAt']),
    })) as MoneySource[];

    return sources;
  }

  async addSource(
    userId: string,
    data: Omit<MoneySource, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const sourcesRef = collection(this.firestore, `users/${userId}/money-sources`);
    const docRef = await addDoc(sourcesRef, {
      ...data,
      userId,
      createdAt: serverTimestamp(),
    });

    await this.getSources(userId);
    return docRef.id;
  }

  async updateBalance(userId: string, sourceId: string, balance: number): Promise<void> {
    const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
    await updateDoc(sourceRef, {
      balance,
      updatedAt: serverTimestamp(),
    });

    await this.getSources(userId);
  }
}

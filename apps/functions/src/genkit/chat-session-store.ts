import { getFirestore } from 'firebase-admin/firestore';
import { SessionData, SessionStore } from 'genkit/beta';

export class FirestoreSessionStore implements SessionStore {
  constructor(private readonly userId: string) {}

  async get(sessionId: string): Promise<SessionData | undefined> {
    const db = getFirestore();
    const doc = await db.collection(`users/${this.userId}/genkit_sessions`).doc(sessionId).get();
    return doc.exists ? (doc.data() as SessionData) : undefined;
  }

  async save(sessionId: string, sessionData: SessionData): Promise<void> {
    const db = getFirestore();
    await db.collection(`users/${this.userId}/genkit_sessions`).doc(sessionId).set(sessionData);
  }
}

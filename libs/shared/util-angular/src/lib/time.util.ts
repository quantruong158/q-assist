import { Timestamp } from '@angular/fire/firestore';

export function convertTimestamp(timestamp: unknown): string {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return String(timestamp);
}

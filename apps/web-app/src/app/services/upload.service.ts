import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from } from 'rxjs';

export interface UploadResult {
  url: string;
  mimeType: string;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly storage = inject(Storage);

  readonly MAX_FILES = 4;
  readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  validateFile(file: File): string | null {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.';
    }
    if (file.size > this.MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 10MB.';
    }
    return null;
  }

  uploadFile(file: File, userId: string): Observable<UploadResult> {
    return from(
      (async () => {
        const uniqueId = crypto.randomUUID();
        const filePath = `users/${userId}/uploads/${uniqueId}-${file.name}`;

        const storageRef = ref(this.storage, filePath);

        await uploadBytes(storageRef, file, {
          contentType: file.type,
        });

        const url = await getDownloadURL(storageRef);

        return {
          url,
          mimeType: file.type,
          filename: file.name,
        };
      })(),
    );
  }
}

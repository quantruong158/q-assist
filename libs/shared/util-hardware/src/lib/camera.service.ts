import { inject, Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PlatformService } from '@qos/shared/data-access';

@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly platform = inject(PlatformService);

  async capturePhoto(source: CameraSource = CameraSource.Prompt): Promise<File | null> {
    if (!this.platform.isNative) {
      return null;
    }

    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source,
    });

    if (!image.base64String) {
      return null;
    }

    const mimeType = `image/${image.format}`;
    const blob = this.base64ToBlob(image.base64String, mimeType);
    return new File([blob], `photo_${Date.now()}.${image.format}`, { type: mimeType });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteArray], { type: mimeType });
  }
}

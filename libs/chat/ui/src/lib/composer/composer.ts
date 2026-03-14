import { KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import { TextFieldModule } from '@angular/cdk/text-field';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAdd01,
  hugeAlert02,
  hugeArrowUp02,
  hugeCamera02,
  hugeCancel01,
  hugeImageUpload,
} from '@ng-icons/huge-icons';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AiModel } from '@qos/shared/models';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { PlatformService } from '@qos/shared/data-access';

export interface ChatComposerAttachment {
  id: string;
  file: File;
  previewUrl: string;
  isUploading: boolean;
  error?: string;
}

const DEFAULT_ATTACHMENT_LIMIT = 4;

@Component({
  selector: 'chat-composer',
  imports: [
    ReactiveFormsModule,
    BrnSelectImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmSelectImports,
    HlmSpinnerImports,
    TextFieldModule,
    KeyValuePipe,
    NgTemplateOutlet,
    NgIcon,
  ],
  providers: [
    provideIcons({
      hugeArrowUp02,
      hugeImageUpload,
      hugeAdd01,
      hugeCamera02,
      hugeAlert02,
      hugeCancel01,
    }),
  ],
  templateUrl: './composer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposer {
  readonly inputText = input.required<FormControl<string | null>>();
  readonly selectedModel = input.required<FormControl<AiModel>>();
  readonly models = input.required<Partial<Record<string, AiModel[]>>>();
  readonly compareModels = input.required<(a: AiModel, b: AiModel) => boolean>();
  readonly pendingAttachments = input.required<ChatComposerAttachment[]>();
  readonly canSend = input(false);
  readonly isStreaming = input(false);
  readonly isInitialChat = input(false);
  readonly maxFiles = input(DEFAULT_ATTACHMENT_LIMIT);

  readonly send = output<void>();
  readonly sendShortcut = output<void>();
  readonly filesSelected = output<File[]>();
  readonly removeAttachment = output<string>();
  readonly takePhoto = output<void>();

  protected readonly sidebarState = inject(HlmSidebarService).state;
  protected readonly isNative = inject(PlatformService).isNative;

  protected onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }

    input.value = '';
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendShortcut.emit();
    }
  }
}

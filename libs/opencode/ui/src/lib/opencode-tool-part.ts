import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart } from '@qos/opencode/data-access';
import { ToolGlobComponent } from './tool-glob';
import { ToolGrepComponent } from './tool-grep';
import { ToolReadComponent } from './tool-read';
import { ToolEditComponent } from './tool-edit';
import { ToolSkillComponent } from './tool-skill';
import { ToolApplyPatchComponent } from './tool-apply-patch';
import { ToolBashComponent } from './tool-bash';
import { ToolDefaultComponent } from './tool-default';
import { ToolWriteComponent } from './tool-write';

@Component({
  selector: 'opencode-tool-part',
  imports: [
    ToolGlobComponent,
    ToolGrepComponent,
    ToolReadComponent,
    ToolEditComponent,
    ToolSkillComponent,
    ToolApplyPatchComponent,
    ToolBashComponent,
    ToolWriteComponent,
    ToolDefaultComponent,
  ],
  template: `
    @switch (toolType()) {
      @case ('glob') {
        <tool-glob [part]="part()" />
      }
      @case ('grep') {
        <tool-grep [part]="part()" />
      }
      @case ('read') {
        <tool-read [part]="part()" />
      }
      @case ('edit') {
        <tool-edit [part]="part()" />
      }
      @case ('skill') {
        <tool-skill [part]="part()" />
      }
      @case ('apply_patch') {
        <tool-apply-patch [part]="part()" />
      }
      @case ('bash') {
        <tool-bash [part]="part()" />
      }
      @case ('write') {
        <tool-write [part]="part()" />
      }
      @default {
        <tool-default [part]="part()" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeToolPartComponent {
  readonly part = input.required<ToolPart>();

  protected readonly toolType = computed(() => this.part().tool);
}

import { HlmTooltip } from './lib/hlm-tooltip';
import { QTooltip } from './lib/q-tooltip';

export * from './lib/hlm-tooltip';
export * from './lib/q-tooltip';

export const QTooltipImports = [QTooltip] as const;
export const HlmTooltipImports = [HlmTooltip] as const;

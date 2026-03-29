import { AiRuntimeConfig } from '../config';

export interface ChatToolContext {
  auth: {
    uid?: string;
  };
  config: Pick<AiRuntimeConfig, 'aiSecrets'>;
}

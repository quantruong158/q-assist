import { z } from 'zod';

export const chatAttachmentSchema = z.object({
  url: z.string().url(),
  mimeType: z.string().min(1),
  filename: z.string().min(1).optional(),
});

export const chatRequestSchema = z.object({
  prompt: z.string().min(1),
  sessionId: z.string().default(''),
  model: z.string().min(1).optional(),
  attachments: z
    .array(chatAttachmentSchema)
    .optional()
    .nullable()
    .transform((value) => value ?? undefined),
  isRetry: z.boolean().optional().default(false),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

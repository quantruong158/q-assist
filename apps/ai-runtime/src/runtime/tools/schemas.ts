import { z } from 'zod';

import { FINANCE_CATEGORIES, FinanceCategoryId } from '@qos/finance/shared-models';

export type { FinanceCategoryId };

export const listMoneySourcesInputSchema = z.object({});

export const listMoneySourcesOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    balance: z.number(),
  }),
);

export const createTransactionInputSchema = z.object({
  amount: z.number().positive().describe('Amount of the transaction'),
  currency: z
    .string()
    .length(3)
    .default('VND')
    .describe('3 letter currency code, default to "VND" if not provided'),
  type: z.enum(['income', 'expense']).describe('Type of the transaction'),
  sourceId: z.string().describe('ID of the money source from the database'),
  merchant: z
    .string()
    .optional()
    .describe('Name of the merchant, store, person, or wallet if provided'),
  description: z.string().optional().describe('Transaction description if provided'),
  categoryId: z
    .enum(FINANCE_CATEGORIES)
    .optional()
    .describe('Category ID of the transaction if provided'),
});

export const createTransactionOutputSchema = z.object({
  transactionId: z.string(),
});

export const updateLatestTransactionCategoryInputSchema = z.object({
  categoryId: z.enum(FINANCE_CATEGORIES).describe('Updated category ID of the transaction'),
});

export const updateLatestTransactionCategoryOutputSchema = z.object({
  updatedTransactionId: z.string().nullable(),
});

import { z } from 'genkit';

export const FinanceCategories = [
  'shopping',
  'food',
  'entertainment',
  'transport',
  'bills',
  'health',
  'education',
  'salary',
  'other',
] as const;

export type FinanceCategoryId = (typeof FinanceCategories)[number];

export const listMoneySourcesInputSchema = z.object({
  userId: z.string().describe('Current user ID to list money sources for'),
});

export const listMoneySourcesOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    balance: z.number(),
  }),
);

export const createTransactionInputSchema = z.object({
  userId: z.string().describe("Current user's ID"),
  amount: z.number().positive().describe('Amount of the transaction'),
  currency: z
    .string()
    .default('VND')
    .describe('3 letter currency code, default to "VND" if not provided'),
  type: z.enum(['income', 'expense']).describe('Type of the transaction'),
  sourceId: z.string().describe('Source ID of the transaction'),
  merchant: z
    .string()
    .optional()
    .describe('Name of the merchant, store, person, or wallet if provided'),
  description: z.string().optional().describe('Transaction description if provided'),
  categoryId: z
    .enum(FinanceCategories)
    .optional()
    .describe('Category ID of the transaction if provided'),
});

export const createTransactionOutputSchema = z.object({
  transactionId: z.string(),
});

export const updateLatestTransactionCategoryInputSchema = z.object({
  userId: z.string().describe("Current user's ID"),
  categoryId: z.enum(FinanceCategories).describe('Updated category ID of the transaction'),
});

export const updateLatestTransactionCategoryOutputSchema = z.object({
  updatedTransactionId: z.string().nullable(),
});

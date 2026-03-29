import { tool } from 'ai';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { MoneySource, MoneyTransactionData } from '@qos/finance/shared-models';

import { UnauthorizedError } from '../auth';

import { ChatToolContext } from './context';
import {
  createTransactionInputSchema,
  createTransactionOutputSchema,
  listMoneySourcesInputSchema,
  listMoneySourcesOutputSchema,
  type FinanceCategoryId,
  updateLatestTransactionCategoryInputSchema,
  updateLatestTransactionCategoryOutputSchema,
} from './schemas';

const requireUserId = (context: ChatToolContext | undefined): string => {
  const userId = context?.auth?.uid;
  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  return userId;
};

const getUserMoneySources = async (userId: string): Promise<MoneySource[]> => {
  const db = getFirestore();
  const snapshot = await db.collection(`users/${userId}/money-sources`).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MoneySource[];
};

const createTransaction = async (
  userId: string,
  data: Omit<MoneyTransactionData, 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>,
): Promise<string> => {
  const db = getFirestore();
  const transactionsRef = db.collection(`users/${userId}/transactions`);
  const docRef = await transactionsRef.add({
    ...data,
    userId,
    timestamp: FieldValue.serverTimestamp(),
  });

  return docRef.id;
};

const updateLatestTransactionCategory = async (
  userId: string,
  categoryId: FinanceCategoryId,
): Promise<string | null> => {
  const db = getFirestore();
  const snapshot = await db
    .collection(`users/${userId}/transactions`)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const docRef = snapshot.docs[0].ref;
  await docRef.update({
    categoryId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
};

export const listMoneySourcesTool = tool({
  description: "List the current user's money sources from database",
  inputSchema: listMoneySourcesInputSchema,
  execute: async (_input, { experimental_context }) => {
    const userId = requireUserId(experimental_context as ChatToolContext | undefined);
    const sources = await getUserMoneySources(userId);
    return listMoneySourcesOutputSchema.parse(
      sources.map((source) => ({
        id: source.id,
        name: source.name,
        type: source.type,
        balance: source.balance,
      })),
    );
  },
});

export const createTransactionTool = tool({
  description:
    'Create a new transaction in database for the current user. Asks the user for missing required fields if necessary',
  inputSchema: createTransactionInputSchema,
  execute: async (
    { amount, currency, type, sourceId, merchant, description, categoryId },
    { experimental_context },
  ) => {
    const userId = requireUserId(experimental_context as ChatToolContext | undefined);
    const transactionId = await createTransaction(userId, {
      amount,
      currency,
      type,
      sourceId,
      merchant,
      description,
      categoryId,
    });

    return createTransactionOutputSchema.parse({ transactionId });
  },
});

export const updateLatestTransactionCategoryTool = tool({
  description:
    'Update the categoryId of the latest transaction for the current user. Asks the user for the category if necessary.',
  inputSchema: updateLatestTransactionCategoryInputSchema,
  execute: async ({ categoryId }, { experimental_context }) => {
    const userId = requireUserId(experimental_context as ChatToolContext | undefined);
    const updatedTransactionId = await updateLatestTransactionCategory(userId, categoryId);

    return updateLatestTransactionCategoryOutputSchema.parse({ updatedTransactionId });
  },
});

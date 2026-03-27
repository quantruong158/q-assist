import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { MoneyTransactionData, MoneySource } from '@qos/finance/shared-models';
import { aiGenkit } from './ai.runtime';
import {
  FinanceCategoryId,
  listMoneySourcesInputSchema,
  listMoneySourcesOutputSchema,
  createTransactionInputSchema,
  createTransactionOutputSchema,
  updateLatestTransactionCategoryInputSchema,
  updateLatestTransactionCategoryOutputSchema,
} from './finance-ai.schemas';

export interface FinanceAiToolContext {
  auth?: {
    uid?: string;
  };
}

export const listMoneySourcesTool = aiGenkit.defineTool(
  {
    name: 'listMoneySources',
    description: "List the current user's money sources from database",
    inputSchema: listMoneySourcesInputSchema,
    outputSchema: listMoneySourcesOutputSchema,
  },
  async (_, { context }) => {
    const userId = context.auth?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const sources = await getUserMoneySources(userId);
    const result = sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      balance: source.balance,
    }));

    return result;
  },
);

export const createTransactionTool = aiGenkit.defineTool(
  {
    name: 'createTransaction',
    description:
      'Create a new transaction in database for the current user. Asks the user for missing required fields if necessary',
    inputSchema: createTransactionInputSchema,
    outputSchema: createTransactionOutputSchema,
  },
  async ({ ...data }, { context }) => {
    const userId = context.auth?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const transactionId = await createTransaction(userId, {
      amount: data.amount,
      currency: data.currency,
      type: data.type,
      sourceId: data.sourceId,
      merchant: data.merchant,
      description: data.description,
      categoryId: data.categoryId,
    });

    return { transactionId };
  },
);

export const updateLatestTransactionCategoryTool = aiGenkit.defineTool(
  {
    name: 'updateLatestTransactionCategory',
    description:
      'Update the categoryId of the latest transaction for the current user. Asks the user for the category if necessary.',
    inputSchema: updateLatestTransactionCategoryInputSchema,
    outputSchema: updateLatestTransactionCategoryOutputSchema,
  },
  async ({ categoryId }, { context }) => {
    const userId = context.auth?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const updatedTransactionId = await updateLatestTransactionCategory(userId, categoryId);

    return { updatedTransactionId };
  },
);

async function getUserMoneySources(userId: string): Promise<MoneySource[]> {
  const db = getFirestore();
  const snapshot = await db.collection(`users/${userId}/money-sources`).get();
  const sources = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MoneySource[];

  return sources;
}

async function createTransaction(
  userId: string,
  data: Omit<MoneyTransactionData, 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const db = getFirestore();
  const transactionsRef = db.collection(`users/${userId}/transactions`);
  const docRef = await transactionsRef.add({
    ...data,
    userId,
    timestamp: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

async function updateLatestTransactionCategory(
  userId: string,
  categoryId: FinanceCategoryId,
): Promise<string | null> {
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
}

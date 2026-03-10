import { logger } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Balance, MoneySourceType } from '../schemas/finance.schema';
import { onDocumentWritten } from 'firebase-functions/firestore';

const firestore = getFirestore();

interface TransactionData {
  amount: number;
  type: 'income' | 'expense';
  sourceId: string;
}

async function updateBalanceOnTransaction(
  userId: string,
  sourceId: string,
  delta: number,
): Promise<void> {
  const userRef = firestore.doc(`users/${userId}`);
  const sourceRef = firestore.doc(`users/${userId}/money-sources/${sourceId}`);

  await firestore.runTransaction(async (t) => {
    const [userDoc, sourceDoc] = await Promise.all([t.get(userRef), t.get(sourceRef)]);

    const userData = userDoc.exists ? userDoc.data() : null;
    const balance = userData?.balance || createInitialBalance(userId);
    const source = sourceDoc.exists
      ? (sourceDoc.data() as { type: MoneySourceType; balance: number })
      : null;

    let newTotal = balance.total;
    let newByType = { ...balance.byType };

    if (source) {
      newByType[source.type] = (newByType[source.type] || 0) + delta;
      newTotal += delta;
    }

    const newBalance: Balance = {
      ...balance,
      total: newTotal,
      byType: newByType,
      lastUpdated: FieldValue.serverTimestamp() as unknown as string,
    };

    t.update(userRef, { balance: newBalance });

    if (source) {
      t.update(sourceRef, {
        balance: (source.balance || 0) + delta,
      });
    }
  });
}

function createInitialBalance(userId: string): Balance {
  return {
    userId,
    total: 0,
    byType: {
      bank: 0,
      ewallet: 0,
      cash: 0,
    },
    sourceIds: [],
    lastUpdated: FieldValue.serverTimestamp() as unknown as string,
  };
}

function getTransactionDelta(
  before: TransactionData | null,
  after: TransactionData | null,
): { delta: number; sourceId: string } | null {
  const beforeAmount = before?.type === 'expense' ? -(before.amount || 0) : before?.amount || 0;
  const afterAmount = after?.type === 'expense' ? -(after.amount || 0) : after?.amount || 0;

  const delta = afterAmount - beforeAmount;
  const sourceId = after?.sourceId || before?.sourceId;

  if (!sourceId) return null;

  return { delta, sourceId };
}

export const onTransactionWrite = onDocumentWritten(
  'users/{userId}/transactions/{transactionId}',
  async (event: any) => {
    const { userId } = event.params;
    const beforeData = event.data?.before?.data() as TransactionData | undefined;
    const afterData = event.data?.after?.data() as TransactionData | undefined;

    const before = beforeData
      ? {
          amount: beforeData.amount,
          type: beforeData.type,
          sourceId: beforeData.sourceId,
        }
      : null;

    const after = afterData
      ? {
          amount: afterData.amount,
          type: afterData.type,
          sourceId: afterData.sourceId,
        }
      : null;

    if (!before && !after) return;

    const result = getTransactionDelta(before, after);

    if (!result) return;

    const { delta, sourceId } = result;

    try {
      await updateBalanceOnTransaction(userId, sourceId, delta);
      logger.info(`Balance updated for user ${userId}: delta=${delta}, sourceId=${sourceId}`);
    } catch (error) {
      logger.error(`Failed to update balance for user ${userId}:`, error);
    }
  },
);

export const onMoneySourceWrite = onDocumentWritten(
  'users/{userId}/money-sources/{sourceId}',
  async (event: any) => {
    const { userId } = event.params;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    const beforeBalance = beforeData?.balance || 0;
    const afterBalance = afterData?.balance || 0;
    const sourceType = afterData?.type || beforeData?.type;

    const balanceDelta = afterBalance - beforeBalance;

    if (balanceDelta === 0 || !sourceType) return;

    try {
      const userRef = firestore.doc(`users/${userId}`);

      await firestore.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        const userData = userDoc.exists ? userDoc.data() : null;
        const balance = userData?.balance || createInitialBalance(userId);

        const newBalance: Balance = {
          ...balance,
          total: balance.total + balanceDelta,
          byType: {
            ...balance.byType,
            [sourceType]: (balance.byType[sourceType as MoneySourceType] || 0) + balanceDelta,
          },
          lastUpdated: FieldValue.serverTimestamp() as unknown as string,
        };

        t.update(userRef, { balance: newBalance });
      });

      logger.info(
        `Balance updated for user ${userId} due to source balance change: delta=${balanceDelta}`,
      );
    } catch (error) {
      logger.error(`Failed to update balance for user ${userId}:`, error);
    }
  },
);

import { logger } from 'firebase-functions';
import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { processNotificationFlow } from '../genkit/process-notification-flow';
import { InboundNotification, MoneyTransaction } from './models/transaction.model';

export const notificationHandler = async (req: Request, res: Response): Promise<void> => {
  const clientSecret = req.get('Authorization');
  const serverSecret = process.env.NOTIFICATION_GATEWAY_KEY;

  if (!clientSecret || clientSecret !== serverSecret) {
    logger.warn('Unauthorized request attempt', { ip: req.ip });
    res.status(403).send('Forbidden: Invalid API Key');
    return;
  }

  const notification = req.body as InboundNotification;

  logger.info('New Notification Received:', {
    body: notification.content,
    timestamp: new Date().toISOString(),
  });

  const parsedResult = await processNotificationFlow(req.body.message);

  if (parsedResult && parsedResult.type !== 'NON_TRANSACTION') {
    const db = getFirestore();
    const transaction: MoneyTransaction = {
      userId: notification.userId,
      type: parsedResult.type,
      amount: parsedResult.amount,
      currency: parsedResult.currency,
      source: notification.source,
      merchant: parsedResult.merchant,
      timestamp: parsedResult.timestamp,
    };

    const docRef = await db
      .collection(`users/${notification.userId}/transactions`)
      .add(transaction);

    logger.info('Transaction saved to Firestore', { docId: docRef.id });
  }

  res.status(200).json({
    status: 'success',
    data: parsedResult,
  });
};

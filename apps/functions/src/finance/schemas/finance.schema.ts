import { Timestamp } from 'firebase-admin/firestore';

export type TransactionType = 'income' | 'expense';
export type MoneySourceType = 'bank' | 'ewallet' | 'cash';
export type SubscriptionStatus = 'active' | 'cancelled' | 'paused';
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Firestore Path Structure:
 * users/{userId}/transactions/{transactionId}
 * users/{userId}/balance
 * users/{userId}/subscriptions/{subscriptionId}
 * users/{userId}/transaction-categories/{categoryId}
 * users/{userId}/money-sources/{sourceId}
 */

export interface TransactionCategory {
  userId: string;
  name: string;
  icon?: string;
  type: TransactionType;
  color?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface MoneySource {
  userId: string;
  name: string;
  type: MoneySourceType;
  balance: number;
  currency: string;
  isActive: boolean;
  accountNumber?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface MoneyTransaction {
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  categoryId?: string;
  sourceId: string;
  description?: string;
  merchant?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  timestamp: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface Balance {
  userId: string;
  total: number;
  byType: {
    bank: number;
    ewallet: number;
    cash: number;
  };
  sourceIds: string[];
  lastUpdated: Timestamp | string;
}

export interface Subscription {
  userId: string;
  service: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: Timestamp | string;
  category?: string;
  status: SubscriptionStatus;
  logoUrl?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
  cancelledAt?: Timestamp | string;
}

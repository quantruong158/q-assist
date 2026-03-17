export type TransactionType = 'income' | 'expense';
export type MoneySourceType = 'bank' | 'ewallet' | 'cash';
export type SubscriptionStatus = 'active' | 'cancelled' | 'paused';
export type BillingCycle = 'monthly' | 'yearly';

export interface TransactionCategoryData {
  userId: string;
  name: string;
  icon?: string;
  type: TransactionType;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionCategory extends TransactionCategoryData {
  id: string;
}

export interface MoneySourceData {
  userId: string;
  name: string;
  type: MoneySourceType;
  balance: number;
  currency: string;
  isActive: boolean;
  accountNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MoneySource extends MoneySourceData {
  id: string;
}

export interface MoneyTransactionData {
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
  timestamp: string;
  updatedAt?: string;
}

export interface MoneyTransaction extends MoneyTransactionData {
  id: string;
}

export interface TransactionWithSource extends MoneyTransaction {
  sourceName: string;
}

export interface BalanceData {
  userId: string;
  total: number;
  byType: {
    bank: number;
    ewallet: number;
    cash: number;
  };
  sourceIds: string[];
  lastUpdated: string;
}

export interface Balance extends BalanceData {
  id: string;
}

export interface SubscriptionData {
  userId: string;
  service: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  category?: string;
  status: SubscriptionStatus;
  logoUrl?: string;
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
}

export interface Subscription extends SubscriptionData {
  id: string;
}

export const FINANCE_CATEGORIES = [
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

export type FinanceCategoryId = (typeof FINANCE_CATEGORIES)[number];

export interface FinanceAiRequest {
  prompt: string;
  sessionId: string;
}

export type FinanceAiIntent =
  | 'add_transaction'
  | 'update_latest_transaction_category'
  | 'unsupported';

export interface FinanceAiActionResult {
  message: string;
  performedAction: 'added' | 'updated' | 'clarification' | 'unsupported';
  createdTransactionId?: string;
  updatedTransactionId?: string;
  requiresClarification?: boolean;
  clarificationOptions?: string[];
}

export interface FinanceAiResponse {
  text: string;
  sessionId: string;
}

export type TransactionType = 'income' | 'expense';

export interface MoneyTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  sourceId: string;
  categoryId?: string;
  description?: string;
  merchant?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

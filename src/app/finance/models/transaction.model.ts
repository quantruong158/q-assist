export interface MoneyTransaction {
  id: string;
  userId: string;
  type: 'INCOMING' | 'OUTGOING';
  amount: number;
  currency: string;
  source: string;
  merchant: string;
  timestamp: string;
}

export interface MoneyTransaction {
  userId: string;
  type: string;
  amount: number;
  currency: string;
  source: string;
  merchant: string;
  timestamp: string;
}

export interface InboundNotification {
  userId: string;
  content: string;
  source: string;
}

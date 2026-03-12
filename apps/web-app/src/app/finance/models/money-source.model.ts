export type MoneySourceType = 'bank' | 'ewallet' | 'cash';

export interface MoneySource {
  id: string;
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

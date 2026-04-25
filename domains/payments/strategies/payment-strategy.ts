import type { PaymentAction } from '../types'
import type { PaymentToken } from '@/lib/writerCoins'
import type { WalletClient } from 'viem'

export interface ExecutePaymentParams {
  walletClient: WalletClient;
  userAddress: string;
  token: PaymentToken;
  action: PaymentAction;
  amount: string; // amount in wei as string
}

export interface PaymentStrategy {
  id: string;
  name: string;
  chainId: number;
  
  /**
   * Execute the payment flow and return the transaction hash
   */
  executePayment: (params: ExecutePaymentParams) => Promise<string>;
}

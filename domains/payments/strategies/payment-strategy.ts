import type { PaymentAction } from '../types'
import type { PaymentToken } from '@/lib/writer-coins'
import type { WalletClient } from 'viem'

export interface ExecutePaymentParams {
  walletClient: WalletClient;
  userAddress: string;
  token: PaymentToken;
  action: PaymentAction;
  amount: string; // amount in wei as string
  /**
   * Optional callback fired as the strategy advances through its steps.
   * The string is a short, user-facing label suitable for display in the UI
   * (e.g. "Approving token…", "Sending payment…", "Verifying…").
   */
  onStep?: (step: string) => void;
}

export interface PaymentResult {
  transactionHash: string;
  paymentId?: string;
  statusCheckUrl?: string;
}

export interface PaymentStrategy {
  id: string;
  name: string;
  chainId: number;
  
  /**
   * Execute the payment flow and return the verified payment details.
   */
  executePayment: (params: ExecutePaymentParams) => Promise<PaymentResult>;
}

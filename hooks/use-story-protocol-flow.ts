/**
 * Story Protocol Registration Flow Hook
 * 
 * Orchestrates the entire IP registration workflow:
 * 1. Pre-flight validation (wallet + network + asset requirements)
 * 2. User confirmation with education
 * 3. Wallet signing & registration
 * 4. Success state with next steps
 * 
 * Single source of truth for Story Protocol user flow.
 * Consolidates: alert/confirm dialogs, state management, error handling
 */

'use client';

import { useCallback, useState } from 'react';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { Address } from 'viem';
import {
  createStoryClientFromWallet,
  isOnStoryNetwork,
  STORY_CHAIN_ID,
  STORY_SPG_CONTRACT,
} from '@/domains/story/services/story-sdk-client';
import { registerGameAsIP, estimateGas, IPRegistrationResult } from '@/domains/story/services/story-protocol.service';
import { uploadToIPFS } from '@/domains/story/services/ipfs-utils';

// ============================================================================
// Types
// ============================================================================

export type RegistrationFlowStateType =
  | 'idle'           // Ready to start
  | 'checking-wallet' // Validating wallet connection
  | 'switching-chain' // Switching to Story network
  | 'confirming'     // Awaiting user confirmation with context
  | 'uploading'      // Uploading metadata to IPFS
  | 'signing'        // Awaiting wallet signature
  | 'success'        // Registration complete
  | 'error';         // Error occurred

export interface RegistrationFlowContext {
  // User & asset data
  assetTitle: string;
  assetDescription: string;
  articleUrl: string;
  genre: 'horror' | 'comedy' | 'mystery';
  difficulty: 'easy' | 'hard';
  authorUsername: string;
  authorWalletAddress: Address;
  gameMetadataUri?: string;
}

export interface RegistrationFlowStateObj {
  state: RegistrationFlowStateType;
  result: IPRegistrationResult | null;
  error: string | null;
  progress: {
    current: string;
    details?: string;
  };
}

// Re-export from story service
export type { IPRegistrationResult } from '@/domains/story/services/story-protocol.service';

export interface RegistrationFlowActions {
  startFlow: () => Promise<void>;
  confirmAndProceed: () => Promise<void>;
  switchToStoryNetwork: () => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useStoryProtocolFlow(context: RegistrationFlowContext) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Flow state
  const [flowState, setFlowState] = useState<RegistrationFlowStateType>('idle');
  const [registrationResult, setRegistrationResult] = useState<IPRegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: '', details: '' });

  // Derived state
  const onStoryNetwork = isOnStoryNetwork(chainId);
  const isRegistered = registrationResult !== null;

  /**
   * Step 1: Validate prerequisites and show confirmation modal
   * Includes gas estimation to warn users about insufficient funds
   */
  const startFlow = useCallback(async () => {
    setError(null);
    setProgress({ current: 'Checking prerequisites...', details: '' });

    if (!isConnected) {
      setError('Please connect your wallet first');
      setFlowState('error');
      return;
    }

    if (!onStoryNetwork) {
      setFlowState('switching-chain');
      return;
    }

    // Check gas estimate to warn user if they might not have enough funds
    if (address) {
      setProgress({ current: 'Checking gas requirements...', details: '' });
      const gasEstimate = await estimateGas(address, STORY_SPG_CONTRACT);
      
      if (gasEstimate && !gasEstimate.enoughFunds) {
        console.warn(`⚠️ User may have insufficient funds: ${gasEstimate.costInEth} ETH estimated`);
        // Note: We continue anyway - this is just a warning
        // The actual transaction will fail with proper error message
      }
    }

    // All prereqs met, show confirmation
    setFlowState('confirming');
  }, [isConnected, onStoryNetwork, address]);

  /**
   * Step 2: Switch to Story network
   */
  const switchToStoryNetwork = useCallback(async () => {
    if (!switchChain) {
      setError('Network switching not available in your wallet');
      setFlowState('error');
      return;
    }

    setFlowState('switching-chain');
    setProgress({ current: 'Switching to Story Network...', details: 'Check your wallet' });

    try {
      await switchChain({ chainId: STORY_CHAIN_ID });
      // After switch, show confirmation
      setFlowState('confirming');
      setProgress({ current: '', details: '' });
    } catch (err) {
      // User rejected the chain switch - this is NOT an error, just return to idle
      const message = err instanceof Error ? err.message : '';
      
      if (message.includes('rejected') || message.includes('User rejected')) {
        console.log('User rejected chain switch');
        setFlowState('idle');
        setProgress({ current: '', details: '' });
        setError('Please switch to Story Network to continue');
      } else {
        setError(message || 'Network switch failed');
        setFlowState('error');
      }
    }
  }, [switchChain]);

  /**
   * Step 3: User confirms, then execute registration
   */
  const confirmAndProceed = useCallback(async () => {
    if (!walletClient || !address) {
      setError('Wallet connection lost');
      setFlowState('error');
      return;
    }

    if (!onStoryNetwork) {
      setError('Not on Story network');
      setFlowState('error');
      return;
    }

    setFlowState('uploading');
    setProgress({ current: 'Preparing metadata...', details: 'Uploading to IPFS' });

    try {
      // 1. Upload metadata to IPFS
      let metadataUri = context.gameMetadataUri;
      if (!metadataUri) {
        metadataUri = await uploadToIPFS({
          name: context.assetTitle,
          description: context.assetDescription,
          external_url: context.articleUrl,
          attributes: [
            { trait_type: 'Genre', value: context.genre },
            { trait_type: 'Difficulty', value: context.difficulty },
            { trait_type: 'Author', value: context.authorUsername },
          ],
        });
      }

      // 2. Create Story client and register IP
      setFlowState('signing');
      setProgress({ current: 'Awaiting signature...', details: 'Check your wallet to confirm' });

      const storyClient = createStoryClientFromWallet(walletClient);
      if (!storyClient) {
        throw new Error('Failed to initialize Story Protocol client');
      }

      const result = await registerGameAsIP(storyClient, {
        title: context.assetTitle,
        description: context.assetDescription,
        articleUrl: context.articleUrl,
        gameCreatorAddress: address as Address,
        authorParagraphUsername: context.authorUsername,
        authorWalletAddress: context.authorWalletAddress,
        genre: context.genre,
        difficulty: context.difficulty,
        gameMetadataUri: metadataUri,
        nftMetadataUri: metadataUri,
      });

      setRegistrationResult(result);
      setFlowState('success');
      setProgress({ current: 'Registration complete!', details: 'Your IP is now on chain' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      setFlowState('error');
      setProgress({ current: '', details: '' });
    }
  }, [walletClient, address, onStoryNetwork, context]);

  /**
   * Reset flow to initial state
   */
  const reset = useCallback(() => {
    setFlowState('idle');
    setRegistrationResult(null);
    setError(null);
    setProgress({ current: '', details: '' });
  }, []);

  /**
   * Cancel at any point
   */
  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  return {
    // State
    state: flowState,
    isRegistered,
    result: registrationResult,
    error,
    progress,
    onStoryNetwork,
    isConnected,
    address,

    // Actions
    startFlow,
    switchToStoryNetwork,
    confirmAndProceed,
    reset,
    cancel,
  };
}

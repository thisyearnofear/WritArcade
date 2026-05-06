'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { 
  getConfig, 
  mezoTestnet, 
  mezoMainnet, 
  getDefaultWallets,
  PassportProvider 
} from '@mezo-org/passport';
import { WagmiProvider } from 'wagmi';
import {
  base,
  baseSepolia,
} from 'wagmi/chains';
import { defineChain } from 'viem';

import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';

/**
 * Story Protocol Aeneid Testnet
 * Used for IP registration - users switch to this chain to sign IP transactions
 * Docs: https://docs.story.foundation/
 */
export const storyAeneid = defineChain({
  id: 1315,
  name: 'Story Aeneid',
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] },
  },
  blockExplorers: {
    default: {
      name: 'Story Explorer',
      url: 'https://aeneid.storyscan.xyz'
    },
  },
  testnet: true,
});

// WalletConnect guard: only include WC wallet if a valid projectId is provided
const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
const HAS_WC = Boolean(WALLET_CONNECT_PROJECT_ID && WALLET_CONNECT_PROJECT_ID !== 'YOUR_PROJECT_ID');

// Combine Mezo default wallets with our app-specific requirements
const wallets = getDefaultWallets("testnet");

const config = getConfig({
  appName: 'writersarcade',
  walletConnectProjectId: WALLET_CONNECT_PROJECT_ID || 'disabled-walletconnect',
  chains: [base, baseSepolia, storyAeneid, mezoTestnet],
  ssr: true,
  wallets,
});

const queryClient = new QueryClient();

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
  AuthenticationStatus,
} from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';

interface Web3AuthContextType {
  status: AuthenticationStatus;
}
const Web3AuthContext = createContext<Web3AuthContextType>({ status: 'loading' });

export const useWeb3Auth = () => useContext(Web3AuthContext);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('loading');

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include', // Ensure cookies are sent
        });
        const data = await res.json();
        setAuthStatus(data.success ? 'authenticated' : 'unauthenticated');
      } catch {
        setAuthStatus('unauthenticated');
      }
    }
    checkAuth();
  }, []);

  const authenticationAdapter = useMemo(() => {
    return createAuthenticationAdapter({
      getNonce: async () => {
        try {
          const response = await fetch('/api/auth/nonce');
          const data = await response.json();
          console.log('[SIWE] Nonce fetched:', data.nonce);
          return data.nonce;
        } catch (e) {
          console.error('[SIWE] Failed to fetch nonce:', e);
          throw e;
        }
      },

      createMessage: ({ nonce, address, chainId }) => {
        console.log('[SIWE] Creating message for:', { address, chainId, nonce });
        try {
          const message = new SiweMessage({
            domain: window.location.host,
            address,
            statement: 'Sign in to writersarcade.',
            uri: window.location.origin,
            version: '1',
            chainId,
            nonce,
          });
          // RainbowKit expects a string for signing. Return the prepared string.
          return message.prepareMessage();
        } catch (e) {
          console.error('[SIWE] Error creating SiweMessage:', e);
          throw e;
        }
      },

      getMessageBody: ({ message }) => {
        // Return the message body - in RainbowKit 2.1.7 this is required
        return String(message);
      },

      verify: async ({ message, signature }) => {
        console.log('[SIWE] Verifying signature...');
        try {
          // Ensure we send the exact string message that was signed
          const messageContent = typeof message === 'object' && message !== null && 'prepareMessage' in message && typeof (message as { prepareMessage?: () => string }).prepareMessage === 'function' 
            ? (message as { prepareMessage?: () => string }).prepareMessage?.() 
            : String(message);

          const verifyRes = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageContent, signature }),
          });

          const success = verifyRes.ok;
          console.log('[SIWE] Verification result:', success);

          if (success) {
            setAuthStatus('authenticated');
          }
          return success;
        } catch (e) {
          console.error('[SIWE] Verification error:', e);
          return false;
        }
      },

      signOut: async () => {
        setAuthStatus('unauthenticated'); // Optimistic update
        await fetch('/api/auth/logout', { method: 'POST' });
      },
    });
  }, []);

  return (
    <Web3AuthContext.Provider value={{ status: authStatus }}>
      {!HAS_WC && (
        <div className="fixed bottom-2 left-2 z-50 rounded-md bg-yellow-900/80 text-yellow-100 border border-yellow-600/60 px-3 py-2 text-xs shadow">
          WalletConnect disabled: set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID to enable.
        </div>
      )}
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <PassportProvider environment="testnet">
            <RainbowKitAuthenticationProvider
              adapter={authenticationAdapter}
              status={authStatus}
            >
              <RainbowKitProvider
                theme={darkTheme()}
                modalSize="compact"
              >
                {children}
              </RainbowKitProvider>
            </RainbowKitAuthenticationProvider>
          </PassportProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3AuthContext.Provider>
  );
}

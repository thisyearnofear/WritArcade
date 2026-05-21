'use client';

import { Web3Provider } from './Web3Provider';
import { WalletSync } from './WalletSync';
import { ToastProvider } from '@/components/ui/use-toast';
import { DarkModeProvider } from './DarkModeProvider';
import { AuthProvider } from '@/domains/users/components/auth-provider';
import { VisualConfigProvider } from '@/contexts/visual-config.context';
import { PageTransition } from './PageTransition';
import { Toaster } from '@/components/ui/toaster';
import { WalletErrorBoundary } from '@/components/error/WalletErrorBoundary';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WalletErrorBoundary>
      <Web3Provider>
        <ToastProvider>
          <WalletSync />
          <DarkModeProvider>
            <AuthProvider>
              <VisualConfigProvider>
                <PageTransition>
                  {children}
                </PageTransition>
                <Toaster />
              </VisualConfigProvider>
            </AuthProvider>
          </DarkModeProvider>
        </ToastProvider>
      </Web3Provider>
    </WalletErrorBoundary>
  );
}

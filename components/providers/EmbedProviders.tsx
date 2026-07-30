'use client';

// Minimal provider stack for /embed — no Web3Provider/wagmi, so iframes
// never download wallet bundles.
import { ToastProvider } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { VisualConfigProvider } from '@/contexts/visual-config.context';

export function EmbedProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <VisualConfigProvider>
        {children}
        <Toaster />
      </VisualConfigProvider>
    </ToastProvider>
  );
}

'use client';

// Polyfill React 19's removed __SECRET_INTERNALS before mezo-clay/baseui evaluates.
// Must be the first import so the patch is in place when baseui accesses
// React.__SECRET_INTERNALS.ReactCurrentOwner.
import '@/lib/react-19-internals-polyfill';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const ClientProviders = dynamic(
  () => import('./ClientProviders').then(m => m.ClientProviders),
  { ssr: false }
);

const EmbedProviders = dynamic(
  () => import('./EmbedProviders').then(m => m.EmbedProviders),
  { ssr: false }
);

export function ClientProvidersLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /embed iframes get a wallet-free provider stack — no wagmi bundles
  if (pathname?.startsWith('/embed')) {
    return <EmbedProviders>{children}</EmbedProviders>;
  }
  return <ClientProviders>{children}</ClientProviders>;
}

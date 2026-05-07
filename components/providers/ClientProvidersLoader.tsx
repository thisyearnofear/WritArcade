'use client';

// Polyfill React 19's removed __SECRET_INTERNALS before mezo-clay/baseui evaluates.
// Must be the first import so the patch is in place when baseui accesses
// React.__SECRET_INTERNALS.ReactCurrentOwner.
import '@/lib/react-19-internals-polyfill';

import dynamic from 'next/dynamic';

const ClientProviders = dynamic(
  () => import('./ClientProviders').then(m => m.ClientProviders),
  { ssr: false }
);

export function ClientProvidersLoader({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}

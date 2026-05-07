'use client';

import dynamic from 'next/dynamic';

const ClientProviders = dynamic(
  () => import('./ClientProviders').then(m => m.ClientProviders),
  { ssr: false }
);

export function ClientProvidersLoader({ children }: { children: React.ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}

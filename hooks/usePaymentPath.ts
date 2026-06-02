/**
 * usePaymentPath — memoized wrapper around `resolvePaymentPath`.
 *
 * Lets React components compute the right payment path for a given article
 * URL without re-running the parser on every render.
 *
 * Usage:
 *   const resolved = usePaymentPath(url)
 *   if (resolved.path === 'writercoin') { /* use resolved.writerCoin *\/ }
 */

'use client'

import { useMemo } from 'react'
import { resolvePaymentPath, type ResolvedPaymentPath } from '@/lib/payment-path-resolver'

export function usePaymentPath(articleUrl: string | null | undefined): ResolvedPaymentPath {
  return useMemo(() => resolvePaymentPath(articleUrl), [articleUrl])
}

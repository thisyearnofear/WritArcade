'use client'

import { usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useIsActive() {
  const pathname = usePathname()

  return useCallback(
    (href: string) =>
      href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(href + '/'),
    [pathname]
  )
}

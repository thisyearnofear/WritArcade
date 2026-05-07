'use client';

import { usePathname } from 'next/navigation';

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function PageTransitionContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PageTransitionContent>{children}</PageTransitionContent>
    </Suspense>
  );
}

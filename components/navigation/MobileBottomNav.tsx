'use client';

import Link from 'next/link';
import { Gamepad2, PenTool, Sparkles, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsActive } from '@/hooks/useIsActive';

// Mobile bottom nav focuses on the primary user journey:
// Discover → Writers → Create → Own (My Games)
// CONSOLIDATION: Removed 'Home' (Logo link) and 'Profile' (Header UserMenu) to make room
const navItems = [
  { href: '/games', label: 'Arcade', icon: Gamepad2 },
  { href: '/writers', label: 'Writers', icon: PenTool },
  { href: '/generate', label: 'Create', icon: Sparkles },
  { href: '/my-games', label: 'My Games', icon: Library },
];

export function MobileBottomNav() {
  const isActive = useIsActive();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border md:hidden z-50">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/30"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative w-6 h-6" aria-hidden="true" />
              <span className="relative text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, PenTool, Store, Sparkles, Library } from 'lucide-react';
import { motion } from 'framer-motion';

// Mobile bottom nav focuses on the primary user journey:
// Discover → Writers → Create → Marketplace → Own (My Games)
// CONSOLIDATION: Removed 'Home' (Logo link) and 'Profile' (Header UserMenu) to make room
const navItems = [
  { href: '/games', label: 'Arcade', icon: Gamepad2 },
  { href: '/writers', label: 'Writers', icon: PenTool },
  { href: '/generate', label: 'Create', icon: Sparkles },
  { href: '/assets', label: 'Market', icon: Store },
  { href: '/my-games', label: 'My Games', icon: Library },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-gray-800 md:hidden z-50">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href) && item.href !== '/';
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                isActive ? 'text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-lg bg-purple-900/30 border border-purple-500/50"
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
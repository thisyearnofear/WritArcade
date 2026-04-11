'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Sparkles, Gamepad2, Wallet, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  items?: CommandItem[]
}

/**
 * CONSOLIDATION: Command palette using CSS variables
 */
export function CommandPalette({ items }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const defaultItems: CommandItem[] = [
    {
      id: 'create',
      title: 'Create New Game',
      description: 'Generate a game from an article',
      icon: <Sparkles className="w-4 h-4" />,
      shortcut: '⌘G',
      action: () => {
        router.push('/generate')
        setIsOpen(false)
      },
    },
    {
      id: 'games',
      title: 'Browse Games',
      description: 'Explore all arcade cabinets',
      icon: <Gamepad2 className="w-4 h-4" />,
      shortcut: '⌘K',
      action: () => {
        router.push('/games')
        setIsOpen(false)
      },
    },
    {
      id: 'my-games',
      title: 'My Games',
      description: 'View your created games',
      icon: <Wallet className="w-4 h-4" />,
      shortcut: '⌘M',
      action: () => {
        router.push('/my-games')
        setIsOpen(false)
      },
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure AI preferences',
      icon: <Settings className="w-4 h-4" />,
      shortcut: '⌘,',
      action: () => {
        router.push('/profile')
        setIsOpen(false)
      },
    },
  ]

  const commands = items || defaultItems
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(search.toLowerCase())
  )

  // Open palette on ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault()
        filteredCommands[selectedIndex].action()
      }
    },
    [filteredCommands, selectedIndex]
  )

  // Reset selection when search changes
   
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  return (
    <>
      {/* Keyboard hint badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border border-border transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-muted-foreground/20 rounded">⌘K</kbd>
      </button>

      {/* Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed left-1/2 top-[20%] -translate-x-1/2 z-50 w-full max-w-xl"
              onKeyDown={handleKeyDown}
            >
              <div className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search commands..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Commands List */}
                <div className="max-h-80 overflow-y-auto py-2">
                  {filteredCommands.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      No commands found
                    </div>
                  ) : (
                    filteredCommands.map((cmd, index) => (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          index === selectedIndex
                            ? 'bg-primary/20 text-primary-foreground'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        {cmd.icon && (
                          <span className="text-muted-foreground">{cmd.icon}</span>
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.description && (
                            <div className="text-sm text-muted-foreground">{cmd.description}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="px-2 py-1 text-xs bg-muted rounded text-muted-foreground">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>Esc Close</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

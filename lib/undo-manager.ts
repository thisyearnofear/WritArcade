/**
 * Undo/Redo Manager
 * Manages state history for graceful recovery from deletions
 * Enhanced with localStorage persistence
 */

export interface HistoryState<T> {
  state: T
  timestamp: number
  description: string
}

export class UndoManager<T> {
  private history: HistoryState<T>[] = []
  private currentIndex: number = -1
  private maxHistory: number
  private persistenceKey: string | null

  constructor(maxHistory: number = 20, persistenceKey: string | null = null) {
    this.maxHistory = maxHistory
    this.persistenceKey = persistenceKey

    if (this.persistenceKey && typeof window !== 'undefined') {
      this.hydrate()
    }
  }

  /**
   * Hydrate history from localStorage
   */
  private hydrate(): void {
    if (!this.persistenceKey) return

    try {
      const saved = localStorage.getItem(this.persistenceKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.history) && typeof parsed.currentIndex === 'number') {
          this.history = parsed.history
          this.currentIndex = parsed.currentIndex
          console.log(`[UndoManager] Hydrated ${this.history.length} states from "${this.persistenceKey}"`)
        }
      }
    } catch (error) {
      console.warn(`[UndoManager] Failed to hydrate history for "${this.persistenceKey}":`, error)
      this.clear()
    }
  }

  /**
   * Persist history to localStorage
   */
  private persist(): void {
    if (!this.persistenceKey || typeof window === 'undefined') return

    try {
      const data = JSON.stringify({
        history: this.history,
        currentIndex: this.currentIndex
      })
      localStorage.setItem(this.persistenceKey, data)
    } catch (error) {
      console.warn(`[UndoManager] Failed to persist history for "${this.persistenceKey}":`, error)
    }
  }

  /**
   * Push a new state onto the history
   */
  push(state: T, description: string = ''): void {
    // Remove any redo history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    this.history.push({
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: Date.now(),
      description
    })

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    } else {
      this.currentIndex++
    }

    this.persist()
  }

  /**
   * Undo to previous state
   */
  undo(): HistoryState<T> | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      this.persist()
      return this.history[this.currentIndex]
    }
    return null
  }

  /**
   * Redo to next state
   */
  redo(): HistoryState<T> | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      this.persist()
      return this.history[this.currentIndex]
    }
    return null
  }

  /**
   * Get current state
   */
  current(): HistoryState<T> | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Get description of last action for UI
   */
  lastActionDescription(): string {
    if (this.currentIndex >= 0) {
      return this.history[this.currentIndex].description
    }
    return ''
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
    
    if (this.persistenceKey && typeof window !== 'undefined') {
      localStorage.removeItem(this.persistenceKey)
    }
  }
}

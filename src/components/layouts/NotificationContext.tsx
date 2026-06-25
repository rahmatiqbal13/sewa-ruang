'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface NotificationContextValue {
  /** IDs of items the user has explicitly seen (clicked or opened popover) */
  seenIds: Set<string>
  /** Mark a single item as seen */
  markSeen: (id: string) => void
  /** Mark all given IDs as seen */
  markAllSeen: (ids: string[]) => void
  /** Whether data is currently loading */
  loading: boolean
  setLoading: (v: boolean) => void
  /** Current notification items (used by both bell and sidebar) */
  itemIds: string[]
  setItemIds: (ids: string[]) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const SEEN_KEY = 'notif_seen_ids'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [itemIds, setItemIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Hydrate seen IDs from localStorage once
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEEN_KEY)
      if (stored) {
        setSeenIds(new Set(JSON.parse(stored) as string[]))
      }
    } catch { /* ignore */ }
  }, [])

  const persist = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]))
    } catch { /* ignore */ }
  }, [])

  const markSeen = useCallback((id: string) => {
    setSeenIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set([...prev, id])
      persist(next)
      return next
    })
  }, [persist])

  const markAllSeen = useCallback((ids: string[]) => {
    setSeenIds(prev => {
      const next = new Set([...prev, ...ids])
      persist(next)
      return next
    })
  }, [persist])

  return (
    <NotificationContext.Provider
      value={{ seenIds, markSeen, markAllSeen, loading, setLoading, itemIds, setItemIds }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types/supabase'

interface AuthStore {
  user: User | null
  role: UserRole | null
  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clear: () => set({ user: null, role: null }),
}))

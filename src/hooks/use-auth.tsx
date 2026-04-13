'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

export interface AuthUser {
  id: string
  name: string
  phone: string
  role: 'admin' | 'trainer'
}

interface AuthContextType {
  user: AuthUser | null
  login: (phone: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('authUser')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.id && parsed.name && parsed.role) {
          setUser(parsed)
        } else {
          localStorage.removeItem('authUser')
        }
      }
    } catch {
      localStorage.removeItem('authUser')
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })

      if (!res.ok) return false

      const data = await res.json()
      const authUser: AuthUser = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        role: data.role,
      }

      setUser(authUser)
      localStorage.setItem('authUser', JSON.stringify(authUser))
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('authUser')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

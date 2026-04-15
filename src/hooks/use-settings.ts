'use client'

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react'

export interface PrintSettings {
  gymName: string
  gymPhone: string
  gymLogo: string
  bannerImage: string
  bannerHeight: number
  accentColor: string
  showTraineeInfo: boolean
  showSubscriptionDate: boolean
  showPhone: boolean
  showWeight: boolean
  showHeight: boolean
  showAge: boolean
  footerText: string
  dayHeaderColor: string
  tableHeaderBg: string
  fontFamily: string
  pageSize: string
  // New customization options
  titleFontSize: number
  bodyFontSize: number
  tableFontSize: number
  tableCellPadding: number
  pagePadding: number
  logoSize: number
  headerFontSize: number
  traineeInfoFontSize: number
  dayHeaderFontSize: number
}

export const defaultPrintSettings: PrintSettings = {
  gymName: 'صالة القوة الرياضية',
  gymPhone: '',
  gymLogo: '',
  bannerImage: '',
  bannerHeight: 120,
  accentColor: '#059669',
  showTraineeInfo: true,
  showSubscriptionDate: true,
  showPhone: true,
  showWeight: true,
  showHeight: true,
  showAge: true,
  footerText: '',
  dayHeaderColor: '#059669',
  tableHeaderBg: '#f0fdf4',
  fontFamily: 'Arial',
  pageSize: 'A4',
  // New customization defaults
  titleFontSize: 26,
  bodyFontSize: 14,
  tableFontSize: 13,
  tableCellPadding: 10,
  pagePadding: 40,
  logoSize: 65,
  headerFontSize: 20,
  traineeInfoFontSize: 17,
  dayHeaderFontSize: 15,
}

function getLocalPrintSettings(): PrintSettings {
  try {
    const saved = localStorage.getItem('printSettings')
    if (saved) {
      return { ...defaultPrintSettings, ...JSON.parse(saved) }
    }
  } catch {
    // ignore
  }
  return defaultPrintSettings
}

export function usePrintSettings() {
  const [settings, setSettings] = useState<PrintSettings>(getLocalPrintSettings)
  const [loaded, setLoaded] = useState(false)

  // Load from server on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          const parsed: Partial<PrintSettings> = {}
          // Parse boolean and number values
          for (const [key, value] of Object.entries(data)) {
            if (key in defaultPrintSettings) {
              const defVal = defaultPrintSettings[key as keyof PrintSettings]
              if (typeof defVal === 'boolean') {
                parsed[key as keyof PrintSettings] = value === 'true' as any
              } else if (typeof defVal === 'number') {
                parsed[key as keyof PrintSettings] = Number(value) as any
              } else {
                parsed[key as keyof PrintSettings] = value as any
              }
            }
          }
          const merged = { ...defaultPrintSettings, ...parsed }
          setSettings(merged)
          // Also save to localStorage for offline use
          try {
            localStorage.setItem('printSettings', JSON.stringify(merged))
          } catch { /* ignore */ }
        }
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  const saveSettings = useCallback((newSettings: Partial<PrintSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      // Save to localStorage immediately for offline
      try {
        localStorage.setItem('printSettings', JSON.stringify(updated))
      } catch { /* ignore */ }
      // Save to server (cloud) for all users
      const settingsForServer: Record<string, string> = {}
      for (const [key, value] of Object.entries(updated)) {
        settingsForServer[key] = String(value)
      }
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsForServer }),
      }).catch(() => { /* ignore server errors, localStorage is backup */ })
      return updated
    })
  }, [])

  const reloadSettings = useCallback(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          const parsed: Partial<PrintSettings> = {}
          for (const [key, value] of Object.entries(data)) {
            if (key in defaultPrintSettings) {
              const defVal = defaultPrintSettings[key as keyof PrintSettings]
              if (typeof defVal === 'boolean') {
                parsed[key as keyof PrintSettings] = value === 'true' as any
              } else if (typeof defVal === 'number') {
                parsed[key as keyof PrintSettings] = Number(value) as any
              } else {
                parsed[key as keyof PrintSettings] = value as any
              }
            }
          }
          const merged = { ...defaultPrintSettings, ...parsed }
          setSettings(merged)
          try {
            localStorage.setItem('printSettings', JSON.stringify(merged))
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  return { settings, saveSettings, reloadSettings, loaded }
}

// Theme management using a simple subscription pattern
let themeListeners: (() => void)[] = []
let currentTheme: 'light' | 'dark' = 'light'

function getStoredTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('theme')
    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function subscribeTheme(listener: () => void) {
  themeListeners.push(listener)
  return () => {
    themeListeners = themeListeners.filter((l) => l !== listener)
  }
}

function getThemeSnapshot() {
  return currentTheme
}

function getThemeServerSnapshot() {
  return 'light' as const
}

// Initialize theme on module load
if (typeof window !== 'undefined') {
  currentTheme = getStoredTheme()
  document.documentElement.classList.toggle('dark', currentTheme === 'dark')
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)

  const setTheme = useCallback((t: 'light' | 'dark') => {
    currentTheme = t
    localStorage.setItem('theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    themeListeners.forEach((l) => l())
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  return { theme, setTheme, toggleTheme }
}

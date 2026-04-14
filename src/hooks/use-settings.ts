'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'

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
}

function getStoredPrintSettings(): PrintSettings {
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
  const [settings, setSettings] = useState<PrintSettings>(getStoredPrintSettings)

  const saveSettings = useCallback((newSettings: Partial<PrintSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem('printSettings', JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }, [])

  const reloadSettings = useCallback(() => {
    setSettings(getStoredPrintSettings())
  }, [])

  return { settings, saveSettings, reloadSettings }
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

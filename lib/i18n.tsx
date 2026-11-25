"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Locale = 'en' | 'es' | 'fr' | 'de' | 'hi'

type Translations = Record<string, any>

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
  translations: Translations
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
  translations: {},
})

const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'fr', 'de', 'hi']
const LS_KEY = 'hireverse-locale'

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(LS_KEY) as Locale | null
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  const navLang = navigator.language?.split('-')[0] as Locale | undefined
  if (navLang && SUPPORTED_LOCALES.includes(navLang)) return navLang
  return 'en'
}

function resolveKey(obj: Record<string, any>, path: string, fallback: string): string {
  const keys = path.split('.')
  let current: any = obj
  for (const key of keys) {
    if (current === undefined || current === null) return fallback
    current = current[key]
  }
  return typeof current === 'string' ? current : fallback
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [translations, setTranslations] = useState<Translations>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const detected = detectLocale()
    setLocale(detected)
    localStorage.setItem(LS_KEY, detected)
  }, [])

  useEffect(() => {
    let cancelled = false
    import(`@/locales/${locale}.json`)
      .then((mod) => {
        if (!cancelled) {
          setTranslations(mod.default || mod)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => { cancelled = true }
  }, [locale])

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem(LS_KEY, newLocale)
  }

  const t = (key: string, fallback?: string): string => {
    if (!loaded) return fallback || key
    return resolveKey(translations, key, fallback || key)
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t, translations }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

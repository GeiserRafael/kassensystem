import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('darkMode', String(dark))
  }, [dark])

  // Auf Systemänderungen reagieren, aber nur wenn kein manueller Override gesetzt
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('darkMode')
      if (stored === null) setDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function toggle() {
    setDark((d) => !d)
  }

  function resetToSystem() {
    localStorage.removeItem('darkMode')
    setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }

  return { dark, toggle, resetToSystem }
}

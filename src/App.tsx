import { useState, useEffect } from 'react'
import { SaleView } from './components/sale/SaleView'
import { SettingsView } from './components/settings/SettingsView'
import { UserNamePrompt } from './components/UserNamePrompt'
import { syncSalesToFirestore, getLastSyncedAt, subscribeToProductChanges } from './db/sync'
import { ensureSignedIn, firebaseReady } from './firebase'
import { useDarkMode } from './hooks/useDarkMode'

type Tab = 'sale' | 'settings'
type FirebaseStatus = 'unknown' | 'connected' | 'error'

export default function App() {
  const [tab, setTab] = useState<Tab>('sale')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncedAt())
  const [fbStatus, setFbStatus] = useState<FirebaseStatus>('unknown')
  const [userName, setUserName] = useState<string>(localStorage.getItem('userName') ?? '')
  const { dark, toggle: toggleDark } = useDarkMode()

  async function doSync() {
    if (!navigator.onLine || syncing) return
    setSyncing(true)
    try {
      const count = await syncSalesToFirestore()
      setFbStatus('connected')
      if (count > 0) setLastSync(new Date().toISOString())
    } catch (e) {
      console.error('Sync fehlgeschlagen:', e)
      setFbStatus('error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const onOnline = () => { setOnline(true); doSync() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    ensureSignedIn()
      .then(() => {
        setFbStatus('connected')
        doSync()
        return subscribeToProductChanges()
      })
      .catch((e) => { console.warn('Auth fehlgeschlagen:', e); setFbStatus('error') })
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const syncLabel = syncing
    ? 'Synchronisiere…'
    : lastSync
    ? `Sync ${new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
    : 'Nicht synchronisiert'

  // Firebase-Status Indikator
  const fbIndicator = !firebaseReady
    ? { icon: '○', label: 'Kein Firebase', color: 'text-gray-400' }
    : fbStatus === 'connected'
    ? { icon: '●', label: 'DB verbunden', color: 'text-green-600 dark:text-green-400' }
    : fbStatus === 'error'
    ? { icon: '●', label: 'DB Fehler', color: 'text-red-500' }
    : { icon: '◌', label: 'DB…', color: 'text-gray-400' }

  return (
    <>
      {!userName && (
        <UserNamePrompt onSave={(name) => setUserName(name)} />
      )}
      {userName && (
    <div className="flex flex-col h-svh max-w-lg mx-auto bg-white dark:bg-gray-900">
      {/* Sync-Status-Leiste */}
      <div className={`flex items-center justify-between px-3 py-1 text-xs shrink-0 ${
        online
          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
          : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
      }`}>
        {/* Links: Internet + Firebase Status */}
        <div className="flex items-center gap-2">
          <span>{online ? '● Online' : '○ Offline'}</span>
          <span className={`${fbIndicator.color}`}>{fbIndicator.icon} {fbIndicator.label}</span>
        </div>

        {/* Mitte: Sync-Zeit */}
        <span>{syncLabel}</span>

        {/* Rechts: Sync-Button + Dark Mode */}
        <div className="flex items-center gap-2">
          {online && !syncing && (
            <button onClick={doSync} className="underline">↑ Sync</button>
          )}
          <button onClick={toggleDark} className="text-base" title="Dark Mode">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden">
        {tab === 'sale' && <SaleView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom nav */}
      <nav className="flex bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <button
          onClick={() => setTab('sale')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            tab === 'sale' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <span className="text-2xl">🛒</span>
          <span>Verkauf</span>
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            tab === 'settings' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <span className="text-2xl">⚙️</span>
          <span>Einstellungen</span>
        </button>
      </nav>
    </div>
    )}
    </>
  )
}

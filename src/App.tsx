import { useState, useEffect } from 'react'
import { SaleView } from './components/sale/SaleView'
import { SettingsView } from './components/settings/SettingsView'
import { syncSalesToFirestore, getLastSyncedAt } from './db/sync'
import { ensureSignedIn } from './firebase'

type Tab = 'sale' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('sale')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncedAt())

  async function doSync() {
    if (!navigator.onLine || syncing) return
    setSyncing(true)
    try {
      const count = await syncSalesToFirestore()
      if (count > 0) setLastSync(new Date().toISOString())
    } catch (e) {
      console.error('Sync fehlgeschlagen:', e)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const onOnline = () => { setOnline(true); doSync() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    // Beim Start: anonym einloggen, dann sync versuchen
    ensureSignedIn().then(() => doSync())
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const syncLabel = syncing
    ? 'Synchronisiere…'
    : lastSync
    ? `Sync ${new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
    : 'Noch nicht synchronisiert'

  return (
    <div className="flex flex-col h-svh max-w-lg mx-auto">
      {/* Sync-Status-Leiste */}
      <div className={`flex items-center justify-between px-3 py-1 text-xs shrink-0 ${online ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
        <span>{online ? '● Online' : '○ Offline'}</span>
        <span>{syncLabel}</span>
        {online && !syncing && (
          <button onClick={doSync} className="underline">Jetzt sync</button>
        )}
      </div>

      <main className="flex-1 overflow-hidden">
        {tab === 'sale' && <SaleView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom nav */}
      <nav className="flex bg-white border-t border-gray-200 shrink-0">
        <button
          onClick={() => setTab('sale')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            tab === 'sale' ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <span className="text-2xl">🛒</span>
          <span>Verkauf</span>
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            tab === 'settings' ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <span className="text-2xl">⚙️</span>
          <span>Einstellungen</span>
        </button>
      </nav>
    </div>
  )
}

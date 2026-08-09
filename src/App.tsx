import { useState, useEffect } from 'react'
import { SaleView } from './components/sale/SaleView'
import { SettingsView } from './components/settings/SettingsView'
import { AnalyseView } from './components/analyse/AnalyseView'
import { UserNamePrompt } from './components/UserNamePrompt'
import { syncSalesToFirestore, getLastSyncedAt, subscribeToProductChanges, subscribeToSalesChanges } from './db/sync'
import { ensureSignedIn, firebaseReady } from './firebase'
import { useDarkMode } from './hooks/useDarkMode'

type Tab = 'sale' | 'settings' | 'analyse'
type FirebaseStatus = 'unknown' | 'connected' | 'error'

export default function App() {
  const [tab, setTab] = useState<Tab>('sale')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncedAt())
  const [fbStatus, setFbStatus] = useState<FirebaseStatus>('unknown')
  const [userName, setUserName] = useState<string>(localStorage.getItem('userName') ?? '')
  const { dark, toggle: toggleDark, resetToSystem } = useDarkMode()

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
        subscribeToProductChanges()
        subscribeToSalesChanges()
      })
      .catch((e) => { console.warn('Auth fehlgeschlagen:', e); setFbStatus('error') })
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const syncLabel = syncing
    ? 'Sync…'
    : lastSync
    ? `${new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
    : '—'

  const dbDot = !firebaseReady
    ? 'bg-gray-400'
    : fbStatus === 'connected'
    ? 'bg-green-500'
    : fbStatus === 'error'
    ? 'bg-red-500'
    : 'bg-yellow-400'

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'sale',     label: 'Verkauf',       icon: '🛒' },
    { id: 'analyse',  label: 'Analyse',        icon: '📊' },
    { id: 'settings', label: 'Einstellungen',  icon: '⚙️' },
  ]

  return (
    <>
      {!userName && <UserNamePrompt onSave={(name) => setUserName(name)} />}
      {userName && (
        <div
          className="flex flex-col bg-[#f2f2f7] dark:bg-black"
          style={{
            height: '100svh',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* iOS-style compact status bar */}
          <div className={`flex items-center justify-between px-4 py-1.5 text-[11px] font-medium shrink-0 ${
            online
              ? 'bg-[#f2f2f7]/80 dark:bg-black/80 text-[#3c3c43]/60 dark:text-white/40'
              : 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400'
          }`}
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-yellow-400'}`} />
              <span>{online ? 'Online' : 'Offline'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dbDot}`} />
              <span>{!firebaseReady ? 'Lokal' : fbStatus === 'connected' ? 'Verbunden' : fbStatus === 'error' ? 'Fehler' : '…'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{syncLabel}</span>
              {online && !syncing && (
                <button onClick={doSync} className="text-[#007aff] dark:text-[#0a84ff] font-semibold">Sync</button>
              )}
              <button onClick={toggleDark} className="text-sm">{dark ? '☀️' : '🌙'}</button>
              {localStorage.getItem('darkMode') !== null && (
                <button onClick={resetToSystem} className="text-[10px] text-[#3c3c43]/50 dark:text-white/30 font-medium">Auto</button>
              )}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-hidden">
            {tab === 'sale'     && <SaleView />}
            {tab === 'settings' && <SettingsView />}
            {tab === 'analyse'  && <AnalyseView />}
          </main>

          {/* iOS Tab Bar */}
          <nav
            className="flex shrink-0 border-t border-[#3c3c43]/20 dark:border-white/10 bg-[#f2f2f7]/80 dark:bg-[#1c1c1e]/80"
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 transition-opacity active:opacity-60 ${
                  tab === t.id
                    ? 'text-[#007aff] dark:text-[#0a84ff]'
                    : 'text-[#3c3c43]/50 dark:text-white/35'
                }`}
              >
                <span className="text-[22px] leading-none">{t.icon}</span>
                <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}

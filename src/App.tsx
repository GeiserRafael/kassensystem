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
      await syncSalesToFirestore()
      setFbStatus('connected')
      setLastSync(new Date().toISOString())
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
    ? new Date(lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const dbDot = !firebaseReady
    ? 'bg-gray-400'
    : fbStatus === 'connected'
    ? 'bg-[#34c759]'
    : fbStatus === 'error'
    ? 'bg-[#ff3b30]'
    : 'bg-yellow-400'

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'sale',     label: 'Verkauf',      icon: '🛒' },
    { id: 'analyse',  label: 'Analyse',       icon: '📊' },
    { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
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
          {/* Status bar */}
          <div
            className={`flex items-center justify-between px-4 py-2 text-[11px] font-medium shrink-0 ${
              online ? 'text-[#3c3c43]/70 dark:text-white/50' : 'text-yellow-700 dark:text-yellow-400'
            }`}
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              background: online ? 'var(--lg-status-bg)' : 'rgba(254,252,232,0.85)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#34c759]' : 'bg-yellow-400'}`} />
              <span>{online ? 'Online' : 'Offline'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dbDot}`} />
              <span>{!firebaseReady ? 'Lokal' : fbStatus === 'connected' ? 'Verbunden' : fbStatus === 'error' ? 'Fehler' : '…'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{syncLabel}</span>
              {online && !syncing && (
                <button onClick={doSync} className="text-[#007aff] dark:text-[#0a84ff] font-semibold">Sync</button>
              )}
              <button onClick={toggleDark} className="text-sm">{dark ? '☀️' : '🌙'}</button>
              {localStorage.getItem('darkMode') !== null && (
                <button onClick={resetToSystem} className="text-[10px] text-[#3c3c43]/40 dark:text-white/25 font-medium">Auto</button>
              )}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-hidden">
            {tab === 'sale'     && <SaleView />}
            {tab === 'settings' && <SettingsView />}
            {tab === 'analyse'  && <AnalyseView />}
          </main>

          {/* Tab Bar */}
          <nav
            className="flex shrink-0"
            style={{
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              background: 'var(--lg-bar-bg)',
              borderTop: '0.5px solid var(--lg-bar-border)',
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 active:opacity-50 transition-all ${
                  tab === t.id
                    ? 'text-[#007aff] dark:text-[#0a84ff]'
                    : 'text-[#3c3c43]/45 dark:text-white/30'
                }`}
              >
                <span className={`text-[22px] leading-none transition-transform ${tab === t.id ? 'scale-110' : 'scale-100'}`}>{t.icon}</span>
                <span className="text-[10px] font-medium tracking-tight">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}

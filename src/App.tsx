import { useState } from 'react'
import { SaleView } from './components/sale/SaleView'
import { SettingsView } from './components/settings/SettingsView'

type Tab = 'sale' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('sale')

  return (
    <div className="flex flex-col h-svh max-w-lg mx-auto">
      <main className="flex-1 overflow-hidden">
        {tab === 'sale' && <SaleView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom nav */}
      <nav className="flex bg-white border-t border-gray-200 shrink-0 safe-area-inset-bottom">
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

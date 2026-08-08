import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { formatCent } from '../../utils'

export function AnalyseView() {
  const sales = useLiveQuery(() =>
    db.sales.where('type').equals('sale').toArray()
  )

  if (!sales) return <div className="flex items-center justify-center h-full text-gray-400">Lade…</div>
  if (sales.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 dark:text-gray-500">
      <span className="text-4xl">📊</span>
      <span>Noch keine Verkäufe</span>
    </div>
  )

  // --- Gesamt ---
  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0)

  // --- Pro Nutzer ---
  const byUser = new Map<string, { count: number; revenue: number }>()
  for (const sale of sales) {
    const u = sale.userId || 'Unbekannt'
    const cur = byUser.get(u) ?? { count: 0, revenue: 0 }
    byUser.set(u, { count: cur.count + 1, revenue: cur.revenue + sale.total })
  }
  const userRows = [...byUser.entries()].sort((a, b) => b[1].revenue - a[1].revenue)

  // --- Pro Produkt ---
  const byProduct = new Map<string, { icon: string; count: number; revenue: number }>()
  for (const sale of sales) {
    for (const item of sale.lineItems) {
      const key = item.name
      const cur = byProduct.get(key) ?? { icon: item.icon, count: 0, revenue: 0 }
      byProduct.set(key, {
        icon: item.icon,
        count: cur.count + item.qty,
        revenue: cur.revenue + item.lineTotal,
      })
    }
  }
  const productRows = [...byProduct.entries()].sort((a, b) => b[1].revenue - a[1].revenue)

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="p-3 space-y-4">

        {/* Gesamt-Karte */}
        <div className="bg-green-600 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-80">Gesamtumsatz</div>
          <div className="text-4xl font-bold mt-1">{formatCent(totalRevenue)}</div>
          <div className="text-sm opacity-80 mt-1">{sales.length} Verkäufe</div>
        </div>

        {/* Pro Nutzer */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-2">
            Verkäufe pro Mitarbeiter
          </h2>
          <div className="space-y-2">
            {userRows.map(([name, stats]) => (
              <div key={name} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stats.count} Verkäufe</div>
                </div>
                <div className="font-bold text-gray-900 dark:text-white text-right">
                  {formatCent(stats.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Produkt */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-2">
            Verkäufe pro Produkt
          </h2>
          <div className="space-y-2">
            {productRows.map(([name, stats]) => (
              <div key={name} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl shrink-0">{stats.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{stats.count}× verkauft</div>
                </div>
                <div className="font-bold text-gray-900 dark:text-white text-right">
                  {formatCent(stats.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

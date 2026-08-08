import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { formatCent } from '../../utils'

export function AnalyseView() {
  const sales = useLiveQuery(() =>
    db.sales.where('type').equals('sale').toArray()
  )

  if (!sales) return (
    <div className="flex items-center justify-center h-full text-[#3c3c43]/40 dark:text-white/25 text-[15px]">
      Lade…
    </div>
  )

  if (sales.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[#3c3c43]/40 dark:text-white/25">
      <span className="text-5xl">📊</span>
      <span className="text-[17px] font-medium">Noch keine Verkäufe</span>
    </div>
  )

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0)

  const byUser = new Map<string, { count: number; revenue: number }>()
  for (const sale of sales) {
    const u = sale.userId || 'Unbekannt'
    const cur = byUser.get(u) ?? { count: 0, revenue: 0 }
    byUser.set(u, { count: cur.count + 1, revenue: cur.revenue + sale.total })
  }
  const userRows = [...byUser.entries()].sort((a, b) => b[1].revenue - a[1].revenue)

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
    <div className="h-full overflow-y-auto bg-[#f2f2f7] dark:bg-black">
      <div className="pb-6">

        {/* Hero metric card */}
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-[#34c759] dark:bg-[#30d158] p-5 shadow-sm">
          <div className="text-white/75 text-[13px] font-medium uppercase tracking-wide">Gesamtumsatz</div>
          <div className="text-white text-[40px] font-bold tracking-tight mt-0.5">{formatCent(totalRevenue)}</div>
          <div className="text-white/65 text-[13px] mt-1">{sales.length} {sales.length === 1 ? 'Verkauf' : 'Verkäufe'}</div>
        </div>

        {/* Per user */}
        <div className="px-4 pt-5 pb-1">
          <span className="text-[13px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">Mitarbeiter</span>
        </div>
        <div className="mx-4 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm">
          {userRows.map(([name, stats], i) => (
            <div key={name}>
              {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-[60px]" />}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#007aff]/15 dark:bg-[#0a84ff]/20 flex items-center justify-center text-[#007aff] dark:text-[#0a84ff] font-bold text-[15px] shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[#1c1c1e] dark:text-white truncate">{name}</div>
                  <div className="text-[12px] text-[#3c3c43]/50 dark:text-white/35">{stats.count} {stats.count === 1 ? 'Verkauf' : 'Verkäufe'}</div>
                </div>
                <div className="text-[17px] font-semibold text-[#1c1c1e] dark:text-white">{formatCent(stats.revenue)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Per product */}
        <div className="px-4 pt-5 pb-1">
          <span className="text-[13px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">Produkte</span>
        </div>
        <div className="mx-4 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm">
          {productRows.map(([name, stats], i) => (
            <div key={name}>
              {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-[60px]" />}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-[28px] w-9 text-center shrink-0">{stats.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[#1c1c1e] dark:text-white truncate">{name}</div>
                  <div className="text-[12px] text-[#3c3c43]/50 dark:text-white/35">{stats.count}× verkauft</div>
                </div>
                <div className="text-[17px] font-semibold text-[#1c1c1e] dark:text-white">{formatCent(stats.revenue)}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

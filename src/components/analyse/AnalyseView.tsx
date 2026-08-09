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
      byProduct.set(key, { icon: item.icon, count: cur.count + item.qty, revenue: cur.revenue + item.lineTotal })
    }
  }
  const productRows = [...byProduct.entries()].sort((a, b) => b[1].revenue - a[1].revenue)

  return (
    <div className="h-full overflow-y-auto bg-[#f2f2f7] dark:bg-black">
      <div className="pb-8">

        {/* Hero card */}
        <div
          className="mx-4 mt-5 rounded-3xl p-6"
          style={{
            background: 'linear-gradient(135deg, #34c759, #30d158)',
            boxShadow: '0 8px 32px rgba(52,199,89,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          <div className="text-white/70 text-[13px] font-medium uppercase tracking-widest">Gesamtumsatz</div>
          <div className="text-white text-[44px] font-bold tracking-tight mt-1 leading-none">{formatCent(totalRevenue)}</div>
          <div className="text-white/60 text-[13px] mt-2">{sales.length} {sales.length === 1 ? 'Verkauf' : 'Verkäufe'}</div>
        </div>

        {/* Mitarbeiter */}
        <div className="px-4 pt-6 pb-1">
          <span className="text-[12px] font-semibold text-[#3c3c43]/55 dark:text-white/35 uppercase tracking-widest">Mitarbeiter</span>
        </div>
        <div
          className="mx-4 rounded-3xl overflow-hidden"
          style={{
            background: 'var(--lg-card-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'var(--lg-card-shadow)',
            border: '0.5px solid var(--lg-card-border)',
          }}
        >
          {userRows.map(([name, stats], i) => (
            <div key={name}>
              {i > 0 && <div className="h-px ml-[60px]" style={{ background: 'var(--lg-divider)' }} />}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0 text-[#007aff] dark:text-[#0a84ff]"
                  style={{ background: 'var(--lg-btn-primary-bg)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[#1c1c1e] dark:text-white truncate">{name}</div>
                  <div className="text-[12px] text-[#3c3c43]/45 dark:text-white/35">{stats.count} {stats.count === 1 ? 'Verkauf' : 'Verkäufe'}</div>
                </div>
                <div className="text-[17px] font-semibold text-[#1c1c1e] dark:text-white">{formatCent(stats.revenue)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Produkte */}
        <div className="px-4 pt-6 pb-1">
          <span className="text-[12px] font-semibold text-[#3c3c43]/55 dark:text-white/35 uppercase tracking-widest">Produkte</span>
        </div>
        <div
          className="mx-4 rounded-3xl overflow-hidden"
          style={{
            background: 'var(--lg-card-bg)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'var(--lg-card-shadow)',
            border: '0.5px solid var(--lg-card-border)',
          }}
        >
          {productRows.map(([name, stats], i) => (
            <div key={name}>
              {i > 0 && <div className="h-px ml-[60px]" style={{ background: 'var(--lg-divider)' }} />}
              <div className="px-4 py-3.5 flex items-center gap-3">
                <span className="text-[28px] w-9 text-center shrink-0">{stats.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[#1c1c1e] dark:text-white truncate">{name}</div>
                  <div className="text-[12px] text-[#3c3c43]/45 dark:text-white/35">{stats.count}× verkauft</div>
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

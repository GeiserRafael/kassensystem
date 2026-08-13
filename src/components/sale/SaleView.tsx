import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useCartStore } from '../../store/cartStore'
import { formatCent, generateId, getDeviceId, getUserName, getPfandPrice } from '../../utils'
import { ProductButton } from './ProductButton'
import { syncSalesToFirestore } from '../../db/sync'
import type { Category } from '../../db/types'

const QUICK_AMOUNTS = [5_00, 10_00, 20_00, 50_00]

const blur = 'blur(40px) saturate(180%)'

export function SaleView() {
  const [given, setGiven] = useState('')
  const [paid, setPaid] = useState(false)
  const [activeTabId, setActiveTabId] = useState<number | null>(null)

  const items = useCartStore((s) => s.items)
  const pfandQty = useCartStore((s) => s.pfandQty)
  const pfandAdded = useCartStore((s) => s.pfandAdded)
  const addProduct = useCartStore((s) => s.addProduct)
  const addPfand = useCartStore((s) => s.addPfand)
  const removePfand = useCartStore((s) => s.removePfand)
  const removeOne = useCartStore((s) => s.removeOne)
  const removeLastAdded = useCartStore((s) => s.removeLastAdded)
  const clear = useCartStore((s) => s.clear)
  const total = useCartStore((s) => s.total())

  const givenCent = Math.round(parseFloat(given.replace(',', '.')) * 100) || 0
  const change = givenCent - total

  const tabs = useLiveQuery(() => db.tabs.orderBy('sortOrder').toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())
  const products = useLiveQuery(async () => {
    const all = await db.products.toArray()
    return all.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const activeTabs = useLiveQuery(async () => {
    if (!tabs || !categories || !products) return []
    const catIdsWithProducts = new Set(products.map((p) => p.categoryId))
    const tabIdsWithProducts = new Set(
      (categories as Category[])
        .filter((c) => catIdsWithProducts.has(c.id!))
        .map((c) => c.tabId)
    )
    return tabs.filter((t) => tabIdsWithProducts.has(t.id))
  }, [tabs, categories, products])

  const resolvedTabId = activeTabId ?? activeTabs?.[0]?.id ?? null

  const activeCatsWithProducts = useLiveQuery(async () => {
    if (!products || !categories || resolvedTabId === null) return []
    const catIdsWithProducts = new Set(products.map((p) => p.categoryId))
    return (categories as Category[]).filter(
      (c) => c.tabId === resolvedTabId && catIdsWithProducts.has(c.id!)
    )
  }, [products, categories, resolvedTabId])

  async function handlePay() {
    if (items.length === 0) return
    const pfandTotal = pfandQty * getPfandPrice()
    await db.sales.add({
      id: generateId(),
      userId: getUserName(),
      deviceId: getDeviceId(),
      createdAt: Date.now(),
      type: 'sale',
      lineItems: items,
      pfandQty,
      pfandTotal,
      total,
      given: givenCent,
      change: Math.max(0, change),
    })
    clear()
    setGiven('')
    setPaid(true)
    setTimeout(() => setPaid(false), 1500)
    if (navigator.onLine) syncSalesToFirestore().catch(console.error)
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f2f7] dark:bg-black">

      {/* Tab pills */}
      {(activeTabs ?? []).length > 1 && (
        <div
          className="shrink-0 flex gap-2 px-4 pt-3 pb-3 overflow-x-auto"
          style={{ backdropFilter: blur, WebkitBackdropFilter: blur, background: 'var(--lg-bar-bg)' }}
        >
          {(activeTabs ?? []).map((t) => {
            const isActive = t.id === resolvedTabId
            return (
              <button
                key={t.id}
                onClick={() => setActiveTabId(t.id!)}
                className={`shrink-0 px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all active:scale-95 ${
                  isActive ? 'text-white dark:text-[#1c1c1e]' : 'text-[#3c3c43]/70 dark:text-white/60'
                }`}
                style={{
                  background: isActive ? 'var(--lg-pill-active-bg)' : 'var(--lg-pill-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: isActive
                    ? '0 2px 8px rgba(0,0,0,0.2), inset 0 0.5px 0 rgba(255,255,255,0.15)'
                    : 'var(--lg-pill-shadow)',
                }}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Scrollable product list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {(activeCatsWithProducts ?? []).map((cat) => {
          const catProducts = (products ?? []).filter((p) => p.categoryId === cat.id)
          if (catProducts.length === 0) return null
          return (
            <div key={cat.id} style={{ '--cat-color': cat.color } as React.CSSProperties}>
              <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-[12px] font-semibold text-[#3c3c43]/55 dark:text-white/35 uppercase tracking-widest">
                  {cat.name}
                </span>
              </div>
              <div className="grid gap-3 px-4 pb-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                {catProducts.map((p) => (
                  <ProductButton key={p.id} product={p} />
                ))}
              </div>
            </div>
          )
        })}
        <div className="h-3" />
      </div>

      {/* Cart + payment panel */}
      <div
        className="shrink-0"
        style={{
          backdropFilter: blur,
          WebkitBackdropFilter: blur,
          background: 'var(--lg-panel-bg)',
          borderTop: '0.5px solid var(--lg-panel-border)',
        }}
      >
        {items.length > 0 && (
          <div className="px-4 pt-3 space-y-1.5 max-h-36 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 text-[15px] truncate text-[#1c1c1e] dark:text-white">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => removeOne(item.productId)}
                    className="w-7 h-7 rounded-full text-[#ff3b30] dark:text-[#ff453a] font-bold text-lg flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'var(--lg-btn-danger-bg)' }}
                  >−</button>
                  <span className="w-5 text-center text-[15px] font-semibold text-[#1c1c1e] dark:text-white">{item.qty}</span>
                  <button
                    onClick={() => addProduct({ id: item.productId, name: item.name, icon: item.icon, price: item.unitPrice, hasPfand: item.hasPfand, categoryId: 0, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0, lastModified: 0 })}
                    className="w-7 h-7 rounded-full text-[#34c759] dark:text-[#30d158] font-bold text-lg flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(52,199,89,0.12)' }}
                  >+</button>
                </div>
                <span className="text-[14px] font-medium w-16 text-right text-[#3c3c43] dark:text-white/70">{formatCent(item.lineTotal)}</span>
              </div>
            ))}
            {pfandAdded > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <span className="flex-1 text-[15px] truncate text-[#1c1c1e] dark:text-white">Pfand</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={removePfand}
                    className="w-7 h-7 rounded-full text-[#ff3b30] dark:text-[#ff453a] font-bold text-lg flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'var(--lg-btn-danger-bg)' }}
                  >−</button>
                  <span className="w-12 text-center text-[15px] font-semibold text-[#1c1c1e] dark:text-white tabular-nums">{pfandQty}/{pfandAdded}</span>
                  <button
                    onClick={addPfand}
                    className="w-7 h-7 rounded-full text-[#34c759] dark:text-[#30d158] font-bold text-lg flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(52,199,89,0.12)' }}
                  >+</button>
                </div>
                <span className="text-[14px] font-medium w-16 text-right text-[#3c3c43] dark:text-white/70">{formatCent(pfandQty * getPfandPrice())}</span>
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-3 pb-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-[17px] font-semibold text-[#3c3c43]/60 dark:text-white/50">Gesamt</span>
            <span className="text-[36px] font-bold tracking-tight text-[#1c1c1e] dark:text-white">{formatCent(total)}</span>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[15px] text-[#3c3c43]/55 dark:text-white/40 shrink-0">Gegeben</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={given}
              onChange={(e) => setGiven(e.target.value.replace('.', ','))}
              className="flex-1 rounded-2xl px-3 py-2 text-right text-[17px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#007aff] text-[#1c1c1e] dark:text-white"
              style={{ background: 'var(--lg-input-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            />
            {givenCent >= total && total > 0 && (
              <div className="text-right shrink-0">
                <div className="text-[11px] text-[#3c3c43]/45 dark:text-white/35">Rückgeld</div>
                <div className="text-[20px] font-bold text-[#34c759] dark:text-[#30d158]">{formatCent(change)}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  const current = Math.round(parseFloat(given.replace(',', '.')) * 100) || 0
                  setGiven(((current + amt) / 100).toFixed(2).replace('.', ','))
                }}
                className="flex-1 py-2 rounded-2xl text-[#1c1c1e] dark:text-white text-[13px] font-semibold active:scale-95 transition-transform"
                style={{ background: 'var(--lg-btn-bg)' }}
              >
                +{formatCent(amt).replace(',00 €', '€').replace(' €', '€')}
              </button>
            ))}
            <button
              onClick={() => setGiven((total / 100).toFixed(2).replace('.', ','))}
              className="flex-1 py-2 rounded-2xl text-[#007aff] dark:text-[#0a84ff] text-[13px] font-semibold active:scale-95 transition-transform"
              style={{ background: 'var(--lg-btn-primary-bg)' }}
            >
              Passend
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { if (items.length > 0 && confirm('Kauf zurücksetzen?')) { clear(); setGiven('') } }}
              disabled={items.length === 0}
              className="px-4 py-3.5 rounded-2xl text-[#ff3b30] dark:text-[#ff453a] text-[17px] font-semibold disabled:opacity-25 active:scale-95 transition-transform"
              style={{ background: 'var(--lg-btn-danger-bg)' }}
            >🗑️</button>
            <button
              onClick={removeLastAdded}
              disabled={items.length === 0}
              className="px-4 py-3.5 rounded-2xl text-[#3c3c43] dark:text-white/70 text-[17px] font-semibold disabled:opacity-25 active:scale-95 transition-transform"
              style={{ background: 'var(--lg-btn-bg)' }}
            >↩</button>
            <button
              onClick={handlePay}
              disabled={items.length === 0}
              className="flex-1 py-3.5 rounded-2xl text-white text-[17px] font-bold active:scale-[0.98] disabled:opacity-30 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #34c759, #30d158)',
                boxShadow: items.length > 0 ? '0 4px 16px rgba(52,199,89,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
              }}
            >
              {paid ? '✓ Gespeichert' : `Bezahlen${items.length > 0 ? '  ' + formatCent(total) : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useCartStore } from '../../store/cartStore'
import { formatCent, generateId, getDeviceId, getUserName } from '../../utils'
import { ProductButton } from './ProductButton'
import { syncSalesToFirestore } from '../../db/sync'
import type { Category } from '../../db/types'

const QUICK_AMOUNTS = [5_00, 10_00, 20_00, 50_00]

export function SaleView() {
  const [activeCatId, setActiveCatId] = useState<number | null>(null)
  const [given, setGiven] = useState('')
  const [paid, setPaid] = useState(false)

  const items = useCartStore((s) => s.items)
  const addProduct = useCartStore((s) => s.addProduct)
  const removeOne = useCartStore((s) => s.removeOne)
  const removeLastAdded = useCartStore((s) => s.removeLastAdded)
  const clear = useCartStore((s) => s.clear)
  const total = useCartStore((s) => s.total())

  const givenCent = Math.round(parseFloat(given.replace(',', '.')) * 100) || 0
  const change = givenCent - total

  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())

  const products = useLiveQuery(async () => {
    const all = await db.products.toArray()
    return all.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const activeCatsWithProducts = useLiveQuery(async () => {
    if (!products || !categories) return []
    const catIds = new Set(products.map((p) => p.categoryId))
    return (categories as Category[]).filter((c) => catIds.has(c.id!))
  }, [products, categories])

  const currentCatId = activeCatId ?? activeCatsWithProducts?.[0]?.id ?? null
  const visibleProducts = products?.filter((p) => p.categoryId === currentCatId) ?? []
  const catColor = (categories ?? []).find((c) => c.id === currentCatId)?.color ?? '#007aff'

  async function handlePay() {
    if (items.length === 0) return
    await db.sales.add({
      id: generateId(),
      userId: getUserName(),
      deviceId: getDeviceId(),
      createdAt: Date.now(),
      type: 'sale',
      lineItems: items,
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
    <div
      className="flex flex-col h-full bg-[#f2f2f7] dark:bg-black"
      style={{ '--cat-color': catColor } as React.CSSProperties}
    >
      {/* Category pill tabs — iOS Segmented-style */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto">
          {(activeCatsWithProducts ?? []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCatId(cat.id!)}
              className={`relative px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:opacity-70 overflow-hidden ${
                cat.id === currentCatId
                  ? 'text-white shadow-sm'
                  : 'bg-white/70 dark:bg-white/10 text-[#3c3c43] dark:text-white/80'
              }`}
              style={cat.id === currentCatId ? { backgroundColor: cat.color } : undefined}
            >
              <span className="hidden dark:block absolute inset-0 bg-black/25 pointer-events-none" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div
        className="flex-1 min-h-0 grid gap-2.5 px-4 pb-2 overflow-y-auto content-start"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}
      >
        {visibleProducts.map((p) => (
          <ProductButton key={p.id} product={p} />
        ))}
      </div>

      {/* Cart + payment — iOS card */}
      <div className="shrink-0 bg-white/80 dark:bg-[#1c1c1e]/90 border-t border-[#3c3c43]/10 dark:border-white/8"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Cart items */}
        {items.length > 0 && (
          <div className="px-4 pt-3 space-y-1 max-h-36 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <span className="flex-1 text-[15px] truncate text-[#1c1c1e] dark:text-white">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => removeOne(item.productId)}
                    className="w-7 h-7 rounded-full bg-[#ff3b30]/15 dark:bg-[#ff453a]/20 text-[#ff3b30] dark:text-[#ff453a] font-bold text-lg flex items-center justify-center"
                  >−</button>
                  <span className="w-5 text-center text-[15px] font-semibold text-[#1c1c1e] dark:text-white">{item.qty}</span>
                  <button
                    onClick={() => addProduct({ id: item.productId, name: item.name, icon: item.icon, price: item.unitPrice, categoryId: 0, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0, lastModified: 0 })}
                    className="w-7 h-7 rounded-full bg-[#34c759]/15 dark:bg-[#30d158]/20 text-[#34c759] dark:text-[#30d158] font-bold text-lg flex items-center justify-center"
                  >+</button>
                </div>
                <span className="text-[14px] font-medium w-16 text-right text-[#3c3c43] dark:text-white/70">{formatCent(item.lineTotal)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 pt-3 pb-3 space-y-3">
          {/* Total */}
          <div className="flex justify-between items-baseline">
            <span className="text-[17px] font-semibold text-[#3c3c43] dark:text-white/60">Gesamt</span>
            <span className="text-[34px] font-bold tracking-tight text-[#1c1c1e] dark:text-white">{formatCent(total)}</span>
          </div>

          {/* Given amount + change */}
          <div className="flex gap-2 items-center">
            <span className="text-[15px] text-[#3c3c43]/60 dark:text-white/40 shrink-0">Gegeben</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={given}
              onChange={(e) => setGiven(e.target.value)}
              className="flex-1 bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2 text-right text-[17px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#007aff]"
            />
            {givenCent >= total && total > 0 && (
              <div className="text-right shrink-0">
                <div className="text-[11px] text-[#3c3c43]/50 dark:text-white/40">Rückgeld</div>
                <div className="text-[20px] font-bold text-[#34c759] dark:text-[#30d158]">{formatCent(change)}</div>
              </div>
            )}
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setGiven((amt / 100).toFixed(2))}
                className="flex-1 py-2 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white text-[13px] font-semibold active:opacity-60 transition-opacity"
              >
                {formatCent(amt).replace(' €', '€')}
              </button>
            ))}
            <button
              onClick={() => setGiven((total / 100).toFixed(2))}
              className="flex-1 py-2 rounded-xl bg-[#007aff]/12 dark:bg-[#0a84ff]/15 text-[#007aff] dark:text-[#0a84ff] text-[13px] font-semibold active:opacity-60 transition-opacity"
            >
              Passend
            </button>
          </div>

          {/* Action row */}
          <div className="flex gap-2">
            <button
              onClick={() => { if (items.length > 0 && confirm('Kauf zurücksetzen?')) { clear(); setGiven('') } }}
              disabled={items.length === 0}
              className="px-4 py-3 rounded-xl bg-[#ff3b30]/12 dark:bg-[#ff453a]/15 text-[#ff3b30] dark:text-[#ff453a] text-[15px] font-semibold disabled:opacity-30 active:opacity-60 transition-opacity"
            >
              🗑️
            </button>
            <button
              onClick={removeLastAdded}
              disabled={items.length === 0}
              className="px-4 py-3 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[15px] font-semibold disabled:opacity-30 active:opacity-60 transition-opacity"
            >
              ↩
            </button>
            <button
              onClick={handlePay}
              disabled={items.length === 0}
              className={`flex-1 py-3 rounded-xl text-white text-[17px] font-bold transition-all active:opacity-80 disabled:opacity-35 ${
                paid ? 'bg-[#34c759] dark:bg-[#30d158]' : 'bg-[#34c759] dark:bg-[#30d158]'
              }`}
            >
              {paid ? '✓ Gespeichert' : `Bezahlen${items.length > 0 ? '  ' + formatCent(total) : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

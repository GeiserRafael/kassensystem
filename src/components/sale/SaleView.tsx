import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useCartStore } from '../../store/cartStore'
import { formatCent, generateId, getDeviceId, getUserName } from '../../utils'
import { ProductButton } from './ProductButton'
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

  const categories = useLiveQuery(() =>
    db.categories.orderBy('sortOrder').toArray()
  )

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

  const catColor = (categories ?? []).find((c) => c.id === currentCatId)?.color ?? '#3b82f6'

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
  }

  return (
    <div className="flex flex-col h-svh bg-gray-50" style={{ '--cat-color': catColor } as React.CSSProperties}>
      {/* Category tabs */}
      <div className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto shrink-0 bg-white shadow-sm">
        {(activeCatsWithProducts ?? []).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCatId(cat.id!)}
            className={`
              px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors
              ${cat.id === currentCatId ? 'text-white' : 'bg-gray-100 text-gray-600'}
            `}
            style={cat.id === currentCatId ? { backgroundColor: cat.color } : undefined}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div
        className="grid gap-2 p-2 overflow-y-auto"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
      >
        {visibleProducts.map((p) => (
          <ProductButton key={p.id} product={p} />
        ))}
      </div>

      {/* Cart + payment */}
      <div className="shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        {/* Cart items */}
        {items.length > 0 && (
          <div className="px-3 pt-2 space-y-1 max-h-40 overflow-y-auto">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1 text-sm truncate">{item.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => removeOne(item.productId)}
                    className="w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-lg flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <button
                    onClick={() => addProduct({ id: item.productId, name: item.name, icon: item.icon, price: item.unitPrice, categoryId: 0, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0, lastModified: 0 })}
                    className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-medium w-16 text-right">{formatCent(item.lineTotal)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-3 py-2 space-y-2">
          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-700">Gesamt</span>
            <span className="text-3xl font-bold text-gray-900">{formatCent(total)}</span>
          </div>

          {/* Given amount */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500 shrink-0">Gegeben</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={given}
              onChange={(e) => setGiven(e.target.value)}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-right text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {givenCent >= total && total > 0 && (
              <div className="text-right shrink-0">
                <div className="text-xs text-gray-500">Rückgeld</div>
                <div className="text-xl font-bold text-green-600">{formatCent(change)}</div>
              </div>
            )}
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setGiven((amt / 100).toFixed(2))}
                className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium active:bg-gray-200"
              >
                {formatCent(amt).replace(' €', '€')}
              </button>
            ))}
            <button
              onClick={() => setGiven((total / 100).toFixed(2))}
              className="flex-1 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium active:bg-blue-100"
            >
              Passend
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={removeLastAdded}
              disabled={items.length === 0}
              className="px-3 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium disabled:opacity-30 active:bg-gray-200"
            >
              ↩ Undo
            </button>
            <button
              onClick={handlePay}
              disabled={items.length === 0}
              className={`
                flex-1 py-3 rounded-xl text-white text-lg font-bold
                transition-all active:scale-95
                ${paid ? 'bg-blue-500' : 'bg-green-600 disabled:opacity-40'}
              `}
            >
              {paid ? '✓ Gespeichert' : `Bezahlen ${items.length > 0 ? formatCent(total) : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

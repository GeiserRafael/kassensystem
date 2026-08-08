import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Category, Product } from '../../db/types'
import { formatCent } from '../../utils'

const CATEGORY_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899']

export function SettingsView() {
  const [tab, setTab] = useState<'products' | 'categories' | 'user'>('products')
  const [userName, setUserName] = useState(localStorage.getItem('userName') ?? '')

  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())
  const products = useLiveQuery(() => db.products.orderBy('sortOrder').toArray())

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)

  function newProduct() {
    setEditingProduct({ name: '', icon: '🛍️', price: 0, categoryId: categories?.[0]?.id ?? 0, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0 })
  }

  async function saveProduct() {
    if (!editingProduct?.name || !editingProduct.price) return
    const now = Date.now()
    if (editingProduct.id) {
      await db.products.update(editingProduct.id, { ...editingProduct, lastModified: now })
    } else {
      const count = await db.products.count()
      await db.products.add({ ...editingProduct as Product, sortOrder: count, lastModified: now })
    }
    setEditingProduct(null)
  }

  async function toggleSoldOut(p: Product) {
    await db.products.update(p.id!, { isSoldOut: !p.isSoldOut, lastModified: Date.now() })
  }

  async function toggleActive(p: Product) {
    await db.products.update(p.id!, { isActive: !p.isActive, lastModified: Date.now() })
  }

  async function toggleFavorite(p: Product) {
    await db.products.update(p.id!, { isFavorite: !p.isFavorite, lastModified: Date.now() })
  }

  function newCategory() {
    setEditingCategory({ name: '', sortOrder: (categories?.length ?? 0), color: CATEGORY_COLORS[0] })
  }

  async function saveCategory() {
    if (!editingCategory?.name) return
    const now = Date.now()
    if (editingCategory.id) {
      await db.categories.update(editingCategory.id, { ...editingCategory, lastModified: now })
    } else {
      await db.categories.add({ ...editingCategory as Category, lastModified: now })
    }
    setEditingCategory(null)
  }

  async function deleteCategory(id: number) {
    const hasProducts = await db.products.where('categoryId').equals(id).count()
    if (hasProducts > 0) {
      alert('Kategorie hat noch Produkte. Erst Produkte verschieben oder deaktivieren.')
      return
    }
    await db.categories.delete(id)
  }

  function saveUserName() {
    localStorage.setItem('userName', userName)
    alert('Gespeichert!')
  }

  const catName = (id: number) => categories?.find((c) => c.id === id)?.name ?? '—'
  const catColor = (id: number) => categories?.find((c) => c.id === id)?.color ?? '#9ca3af'

  return (
    <div className="flex flex-col h-svh bg-gray-50 dark:bg-gray-900">
      {/* Tab bar */}
      <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {(['products', 'categories', 'user'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t
                ? 'border-green-600 text-green-700 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            {t === 'products' ? 'Produkte' : t === 'categories' ? 'Kategorien' : 'Benutzer'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* PRODUCTS tab */}
        {tab === 'products' && (
          <>
            <button onClick={newProduct} className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-base">
              + Neues Produkt
            </button>

            {editingProduct && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow space-y-3">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{editingProduct.id ? 'Produkt bearbeiten' : 'Neues Produkt'}</h3>
                <div className="flex gap-2">
                  <input
                    value={editingProduct.icon}
                    onChange={(e) => setEditingProduct({ ...editingProduct, icon: e.target.value })}
                    className="w-14 text-center text-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl p-2"
                    placeholder="🛍️"
                  />
                  <input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                    placeholder="Name"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Preis (€)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={editingProduct.price ? (editingProduct.price / 100).toFixed(2) : ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Kategorie</label>
                    <select
                      value={editingProduct.categoryId}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: Number(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                    >
                      {(categories ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingProduct(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">Abbrechen</button>
                  <button onClick={saveProduct} className="flex-1 py-2 rounded-xl bg-green-600 text-white font-semibold">Speichern</button>
                </div>
              </div>
            )}

            {(products ?? []).map((p) => (
              <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-2xl px-3 py-2 shadow flex items-center gap-2 ${!p.isActive ? 'opacity-50' : ''}`}>
                <span className="text-2xl">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span style={{ backgroundColor: catColor(p.categoryId) }} className="w-2 h-2 rounded-full inline-block" />
                    {catName(p.categoryId)} · {formatCent(p.price)}
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  <button onClick={() => toggleFavorite(p)} title="Favorit" className={`text-lg ${p.isFavorite ? 'opacity-100' : 'opacity-30'}`}>⭐</button>
                  <button onClick={() => toggleSoldOut(p)} className={`text-xs px-2 py-1 rounded-lg font-medium ${p.isSoldOut ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {p.isSoldOut ? 'Aus' : 'OK'}
                  </button>
                  <button onClick={() => toggleActive(p)} className={`text-xs px-2 py-1 rounded-lg font-medium ${p.isActive ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {p.isActive ? 'Aktiv' : 'Inaktiv'}
                  </button>
                  <button onClick={() => setEditingProduct(p)} className="text-blue-600 dark:text-blue-400 px-2 py-1 text-sm">✏️</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* CATEGORIES tab */}
        {tab === 'categories' && (
          <>
            <button onClick={newCategory} className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-base">
              + Neue Kategorie
            </button>

            {editingCategory && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow space-y-3">
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{editingCategory.id ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h3>
                <input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2"
                  placeholder="Name"
                />
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Farbe</label>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORY_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => setEditingCategory({ ...editingCategory, color: col })}
                        className={`w-9 h-9 rounded-full border-4 transition-transform ${editingCategory.color === col ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingCategory(null)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">Abbrechen</button>
                  <button onClick={saveCategory} className="flex-1 py-2 rounded-xl bg-green-600 text-white font-semibold">Speichern</button>
                </div>
              </div>
            )}

            {(categories ?? []).map((cat) => (
              <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                <button onClick={() => setEditingCategory(cat)} className="text-blue-600 dark:text-blue-400 text-sm px-2">✏️</button>
                <button onClick={() => deleteCategory(cat.id!)} className="text-red-500 dark:text-red-400 text-sm px-2">🗑️</button>
              </div>
            ))}
          </>
        )}

        {/* USER tab */}
        {tab === 'user' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Benutzername</h3>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2"
              placeholder="Dein Name"
            />
            <button onClick={saveUserName} className="w-full py-2 rounded-xl bg-green-600 text-white font-semibold">
              Speichern
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

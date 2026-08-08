import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Category, Product } from '../../db/types'
import { formatCent } from '../../utils'
import { pushProductToFirestore, pushCategoryToFirestore, deleteCategoryFromFirestore } from '../../db/sync'

const CATEGORY_COLORS = ['#007aff', '#ff9500', '#34c759', '#af52de', '#ff3b30', '#ffcc00', '#5ac8fa', '#ff2d55']

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <span className="text-[13px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">{title}</span>
    </div>
  )
}

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
    let saved: Product
    if (editingProduct.id) {
      await db.products.update(editingProduct.id, { ...editingProduct, lastModified: now })
      saved = { ...editingProduct as Product, lastModified: now }
    } else {
      const count = await db.products.count()
      const newProd = { ...editingProduct as Product, sortOrder: count, lastModified: now }
      const id = await db.products.add(newProd)
      saved = { ...newProd, id: id as number }
    }
    pushProductToFirestore(saved).catch(console.error)
    setEditingProduct(null)
  }

  async function toggleSoldOut(p: Product) {
    const updated = { ...p, isSoldOut: !p.isSoldOut, lastModified: Date.now() }
    await db.products.update(p.id!, updated)
    pushProductToFirestore(updated).catch(console.error)
  }

  async function toggleActive(p: Product) {
    const updated = { ...p, isActive: !p.isActive, lastModified: Date.now() }
    await db.products.update(p.id!, updated)
    pushProductToFirestore(updated).catch(console.error)
  }

  async function toggleFavorite(p: Product) {
    const updated = { ...p, isFavorite: !p.isFavorite, lastModified: Date.now() }
    await db.products.update(p.id!, updated)
    pushProductToFirestore(updated).catch(console.error)
  }

  function newCategory() {
    setEditingCategory({ name: '', sortOrder: (categories?.length ?? 0), color: CATEGORY_COLORS[0] })
  }

  async function saveCategory() {
    if (!editingCategory?.name) return
    const now = Date.now()
    let saved: Category
    if (editingCategory.id) {
      await db.categories.update(editingCategory.id, { ...editingCategory, lastModified: now })
      saved = { ...editingCategory as Category, lastModified: now }
    } else {
      const newCat = { ...editingCategory as Category, lastModified: now }
      const id = await db.categories.add(newCat)
      saved = { ...newCat, id: id as number }
    }
    pushCategoryToFirestore(saved).catch(console.error)
    setEditingCategory(null)
  }

  async function deleteCategory(id: number) {
    const hasProducts = await db.products.where('categoryId').equals(id).count()
    if (hasProducts > 0) {
      alert('Kategorie hat noch Produkte. Erst Produkte verschieben oder deaktivieren.')
      return
    }
    await db.categories.delete(id)
    deleteCategoryFromFirestore(id).catch(console.error)
  }

  function saveUserName() {
    localStorage.setItem('userName', userName)
    alert('Gespeichert!')
  }

  const catName = (id: number) => categories?.find((c) => c.id === id)?.name ?? '—'
  const catColor = (id: number) => categories?.find((c) => c.id === id)?.color ?? '#9ca3af'

  return (
    <div className="flex flex-col h-full bg-[#f2f2f7] dark:bg-black">
      {/* iOS Segmented Control */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex bg-[#e5e5ea] dark:bg-white/10 rounded-xl p-0.5">
          {(['products', 'categories', 'user'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-[10px] text-[13px] font-semibold transition-all ${
                tab === t
                  ? 'bg-white dark:bg-[#2c2c2e] text-[#1c1c1e] dark:text-white shadow-sm'
                  : 'text-[#3c3c43]/60 dark:text-white/40'
              }`}
            >
              {t === 'products' ? 'Produkte' : t === 'categories' ? 'Kategorien' : 'Benutzer'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* PRODUCTS tab */}
        {tab === 'products' && (
          <>
            <SectionHeader title="Produkte" />
            <div className="mx-4 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm">
              <button
                onClick={newProduct}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-[#007aff] dark:text-[#0a84ff] font-semibold text-[17px] active:bg-[#f2f2f7] dark:active:bg-white/5 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-[#34c759] flex items-center justify-center text-white font-bold text-lg leading-none">+</span>
                Neues Produkt
              </button>
            </div>

            {editingProduct && (
              <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-[17px] text-[#1c1c1e] dark:text-white">{editingProduct.id ? 'Produkt bearbeiten' : 'Neues Produkt'}</h3>
                <div className="flex gap-2">
                  <input
                    value={editingProduct.icon}
                    onChange={(e) => setEditingProduct({ ...editingProduct, icon: e.target.value })}
                    className="w-14 text-center text-2xl bg-[#f2f2f7] dark:bg-white/8 rounded-xl p-2.5 focus:outline-none"
                    placeholder="🛍️"
                  />
                  <input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="flex-1 bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                    placeholder="Name"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[12px] text-[#3c3c43]/60 dark:text-white/40 font-medium">Preis (€)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={editingProduct.price ? (editingProduct.price / 100).toFixed(2) : ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className="w-full mt-1 bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[12px] text-[#3c3c43]/60 dark:text-white/40 font-medium">Kategorie</label>
                    <select
                      value={editingProduct.categoryId}
                      onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: Number(e.target.value) })}
                      className="w-full mt-1 bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[15px] focus:outline-none"
                    >
                      {(categories ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingProduct(null)} className="flex-1 py-2.5 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white font-semibold text-[15px] active:opacity-60">Abbrechen</button>
                  <button onClick={saveProduct} className="flex-1 py-2.5 rounded-xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[15px] active:opacity-80">Speichern</button>
                </div>
              </div>
            )}

            {(products ?? []).length > 0 && (
              <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm mb-6">
                {(products ?? []).map((p, i) => (
                  <div key={p.id}>
                    {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-4" />}
                    <div className={`px-4 py-3 flex items-center gap-3 ${!p.isActive ? 'opacity-45' : ''}`}>
                      <span className="text-2xl">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium text-[#1c1c1e] dark:text-white truncate">{p.name}</div>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#3c3c43]/50 dark:text-white/35">
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: catColor(p.categoryId) }} />
                          {catName(p.categoryId)} · {formatCent(p.price)}
                        </div>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <button onClick={() => toggleFavorite(p)} className={`text-lg transition-opacity ${p.isFavorite ? 'opacity-100' : 'opacity-25'}`}>⭐</button>
                        <button
                          onClick={() => toggleSoldOut(p)}
                          className={`text-[12px] px-2.5 py-1 rounded-lg font-semibold ${
                            p.isSoldOut
                              ? 'bg-[#ff3b30]/15 text-[#ff3b30] dark:bg-[#ff453a]/20 dark:text-[#ff453a]'
                              : 'bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70'
                          }`}
                        >{p.isSoldOut ? 'Aus' : 'OK'}</button>
                        <button
                          onClick={() => toggleActive(p)}
                          className={`text-[12px] px-2.5 py-1 rounded-lg font-semibold ${
                            p.isActive
                              ? 'bg-[#34c759]/15 text-[#34c759] dark:bg-[#30d158]/20 dark:text-[#30d158]'
                              : 'bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43]/50 dark:text-white/30'
                          }`}
                        >{p.isActive ? 'Aktiv' : 'Inaktiv'}</button>
                        <button onClick={() => setEditingProduct(p)} className="text-[#007aff] dark:text-[#0a84ff] px-1 text-[15px]">✏️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* CATEGORIES tab */}
        {tab === 'categories' && (
          <>
            <SectionHeader title="Kategorien" />
            <div className="mx-4 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm">
              <button
                onClick={newCategory}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-[#007aff] dark:text-[#0a84ff] font-semibold text-[17px] active:bg-[#f2f2f7] dark:active:bg-white/5"
              >
                <span className="w-7 h-7 rounded-full bg-[#34c759] flex items-center justify-center text-white font-bold text-lg leading-none">+</span>
                Neue Kategorie
              </button>
            </div>

            {editingCategory && (
              <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-[17px] text-[#1c1c1e] dark:text-white">{editingCategory.id ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</h3>
                <input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                  placeholder="Name"
                />
                <div>
                  <label className="text-[12px] text-[#3c3c43]/60 dark:text-white/40 font-medium block mb-2">Farbe</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {CATEGORY_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => setEditingCategory({ ...editingCategory, color: col })}
                        className={`w-9 h-9 rounded-full border-[3px] transition-transform active:scale-90 ${
                          editingCategory.color === col ? 'border-[#1c1c1e] dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingCategory(null)} className="flex-1 py-2.5 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white font-semibold text-[15px] active:opacity-60">Abbrechen</button>
                  <button onClick={saveCategory} className="flex-1 py-2.5 rounded-xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[15px] active:opacity-80">Speichern</button>
                </div>
              </div>
            )}

            {(categories ?? []).length > 0 && (
              <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm mb-6">
                {(categories ?? []).map((cat, i) => (
                  <div key={cat.id}>
                    {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-4" />}
                    <div className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 text-[17px] font-medium text-[#1c1c1e] dark:text-white">{cat.name}</span>
                      <button onClick={() => setEditingCategory(cat)} className="text-[#007aff] dark:text-[#0a84ff] text-[15px] px-2">✏️</button>
                      <button onClick={() => deleteCategory(cat.id!)} className="text-[#ff3b30] dark:text-[#ff453a] text-[15px] px-2">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* USER tab */}
        {tab === 'user' && (
          <>
            <SectionHeader title="Benutzer" />
            <div className="mx-4 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm p-4 space-y-3 mb-6">
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[17px] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                placeholder="Dein Name"
              />
              <button
                onClick={saveUserName}
                className="w-full py-3 rounded-xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[17px] active:opacity-80"
              >
                Speichern
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

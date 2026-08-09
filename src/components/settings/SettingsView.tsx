import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Category, Product, Tab } from '../../db/types'
import { formatCent } from '../../utils'
import {
  pushProductToFirestore,
  pushCategoryToFirestore,
  pushTabToFirestore,
  deleteCategoryFromFirestore,
  deleteProductFromFirestore,
  deleteTabFromFirestore,
  deleteAllSales,
} from '../../db/sync'

const CATEGORY_COLORS = ['#007aff', '#ff9500', '#34c759', '#af52de', '#ff3b30', '#ffcc00', '#5ac8fa', '#ff2d55']

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <span className="text-[13px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">{title}</span>
    </div>
  )
}

export function SettingsView() {
  const [tab, setTab] = useState<'products' | 'categories' | 'tabs' | 'user' | 'admin'>('products')
  const [userName, setUserName] = useState(localStorage.getItem('userName') ?? '')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminPw, setAdminPw] = useState('')
  const [deleting, setDeleting] = useState(false)

  const appTabs = useLiveQuery(() => db.tabs.orderBy('sortOrder').toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())
  const products = useLiveQuery(() => db.products.orderBy('sortOrder').toArray())

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)
  const [editingTab, setEditingTab] = useState<Partial<Tab> | null>(null)

  // Produkt-Reihenfolge: tauscht die sortOrder-Werte zweier benachbarter Produkte
  async function moveProduct(p: Product, dir: -1 | 1) {
    const list = (products ?? [])
      .filter((x) => x.categoryId === p.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = list.findIndex((x) => x.id === p.id)
    const swapIdx = idx + dir
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return
    const now = Date.now()
    // Normalisiere zuerst alle sortOrders der Kategorie auf 0,1,2,... dann tausche
    const normalized = list.map((item, i) => ({ ...item, sortOrder: i, lastModified: now }))
    normalized[idx].sortOrder = swapIdx
    normalized[swapIdx].sortOrder = idx
    await db.products.bulkPut(normalized)
    normalized.forEach((item) => pushProductToFirestore(item).catch(console.error))
  }

  // Kategorie-Reihenfolge innerhalb eines Tabs
  async function moveCategory(c: Category, dir: -1 | 1) {
    const list = (categories ?? [])
      .filter((x) => x.tabId === c.tabId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = list.findIndex((x) => x.id === c.id)
    const swapIdx = idx + dir
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return
    const now = Date.now()
    const normalized = list.map((item, i) => ({ ...item, sortOrder: i, lastModified: now }))
    normalized[idx].sortOrder = swapIdx
    normalized[swapIdx].sortOrder = idx
    await db.categories.bulkPut(normalized)
    normalized.forEach((item) => pushCategoryToFirestore(item).catch(console.error))
  }

  // Tab-Reihenfolge
  async function moveTab(t: Tab, dir: -1 | 1) {
    const list = (appTabs ?? []).sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = list.findIndex((x) => x.id === t.id)
    const swapIdx = idx + dir
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return
    const now = Date.now()
    const normalized = list.map((item, i) => ({ ...item, sortOrder: i, lastModified: now }))
    normalized[idx].sortOrder = swapIdx
    normalized[swapIdx].sortOrder = idx
    await db.tabs.bulkPut(normalized)
    normalized.forEach((item) => pushTabToFirestore(item).catch(console.error))
  }

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
    setEditingCategory({ name: '', sortOrder: (categories?.length ?? 0), color: CATEGORY_COLORS[0], tabId: appTabs?.[0]?.id })
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

  function newTab() {
    setEditingTab({ name: '', sortOrder: (appTabs?.length ?? 0), color: CATEGORY_COLORS[0] })
  }

  async function saveTab() {
    if (!editingTab?.name) return
    const now = Date.now()
    let saved: Tab
    if (editingTab.id) {
      await db.tabs.update(editingTab.id, { ...editingTab, lastModified: now })
      saved = { ...editingTab as Tab, lastModified: now }
    } else {
      const newT = { ...editingTab as Tab, lastModified: now }
      const id = await db.tabs.add(newT)
      saved = { ...newT, id: id as number }
    }
    pushTabToFirestore(saved).catch(console.error)
    setEditingTab(null)
  }

  async function deleteTab(id: number) {
    const hasCats = await db.categories.where('tabId').equals(id).count()
    if (hasCats > 0) {
      alert('Tab hat noch Kategorien. Erst Kategorien verschieben.')
      return
    }
    await db.tabs.delete(id)
    deleteTabFromFirestore(id).catch(console.error)
  }

  function saveUserName() {
    localStorage.setItem('userName', userName)
    alert('Gespeichert!')
  }

  async function handleAdminReset() {
    if (!confirm('Alle Verkäufe und Benutzerdaten unwiderruflich löschen?')) return
    setDeleting(true)
    try {
      await deleteAllSales()
      localStorage.removeItem('userName')
      alert('Datenbank zurückgesetzt.')
    } catch (e) {
      console.error(e)
      alert('Fehler beim Zurücksetzen.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f2f2f7] dark:bg-black">
      {/* iOS Segmented Control */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex bg-[#e5e5ea] dark:bg-white/10 rounded-xl p-0.5 gap-0.5">
          {(['products', 'categories', 'tabs', 'user', 'admin'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all ${
                tab === t
                  ? 'bg-white dark:bg-[#2c2c2e] text-[#1c1c1e] dark:text-white shadow-sm'
                  : 'text-[#3c3c43]/60 dark:text-white/40'
              }`}
            >
              {t === 'products' ? 'Produkte' : t === 'categories' ? 'Kategorien' : t === 'tabs' ? 'Tabs' : t === 'user' ? 'Benutzer' : '🔒'}
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

            {(products ?? []).length > 0 && (categories ?? []).map((cat) => {
              const catProds = (products ?? [])
                .filter((p) => p.categoryId === cat.id)
                .sort((a, b) => a.sortOrder - b.sortOrder)
              if (catProds.length === 0) return null
              return (
                <div key={cat.id} className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm mb-1">
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-[#3c3c43]/8 dark:border-white/6">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-[12px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">{cat.name}</span>
                  </div>
                  {catProds.map((p, i) => (
                    <div key={p.id}>
                      {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-4" />}
                      <div className={`px-3 py-2.5 flex items-center gap-2 ${!p.isActive ? 'opacity-45' : ''}`}>
                        {/* Sort buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => moveProduct(p, -1)}
                            disabled={i === 0}
                            className="w-6 h-6 rounded-md bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[12px] flex items-center justify-center disabled:opacity-20 active:opacity-60"
                          >↑</button>
                          <button
                            onClick={() => moveProduct(p, 1)}
                            disabled={i === catProds.length - 1}
                            className="w-6 h-6 rounded-md bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[12px] flex items-center justify-center disabled:opacity-20 active:opacity-60"
                          >↓</button>
                        </div>
                        <span className="text-xl shrink-0">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-medium text-[#1c1c1e] dark:text-white truncate">{p.name}</div>
                          <div className="text-[12px] text-[#3c3c43]/50 dark:text-white/35">{formatCent(p.price)}</div>
                        </div>
                        <div className="flex gap-1 items-center">
                          <button onClick={() => toggleFavorite(p)} className={`text-base transition-opacity ${p.isFavorite ? 'opacity-100' : 'opacity-20'}`}>⭐</button>
                          <button
                            onClick={() => toggleSoldOut(p)}
                            className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${
                              p.isSoldOut
                                ? 'bg-[#ff3b30]/15 text-[#ff3b30] dark:bg-[#ff453a]/20 dark:text-[#ff453a]'
                                : 'bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70'
                            }`}
                          >{p.isSoldOut ? 'Aus' : 'OK'}</button>
                          <button
                            onClick={() => toggleActive(p)}
                            className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${
                              p.isActive
                                ? 'bg-[#34c759]/15 text-[#34c759] dark:bg-[#30d158]/20 dark:text-[#30d158]'
                                : 'bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43]/50 dark:text-white/30'
                            }`}
                          >{p.isActive ? 'Aktiv' : 'Inaktiv'}</button>
                          <button onClick={() => setEditingProduct(p)} className="text-[#007aff] dark:text-[#0a84ff] px-1 text-[14px]">✏️</button>
                          <button
                            onClick={async () => {
                              if (!confirm(`"${p.name}" löschen?`)) return
                              await db.products.delete(p.id!)
                              deleteProductFromFirestore(p.id!).catch(console.error)
                            }}
                            className="text-[#ff3b30] dark:text-[#ff453a] px-1 text-[14px]"
                          >🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
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
                  <label className="text-[12px] text-[#3c3c43]/60 dark:text-white/40 font-medium block mb-1">Tab</label>
                  <select
                    value={editingCategory.tabId ?? ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, tabId: Number(e.target.value) })}
                    className="w-full bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[15px] focus:outline-none"
                  >
                    {(appTabs ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] text-[#3c3c43]/60 dark:text-white/40 font-medium block mb-2">Farbe</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {CATEGORY_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => setEditingCategory({ ...editingCategory, color: col })}
                        className={`relative w-9 h-9 rounded-full border-[3px] transition-transform active:scale-90 overflow-hidden ${
                          editingCategory.color === col ? 'border-[#1c1c1e] dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      >
                        <span className="hidden dark:block absolute inset-0 rounded-full bg-black/20 pointer-events-none" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingCategory(null)} className="flex-1 py-2.5 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white font-semibold text-[15px] active:opacity-60">Abbrechen</button>
                  <button onClick={saveCategory} className="flex-1 py-2.5 rounded-xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[15px] active:opacity-80">Speichern</button>
                </div>
              </div>
            )}

            {/* Kategorien gruppiert nach Tab */}
            {(appTabs ?? []).map((appTab) => {
              const tabCats = (categories ?? [])
                .filter((c) => c.tabId === appTab.id)
                .sort((a, b) => a.sortOrder - b.sortOrder)
              if (tabCats.length === 0) return null
              return (
                <div key={appTab.id} className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm mb-1">
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-[#3c3c43]/8 dark:border-white/6">
                    <span className="text-[12px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">{appTab.name}</span>
                  </div>
                  {tabCats.map((cat, i) => (
                    <div key={cat.id}>
                      {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-4" />}
                      <div className="px-3 py-3 flex items-center gap-3">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => moveCategory(cat, -1)}
                            disabled={i === 0}
                            className="w-6 h-6 rounded-md bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[12px] flex items-center justify-center disabled:opacity-20 active:opacity-60"
                          >↑</button>
                          <button
                            onClick={() => moveCategory(cat, 1)}
                            disabled={i === tabCats.length - 1}
                            className="w-6 h-6 rounded-md bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[12px] flex items-center justify-center disabled:opacity-20 active:opacity-60"
                          >↓</button>
                        </div>
                        <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 text-[17px] font-medium text-[#1c1c1e] dark:text-white">{cat.name}</span>
                        <button onClick={() => setEditingCategory(cat)} className="text-[#007aff] dark:text-[#0a84ff] text-[15px] px-2">✏️</button>
                        <button onClick={() => deleteCategory(cat.id!)} className="text-[#ff3b30] dark:text-[#ff453a] text-[15px] px-2">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Kategorien ohne Tab */}
            {(() => {
              const noTabCats = (categories ?? []).filter((c) => !c.tabId)
              if (noTabCats.length === 0) return null
              return (
                <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm mb-1">
                  <div className="px-4 py-2 border-b border-[#3c3c43]/8 dark:border-white/6">
                    <span className="text-[12px] font-semibold text-[#3c3c43]/60 dark:text-white/40 uppercase tracking-wide">Kein Tab</span>
                  </div>
                  {noTabCats.map((cat, i) => (
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
              )
            })()}
          </>
        )}

        {/* TABS tab */}
        {tab === 'tabs' && (
          <>
            <SectionHeader title="Tabs" />
            <div className="mx-4 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm">
              <button
                onClick={newTab}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-[#007aff] dark:text-[#0a84ff] font-semibold text-[17px] active:bg-[#f2f2f7] dark:active:bg-white/5"
              >
                <span className="w-7 h-7 rounded-full bg-[#34c759] flex items-center justify-center text-white font-bold text-lg leading-none">+</span>
                Neuer Tab
              </button>
            </div>

            {editingTab && (
              <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-[17px] text-[#1c1c1e] dark:text-white">{editingTab.id ? 'Tab bearbeiten' : 'Neuer Tab'}</h3>
                <input
                  value={editingTab.name}
                  onChange={(e) => setEditingTab({ ...editingTab, name: e.target.value })}
                  className="w-full bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                  placeholder="z.B. Bierstand"
                />
                <div>
                  <label className="text-[12px] text-[#3c3c43]/60 dark:text-white/40 font-medium block mb-2">Farbe</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {CATEGORY_COLORS.map((col) => (
                      <button
                        key={col}
                        onClick={() => setEditingTab({ ...editingTab, color: col })}
                        className={`relative w-9 h-9 rounded-full border-[3px] transition-transform active:scale-90 overflow-hidden ${
                          editingTab.color === col ? 'border-[#1c1c1e] dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      >
                        <span className="hidden dark:block absolute inset-0 rounded-full bg-black/20 pointer-events-none" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingTab(null)} className="flex-1 py-2.5 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white font-semibold text-[15px] active:opacity-60">Abbrechen</button>
                  <button onClick={saveTab} className="flex-1 py-2.5 rounded-xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[15px] active:opacity-80">Speichern</button>
                </div>
              </div>
            )}

            {(appTabs ?? []).length > 0 && (
              <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e] shadow-sm mb-6">
                {(appTabs ?? []).sort((a, b) => a.sortOrder - b.sortOrder).map((t, i, arr) => (
                  <div key={t.id}>
                    {i > 0 && <div className="h-px bg-[#3c3c43]/10 dark:bg-white/8 ml-4" />}
                    <div className="px-3 py-3 flex items-center gap-3">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveTab(t, -1)}
                          disabled={i === 0}
                          className="w-6 h-6 rounded-md bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[12px] flex items-center justify-center disabled:opacity-20 active:opacity-60"
                        >↑</button>
                        <button
                          onClick={() => moveTab(t, 1)}
                          disabled={i === arr.length - 1}
                          className="w-6 h-6 rounded-md bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 text-[12px] flex items-center justify-center disabled:opacity-20 active:opacity-60"
                        >↓</button>
                      </div>
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="flex-1 text-[17px] font-medium text-[#1c1c1e] dark:text-white">{t.name}</span>
                      <button onClick={() => setEditingTab(t)} className="text-[#007aff] dark:text-[#0a84ff] text-[15px] px-2">✏️</button>
                      <button onClick={() => deleteTab(t.id!)} className="text-[#ff3b30] dark:text-[#ff453a] text-[15px] px-2">🗑️</button>
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

        {/* ADMIN tab */}
        {tab === 'admin' && (
          <>
            <SectionHeader title="Admin" />
            <div className="mx-4 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-sm p-4 space-y-3 mb-6">
              {!adminUnlocked ? (
                <>
                  <p className="text-[15px] text-[#3c3c43] dark:text-white/70">Admin-Passwort eingeben</p>
                  <input
                    type="password"
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (adminPw === '1234') { setAdminUnlocked(true); setAdminPw('') }
                        else { alert('Falsches Passwort'); setAdminPw('') }
                      }
                    }}
                    placeholder="••••"
                    className="w-full bg-[#f2f2f7] dark:bg-white/8 text-[#1c1c1e] dark:text-white rounded-xl px-3 py-2.5 text-[17px] text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                  />
                  <button
                    onClick={() => {
                      if (adminPw === '1234') { setAdminUnlocked(true); setAdminPw('') }
                      else { alert('Falsches Passwort'); setAdminPw('') }
                    }}
                    className="w-full py-3 rounded-xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[17px] active:opacity-80"
                  >
                    Entsperren
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-[13px] font-semibold text-[#34c759] dark:text-[#30d158] uppercase tracking-wide">Admin entsperrt</span>
                  </div>
                  <p className="text-[13px] text-[#3c3c43]/60 dark:text-white/40">
                    Löscht alle Verkäufe lokal und in der Cloud. Produkte und Kategorien bleiben erhalten.
                  </p>
                  <button
                    onClick={handleAdminReset}
                    disabled={deleting}
                    className="w-full py-3 rounded-xl bg-[#ff3b30] dark:bg-[#ff453a] text-white font-semibold text-[17px] active:opacity-80 disabled:opacity-40"
                  >
                    {deleting ? 'Wird gelöscht…' : '🗑️ Alle Verkäufe löschen'}
                  </button>
                  <button
                    onClick={() => setAdminUnlocked(false)}
                    className="w-full py-2.5 rounded-xl bg-[#f2f2f7] dark:bg-white/8 text-[#3c3c43] dark:text-white/70 font-semibold text-[15px] active:opacity-60"
                  >
                    Sperren
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

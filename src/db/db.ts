import Dexie, { type EntityTable } from 'dexie'
import type { Tab, Category, Product, Sale, User } from './types'

const db = new Dexie('kassensystem') as Dexie & {
  tabs: EntityTable<Tab, 'id'>
  categories: EntityTable<Category, 'id'>
  products: EntityTable<Product, 'id'>
  sales: EntityTable<Sale, 'id'>
  users: EntityTable<User, 'id'>
}

db.version(1).stores({
  categories: '++id, sortOrder',
  products: '++id, categoryId, isActive, isFavorite, sortOrder',
  sales: 'id, userId, createdAt, type',
  users: '++id',
})

db.version(2).stores({
  categories: '++id, sortOrder',
  products: '++id, categoryId, isActive, isFavorite, sortOrder',
  sales: 'id, userId, createdAt, type',
  users: '++id',
}).upgrade(async (tx) => {
  await tx.table('categories').clear()
  await tx.table('products').clear()
})

// Version 3: Duplikate bereinigen — Firestore übernimmt den Katalog
db.version(3).stores({
  categories: '++id, sortOrder',
  products: '++id, categoryId, isActive, isFavorite, sortOrder',
  sales: 'id, userId, createdAt, type',
  users: '++id',
}).upgrade(async (tx) => {
  await tx.table('categories').clear()
  await tx.table('products').clear()
})

// Version 4: Tabs-Tabelle + tabId auf Categories
db.version(4).stores({
  tabs: '++id, sortOrder',
  categories: '++id, sortOrder, tabId',
  products: '++id, categoryId, isActive, isFavorite, sortOrder',
  sales: 'id, userId, createdAt, type',
  users: '++id',
})

// Seed nur wenn kein Firebase konfiguriert (reiner Offline-Betrieb)
async function seedDefaultData() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  if (apiKey) return  // Firebase vorhanden → Katalog kommt von Firestore

  const catCount = await db.categories.count()
  if (catCount > 0) return

  const now = Date.now()

  const tabIds = await db.tabs.bulkAdd([
    { name: 'Bierstand', sortOrder: 0, color: '#ff9500', lastModified: now },
    { name: 'Essen',     sortOrder: 1, color: '#34c759', lastModified: now },
  ], { allKeys: true })

  const [bierstId, essenId] = tabIds as number[]

  const catIds = await db.categories.bulkAdd([
    { name: 'Biere',      sortOrder: 0, color: '#ff9500', tabId: bierstId, lastModified: now },
    { name: 'Softdrinks', sortOrder: 1, color: '#3b82f6', tabId: bierstId, lastModified: now },
    { name: 'Wein',       sortOrder: 2, color: '#a855f7', tabId: bierstId, lastModified: now },
    { name: 'Speisen',    sortOrder: 0, color: '#34c759', tabId: essenId,  lastModified: now },
  ], { allKeys: true })

  const [bierId, softId, weinId, speiseId] = catIds as number[]

  await db.products.bulkAdd([
    { name: 'Karlsberg Urpils',    icon: '🍺', categoryId: bierId,   price: 300, isActive: true, isSoldOut: false, isFavorite: true,  sortOrder: 0, lastModified: now },
    { name: 'Radler/Mixery',       icon: '🍺', categoryId: bierId,   price: 300, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: now },
    { name: 'Alk.frei/Grapefruit', icon: '🍺', categoryId: bierId,   price: 300, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 2, lastModified: now },
    { name: 'Fanta/Cola/Light',    icon: '🥤', categoryId: softId,   price: 200, isActive: true, isSoldOut: false, isFavorite: true,  sortOrder: 0, lastModified: now },
    { name: 'Apfelsaftschorle',    icon: '🍎', categoryId: softId,   price: 200, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: now },
    { name: 'Wasser',              icon: '💧', categoryId: softId,   price: 200, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 2, lastModified: now },
    { name: 'Weinschorle',         icon: '🥂', categoryId: weinId,   price: 350, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0, lastModified: now },
    { name: 'Weiß-/Rot-/Rosé',    icon: '🍷', categoryId: weinId,   price: 450, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: now },
    { name: 'Bratwurst',           icon: '🌭', categoryId: speiseId, price: 300, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0, lastModified: now },
  ])
}

seedDefaultData()

export { db }

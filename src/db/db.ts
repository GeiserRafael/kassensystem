import Dexie, { type EntityTable } from 'dexie'
import type { Category, Product, Sale, User } from './types'

const db = new Dexie('kassensystem') as Dexie & {
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

// Version 2: neue Seed-Daten aus Getränkekarte Bierstand
db.version(2).stores({
  categories: '++id, sortOrder',
  products: '++id, categoryId, isActive, isFavorite, sortOrder',
  sales: 'id, userId, createdAt, type',
  users: '++id',
}).upgrade(async (tx) => {
  await tx.table('categories').clear()
  await tx.table('products').clear()
})

async function seedDefaultData() {
  const catCount = await db.categories.count()
  if (catCount > 0) return

  const now = Date.now()
  const catIds = await db.categories.bulkAdd([
    { name: 'Bierstand', sortOrder: 0, color: '#f59e0b', lastModified: now },
    { name: 'Softdrinks', sortOrder: 1, color: '#3b82f6', lastModified: now },
    { name: 'Wein', sortOrder: 2, color: '#a855f7', lastModified: now },
  ], { allKeys: true })

  const [bierId, softId, weinId] = catIds as number[]

  await db.products.bulkAdd([
    // Bierstand
    { name: 'Karlsberg Urpils', icon: '🍺', categoryId: bierId, price: 300, isActive: true, isSoldOut: false, isFavorite: true,  sortOrder: 0, lastModified: now },
    { name: 'Radler/Mixery',    icon: '🍺', categoryId: bierId, price: 300, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: now },
    { name: 'Alk.frei/Grapefruit', icon: '🍺', categoryId: bierId, price: 300, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 2, lastModified: now },
    // Softdrinks
    { name: 'Fanta/Cola/Light', icon: '🥤', categoryId: softId, price: 200, isActive: true, isSoldOut: false, isFavorite: true,  sortOrder: 0, lastModified: now },
    { name: 'Apfelsaftschorle', icon: '🍎', categoryId: softId, price: 200, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: now },
    { name: 'Wasser',           icon: '💧', categoryId: softId, price: 200, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 2, lastModified: now },
    // Wein
    { name: 'Weinschorle',      icon: '🥂', categoryId: weinId, price: 350, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 0, lastModified: now },
    { name: 'Weiß-/Rot-/Rosé', icon: '🍷', categoryId: weinId, price: 450, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: now },
  ])
}

seedDefaultData()

export { db }

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

async function seedDefaultData() {
  const catCount = await db.categories.count()
  if (catCount > 0) return

  const catIds = await db.categories.bulkAdd([
    { name: 'Getränke', sortOrder: 0, color: '#3b82f6', lastModified: Date.now() },
    { name: 'Essen', sortOrder: 1, color: '#f97316', lastModified: Date.now() },
  ], { allKeys: true })

  await db.products.bulkAdd([
    { name: 'Cola', icon: '🥤', categoryId: catIds[0] as number, price: 200, isActive: true, isSoldOut: false, isFavorite: true, sortOrder: 0, lastModified: Date.now() },
    { name: 'Bier', icon: '🍺', categoryId: catIds[0] as number, price: 250, isActive: true, isSoldOut: false, isFavorite: true, sortOrder: 1, lastModified: Date.now() },
    { name: 'Wasser', icon: '💧', categoryId: catIds[0] as number, price: 150, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 2, lastModified: Date.now() },
    { name: 'Bratwurst', icon: '🌭', categoryId: catIds[1] as number, price: 300, isActive: true, isSoldOut: false, isFavorite: true, sortOrder: 0, lastModified: Date.now() },
    { name: 'Pizza', icon: '🍕', categoryId: catIds[1] as number, price: 350, isActive: true, isSoldOut: false, isFavorite: false, sortOrder: 1, lastModified: Date.now() },
  ])
}

seedDefaultData()

export { db }

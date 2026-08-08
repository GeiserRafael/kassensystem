import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { db } from './db'

const SYNC_KEY = 'lastSyncedAt'

function clean<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

export async function syncSalesToFirestore(): Promise<number> {
  if (!firestore) return 0

  const unsyncedSales = await db.sales
    .filter((s) => !s.synced)
    .toArray()

  if (unsyncedSales.length === 0) return 0

  const batch = writeBatch(firestore)
  const salesCol = collection(firestore, 'sales')

  for (const sale of unsyncedSales) {
    const ref = doc(salesCol, sale.id!)
    batch.set(ref, { ...clean(sale), syncedAt: serverTimestamp() })
  }

  await batch.commit()

  await db.sales.bulkPut(unsyncedSales.map((s) => ({ ...s, synced: true })))
  localStorage.setItem(SYNC_KEY, new Date().toISOString())
  return unsyncedSales.length
}

export async function uploadCatalogToFirestore(): Promise<void> {
  if (!firestore) return

  const [categories, products] = await Promise.all([
    db.categories.toArray(),
    db.products.toArray(),
  ])

  const batch = writeBatch(firestore)

  for (const cat of categories) {
    batch.set(doc(firestore, 'categories', String(cat.id)), clean(cat), { merge: true })
  }
  for (const prod of products) {
    batch.set(doc(firestore, 'products', String(prod.id)), clean(prod), { merge: true })
  }

  await batch.commit()
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(SYNC_KEY)
}

import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { firestore } from '../firebase'
import { db } from './db'
import type { Category, Product, Sale } from './types'

const SYNC_KEY = 'lastSyncedAt'

function clean<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  )
}

// Preisfelder von Cent → Euro für bessere Lesbarkeit in Firestore
function centToEuro(obj: Record<string, unknown>): Record<string, unknown> {
  const priceFields = new Set(['unitPrice', 'lineTotal', 'total', 'given', 'change', 'price'])
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (priceFields.has(k) && typeof v === 'number') return [k, v / 100]
      if (k === 'lineItems' && Array.isArray(v)) {
        return [k, v.map((item: Record<string, unknown>) => centToEuro(item))]
      }
      return [k, v]
    })
  )
}

// Euro → Cent für lokale Dexie-Speicherung
function euroToCent(obj: Record<string, unknown>): Record<string, unknown> {
  const priceFields = new Set(['unitPrice', 'lineTotal', 'total', 'given', 'change', 'price'])
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (priceFields.has(k) && typeof v === 'number') return [k, Math.round(v * 100)]
      if (k === 'lineItems' && Array.isArray(v)) {
        return [k, v.map((item: Record<string, unknown>) => euroToCent(item))]
      }
      return [k, v]
    })
  )
}

// --- Sales ---

export async function syncSalesToFirestore(): Promise<number> {
  if (!firestore) return 0

  const unsyncedSales = await db.sales.filter((s) => !s.synced).toArray()
  if (unsyncedSales.length === 0) return 0

  const batch = writeBatch(firestore)
  for (const sale of unsyncedSales) {
    batch.set(doc(firestore, 'sales', sale.id!), {
      ...centToEuro(clean(sale)),
      syncedAt: serverTimestamp(),
    })
  }
  await batch.commit()
  await db.sales.bulkPut(unsyncedSales.map((s) => ({ ...s, synced: true })))
  localStorage.setItem(SYNC_KEY, new Date().toISOString())
  return unsyncedSales.length
}

// --- Katalog hochladen (ein Produkt/Kategorie nach Änderung) ---

export async function pushProductToFirestore(product: Product): Promise<void> {
  if (!firestore || !product.id) return
  await writeBatch(firestore)
    .set(doc(firestore, 'products', String(product.id)), {
      ...clean(product),
      lastModified: Date.now(),
    })
    .commit()
}

export async function pushCategoryToFirestore(category: Category): Promise<void> {
  if (!firestore || !category.id) return
  await writeBatch(firestore)
    .set(doc(firestore, 'categories', String(category.id)), {
      ...clean(category),
      lastModified: Date.now(),
    })
    .commit()
}

export async function deleteProductFromFirestore(id: number): Promise<void> {
  if (!firestore) return
  const { deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(firestore, 'products', String(id)))
}

export async function deleteCategoryFromFirestore(id: number): Promise<void> {
  if (!firestore) return
  const { deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(firestore, 'categories', String(id)))
}

// --- Live-Listener: erster Snapshot = vollständiger Ersatz, danach inkrementell ---

export function subscribeToProductChanges(): Unsubscribe {
  if (!firestore) return () => {}

  let productsReady = false
  let categoriesReady = false

  const unsub1 = onSnapshot(collection(firestore, 'products'), async (snap) => {
    if (!productsReady) {
      productsReady = true
      const prods = snap.docs.map((d) => ({ ...(d.data() as Product), id: Number(d.id) }))
      if (prods.length > 0) {
        await db.products.clear()
        await db.products.bulkAdd(prods)
      }
    } else {
      for (const change of snap.docChanges()) {
        const remote = { ...(change.doc.data() as Product), id: Number(change.doc.id) }
        if (change.type === 'removed') {
          await db.products.delete(remote.id!)
        } else {
          await db.products.put(remote)
        }
      }
    }
  })

  const unsub2 = onSnapshot(collection(firestore, 'categories'), async (snap) => {
    if (!categoriesReady) {
      categoriesReady = true
      const cats = snap.docs.map((d) => ({ ...(d.data() as Category), id: Number(d.id) }))
      if (cats.length > 0) {
        await db.categories.clear()
        await db.categories.bulkAdd(cats)
      }
    } else {
      for (const change of snap.docChanges()) {
        const remote = { ...(change.doc.data() as Category), id: Number(change.doc.id) }
        if (change.type === 'removed') {
          await db.categories.delete(remote.id!)
        } else {
          await db.categories.put(remote)
        }
      }
    }
  })

  return () => { unsub1(); unsub2() }
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(SYNC_KEY)
}

// --- Admin: alle Sales löschen (lokal + Firestore) ---

export async function deleteAllSales(): Promise<void> {
  // Lokal löschen
  await db.sales.clear()

  if (!firestore) return

  // Firestore: alle Docs in 'sales' in Batches löschen
  const { getDocs } = await import('firebase/firestore')
  const snap = await getDocs(collection(firestore, 'sales'))
  const BATCH_SIZE = 400
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore)
    snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

export function subscribeToSalesChanges(): Unsubscribe {
  if (!firestore) return () => {}

  let ready = false

  return onSnapshot(collection(firestore, 'sales'), async (snap) => {
    if (!ready) {
      ready = true
      const remoteSales = snap.docs.map((d) => {
        const raw = euroToCent(d.data() as Record<string, unknown>)
        return { ...raw, id: d.id, synced: true } as Sale
      })
      // Nur fremde Sales einfügen (eigene behalten ihren lokalen Stand)
      const localIds = new Set(await db.sales.toCollection().primaryKeys())
      const newSales = remoteSales.filter((s) => !localIds.has(s.id!))
      if (newSales.length > 0) await db.sales.bulkAdd(newSales)
    } else {
      for (const change of snap.docChanges()) {
        const raw = euroToCent(change.doc.data() as Record<string, unknown>)
        const sale = { ...raw, id: change.doc.id, synced: true } as Sale
        if (change.type === 'removed') {
          await db.sales.delete(sale.id!)
        } else {
          // put überschreibt nur wenn remote — eigene (synced=false) nicht anfassen
          const local = await db.sales.get(sale.id!)
          if (!local || local.synced) await db.sales.put(sale)
        }
      }
    }
  })
}

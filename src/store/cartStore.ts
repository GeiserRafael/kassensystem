import { create } from 'zustand'
import type { LineItem, Product } from '../db/types'
import { getPfandPrice } from '../utils'

interface CartItem extends LineItem {}

interface CartStore {
  items: CartItem[]
  pfandQty: number    // net (after returns)
  pfandAdded: number  // total added (denominator for display)
  addProduct: (product: Product) => void
  addPfand: () => void
  removePfand: () => void
  removeOne: (productId: number) => void
  removeLastAdded: () => void
  clear: () => void
  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  pfandQty: 0,
  pfandAdded: 0,

  addProduct: (product) => {
    const id = product.id!
    set((state) => {
      const existing = state.items.find((i) => i.productId === id)
      const newItems = existing
        ? state.items.map((i) =>
            i.productId === id
              ? { ...i, qty: i.qty + 1, lineTotal: (i.qty + 1) * i.unitPrice }
              : i
          )
        : [
            ...state.items,
            {
              productId: id,
              name: product.name,
              icon: product.icon,
              qty: 1,
              unitPrice: product.price,
              lineTotal: product.price,
              hasPfand: product.hasPfand ?? false,
            },
          ]
      return {
        items: newItems,
        pfandQty: product.hasPfand ? state.pfandQty + 1 : state.pfandQty,
        pfandAdded: product.hasPfand ? state.pfandAdded + 1 : state.pfandAdded,
      }
    })
  },

  addPfand: () => set((state) => ({ pfandQty: Math.min(state.pfandAdded, state.pfandQty + 1) })),
  removePfand: () => set((state) => ({ pfandQty: state.pfandQty - 1 })),

  removeOne: (productId) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId)
      if (!existing) return state
      const hasPfand = existing.hasPfand ?? false
      const newPfandAdded = hasPfand ? state.pfandAdded - 1 : state.pfandAdded
      const newPfandQty = hasPfand ? Math.min(state.pfandQty, newPfandAdded) : state.pfandQty
      if (existing.qty === 1) {
        return { items: state.items.filter((i) => i.productId !== productId), pfandAdded: newPfandAdded, pfandQty: newPfandQty }
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId
            ? { ...i, qty: i.qty - 1, lineTotal: (i.qty - 1) * i.unitPrice }
            : i
        ),
        pfandAdded: newPfandAdded,
        pfandQty: newPfandQty,
      }
    })
  },

  removeLastAdded: () => {
    set((state) => {
      if (state.items.length === 0) return state
      const last = state.items[state.items.length - 1]
      const hasPfand = last.hasPfand ?? false
      const newPfandAdded = hasPfand ? state.pfandAdded - 1 : state.pfandAdded
      const newPfandQty = hasPfand ? Math.min(state.pfandQty, newPfandAdded) : state.pfandQty
      if (last.qty === 1) {
        return { items: state.items.slice(0, -1), pfandAdded: newPfandAdded, pfandQty: newPfandQty }
      }
      return {
        items: state.items.map((item, idx) =>
          idx === state.items.length - 1
            ? { ...item, qty: item.qty - 1, lineTotal: (item.qty - 1) * item.unitPrice }
            : item
        ),
        pfandAdded: newPfandAdded,
        pfandQty: newPfandQty,
      }
    })
  },

  clear: () => set({ items: [], pfandQty: 0, pfandAdded: 0 }),

  total: () => {
    const { items, pfandQty } = get()
    return items.reduce((sum, i) => sum + i.lineTotal, 0) + pfandQty * getPfandPrice()
  },
}))

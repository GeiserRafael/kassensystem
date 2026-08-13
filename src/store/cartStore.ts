import { create } from 'zustand'
import type { LineItem, Product } from '../db/types'
import { getPfandPrice } from '../utils'

interface CartItem extends LineItem {}

interface CartStore {
  items: CartItem[]
  pfandQty: number
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
      }
    })
  },

  addPfand: () => set((state) => ({ pfandQty: state.pfandQty + 1 })),
  removePfand: () => set((state) => ({ pfandQty: Math.max(0, state.pfandQty - 1) })),

  removeOne: (productId) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === productId)
      if (!existing) return state
      if (existing.qty === 1) {
        return { items: state.items.filter((i) => i.productId !== productId) }
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId
            ? { ...i, qty: i.qty - 1, lineTotal: (i.qty - 1) * i.unitPrice }
            : i
        ),
      }
    })
  },

  removeLastAdded: () => {
    set((state) => {
      if (state.items.length === 0) return state
      const last = state.items[state.items.length - 1]
      if (last.qty === 1) {
        return { items: state.items.slice(0, -1) }
      }
      return {
        items: state.items.map((item, idx) =>
          idx === state.items.length - 1
            ? { ...item, qty: item.qty - 1, lineTotal: (item.qty - 1) * item.unitPrice }
            : item
        ),
      }
    })
  },

  clear: () => set({ items: [], pfandQty: 0 }),

  total: () => {
    const { items, pfandQty } = get()
    return items.reduce((sum, i) => sum + i.lineTotal, 0) + pfandQty * getPfandPrice()
  },
}))

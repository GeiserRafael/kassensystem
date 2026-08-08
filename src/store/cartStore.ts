import { create } from 'zustand'
import type { LineItem, Product } from '../db/types'

interface CartItem extends LineItem {}

interface CartStore {
  items: CartItem[]
  addProduct: (product: Product) => void
  removeOne: (productId: number) => void
  removeLastAdded: () => void
  clear: () => void
  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addProduct: (product) => {
    const id = product.id!
    set((state) => {
      const existing = state.items.find((i) => i.productId === id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === id
              ? { ...i, qty: i.qty + 1, lineTotal: (i.qty + 1) * i.unitPrice }
              : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            productId: id,
            name: product.name,
            icon: product.icon,
            qty: 1,
            unitPrice: product.price,
            lineTotal: product.price,
          },
        ],
      }
    })
  },

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

  clear: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),
}))

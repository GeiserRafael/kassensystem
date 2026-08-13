export interface Tab {
  id?: number
  name: string
  sortOrder: number
  color: string
  lastModified: number
}

export interface Category {
  id?: number
  name: string
  sortOrder: number
  color: string
  tabId?: number
  lastModified: number
}

export interface Product {
  id?: number
  name: string
  icon: string
  categoryId: number
  price: number        // in Cent
  isActive: boolean
  isSoldOut: boolean
  isFavorite: boolean
  hasPfand?: boolean
  sortOrder: number
  lastModified: number
}

export interface LineItem {
  productId: number
  name: string
  icon: string
  qty: number
  unitPrice: number    // in Cent
  lineTotal: number    // in Cent
  hasPfand?: boolean
}

export interface Sale {
  id?: string          // client-generierte UUID
  userId: string
  deviceId: string
  createdAt: number
  type: 'sale' | 'void'
  lineItems: LineItem[]
  total: number        // in Cent
  given: number        // in Cent
  change: number       // in Cent
  pfandQty?: number
  pfandTotal?: number  // in Cent
  synced?: boolean
}

export interface User {
  id?: number
  name: string
}

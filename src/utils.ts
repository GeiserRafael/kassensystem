export function formatCent(cent: number): string {
  return (cent / 100).toFixed(2).replace('.', ',') + ' €'
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function getDeviceId(): string {
  let id = localStorage.getItem('deviceId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('deviceId', id)
  }
  return id
}

export function getUserName(): string {
  return localStorage.getItem('userName') ?? 'Unbekannt'
}

const PFAND_PRICE_KEY = 'pfandPrice'
export const PFAND_PRICE_DEFAULT = 200  // 2 € in Cent

export function getPfandPrice(): number {
  const stored = localStorage.getItem(PFAND_PRICE_KEY)
  return stored ? parseInt(stored, 10) : PFAND_PRICE_DEFAULT
}

export function setPfandPrice(cent: number): void {
  localStorage.setItem(PFAND_PRICE_KEY, String(cent))
}

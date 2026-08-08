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

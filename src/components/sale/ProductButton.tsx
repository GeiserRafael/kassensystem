import type { Product } from '../../db/types'
import { useCartStore } from '../../store/cartStore'
import { formatCent } from '../../utils'

interface Props {
  product: Product
}

export function ProductButton({ product }: Props) {
  const addProduct = useCartStore((s) => s.addProduct)
  const items = useCartStore((s) => s.items)
  const qty = items.find((i) => i.productId === product.id)?.qty ?? 0

  return (
    <button
      onClick={() => addProduct(product)}
      disabled={product.isSoldOut}
      className={`
        relative flex flex-col items-center justify-center gap-1
        rounded-2xl p-3 min-h-[88px] w-full
        text-white font-medium text-sm leading-tight
        active:scale-95 transition-transform
        ${product.isSoldOut ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{ backgroundColor: product.isSoldOut ? '#9ca3af' : undefined, background: product.isSoldOut ? undefined : 'var(--cat-color, #3b82f6)' }}
    >
      {qty > 0 && (
        <span className="absolute top-1.5 right-1.5 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
          {qty}
        </span>
      )}
      <span className="text-3xl leading-none">{product.icon}</span>
      <span className="text-center break-words w-full">{product.name}</span>
      <span className="text-xs opacity-80">{formatCent(product.price)}</span>
      {product.isSoldOut && (
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 text-xs font-bold">
          Ausverkauft
        </span>
      )}
    </button>
  )
}

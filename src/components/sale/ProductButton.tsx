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
        relative flex flex-col items-center justify-center gap-1.5
        rounded-2xl p-3 min-h-[96px] w-full
        text-white font-semibold text-[13px] leading-tight
        active:scale-95 transition-transform shadow-sm
        ${product.isSoldOut ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        background: product.isSoldOut
          ? '#9ca3af'
          : `var(--cat-color, #007aff)`,
      }}
    >
      {qty > 0 && (
        <span className="absolute top-2 right-2 bg-white text-[#1c1c1e] text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center leading-none shadow-sm">
          {qty}
        </span>
      )}
      <span className="text-[32px] leading-none">{product.icon}</span>
      <span className="text-center break-words w-full leading-snug">{product.name}</span>
      <span className="text-[11px] opacity-80 font-medium">{formatCent(product.price)}</span>
      {product.isSoldOut && (
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/25 text-[11px] font-bold">
          Ausverkauft
        </span>
      )}
    </button>
  )
}

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
        relative flex flex-col items-center justify-center gap-2
        rounded-[22px] p-3 min-h-[105px] w-full
        active:scale-95 transition-transform
        ${product.isSoldOut ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), inset 0 0.5px 0 rgba(255,255,255,0.9)',
        border: '0.5px solid rgba(255,255,255,0.6)',
      }}
    >
      {qty > 0 && (
        <span
          className="absolute top-2 right-2 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center leading-none"
          style={{
            backgroundColor: 'var(--cat-color, #007aff)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {qty}
        </span>
      )}

      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[26px] leading-none shrink-0"
        style={{
          backgroundColor: product.isSoldOut
            ? 'rgba(156,163,175,0.15)'
            : `color-mix(in srgb, var(--cat-color, #007aff) 18%, transparent)`,
          boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.6)',
        }}
      >
        {product.icon}
      </div>

      <div className="flex flex-col items-center gap-0.5 w-full">
        <span className="text-[13px] font-semibold text-[#1c1c1e] dark:text-white text-center break-words w-full leading-snug">
          {product.name}
        </span>
        <span
          className="text-[12px] font-semibold"
          style={{ color: product.isSoldOut ? '#9ca3af' : 'var(--cat-color, #007aff)' }}
        >
          {formatCent(product.price)}
        </span>
      </div>

      {product.isSoldOut && (
        <span className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-white/50 text-[12px] font-bold text-[#3c3c43]">
          Ausverkauft
        </span>
      )}
    </button>
  )
}

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
        background: 'var(--lg-card-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'var(--lg-card-shadow)',
        border: '0.5px solid var(--lg-card-border)',
      }}
    >
      {qty > 0 && (
        <span
          className="absolute top-2 right-2 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center leading-none"
          style={{ backgroundColor: 'var(--cat-color, #007aff)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
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
        <span className="absolute inset-0 flex items-center justify-center rounded-[22px] text-[12px] font-bold text-[#3c3c43] dark:text-white/60"
          style={{ background: 'var(--lg-card-bg)' }}>
          Ausverkauft
        </span>
      )}
    </button>
  )
}

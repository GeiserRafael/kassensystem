import { useState } from 'react'

interface Props {
  onSave: (name: string) => void
}

export function UserNamePrompt({ onSave }: Props) {
  const [name, setName] = useState('')

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem('userName', trimmed)
    onSave(trimmed)
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-svh bg-[#f2f2f7] dark:bg-black px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-sm space-y-5">
        {/* Icon + title */}
        <div className="text-center space-y-3">
          <div
            className="w-24 h-24 rounded-[28px] flex items-center justify-center text-5xl mx-auto"
            style={{
              background: 'linear-gradient(135deg, #34c759, #30d158)',
              boxShadow: '0 8px 32px rgba(52,199,89,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            🛒
          </div>
          <h1 className="text-[32px] font-bold text-[#1c1c1e] dark:text-white tracking-tight">Kasse</h1>
          <p className="text-[15px] text-[#3c3c43]/55 dark:text-white/40">Gib deinen Namen ein um zu starten</p>
        </div>

        {/* Input — Liquid Glass */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--lg-card-bg)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: 'var(--lg-card-shadow)',
            border: '0.5px solid var(--lg-card-border)',
          }}
        >
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Dein Name"
            className="w-full px-4 py-4 text-[17px] text-[#1c1c1e] dark:text-white bg-transparent placeholder:text-[#3c3c43]/30 dark:placeholder:text-white/25 focus:outline-none"
          />
        </div>

        {/* CTA — Liquid Glass Green */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl text-white font-semibold text-[17px] disabled:opacity-35 active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #34c759, #30d158)',
            boxShadow: name.trim()
              ? '0 4px 20px rgba(52,199,89,0.4), inset 0 1px 0 rgba(255,255,255,0.25)'
              : 'none',
          }}
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

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
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-[22px] bg-[#34c759] dark:bg-[#30d158] flex items-center justify-center text-4xl mx-auto shadow-lg">
            🛒
          </div>
          <h1 className="text-[28px] font-bold text-[#1c1c1e] dark:text-white">Kasse</h1>
          <p className="text-[15px] text-[#3c3c43]/60 dark:text-white/40">Gib deinen Namen ein um zu starten</p>
        </div>

        {/* Input card */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden">
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

        {/* CTA */}
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl bg-[#007aff] dark:bg-[#0a84ff] text-white font-semibold text-[17px] disabled:opacity-35 active:opacity-80 transition-opacity shadow-sm"
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

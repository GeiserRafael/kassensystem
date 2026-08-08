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
    <div className="flex flex-col items-center justify-center h-svh bg-gray-50 dark:bg-gray-900 px-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-8 shadow space-y-5">
        <div className="text-center">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kasse</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bitte gib deinen Namen ein um zu starten</p>
        </div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Dein Name"
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-lg disabled:opacity-40"
        >
          Weiter
        </button>
      </div>
    </div>
  )
}

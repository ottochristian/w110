'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

type Club = { id: string; name: string; slug: string }

interface ClubPickerProps {
  clubs: Club[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export function ClubPicker({ clubs, value, onChange, placeholder = 'Search for your club…' }: ClubPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = clubs.find(c => c.id === value)

  const filtered = query.trim()
    ? clubs.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clubs

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // If a club is selected, reset query so the selected name shows
        if (value) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  function handleInputFocus() {
    setOpen(true)
    // Clear the display value so the user can type freely
    if (selected) setQuery('')
  }

  function handleSelect(club: Club) {
    onChange(club.id)
    setQuery('')
    setOpen(false)
  }

  // What to show in the input
  const displayValue = open ? query : (selected?.name ?? query)

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 rounded-lg border bg-input px-3 py-2.5 transition-shadow
        ${open ? 'border-blue-500 ring-2 ring-blue-500' : 'border-zinc-300 hover:border-zinc-400'}`}>
        <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={handleInputFocus}
          placeholder={selected ? selected.name : placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-zinc-400 focus:outline-none min-w-0"
        />
        <ChevronDown className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-zinc-200 bg-card shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-400">No clubs found for "{query}"</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.map(club => (
                <li key={club.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(club)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors
                      ${club.id === value
                        ? 'bg-blue-50 text-blue-900 font-medium'
                        : 'text-foreground hover:bg-zinc-50'}`}
                  >
                    {club.name}
                    {club.id === value && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

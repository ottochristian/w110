'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type CartItem = {
  id: string // temporary ID for cart
  athlete_id: string
  athlete_name: string
  sub_program_id: string
  sub_program_name: string
  program_name: string
  price: number
  registration_id?: string // Set when registration is created
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: CartItem) => boolean
  removeItem: (itemId: string) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (item: CartItem): boolean => {
    // Check for duplicates using current state
    // Note: This might have race conditions if multiple items added simultaneously,
    // but the updater function will prevent duplicates as a safety check
    const existing = items.find(
      i => i.athlete_id === item.athlete_id && i.sub_program_id === item.sub_program_id
    )
    
    if (existing) {
      return false // Don't add duplicates
    }
    
    setItems(prev => {
      // Safety check: prevent duplicates if state changed between check and update
      const duplicate = prev.find(
        i => i.athlete_id === item.athlete_id && i.sub_program_id === item.sub_program_id
      )
      if (duplicate) {
        return prev
      }
      return [...prev, item]
    })
    
    return true
  }

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.price, 0)
  const itemCount = items.length

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

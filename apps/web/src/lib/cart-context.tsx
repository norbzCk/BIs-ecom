import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { products } from '../data/products'
import type { CartLine, Product } from '../types'

interface CartContextValue {
  lines: CartLine[]
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  itemCount: number
  subtotal: number
  cartProducts: Array<{ product: Product; quantity: number }>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([
    { productId: 'p-apex-15-pro', quantity: 1 },
    { productId: 'p-glide-x-wireless-mouse', quantity: 1 },
  ])

  const addItem = (productId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l,
        )
      }
      return [...prev, { productId, quantity }]
    })
  }

  const removeItem = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return removeItem(productId)
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)))
  }

  const cartProducts = useMemo(
    () =>
      lines
        .map((line) => {
          const product = products.find((p) => p.id === line.productId)
          return product ? { product, quantity: line.quantity } : null
        })
        .filter((v): v is { product: Product; quantity: number } => v !== null),
    [lines],
  )

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const subtotal = cartProducts.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0)

  const value: CartContextValue = {
    lines,
    addItem,
    removeItem,
    setQuantity,
    itemCount,
    subtotal,
    cartProducts,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

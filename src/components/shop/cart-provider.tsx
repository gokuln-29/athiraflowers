"use client"

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react"

export type CartItem = { productId: number; quantity: number }
type CartState = { items: CartItem[]; open: boolean }

type CartContextValue = {
  items: CartItem[]
  count: number
  hydrated: boolean
  open: boolean
  setOpen: (open: boolean) => void
  add: (productId: number, quantity: number) => void
  setQuantity: (productId: number, quantity: number) => void
  remove: (productId: number) => void
  clear: () => void
}

const KEY = "athira.cart.v1"
const CartContext = createContext<CartContextValue | null>(null)

/** Cart lives in the browser as {productId, quantity} only. Prices are never stored or trusted. */
function read(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((i) => Number.isInteger(i?.productId) && Number.isInteger(i?.quantity) && i.quantity > 0 && i.quantity <= 1000)
      .slice(0, 40)
  } catch {
    return []
  }
}

const subscribeNever = () => () => {}
const listeners = new Set<() => void>()
let snapshot: string | null = null
const getSnapshot = () => {
  if (snapshot === null) snapshot = JSON.stringify(read())
  return snapshot
}
function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* private mode: cart lasts for the session only */
  }
  snapshot = JSON.stringify(items)
  listeners.forEach((l) => l())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const serialized = useSyncExternalStore(subscribe, getSnapshot, () => "[]")
  const items = useMemo(() => JSON.parse(serialized) as CartItem[], [serialized])
  const [state, setState] = useState<Pick<CartState, "open">>({ open: false })
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  const add = useCallback((productId: number, quantity: number) => {
    const current = read()
    const found = current.find((i) => i.productId === productId)
    if (found) found.quantity = Math.min(1000, found.quantity + quantity)
    else current.push({ productId, quantity })
    write(current)
  }, [])
  const setQuantity = useCallback((productId: number, quantity: number) => {
    const next = read()
      .map((i) => (i.productId === productId ? { ...i, quantity } : i))
      .filter((i) => i.quantity > 0)
    write(next)
  }, [])
  const remove = useCallback((productId: number) => write(read().filter((i) => i.productId !== productId)), [])
  const clear = useCallback(() => write([]), [])
  const setOpen = useCallback((open: boolean) => setState({ open }), [])

  const value = useMemo<CartContextValue>(
    () => ({ items, count: items.length, hydrated, open: state.open, setOpen, add, setQuantity, remove, clear }),
    [items, hydrated, state.open, setOpen, add, setQuantity, remove, clear]
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}

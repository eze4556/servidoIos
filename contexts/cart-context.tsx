"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, ReactNode } from "react"
export interface CartItem {
  id: string
  name: string
  description?: string
  price: number // Original price
  discountedPrice: number // Compatibilidad con el checkout; siempre coincide con price
  quantity: number
  imageUrl?: string
  media?: any[]
  isService: boolean
  sellerId: string
  stock?: number
  condition?: 'nuevo' | 'usado'
  freeShipping?: boolean
  shippingCost?: number
}

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (id: string) => number
  getTotalPrice: () => number
  getSubtotal: () => number
  // 🆕 NUEVAS FUNCIONES PARA SISTEMA CENTRALIZADO
  getItemsByVendor: () => { [sellerId: string]: CartItem[] }
  getVendorCount: () => number
  getTotalCommission: () => number
  getVendorSubtotal: (sellerId: string) => number
  canCreateCentralizedPurchase: () => boolean
  getTotalShipping: () => number
  getTotalWithShipping: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM":
      const normalizedItem = {
        ...action.payload,
        discountedPrice: action.payload.price,
      } as CartItem & { appliedCoupon?: unknown }
      delete normalizedItem.appliedCoupon
      const existingItem = state.items.find(item => item.id === normalizedItem.id)
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === normalizedItem.id
              ? { 
                  ...item, 
                  quantity: item.quantity + normalizedItem.quantity, 
                  price: normalizedItem.price,
                  discountedPrice: normalizedItem.price,
                }
              : item
          )
        }
      }
      return {
        ...state,
        items: [...state.items, normalizedItem]
      }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
    }

    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
    }

    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      }

    default:
      return state
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCart = localStorage.getItem("servido-cart")
    
    if (storedCart) {
      dispatch({ type: "CLEAR_CART" }) // Clear existing items
      const items = JSON.parse(storedCart)
      items.forEach((item: CartItem) => {
        // Re-add items to ensure they pass through reducer and potentially update prices/coupons
        dispatch({ type: "ADD_ITEM", payload: item })
      })
    }

    localStorage.removeItem("servido-applied-coupon")
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("servido-cart", JSON.stringify(state.items))
  }, [state.items])

  const addItem = (item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item })
  }

  const removeFromCart = (id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  const getItemQuantity = (id: string) => {
    const item = state.items.find(item => item.id === id)
    return item ? item.quantity : 0
  }

  const getTotalPrice = (): number => {
    return getSubtotal()
  }

  const getSubtotal = (): number => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  // 🆕 NUEVAS FUNCIONES PARA SISTEMA CENTRALIZADO
  const getItemsByVendor = (): { [sellerId: string]: CartItem[] } => {
    return state.items.reduce((acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = []
      }
      acc[item.sellerId].push(item)
      return acc
    }, {} as { [sellerId: string]: CartItem[] })
  }

  const getVendorCount = (): number => {
    const vendors = new Set(state.items.map(item => item.sellerId))
    return vendors.size
  }

  const getTotalCommission = (): number => {
    const total = getTotalPrice()
    return Math.round(total * 0.08 * 100) / 100 // 8% comisión
  }

  const getVendorSubtotal = (sellerId: string): number => {
    return state.items
      .filter(item => item.sellerId === sellerId)
      .reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const canCreateCentralizedPurchase = (): boolean => {
    if (state.items.length === 0) return false
    
    return state.items.every(item => 
      item.id && item.id.trim() !== '' &&
      item.quantity > 0 && 
      item.price > 0 &&
      item.sellerId && item.sellerId.trim() !== '' &&
      item.name && item.name.trim() !== ''
    )
  }

  const getTotalShipping = (): number => {
    return state.items.reduce((total, item) => {
      // Si el producto tiene envío gratis, no agregar costo
      if (item.freeShipping) {
        return total
      }
      // Si tiene costo de envío definido, agregarlo
      if (item.shippingCost !== undefined && item.shippingCost > 0) {
        return total + item.shippingCost
      }
      // Si no tiene envío gratis ni costo definido, no agregar nada
      return total
    }, 0)
  }

  const getTotalWithShipping = (): number => {
    return getTotalPrice() + getTotalShipping()
  }

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        getTotalPrice,
        getSubtotal,
        getItemsByVendor,
        getVendorCount,
        getTotalCommission,
        getVendorSubtotal,
        canCreateCentralizedPurchase,
        getTotalShipping,
        getTotalWithShipping,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

"use client"

import { createContext, useContext, useReducer, useCallback, type ReactNode } from "react"
import type { FoodOrderItemSelection } from "@/types/restaurant"
import { buildLineKey } from "@/lib/restaurant-options"

export interface FoodCartItem {
  lineId: string
  menuItemId: string
  restaurantId: string
  restaurantName: string
  name: string
  /** Precio unitario final mostrado en UI */
  price: number
  quantity: number
  selections?: FoodOrderItemSelection[]
  promotionId?: string
  /** Texto auxiliar (ej. contenido del combo) */
  subtitle?: string
}

interface FoodCartState {
  restaurantId: string | null
  restaurantName: string | null
  items: FoodCartItem[]
}

type FoodCartAction =
  | { type: "ADD_ITEM"; payload: FoodCartItem }
  | { type: "REMOVE_ITEM"; payload: { lineId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { lineId: string; quantity: number } }
  | { type: "CLEAR" }

const initialState: FoodCartState = {
  restaurantId: null,
  restaurantName: null,
  items: [],
}

function foodCartReducer(state: FoodCartState, action: FoodCartAction): FoodCartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { payload } = action
      if (state.restaurantId && state.restaurantId !== payload.restaurantId) {
        return {
          restaurantId: payload.restaurantId,
          restaurantName: payload.restaurantName,
          items: [payload],
        }
      }
      const existing = state.items.find((i) => i.lineId === payload.lineId)
      if (existing) {
        return {
          restaurantId: payload.restaurantId,
          restaurantName: payload.restaurantName,
          items: state.items.map((i) =>
            i.lineId === payload.lineId ? { ...i, quantity: i.quantity + payload.quantity } : i
          ),
        }
      }
      return {
        restaurantId: payload.restaurantId,
        restaurantName: payload.restaurantName,
        items: [...state.items, payload],
      }
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.lineId !== action.payload.lineId),
      }
    case "UPDATE_QUANTITY": {
      const { lineId, quantity } = action.payload
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.lineId !== lineId),
        }
      }
      return {
        ...state,
        items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)),
      }
    }
    case "CLEAR":
      return initialState
    default:
      return state
  }
}

export type AddFoodCartItemInput = {
  menuItemId: string
  restaurantId: string
  restaurantName: string
  name: string
  price: number
  quantity?: number
  selections?: FoodOrderItemSelection[]
  promotionId?: string
  subtitle?: string
  lineId?: string
}

interface FoodCartContextType {
  items: FoodCartItem[]
  restaurantId: string | null
  restaurantName: string | null
  itemCount: number
  subtotal: number
  addItem: (item: AddFoodCartItemInput) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
}

const FoodCartContext = createContext<FoodCartContextType | undefined>(undefined)

export function FoodCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(foodCartReducer, initialState)

  const addItem = useCallback((item: AddFoodCartItemInput) => {
    const lineId =
      item.lineId ||
      buildLineKey(
        item.menuItemId,
        item.selections || [],
        item.promotionId
      )
    dispatch({
      type: "ADD_ITEM",
      payload: {
        lineId,
        menuItemId: item.menuItemId,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        name: item.name,
        price: item.price,
        quantity: item.quantity ?? 1,
        selections: item.selections,
        promotionId: item.promotionId,
        subtitle: item.subtitle,
      },
    })
  }, [])

  const removeItem = useCallback((lineId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { lineId } })
  }, [])

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { lineId, quantity } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" })
  }, [])

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <FoodCartContext.Provider
      value={{
        items: state.items,
        restaurantId: state.restaurantId,
        restaurantName: state.restaurantName,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </FoodCartContext.Provider>
  )
}

export function useFoodCart() {
  const context = useContext(FoodCartContext)
  if (!context) {
    throw new Error("useFoodCart must be used within FoodCartProvider")
  }
  return context
}
